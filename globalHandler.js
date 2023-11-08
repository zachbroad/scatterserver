import state from "./state.js";


export const registerGlobalHandlers = (io, socket, client) => {

  /**
   * Handle global chat message
   */
  const handleGlobalMessage = (msg) => {
    // Check for blank message
    if (msg?.trim() === "" || !msg) {
      client.error(`Message can't be blank.`); // send message err to client if blank
      return;
    }

    console.log(`${client} sent message: ${msg}`); // Log message
    msg = `${client.username}: ${msg}`; // Format message
    state.messages = state.messages.concat(msg); // Store message in state
    io.emit("global:message", msg); // Send message to all clients
  };

  // Handle disconnect
  let handleUserDisconnect = () => {
    console.log(`${client} has disconnected.`);
    client.handleDisconnect(); // Remove from rooms, send messages, etc
  };

  /**
   * Send the client the list of rooms
   */
  const handleRoomList = () => {
    console.log(`${client} requested room list`);
    client.sendListOfRooms();
  };

  const handleNameChange = (data) => {
    console.log(`${client} requested name change to ${data}`);
    client.setUsername(data);
  };

  // Register handlers
  socket.on("disconnect", handleUserDisconnect);
  socket.on("global:message", handleGlobalMessage);
  socket.on("global:roomList", handleRoomList); // user is asking for rooms list
  socket.on("global:changeName", handleNameChange);
};

export default registerGlobalHandlers;