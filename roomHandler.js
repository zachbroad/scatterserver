const Room = require("./room");
const Client = require('./client');
const {GameStatus} = require("./util");
const Game = require('./game');

module.exports = (io, socket, client) => {
  /**
   * Handle user requesting to join room
   */
  const join = (roomSlug) => {
    let room = Room.getRoomBySlug(roomSlug)
    console.log(`${client} wants to join ${room}`)

    if (!room) {
      console.error(`${client} tried to join room that doesn't exist.`)
      io.to(socket.id).emit('error', 'Room does not exist.')
    }

    let [joined, message] = room.addPlayer(client);

    if (joined) {
      // join the room by slug
      socket.join(room.slug);

      room.updateRoom(io);

      // send success
      console.log(`${client} joined ${room}.`)
      io.to(socket.id).emit('room:data', room)
    } else {
      console.log(`${client} failed to join ${room} - ${message}.`)
      io.to(socket.id).emit('error', 'Room not joined.')
    }
  }


  const create = (data) => {
    // TODO: ADD ERR HANDLING
    const {name, capacity} = data;

    // Create the room
    let room = new Room(name, capacity);
    Room.rooms = Room.rooms.concat(room);

    // Make the user joined the room
    let [joined, message] = room.addPlayer(client);

    if (joined) {
      // join the room by slug
      socket.join(room.slug);

      // send success
      console.log(`${client} joined ${room}.`)
      io.to(socket.id).emit('room_joined', room)
      io.to(socket.id).emit('message', "Room created.")
    } else {
      // Failed to join room, send error msg
      console.log(`${client} failed to join ${room} - ${message}.`)
      io.to(socket.id).emit('error', 'Room not joined.')
    }
  };
  /**
   * Handle user wanting to create a room
   */

  const message = (messageData) => {
    // Log msg
    console.log('Got message.');
    console.dir(messageData);
    // TODO FIX THIS DONE USE DEFAULT FIND BETTER WAY TO SEND MSG

    let fmtMsg = `${client.username}: ${messageData.message}`;
    // Store msg in state
    Room.getRoomBySlug(messageData.room).chat = Room.getRoomBySlug(messageData.room).chat.concat(fmtMsg)

    // Send msg out to everyone connected
    io.sockets.in(messageData.room).emit('room:message', fmtMsg);
  };


  /**
   * User wants to start the game... handles all game logic
   */
  const startGame = data => {
    const {slug} = data;
    console.log(`${client.username} requested to start ${slug}`)

    const room = Room.getRoomBySlug(slug);
    if (!room) {
      console.error(`Tried to start game for room ${slug} but couldn't find room!`)
      return;
    }

    console.log(`Set ${slug} status to Starting`);
    room.status = GameStatus.Starting;
    room.updateRoom(io);

    console.log(`${slug} will start in ${Game.LOBBY_DURATION} seconds.`);

    setTimeout(() => {
      // Start game
      console.log(`${slug} is starting...`);
      room.status = GameStatus.InProgress;
      room.updateRoom(io);

      // timeout for game is done
      setTimeout(() => {
        // Game is done, set status to scoring & get answers
        room.status = GameStatus.Scoring;
        room.updateRoom(io);

        // Score for 3 seconds to get answers
        room.requestAnswers(io);

        // Show results after these 3 seconds
        setTimeout(() => {
          room.status = GameStatus.Results;
          room.updateRoom(io);

          // Send results
          io.to(room.slug).emit('room:results', room.game.results);

          // Wait for 3000ms then restart the game TODO: multiple rounds
          setTimeout(() => {
            // Set to new round
            room.status = GameStatus.Waiting;
            room.reset();
            room.updateRoom(io);
          }, 1000 * Game.RESULT_DURATION);
        }, 1000 * Game.WAIT_FOR_ANSWERS_DURATION);
      }, 1000 * Game.ROUND_DURATION);
    }, 1000 * Game.LOBBY_DURATION);
  };

  // TODO:: rename this isnt good descr.
  const sendUserDataOnReq = (room) => {
    room.updateRoom(io);
  };


  const submitEntries = (data) => {
  };


  // Data expected is an array of strings
  const recvAnswers = (data) => {
    /*

    client: {
      answers
    }

    or
    {
      client,
      answers
    }
     */

    // client
    //

    const {slug, results} = data;
    const room = Room.getRoomBySlug(slug);
    room.game.results[client] = data;
  };


  socket.on('room:create', create);
  socket.on('room:data', sendUserDataOnReq);
  socket.on('room:join', join);
  socket.on('room:message', message);
  socket.on('room:startGame', startGame);
  socket.on('room:submitEntries', submitEntries);
  socket.on('room:provideAnswers', recvAnswers);

}