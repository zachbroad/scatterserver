import state from './state.js';


export const registerGlobalHandlers = (io, socket, client) => {
  /**
   * Handle global chat message
   **/
  const handleGlobalMessage = (msg) => {
    // Dont allow blank messages
    if (msg?.trim() === "" || !msg) {
      // send message err
      io.to(socket.id).emit('error', "Message can't be blank.");
      return;
    }

    msg = `${client.username}: ${msg}`
    state.messages = state.messages.concat(msg);
    io.emit('global:message', msg);
  }

  // Handle disconnect
  let handleUserDisconnect = () => {
    console.log(`${client} has disconnected.`)

    // Remove from rooms, send messages, etc
    client.handleDisconnect();
  };

  socket.on('disconnect', handleUserDisconnect)
  socket.on('global:message', handleGlobalMessage);
};

export default registerGlobalHandlers;