import Room from './room.js';
import {GameStatus} from './util.js';
import Game from './game.js';
import {scoreGame} from "./gpt.js";

export const registerRoomHandlers = (io, socket, client) => {
  /**
   * Handle user requesting to join room
   */
  const handleJoin = (roomSlug) => {
    let room = Room.getRoomBySlug(roomSlug)
    console.log(`${client} wants to join ${room}`)

    if (!room) {
      console.error(`${client} tried to join room that doesn't exist.`)
      io.to(socket.id).emit('error', 'Room does not exist.')
    }

    let [joined, message] = room.addClient(client);

    if (joined) {
      // join the room by slug
      socket.join(room.slug);

      // Set the player's score to 0
      client.score = 0;

      // Send update to whole room
      room.updateRoom(io);

      // send success
      console.log(`${client} joined ${room}.`)
      io.to(socket.id).emit('room:data', room)
    } else {
      console.log(`${client} failed to join ${room} - ${message}.`)
      io.to(socket.id).emit('error', 'Room not joined.')
    }
  };



  const handleCreate = (slug) => {
    // TODO: ADD ERR HANDLING
    // Create the room
    if (!slug || slug.trim() === "") {
      io.to(socket.id).emit('error', `You must provide a name for the room!`);
      return;
    }


    // Make sure it doesn't already exist
    if (Room.getRoomBySlug(slug)) {
      console.log(`Room ${slug} already exists!`);
      io.to(socket.id).emit('error', `Room ${slug} already exists!`)
      return; // Cancel if already exists
    }

    let room = new Room(slug);
    if (room) {
      console.log(`Room ${slug} created by ${client}`);
    } else {
      io.to(socket.id).emit('error', `Error creating room ${slug}!`);
      console.log(`Error creating room ${slug}`);
      return;
    }
    // Add to room list
    Room.rooms = Room.rooms.concat(room);

    // Make the user joined the room
    let [joined, message] = room.addClient(client);

    if (joined) {
      // join the room by slug
      socket.join(room.slug);

      // send success
      console.log(`${client} joined ${room}.`)
      io.to(socket.id).emit('room:data', room)
      io.to(socket.id).emit('message', "Room created.")
    } else {
      // Failed to join room, send error msg
      console.log(`${client} failed to join ${room} - ${message}.`)
      io.to(socket.id).emit('error', 'Room created but not joined.')
    }
  };

  /**
   * Handle user wanting to create a room
   */
  const handleMessage = (messageData) => {
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
  const handleStartGame = data => {
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

        // We should have answers, now let's score them
        setTimeout(async () => {

          // Use GPT to score them


          let highScore = 0;
          for (let v in room.game.results[client]) {
            room.clickedOkResults[client.id] = false;
            room.game.results[client].results = await scoreGame(room.game.letter, room.game.currentPrompts, room.game.results[client].answers);
            room.game.results[client].score = room.game.results[client].results.reduce((a, b) => a + b, 0);

            if (room.game.results[client].score > highScore) {
              highScore = room.game.results[client].score;
              room.game.winner = client;
            }
          }

          // If everyone has 0, there's no winner so don't add for score
          if (room.game.winner) {
            room.scores[room.game.winner] += 1;
          }


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
          }, 1000 * Game.RESULTS_DURATION);
        }, 1000 * Game.WAIT_FOR_ANSWERS_DURATION);
      }, 1000 * Game.ROUND_DURATION);
    }, 1000 * Game.LOBBY_DURATION);
  };

  // TODO:: rename this isnt good descr.
  const sendUserDataOnReq = (room) => {
    room.updateRoom(io);
  };


  // Data expected is an array of strings
  const handleProvideAnswers = (data) => {
    const {slug, answers} = data;
    const room = Room.getRoomBySlug(slug);
    room.game.results[client] = {};
    room.game.results[client].answers = answers;
    room.game.results[client].results = [];
  };

  const handleLeaveRoom = (data) => {
    const {room: roomData} = data;
    const room = Room.getRoomBySlug(roomData.slug);
    if (!room) {
      console.error(`${client} tried to leave room ${roomData.slug} but it doesn't exist!`)
      return;
    }

    console.log(`${client} wants to leave room ${room.slug}`)
    client.leaveRoom(Room.getRoomBySlug(room.slug));
  };


  const handleVoteGoToLobby = (data) => {
    const {room: roomData} = data;
    const room = Room.getRoomBySlug(roomData.slug);

    if (!room) {
      console.error(`${client} tried to go to lobby on room ${roomData.slug} but it doesn't exist anymore!`)
      return;
    }


    room.clickedOkResults[client.id] = true;

  };


  const handleSinglePlayer = () => {

  };

  socket.on('room:create', handleCreate); // client wants to create a new room
  socket.on('room:data', sendUserDataOnReq); // client is requesting updated room info
  socket.on('room:join', handleJoin); // client is requesting to join room
  socket.on('room:message', handleMessage); // client is sending message to room
  socket.on('room:startGame', handleStartGame); // client wants to start game
  socket.on('room:provideAnswers', handleProvideAnswers); // get answers from client
  socket.on('room:leaveRoom', handleLeaveRoom); // get answers from client
  socket.on('room:voteGoToLobby', handleVoteGoToLobby); // get answers from client
  socket.on('room:singlePlayer', handleSinglePlayer); // get answers from client
};

export default registerRoomHandlers;
