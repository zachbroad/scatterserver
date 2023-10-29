import Room from './room.js';

/**
 * Wrapper for client info...
 * TODO: Should this contain socket?
 */
class Client {
  static clients = [];

  constructor(socket, name = "no name", address) {
    this.socket = socket
    this.id = socket.id
    this.username = name
    this.address = address
    this.roomSlug = null;
  }

  /**
   * Adds socket to Client list
   * @param socket
   */
  static addClient(socket) {
    let client = new Client(socket, socket.handshake.query.name, socket.handshake.address);
    console.log(`Client created for ${socket.id}`)
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

  handleDisconnect() {
    console.log(`Handling ${this}'s disconnection`);
    let room = Room.getRoomBySlug(this.roomSlug);
    if (room) {
      console.log(`${this} is in room ${room}, removing...`);
      room.removePlayer(this);
    } else {
      console.log(`${this} is not in any rooms...`);
    }
  }
}

export default Client
