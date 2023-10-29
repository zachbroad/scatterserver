import slugify from 'slugify';
import {GameStatus} from "./util.js";
import Game from './game.js';

class Room {
  static rooms = [
    new Room('Room 1', 10),
    new Room('Room 2', 2),
    new Room('Room 3', 5)
  ];

  constructor(name, capacity, status = GameStatus.Waiting) {
    this.name = name;
    this.slug = slugify(this.name, {lower: true})
    this.capacity = capacity;
    this.status = status;
    this.players = [];
    this.chat = []; // array of messages
    this.reset();
  }

  toString() {
    return `${this.slug} - (${this.players.length} / ${this.capacity})`
  }

  // Set up fresh game
  reset() {
    this.game = new Game();
  }

  /**
   * Add client to this.players
   * Checks whether player is in room or not
   * @param client
   * @returns {[boolean, string]} returns true when successfully added, false when error
   */
  addPlayer(client) {
    if (this.players.includes(client)) {
      console.error(`${client} is already in room ${this.slug}`);
      return [false, 'Client is already in room'];
    }

    // Join the socket chan
    client.socket.join(this.slug);

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
  removePlayer(client) {
    if (!this.players.includes(client)) {
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

  setNextCard() {

  }

  /**
   * Sends updated data to all connected clients
   */
  updateRoom(io) {
    io.to(this.slug).emit('room:data', this);
  }

  requestAnswers(io) {
    io.to(this.slug).emit('room:requestAnswers');
  }


}

export default Room;
