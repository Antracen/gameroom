let AbstractRoom = require("./AbstractRoom.js");

class UnoCard {
    constructor(color, number) {
        this.color = color;
        this.number = number;
    }
}

class UnoCardRandomizer {
    constructor() {
        this.colors = ["red", "green", "blue", "gold"];

        this.numbers = [];
        let numberset1 = [0,"+4","colorChoice","dirSwap"];
        let numberset2 = [1,2,3,4,5,6,7,8,9,"stop","+2"];
        for(let number of numberset1) {
            this.numbers.push(number);
        }
        for(let number of numberset2) {
            this.numbers.push(number);
            this.numbers.push(number);
        }
    }

    randomUnoCard() {
        let randNum = Math.floor(Math.random() * this.numbers.length);
        let randCol = Math.floor(Math.random() * this.colors.length);
        return new UnoCard(this.colors[randCol], this.numbers[randNum]);
    }

    randomUnoNumberCard() {
        let randNum = Math.floor(Math.random() * 10);
        let randCol = Math.floor(Math.random() * this.colors.length);
        return new UnoCard(this.colors[randCol], randNum);
    }
}

let unoCardRandomizer = new UnoCardRandomizer();

class UnoHand {
    constructor(numCards) {
        console.log("MAKING NEW UNO HAND");
        this.cards = [];

        for(let i = 0; i < numCards; i++) this.cards.push(unoCardRandomizer.randomUnoCard());
    }
}

class UnoPlayer {
    constructor(params, room, socket) {
        this.name = params.userName;
        this.room = room;
        this.socket = socket;

        this.hand = new UnoHand(15);
        this.playerToTheRight = null;
        this.playerToTheLeft = null;
        this.isMyTurn = false;
    }

    handleBeingFirstIntoTheRoom() {
    }

    handleEnteringExistingRoom() {
        this.room.givePlayerSpotInTable(this);
        this.isMyTurn = true;
        this.room.whosTurn = this;
        this.room.pendingWhosTurn = this;
    }
}

class UnoRoom extends AbstractRoom {
    constructor(io) {
        super();
        this.io = io;
        this.pile = [unoCardRandomizer.randomUnoNumberCard()];

        this.waitingForMultipleCards = false;
        this.whosTurn = null;
        this.pendingWhosTurn = null; // Whos turn it will be after endTurn()
    }

    addPlayer(params, socket) {
        let player = new UnoPlayer(params, this, socket);

        if(!super.addPlayer(player.name, player, socket)) return false;

        this.addSocketCallbacks(socket, player);

        socket.emit("playerInfo", this.playerInfo(player));
        this.sendToAll("roomInfo", this.roomInfo());

        return true;
    }

    addSocketCallbacks(socket, player) {
        socket.on("placeCard", (msg) => {
            if(player.isMyTurn) {
                let myCards = player.hand.cards;
                
                let cardToPlace = myCards[msg];

                if(!this.canPlaceOnPile(player, cardToPlace)) return;

                this.pile.push(myCards[msg]);
                myCards = myCards.splice(msg, 1);

                this.handlePlacedCard(player, cardToPlace);
                this.waitingForMultipleCards = true;
            }
            
            this.sendToAll("roomInfo", this.roomInfo())
            socket.emit("playerInfo", this.playerInfo(player));
        });

        socket.on("pickupCard", (msg) => {
            if(player.isMyTurn) {
                player.hand.cards.push(unoCardRandomizer.randomUnoCard());
                socket.emit("playerInfo", this.playerInfo(player));
                this.sendToAll("roomInfo", this.roomInfo());
            }
        });

        socket.on("endTurn", (msg) => {
            player.isMyTurn = false;
            this.whosTurn = this.pendingWhosTurn;
            this.whosTurn.isMyTurn = true;
            this.waitingForMultipleCards = false;
            socket.emit("playerInfo", this.playerInfo(player));
            this.sendToAll("roomInfo", this.roomInfo());
        });
    }

    handlePlacedCard(player, cardPlaced) {
        if(cardPlaced.number == "stop") {
            this.handlePlacedStopCard();
        }
        else if(cardPlaced.number == "dirSwap") {
            this.handlePlacedDirSwapCard();
        }
        else if(cardPlaced.number == "+2") {
            this.handlePlacedPickupCard(player, 2);
        }
        else if(cardPlaced.number == "+4") {
            this.handlePlacedPickupCard(player, 4);
        }
        else {
            this.handlePlacedNumberCard();
        }
    }

    handlePlacedStopCard() {
        this.pendingWhosTurn = this.whosTurn.playerToTheRight.playerToTheRight;
    }

    handlePlacedDirSwapCard() {
        if(this.guests.size == 2) {
            this.handlePlacedStopCard();
            return;
        }

        for(let [_, guest] of this.guests) {
            let left = guest.playerToTheLeft;
            guest.playerToTheLeft = guest.playerToTheRight;
            guest.playerToTheRight = left;
        }
        this.pendingWhosTurn = this.whosTurn.playerToTheRight;
    }

    handlePlacedPickupCard(player, num) {
        for(let i = 0; i < num; i++) {
            player.playerToTheRight.hand.cards.push(unoCardRandomizer.randomUnoCard());
        }
        this.pendingWhosTurn = this.whosTurn.playerToTheRight;
        player.playerToTheRight.socket.emit("playerInfo", this.playerInfo(player.playerToTheRight));
    }

    handlePlacedNumberCard() {
        this.pendingWhosTurn = this.whosTurn.playerToTheRight;
    }

    canPlaceOnPile(player, cardToPlace) {
        let topCard = this.pile[this.pile.length - 1];

        console.log("Check if we can place ", cardToPlace, " on top of ", topCard);

        if(cardToPlace.number == "+4" || cardToPlace.number == "colorChoice") {
            if(topCard.number == cardToPlace.number) return true;

            if(this.waitingForMultipleCards) return false;
        }

        if(topCard.number == "+4") {
            if(this.waitingForMultipleCards) {
                // Self place must be a +4
                return cardToPlace.number == topCard.number;
            }
            else {
                // TODO: Color should match previously chosen color
                return true;
            }
        }
        else if(topCard.number == "colorChoice") {
            if(this.waitingForMultipleCards) {
                // Can't self place on top of colorChoice
                return false;
            }
            else {
                // TODO: Color should match previously chosen color
                return true;
            }
        }
        else if(topCard.number == "+2") {
            if(this.waitingForMultipleCards) {
                // Self place must be a +2
                return cardToPlace.number == topCard.number;
            }
            else {
                return cardToPlace.color == topCard.color || cardToPlace.number == topCard.number;
            }
        }
        else if(topCard.number == "stop" || topCard.number == "dirSwap") {
            if(this.waitingForMultipleCards) {
                // Self place can only keep placing cards if we are pending
                if(this.pendingWhosTurn == player) {
                    return cardToPlace.color == topCard.color;
                }
                else {
                    return cardToPlace.number == topCard.number;
                }
            }
            else {
                return cardToPlace.color == topCard.color || cardToPlace.number == topCard.number;
            }
        }
        else {
            if(this.waitingForMultipleCards) {
                return cardToPlace.number == topCard.number;   
            }
            else {
                return cardToPlace.number == topCard.number || cardToPlace.color == topCard.color;
            }
        }
    }

    roomInfo() {
        let guestInfos = {};

        for(let [_, guest] of this.guests) {
            let guestInfo = {
                "numCards": guest.hand.cards.length
            };
            guestInfos[guest.name] = guestInfo;
        }

        return {
            "guestInfos": guestInfos,
            "pile": this.pile,
            "whosTurn": (this.whosTurn == null) ? "noone" : this.whosTurn.name
        };
    }

    /*
        Find a player who is not yourself.
        Have a seat to the left of him
            He is now to your right (and vice versa)
            The person who was to the left of him is now to the left of you (and vice versa)
    */
    givePlayerSpotInTable(player) {
        for(let [_, existingPlayer] of this.guests) {
            if(existingPlayer != player) {
                console.log(player.name, " has ", existingPlayer.name, " to the right");
                player.playerToTheRight = existingPlayer;
                if(existingPlayer.playerToTheLeft != null) {
                    console.log(player.name, " has ", existingPlayer.playerToTheLeft.name, " to the left");
                    player.playerToTheLeft = existingPlayer.playerToTheLeft;
                    console.log(existingPlayer.playerToTheLeft.name, " has ", player.name, " to the right");
                    existingPlayer.playerToTheLeft.playerToTheRight = player;
                    console.log(existingPlayer.name, " has ", player.name, " to the left");
                    existingPlayer.playerToTheLeft = player;
                }
                else {
                    console.log(player.name, " has ", existingPlayer.name, " to the left");
                    player.playerToTheLeft = existingPlayer;
                    console.log(existingPlayer.name, " has ", player.name, " to the left");
                    console.log(existingPlayer.name, " has ", player.name, " to the right");
                    existingPlayer.playerToTheLeft = player;
                    existingPlayer.playerToTheRight = player;
                }

                break;
            }
        }

        for(let [_, guest] of this.guests) {
            console.log(guest.name, " has ", guest.playerToTheLeft.name, " to the left and ", guest.playerToTheRight.name, " to the right");
        }
    }

    playerInfo(player) {
        return {
            "hand": player.hand
        };
    }

    leaveRoom(params, socket){
        super.leaveRoom(params.userName, socket);
        this.sendToAll("roomInfo", this.roomInfo());
    }
}

module.exports = UnoRoom;