import slugify from "slugify";
import {GameStatus} from "./util.js";
import Game from "./game.js";
import {io} from "./app.js";
import {scoreGame} from "./gpt.js";

class Room {
  // TODO: Add room owner
  constructor(name, capacity = 10, owner = null, isPublic = true) {
    this.name = name;
    this.slug = slugify(this.name, {lower: true});
    this.capacity = capacity;
    this.status = GameStatus.Waiting;
    this.clients = [];
    this.chat = []; // array of messages
    this.scores = {}; // clientId: score (int)
    this.clickedOkResults = {};
    this.setUpNewGame();

    this.isPublic = isPublic;
    this.currentRound = 1;
    this.owner = null; // the client that created the room
  }

  static rooms = [];

  static getPublicRooms() {
    return Room.rooms.filter(r => r.isPublic);
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

  static createSinglePlayerRoom(client) {
    const room = new Room(client.username, 1, client, false);
    room.isPublic = false;
    room.owner = client;
    room.startGame();
    return room;
  }

  static addRoom(room) {
    // Make sure room is not null
    if (!room) {
      console.error("Error: Room is null!");
      return;
    }

    // Make sure it doesn't already exist
    if (Room.getRoomBySlug(room.slug)) {
      console.error(`Room ${room.slug} already exists!`);
      return; // Cancel if already exists
    }

    Room.rooms = Room.rooms.concat(room);
  }

  toString() {
    return `${this.slug} - (${this.clients.length} / ${this.capacity})`;
  }

  // Set up fresh game with new prompts, letter, etc.
  setUpNewGame() {
    this.game = Game.generateNewGame();
    this.status = GameStatus.Waiting;
    this.updateRoom();
  }

  startGame() {
    this.status = GameStatus.Starting;
    this.updateRoom();

    console.log(`Set ${this.slug} status to Starting`);
    console.log(`${this.slug} will start in ${Game.LOBBY_DURATION} seconds.`);

    // Start game
    setTimeout(() => {
      this.handleSetInProgress();

      // timeout for game is done
      setTimeout(() => {
        this.handleRequestAnswersAndPassToGPT();

        setTimeout(async () => {
          // only score if we haven't already
          if (!this.game.hasBeenScored) {
            this.handleScoring();
          }
        }, 1000 * Game.WAIT_FOR_ANSWERS_DURATION);
      }, 1000 * Game.ROUND_DURATION);
    }, 1000 * Game.LOBBY_DURATION);
  }

  handleSetInProgress() {
    console.log(`${this.slug} is starting...`);

    this.status = GameStatus.InProgress;
    this.updateRoom();
  }

  handleRequestAnswersAndPassToGPT() {
    console.log(`${this.slug} is requesting answers...`);

    this.status = GameStatus.Scoring;
    this.updateRoom();
    this.requestAnswers(io);
  }

  async handleScoring() {
    console.log(`${this.slug} is scoring...`);

    this.game.hasBeenScored = true;

    // Start all the score calculations concurrently and wait for them to finish
    const scoreCalculations = await Promise.all(this.clients.map(client => scoreGame(this.game.letter, this.game.currentPrompts, this.game.results[client.id].answers)));

    // Process the results after all calculations have completed
    let highScore = 0;

    // Loop through each client's answers
    scoreCalculations.forEach((scoredAnswers, index) => {
      const client = this.clients[index];
      const score = scoredAnswers.reduce((a, b) => a + b, 0);

      this.clickedOkResults[client.id] = false;
      this.game.results[client.id].results = scoredAnswers;
      this.game.results[client.id].score = score;

      if (score > highScore) {
        highScore = score;
        this.game.winner = client;
      }
    });

    // If everyone has 0, there's no winner so don't add for score
    if (this.game.winner) {
      this.scores[this.game.winner.id] += 1;
    }

    // Set room status to results
    this.status = GameStatus.Results;
    this.updateRoom();

    // Send results
    io.to(this.slug).emit("room:results", this.game.results);

    // Show the results for a bit before returning to the lobby
    setTimeout(() => {
      // Set to new round
      this.status = GameStatus.Waiting;
      this.setUpNewGame();
      this.updateRoom();
    }, 1000 * Game.RESULTS_DURATION);
  }

  // waitforanswers() {
  //   this.status = GameStatus.Waiting;
  //   this.updateRoom();
  //   this.requestAnswers(io);
  // }


  /**
   * Add client to this.players
   * Checks whether player is in room or not
   * @param client
   * @returns {[boolean, string]} returns true when successfully added, false when error
   */
  addClient(client) {
    // Don't let clients join twice
    if (this.hasClient(client)) {
      client.error("You're already in that room!");
      return [false, "Client is already in room"];
    }

    // Make sure the room isn't full
    if (this.isFull()) {
      client.error("That room is full!");
      return [false, "That room is full!"];
    }

    !(client.id in this.scores) && (this.scores[client.id] = 0); // Set score to 0 if they haven't joined room before
    if (!client.id in this.scores) {
      this.scores[client.id] = 0;
    }
    // client.score = 0; // Set the player's score to 0
    client.roomSlug = this.slug; // Set cur room slug
    client.socket.join(this.slug);// Join the socket chan

    this.clients = this.clients.concat(client); // Add player to room
    client.message(`You joined ${this.name}`); // send success message to client

    // send join message to all clients
    this.sendToAllClients("room:join", client);
    this.updateRoom();

    return [true, null];
  }

  /**
   * Removes client from this.players
   * @param client
   * @returns {[boolean, string]} returns true if player was removed, false if not
   */
  removeClient(client) {
    // Make sure the player is in the room
    if (!this.hasClient(client)) {
      let errorMessage = `${client} is not in room ${this.slug}`;
      console.error(errorMessage);
      return [false, errorMessage];
    }

    // remove player by id
    this.clients = this.clients.filter(p => p.socket.id !== client.socket.id);
    console.log(`${client} removed from ${this}`);
    console.dir(this.clients);


    // If the room is empty, delete it
    if (this.isEmpty()) {
      console.log(`${this} is empty, deleting...`);
      this.destroy();
      return [true, null];
    }

    // if the owner left, set a new owner
    if (this.owner === client) {
      this.setOwner(this.clients[0]); // set the new owner to the first client in the room
      this.clients[0].message(`You are now the owner of ${this.name}.`); // let the new owner know they're the owner
    }

    // send leave message to all clients
    this.sendToAllClients("alert", `${client.username} left the room.`);

    return [true, null];
  }

  hasClient(client) {
    return this.clients.includes(client);
  }

  /** Sends updated data to all connected clients */
  updateRoom() {
    io.to(this.slug).emit("room:data", this);
  }

  /**
   * Sends a message to all clients in the room
   * @param msg - the message to send
   * @param data - the data to send
   */
  sendToAllClients(msg, data) {
    io.to(this.slug).emit(msg, data);
  }

  /**
   * alert to all clients
   * @param msg - the message to send
   */
  alertToAllClients(msg) {
    io.to(this.slug).emit("room:alert", msg);
  }

  /** Removes all players from the room and deletes from Room.rooms */
  destroy() {
    // TODO: Remove all players
    Room.rooms = Room.rooms.filter(room => room !== this);
  }

  /** Request answers from all clients connected to this room */
  requestAnswers(io) {
    io.to(this.slug).emit("room:requestAnswers");
  }

  /**
   * Checks whether all players are ready to go to the lobby
   * @returns {boolean} - true if everyone is ready to go to the lobby, false otherwise
   */
  isEveryoneReadyToGoToLobby() {
    return Object.values(this.clickedOkResults).every(val => val === true);
  }

  /**
   * Checks whether the room is empty or not
   * @returns {boolean} whether or not there are any players in the room
   */
  isEmpty() {
    return this.clients.length <= 0;
  }

  /**
   * Checks whether the room is full or not
   * @returns {boolean} whether or not the room is full
   */
  isFull() {
    return this.clients.length >= this.capacity;
  }

  /**
   * Returns true if everyone has submitted answers
   * @returns {boolean} - true if everyone has submitted answers, false otherwise
   */
  hasEveryoneSubmittedAnswers() {
    return Object.keys(this.game.results).length === this.clients.length;
  }

  /**
   * setOwner - sets the owner of the room
   */
  setOwner(client) {
    this.alertToAllClients(`${client.username} is now the owner of the room.`);
    this.owner = client;
  }

}

export default Room;
