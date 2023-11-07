import Room from "./room.js";
import {GameStatus} from "./util.js";
import Game from "./game.js";
import {scoreGame} from "./gpt.js";

export const registerRoomHandlers = (io, socket, client) => {
  /**
   * Handle user requesting to join room
   */
  const handleJoin = (roomSlug) => {
    let room = Room.getRoomBySlug(roomSlug);
    console.log(`${client} wants to join ${room}`);

    if (!room) {
      client.error("You tried to join a room that does not exist!");
    }

    let [joined, message] = room.addClient(client, socket);
  };


  const handleCreate = (slug) => {
    // TODO: ADD ERR HANDLING
    // Create the room
    if (!slug || slug.trim() === "") {
      io.to(socket.id).emit("error", `You must provide a name for the room!`);
      return;
    }


    // Make sure it doesn't already exist
    if (Room.getRoomBySlug(slug)) {
      client.error(`Room ${slug} already exists!`);
      return; // Cancel if already exists
    }

    let room = new Room(slug);
    if (room) {
      console.log(`Room ${slug} created by ${client}`);
    } else {
      client.error(`Error creating room ${slug}!`);
      return;
    }
    // Add to room list
    Room.rooms = Room.rooms.concat(room);

    // Make the user joined the room
    let [joined, message] = room.addClient(client, socket);

    if (joined) {// join the room by slug
      socket.join(room.slug);

      // send success
      console.log(`${client} joined ${room}.`);
      client.send("room:data", room);
      client.message("Room created.");
    } else {// Failed to join room, send error msg
      console.log(`${client} failed to join ${room} - ${message}.`);
      io.to(socket.id).emit("error", "Room created but not joined.");
    }
  };

  /**
   * Handle user wanting to create a room
   */
  const handleMessage = (messageData) => {
    // Log msg
    console.log(`Got message from ${client}.`);
    console.dir(messageData);

    // TODO FIX THIS DONE USE DEFAULT FIND BETTER WAY TO SEND MSG
    let fmtMsg = `${client.username}: ${messageData.message}`;

    let roomSlug = messageData.room;
    const room = Room.getRoomBySlug(roomSlug);

    if (!room) {
      console.error(`Room '${roomSlug}' not found!`);
    }

    // Store msg in state
    room.chat = room.chat.concat(fmtMsg);

    // Send msg out to everyone connected
    io.sockets.in(roomSlug).emit("room:message", fmtMsg);
  };


  /**
   * User wants to start the game... handles all game logic
   */
  const handleStartGame = data => {
    const {slug} = data;
    const room = Room.getRoomBySlug(slug);
    console.log(`${client.username} requested to start ${slug}`);

    if (!room) {
      console.error(`Tried to start game for room ${slug} but couldn't find room!`);
      return;
    }

    room.startGame();
  };

  // TODO:: rename this isnt good descr.
  const sendUserDataOnReq = (room) => {
    room.updateRoom(io);
  };


  // Data expected is an array of strings
  const handleProvideAnswers = (data) => {
    const {slug, answers} = data;
    const room = Room.getRoomBySlug(slug);
    console.log("got answers");
    console.dir(client.id);
    console.dir(data);
    room.game.results[client.id] = {};
    room.game.results[client.id].answers = answers;
    room.game.results[client.id].results = [];
  };

  const handleLeaveRoom = (data) => {
    const {room: roomData} = data;
    const room = Room.getRoomBySlug(roomData.slug);

    if (!room) {
      console.error(`${client} tried to leave room ${roomData.slug} but it doesn't exist!`);
      return;
    }

    console.log(`${client} wants to leave room ${room.slug}`);

    client.leaveRoom(Room.getRoomBySlug(room.slug));
    client.socket.leave(room.slug);

    room.updateRoom();
  };


  const handleVoteGoToLobby = (data) => {
    const {room: roomData} = data;
    const room = Room.getRoomBySlug(roomData.slug);
    console.log(`${client} in ${room.slug} wants to go to lobby.`);

    if (!room) {
      console.error(`${client} tried to go to lobby on room ${roomData.slug} but it doesn't exist anymore!`);
      return;
    }

    room.clickedOkResults[client.id] = true;
    room.updateRoom();

    if (room.isEveryoneReadyToGoToLobby()) {
      room.setUpNewGame();
    }
  };


  const handleSinglePlayer = () => {
    console.log(`${client} wants to start a single player game.`);
    const room = Room.createSinglePlayerRoom(client);
    Room.addRoom(room);

    // TODO: DRY this
    let [joined, message] = room.addClient(client, socket);

    if (joined) {
      // join the room by slug
      socket.join(room.slug);

      // send success
      console.log(`${client} joined ${room}.`);
      client.send("room:data", room);
      client.message("Room created.");
    } else {
      // Failed to join room, send error msg
      console.log(`${client} failed to join ${room} - ${message}.`);
      io.to(socket.id).emit("error", "Room created but not joined.");
    }

  };


  const handleJoinRandomRoom = () => {
    if (Room.rooms.length === 0) {
      io.to(socket.id).emit("error", `There are no rooms to join!`);
      return;
    }
    const room = Room.rooms[Math.floor(Math.random() * Room.rooms.length)];

    let [joined, message] = room.addClient(client, socket);

    if (joined) {
      // join the room by slug
      socket.join(room.slug);

      // send success
      console.log(`${client} joined ${room}.`);
      io.to(socket.id).emit("room:data", room);
      io.to(socket.id).emit("message", "Room created.");
    } else {
      // Failed to join room, send error msg
      console.log(`${client} failed to join ${room} - ${message}.`);
      io.to(socket.id).emit("error", "Room created but not joined.");
    }
  };

  socket.on("room:create", handleCreate); // client wants to create a new room
  socket.on("room:data", sendUserDataOnReq); // client is requesting updated room info
  socket.on("room:join", handleJoin); // client is requesting to join room
  socket.on("room:message", handleMessage); // client is sending message to room
  socket.on("room:startGame", handleStartGame); // client wants to start game
  socket.on("room:provideAnswers", handleProvideAnswers); // client is giving us their answers
  socket.on("room:leave", handleLeaveRoom); // client is leaving room
  socket.on("room:voteGoToLobby", handleVoteGoToLobby); // client is voting to return to lobby @ results screen
  socket.on("room:singlePlayer", handleSinglePlayer); // start single player room
  socket.on("room:joinRandomRoom", handleJoinRandomRoom);
};

export default registerRoomHandlers;
