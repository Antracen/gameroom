class UnoCard {
    constructor(color, number) {
        this.color = color;
        this.number = number;
    }
}

function randomUnoCard() {
    /*
        Färg: Samma sannolikhet (0.25)
    
        1-9, byt riktning, +2, och stopp har samma sannolikhet
        0, +4 och byt färg har hälften så stor sannolikhet som ovan
    */

    let colors = ["red", "green", "blue", "gold"];

    let numbers = [];
    let numberset1 = [0,"+4","colorChoice","dirSwap"];
    let numberset2 = [1,2,3,4,5,6,7,8,9,"stop","+2"];
    for(let number of numberset1) {
        numbers.push(number);
    }
    for(let number of numberset2) {
        numbers.push(number);
        numbers.push(number);
    }

    let randNum = Math.floor(Math.random() * numbers.length);
    let randCol = Math.floor(Math.random() * colors.length);
    return new UnoCard(colors[randCol], numbers[randNum]);
}

class UnoHand {
    constructor(numCards) {
        console.log("MAKING NEW UNO HAND");
        this.cards = [];

        for(let i = 0; i < numCards; i++) this.cards.push(randomUnoCard());
    }
}

class Room {
    constructor() {
        this.guests = new Set();
        this.sockets = new Set();
    }

    addPlayer(params, socket) {
        if(this.guests.has(params.userName)) {
            return false;
        }
        else {
            this.guests.add(params.userName);
            this.sockets.add(socket);
        }

        return true;
    }

    leaveRoom(params, socket){
        this.guests.delete(params.userName);
        this.sockets.delete(socket);
    }

    sendToAll(topic, msg) {
        for(let socket of this.sockets){
            socket.emit(topic, msg);
        }
    }
    isEmpty() {
        return this.guests.size == 0;
    }
}

class UnoRoom extends Room {
    constructor(io) {
        super();
        this.io = io;
        this.pile = [randomUnoCard()];

        this.hands = {};
    }

    addPlayer(params, socket) {
        if(!super.addPlayer(params, socket)) return false;
        let playerName = params.userName;
        this.hands[playerName] = new UnoHand(15);

        socket.on("placeCard", (msg) => {
            let myCards = this.hands[playerName].cards;
            
            this.pile.push(myCards[msg]);    
            myCards = myCards.splice(msg, 1);
            
            this.sendToAll("roomInfo", this.roomInfo())
            socket.emit("playerInfo", this.playerInfo(playerName));
        });

        socket.on("pickupCard", (msg) => {
            this.hands[playerName].cards.push(randomUnoCard());
            socket.emit("playerInfo", this.playerInfo(playerName));
            this.sendToAll("roomInfo", this.roomInfo());
        });

        socket.emit("playerInfo", this.playerInfo(playerName));
        this.sendToAll("roomInfo", this.roomInfo());

        return true;
    }

    roomInfo() {
        let guestInfos = {};

        for(let guest of this.guests) {
            let guestInfo = {
                "numCards": this.hands[guest].cards.length
            };
            guestInfos[guest] = guestInfo;
        }

        return {
            "guestInfos": guestInfos,
            "pile": this.pile,
        };
    }

    playerInfo(playerName) {
        return {
            "hand": this.hands[playerName]
        };
    }

    leaveRoom(params, socket){
        super.leaveRoom(params, socket);
        this.sendToAll("roomInfo", this.roomInfo());
    }
}

class SocketHandler {
    constructor(socket, ioHandler) {
        this.params = null;

        this.socket = socket;
        this.ioHandler = ioHandler;

        socket.on('joinRoom', (params) => {
            this.params = params;
            let success = this.ioHandler.joinRoom(params, socket);
            if(!success) {
                console.log("Failed joining room");
            }
            socket.emit("joinRoomSuccess", success);
        });

        socket.on('disconnect', () => {
            console.log("PLAYER DISCONNECTED ", JSON.stringify(this.params));
            if(this.params != null) {
                this.ioHandler.leaveRoom(this.params, socket)
            }
        });
    }
}

class IoHandler {
    
    constructor(io) {
        this.io = io;
        this.rooms = {};
        io.on('connection', (socket) => {
            new SocketHandler(socket, this);
        });
    }

    validParams(params) {
        if(!("userName" in params)) return false;
        if(!("roomName" in params)) return false;
        if(!("game" in params)) return false;

        if(typeof params.userName != "string") return false;
        if(typeof params.roomName != "string") return false;
        if(typeof params.game != "string") return false;

        if(params.game != "uno") return false;

        if(params.userName.length == 0) return false;
        if(params.roomName.length == 0) return false;
        if(params.game.length == 0) return false;

        return true;
    }

    getRoom(game) {
        if(game == "uno") return new UnoRoom(this.io);
        else throw "Unknown game room " + game + " requested";
    }

    joinRoom(params, socket) {
        console.log("Try to join room with params: " + JSON.stringify(params));

        if(!this.validParams(params)) return false;

        let roomName = params.roomName + "(" + params.game + ")";

        if(roomName in this.rooms) {
            console.log("Room already exists");
        } 
        else {
            this.rooms[roomName] = this.getRoom(params.game);
        }
        let room = this.rooms[roomName];

        if(!room.addPlayer(params, socket)) return false;

        return true;
    }

    leaveRoom(params,socket) {
        let roomName = params.roomName + "(" + params.game + ")";
        if(roomName in this.rooms) {
            let room = this.rooms[roomName];
            room.leaveRoom(params, socket);
            
            if(room.isEmpty()) delete this.rooms[roomName];
        }
    }
}

module.exports = IoHandler;