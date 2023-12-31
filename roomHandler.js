import Room from "./room.js";

export const registerRoomHandlers = (io, socket, client) => {
  /** Handle user requesting to join room */
  const handleJoin = (roomSlug) => {
    let room = Room.getRoomBySlug(roomSlug);
    console.log(`${client} wants to join ${room}`);

    if (!room) {
      client.error("You tried to join a room that does not exist!");
    }

    let [joined, message] = room.addClient(client);

    // if joined, send join message to all clients in room
    if (joined) {
      // join the room by slug
      socket.join(room.slug);

      // send success
      console.log(`${client} joined ${room}.`);
      client.send("room:data", room);
      client.message(`You joined ${room.name}.`);
    } else {
      // Failed to join room, send error msg
      console.log(`${client} failed to join ${room} - ${message}.`);
      client.error(message);
    }
  };


  /**
   * Handle user wanting to create a room
   * @param slug - the name of the room
   */
  const handleCreateRoom = (slug) => {
    // TODO: ADD ERR HANDLING

    // Make sure they provided a name
    if (!slug || slug.trim() === "") {
      io.to(socket.id).emit("error", `You must provide a name for the room!`);
      return;
    }

    // Make sure it doesn't already exist
    if (Room.getRoomBySlug(slug)) {
      client.error(`Room ${slug} already exists!`);
      return; // Cancel if already exists
    }

    // Create room
    let room = new Room(slug);
    if (!room) {
      client.error(`Error creating room ${slug}!`);
      return;
    }

    room.setOwner(client);
    client.message(`Room ${slug} created!`);
    Room.rooms = Room.rooms.concat(room); // Add to room list

    // Make the user joined the room
    let [joined, message] = room.addClient(client);

    if (joined) {// join the room by slug
      // join the room by slug
      socket.join(room.slug);

      // send success msg to client
      console.log(`${client} joined ${room}.`);
      client.send("room:data", room);
    } else {// Failed to join room, send error msg
      console.log(`${client} failed to join ${room} - ${message}.`);
      client.error("Room created but not joined.");
    }
  };

  /**
   * Handles a message from a client in a room
   * @param messageData - the message data from the client
   */
  const handleChatMessageFromClient = (messageData) => {
    // Log msg
    console.log(`Got message from ${client}.`);
    console.dir(messageData);

    // make an object with the message data
    let message = {
      username: client.username,
      message: messageData.message,
      timestamp: new Date().toLocaleTimeString(),
    };

    // get the room
    let roomSlug = messageData.room;
    const room = Room.getRoomBySlug(roomSlug);

    // make sure user is in that room
    if (!room || !room.hasClient(client)) {
      console.error(`${client} tried to send message to room ${roomSlug} but they're not in that room!`);
      return;
    }

    // Make sure room exists before sending msg
    if (!room) {
      console.error(`Room '${roomSlug}' not found!`);
    }

    // Store msg in state
    room.chat = room.chat.concat(message);

    // Send msg out to everyone connected
    io.sockets.in(roomSlug).emit("room:chatMessage", message);
  };


  /**
   * Handles a request to start a game from a client in a room (TODO: only the host can do this)
   * @param data - the data from the client (should be the room slug)
   */
  const handleStartGameRequestFromClient = data => {
    const {slug} = data; // Get room slug from data
    const room = Room.getRoomBySlug(slug); // Get room by slug
    console.log(`${client.username} requested to start ${slug}`);

    // Make sure room exists before starting game
    if (!room) {
      console.error(`Tried to start game for room ${slug} but couldn't find room!`);
      return;
    }

    room.startGame();
  };

  /**
   * Sends updated room data to clients in room on request from client
   * @param room - the room to send data for
   */
  const sendUserDataOnReq = (room) => {
    room.updateRoom(io);
  };


  /**
   * Handles a client sending their answers to the server
   * @param data - the data from the client
   */
  const handleClientProvidingAnswers = async (data) => {
    const {slug, answers} = data;
    const room = Room.getRoomBySlug(slug);

    // Make sure room exists
    if (!room) {
      console.error(`${client} tried to provide answers for room ${slug} but it doesn't exist!`);
      return;
    }

    // Make sure client is in room
    if (!room.hasClient(client)) {
      console.error(`${client} tried to provide answers for room ${slug} but they're not in the room!`);
      return;
    }

    // TODO: Fix this
    // // Make sure client hasn't already provided answers
    // if (client.id in room.game.results) {
    //   console.error(`${client} tried to provide answers for room ${slug} but they've already provided answers!`);
    //   return;
    // }

    console.log("got answers");
    console.dir(client.id);
    console.dir(data);

    // Store answers
    room.game.results[client.id] = {};
    room.game.results[client.id].answers = answers;
    room.game.results[client.id].results = [];

    // Check if everyone has provided answers
    if (room.hasEveryoneSubmittedAnswers()) {
      // Everyone is done, score the game
      console.log("Everyone is done, scoring game...");

      await room.handleScoring();
    } else {
      // Not everyone is done, update room
      room.updateRoom();
    }
  };

  const handleClientLeavingRoom = (data) => {
    const {room: roomData} = data;
    const room = Room.getRoomBySlug(roomData.slug);

    // Make sure room exists
    if (!room) {
      console.error(`${client} tried to leave room ${roomData.slug} but it doesn't exist!`);
      return;
    }

    console.log(`${client} wants to leave room ${room.slug}`);

    client.leaveRoom(Room.getRoomBySlug(room.slug)); // Remove from room
    client.socket.leave(room.slug); // Leave socket chan

    room.updateRoom(); // Send updated room data to clients
  };


  /**
   * Handles a client voting to go to lobby @ results screen after game
   * @param data - the data from the client (should be the room data)
   */
  const handleVoteGoToLobby = (data) => {
    const {room: roomData} = data;
    const room = Room.getRoomBySlug(roomData.slug);
    console.log(`${client} in ${room.slug} wants to go to lobby.`);

    // Make sure room exists
    if (!room) {
      console.error(`${client} tried to go to lobby on room ${roomData.slug} but it doesn't exist anymore!`);
      return;
    }

    room.clickedOkResults[client.id] = true;
    room.updateRoom();

    // Check if everyone is ready to go to lobby and start new game if so
    if (room.isEveryoneReadyToGoToLobby()) {
      room.setUpNewGame();
    }
  };


  /** Handles a client requesting to start a single player game */
  const handleSinglePlayerRequest = () => {
    console.log(`${client} wants to start a single player game.`);
    const room = Room.createSinglePlayerRoom(client);
    room.name = "Single Player Room";
    room.slug = "single-player";

    // add random number to name but make sure unique
    while (Room.getRoomBySlug(room.slug)) {
      room.slug += Math.floor(Math.random() * 1000000);
    }

    console.log(`Created single player room ${room.slug}`);

    Room.addRoom(room);

    // TODO: DRY this
    let [joined, message] = room.addClient(client);

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

  /**
   * Handles a client requesting to join a random room
   */
  const handleJoinRandomRoom = () => {
    // Make sure there are rooms to join
    if (Room.rooms.length === 0) {
      io.to(socket.id).emit("error", `There are no rooms to join!`);
      return;
    }

    // Get a random room
    const room = Room.rooms[Math.floor(Math.random() * Room.rooms.length)];

    // Try to join the room
    let [joined, message] = room.addClient(client);

    // Send success or error
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

  // Register room handlers for Socket.IO events
  socket.on("room:create", handleCreateRoom); // client wants to create a new room
  socket.on("room:data", sendUserDataOnReq); // client is requesting updated room info
  socket.on("room:join", handleJoin); // client is requesting to join room
  socket.on("room:chatMessage", handleChatMessageFromClient); // client is sending message to room
  socket.on("room:startGame", handleStartGameRequestFromClient); // client wants to start game
  socket.on("room:provideAnswers", handleClientProvidingAnswers); // client is giving us their answers
  socket.on("room:leave", handleClientLeavingRoom); // client is leaving room
  socket.on("room:voteGoToLobby", handleVoteGoToLobby); // client is voting to return to lobby @ results screen
  socket.on("room:singlePlayer", handleSinglePlayerRequest); // start single player room
  socket.on("room:joinRandomRoom", handleJoinRandomRoom);
};

export default registerRoomHandlers;
