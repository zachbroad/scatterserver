import slugify from "slugify";
import {GameStatus} from "./util.js";
import Game from "./game.js";
import {io} from "./app.js";
import {scoreGame} from "./gpt.js";

class Room {
  static rooms = [];

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
    return new Room(client.username, 1, client, false);
  }

  static addRoom(room) {
    if (!room) {
      console.error("Error: Room is null!");
      return;
    }

    Room.rooms = Room.rooms.concat(room);
  }

  toString() {
    return `${this.slug} - (${this.clients.length} / ${this.capacity})`;
  }

  // Set up fresh game
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
      console.log(`${this.slug} is starting...`);

      this.status = GameStatus.InProgress;
      this.updateRoom();

      // timeout for game is done
      setTimeout(() => {
        // Game is done, set status to scoring & get answers
        this.status = GameStatus.Scoring;
        this.updateRoom();
        this.requestAnswers(io);

        // TODO: Track if we get everyone's answers earlier

        // We should have answers, now let's score them
        setTimeout(async () => {
          // Start all the score calculations concurrently and wait for them to finish
          const scoreCalculations = await Promise.all(
            this.clients.map(client =>
              scoreGame(this.game.letter, this.game.currentPrompts, this.game.results[client.id].answers)
            )
          );

          // Process the results after all calculations have completed
          let highScore = 0;

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


          // for (let client of this.clients) {
          //   this.clickedOkResults[client.id] = false;
          //
          //   let scoredAnswers = await scoreGame(this.game.letter, this.game.currentPrompts, this.game.results[client.id].answers);
          //   this.game.results[client.id].results = scoredAnswers;
          //
          //   let score = this.game.results[client.id].results.reduce((a, b) => a + b, 0);
          //   this.game.results[client.id].score = score;
          //
          //   if (score > highScore) {
          //     highScore = score;
          //     this.game.winner = client;
          //   }
          // }
          //
          // for (let v in this.game.results[client]) {
          //   this.clickedOkResults[client.id] = false;
          //   this.game.results[client].results = await scoreGame(this.game.letter, this.game.currentPrompts, this.game.results[client].answers);
          //   this.game.results[client].score = this.game.results[client].results.reduce((a, b) => a + b, 0);
          //
          //   if (this.game.results[client].score > highScore) {
          //     highScore = this.game.results[client].score;
          //     this.game.winner = client;
          //   }
          // }

          // If everyone has 0, there's no winner so don't add for score
          if (this.game.winner) {
            this.scores[this.game.winner.id] += 1;
          }

          this.status = GameStatus.Results;
          this.updateRoom();

          // Send results
          io.to(this.slug).emit("room:results", this.game.results);

          // Wait for RESULTS_DURATION seconds then restart the game TODO: multiple rounds
          setTimeout(() => {
            // Set to new round
            this.status = GameStatus.Waiting;
            this.setUpNewGame();
            this.updateRoom();
          }, 1000 * Game.RESULTS_DURATION);
        }, 1000 * Game.WAIT_FOR_ANSWERS_DURATION);
      }, 1000 * Game.ROUND_DURATION);
    }, 1000 * Game.LOBBY_DURATION);

  }

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

    !(client.id in this.scores) && (this.scores[client.id] = 0); // Set score to 0 if they haven't joined room before
    if (!client.id in this.scores) {
      this.scores[client.id] = 0;
    }
    // client.score = 0; // Set the player's score to 0
    client.roomSlug = this.slug; // Set cur room slug
    client.socket.join(this.slug);// Join the socket chan

    this.clients = this.clients.concat(client);

    client.message(`You joined ${this.name}`); // send success
    this.updateRoom();

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
    this.clients = this.clients.filter(p => p.socket.id !== client.socket.id);
    console.log(`${client} removed from ${this}`);
    console.dir(this.clients);
    return [true, null];
  }

  hasClient(client) {
    return this.clients.includes(client);
  }


  /** Sends updated data to all connected clients */
  updateRoom() {
    io.to(this.slug).emit("room:data", this);
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


}

export default Room;
