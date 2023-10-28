import express from 'express';
import socketIO from 'socket.io';
import http from 'http';
import cors from 'cors';

const Room = import("./room");
const Client = import("./client");

const state = import("./state");
const registerRoomHandlers = import('./roomHandler');
const registerGlobalHandlers = import('./globalHandler');

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