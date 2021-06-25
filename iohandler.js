let UnoRoom = require("./UnoRoom.js")

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