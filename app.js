const express = require('express');
const socketIO = require('socket.io');
const http = require('http');
const cors = require('cors');

const Room = require("./room");
const Client = require("./client");

const state = require("./state");
const registerRoomHandlers = require('./roomHandler');
const registerGlobalHandlers = require('./globalHandler');

// Set up the server
const app = express();
app.use(cors({origin: '*'}));
const server = http.createServer(app);

// Enable CORS any origin
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});



// Handle socketio events
io.on('connection', (socket) => {
  console.log(`Connection from ${socket.handshake.address}!`);
  const client = Client.addClient(socket);
  console.log(`${client} has connected!`);

  // On join
  io.emit('message', 'Welcome to the server');
  io.emit('global:messageHistory', state.messages);
  io.emit('global:roomList', Room.rooms);

  // Register handlers
  registerRoomHandlers(io, socket, client);
  registerGlobalHandlers(io, socket, client);

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`${client} has disconnected.`)

    // Remove from rooms, send messages, etc
    client.handleDisconnect();
  })

})

// Start the server
server.listen(3000, () => {
  console.log('Server running on port 3000')
})

module.exports = {io}