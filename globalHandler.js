const state = require('./state');

module.exports = (io, socket, client) => {
  /**
   * Handle global chat message
   **/
  const globalMessage = (msg) => {
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

  socket.on('global:message', globalMessage);
}
