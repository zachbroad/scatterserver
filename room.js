import slugify from 'slugify';
import {GameStatus} from "./util.js";
import Game from './game.js';

class Room {
  static rooms = [];

  constructor(name, capacity=10, owner=null) {
    this.name = name;
    this.slug = slugify(this.name, {lower: true})
    this.capacity = capacity;
    this.status = GameStatus.Waiting;
    this.players = [];
    this.chat = []; // array of messages
    this.scores = {} // clientId: score (int)
    this.clickedOkResults = {}
    this.reset();
    this.currentRound = 1;
    this.owner = null; // the client that created the room
  }

  toString() {
    return `${this.slug} - (${this.players.length} / ${this.capacity})`
  }

  // Set up fresh game
  reset() {
    this.game = Game.generateNewGame();
  }

  /**
   * Add client to this.players
   * Checks whether player is in room or not
   * @param client
   * @returns {[boolean, string]} returns true when successfully added, false when error
   */
  addClient(client) {
    if (this.hasClient(client)) {
      console.error(`${client} is already in room ${this.slug}`);
      return [false, 'Client is already in room'];
    }

    // Join the socket chan
    client.socket.join(this.slug);

    // Set score to 0 if they haven't joined room before
    !(client.id in this.scores) && (this.scores[client.id] = 0);

    // Set cur room slug
    client.roomSlug = this.slug;
    this.players = this.players.concat(client);

    // Send update to all players connected to room
    return [true, null];
  }

  /**
   * Removes client from this.players
   * @param client
   * @returns {[boolean, string]} returns true if player was removed, false if not
   */
  removeClient(client) {
    if (!this.hasClient(client)) {
      let errorMessage = `${client} is not in room ${this.slug}`;
      console.error(errorMessage);
      return [false, errorMessage];
    }

    // remove player by id
    this.players = this.players.filter(p => p.socket.id !== client.socket.id);
    console.log(`${client} removed from ${this}`);
    console.dir(this.players);
    return [true, null];
  }

  hasClient(client) {
    return this.players.includes(client);
  }

  /**
   * Gets Room by id
   * @param slug
   * @returns {Room}
   */
  static getRoomBySlug(slug) {
    return Room.rooms.find(r => r.slug === slug);
  }

  /**
   * Removes Room by room id
   * @param slug
   */
  static deleteRoomBySlug(slug) {
    Room.rooms = Room.rooms.filter(r => r.slug !== slug);
  }

  /**
   * Sends updated data to all connected clients
   */
  updateRoom(io) {
    io.to(this.slug).emit('room:data', this);
  }

  /**
   * Request answers from all clients connected to this room
   */
  requestAnswers(io) {
    io.to(this.slug).emit('room:requestAnswers');
  }

  /**
   * Checks whether the room is empty or not
   * @returns {boolean} whether or not there are any players in the room
   */
  isEmpty() {
    return this.players.length <= 0;
  }

  /**
   * Removes all players from the room and deletes from Room.rooms
   */
  destroy() {
    // TODO: Remove all players
    Room.rooms = Room.rooms.filter(room => room !== this);
  }


}

export default Room;
