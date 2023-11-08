import Room from "./room.js";
import {io} from "./app.js";
import state from "./state.js";

/**
 * Wrapper for client info... contains socket and other info about the client
 * TODO: Should this contain socket?
 */
class Client {
  static clients = []; // list of all clients

  constructor(socket, name = "no name", address) {
    this.socket = socket;
    this.id = socket.id;
    this.username = name;
    this.address = address;
    this.roomSlug = null;
  }

  /**
   * Adds socket to Client list and returns Client object
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
   * @param socket - socket object
   * @returns {Client} - Client object
   */
  static getClient(socket) {
    return Client.clients.find(c => c.id === socket.id);
  }

  /**
   * JSON repr so that we dont include socket obj that causes inf recursion on stringify
   * @returns {{address: *, id: *, roomSlug: null, username: string}} - JSON repr of client
   */
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      address: this.address,
      roomSlug: null
    };
  }

  /**
   * Returns string representation of client
   * @returns {string} - string repr of client
   */
  toString() {
    return `${this.username} @ ${this.address}`;
  }

  /**
   * Send a message to the client via socket
   * @param msg - message to send
   * @param data - data to send
   */
  send(msg, data) {
    io.to(this.socket.id).emit(msg, data);
  }

  /**
   * Send a message to the client via socket
   * @param msg - message to send
   */
  message(msg) {
    console.log(`[${this.toString()}]: ${msg}`);
    io.to(this.socket.id).emit("message", msg);
  }

  /**
   * Send an error message to the client via socket
   * @param msg - message to send
   */
  error(msg) {
    console.error(`[${this.toString()}]: ${msg}`);
    io.to(this.socket.id).emit("error", msg);
  }

  /**
   * Handle client leaving room
   * @param room - the room to leave
   */
  leaveRoom(room) {
    if (room.hasClient(this)) {
      room.removeClient(this);
    } else {
      console.log(`User tried to leave room ${room} but wasn't in that room!`);
    }
  }

  /**
   * Cleanup on client disconnect (remove from rooms, etc)
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

  /**
   * Sends the client the list of rooms
   */
  sendListOfRooms() {
    // only show public rooms
    io.to(this.socket.id).emit("global:roomList", Room.getPublicRooms());
  }

  /**
   * Returns the room the client is currently i
   * @returns {Room} - the room the client is currently in
   */
  getCurrentRoom() {
    // Handle client not in room
    if (!this.roomSlug) {
      return null;
    }

    return Room.getRoomBySlug(this.roomSlug);
  }

  /**
   * Sets the client's username
   * @param username - the new username
   */
  setUsername(username) {
    console.log(`${this} changed username to ${username}`);
    this.username = username;
    this.getCurrentRoom()?.updateRoom();
  }

  /**
   * Sends the client the global message history
   */
  sendMessageHistory() {
    io.to(this.socket.id).emit("global:messageHistory", state.messages);
  }
}

export default Client;
