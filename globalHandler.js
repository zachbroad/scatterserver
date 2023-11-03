import state from "./state.js";


export const registerGlobalHandlers = (io, socket, client) => {
  /** Handle global chat message */
  const handleGlobalMessage = (msg) => {
    if (msg?.trim() === "" || !msg) { // Dont allow blank messages
      client.error(`Message can't be blank.`); // send message err
      return;
    }

    msg = `${client.username}: ${msg}`;
    state.messages = state.messages.concat(msg);
    io.emit("global:message", msg);
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
    client.sendRooms();
  };

  socket.on("disconnect", handleUserDisconnect);
  socket.on("global:message", handleGlobalMessage);
  socket.on("global:roomList", handleRoomList); // user is asking for rooms list
};

export default registerGlobalHandlers;