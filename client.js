import Room from "./room.js";
import {io} from "./app.js";

/**
 * Wrapper for client info...
 * TODO: Should this contain socket?
 */
class Client {
  static clients = [];

  constructor(socket, name = "no name", address) {
    this.socket = socket;
    this.id = socket.id;
    this.username = name;
    this.address = address;
    this.roomSlug = null;
  }

  /**
   * Adds socket to Client list
   * @param socket
   */
  static addClient(socket) {
    let client = new Client(socket, socket.handshake.query.name, socket.handshake.address);
    console.log(`Client created for ${socket.id}`);
    Client.clients = Client.clients.concat(client);
    return client;
  }

  /**
   * Returns Client object from socket
   * @param socket
   * @returns {*}
   */
  static getClient(socket) {
    return Client.clients.find(c => c.id === socket.id);
  }

  /**
   * JSON repr so that we dont include socket obj that causes inf recursion
   * @returns {{address: *, id: *, roomSlug: null, username: string}}
   */
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      address: this.address,
      roomSlug: null
    };
  }

  toString() {
    return `${this.username} @ ${this.address}`;
  }

  send(msg, data) {
    io.to(this.socket.id).emit(msg, data);
  }

  message(msg) {
    console.log(`[${this.toString()}]: ${msg}`);
    io.to(this.socket.id).emit("message", msg);
  }

  error(msg) {
    console.error(`[${this.toString()}]: ${msg}`);
    io.to(this.socket.id).emit("error", msg);
  }

  leaveRoom(room) {
    if (room.hasClient(this)) {
      room.removeClient(this);
    } else {
      console.log(`User tried to leave room ${room} but wasn't in that room!`);
    }
  }

  /**
   * Cleanup on client disconnect
   *
   * TODO: Handle dead client connection
   */
  handleDisconnect() {
    console.log(`Handling ${this}'s disconnection`);
    let room = Room.getRoomBySlug(this.roomSlug);

    if (room) {
      // Remove from room if they're in a room
      console.log(`${this} is in room ${room}, removing...`);
      room.removeClient(this);

      // Is the room now empty? If so, let's delete it.
      if (room.isEmpty()) {
        console.log(`Room ${room.slug} is empty... destroying!`);
        room.destroy();
      }

    } else {
      console.log(`${this} is not in any rooms...`);
    }
  }

  sendRooms() {
    io.to(this.socket.id).emit("global:roomList", Room.rooms);
  }
}

export default Client;
