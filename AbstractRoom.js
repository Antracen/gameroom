class AbstractRoom {
    constructor() {
        this.guests = new Map();
        this.sockets = new Set();
    }

    addPlayer(guestKey, guestValue, socket) {
        if(this.guests.has(guestKey)) {
            return false;
        }
        else {
            this.guests.set(guestKey, guestValue);
            this.sockets.add(socket);
        }

        if(this.guests.size == 1) {
            guestValue.handleBeingFirstIntoTheRoom();
        }
        else {
            guestValue.handleEnteringExistingRoom();
        }

        return true;
    }

    leaveRoom(guestKey, socket) {
        this.guests.delete(guestKey);
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

module.exports = AbstractRoom;