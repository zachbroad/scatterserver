import express from "express";
import {Server} from "socket.io";
import http from "http";
import cors from "cors";

import Room from "./room.js";
import Client from "./client.js";

import state from "./state.js";
import registerRoomHandlers from "./roomHandler.js";
import registerGlobalHandlers from "./globalHandler.js";
import {APP_TITLE, SERVER_PORT} from "./config.js";

// Set up the server
const app = express();
app.use(cors({origin: "*"})); // Enable CORS any origin
const httpServer = http.createServer(app); // Create http server

// Enable CORS any origin
export const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});


// Handle socketio events
io.on("connection", (socket) => {
  // Log connection
  console.log(`Connection from ${socket.handshake.address}!`);
  
  // Add client
  const client = Client.addClient(socket);
  console.log(`${client} has connected!`);

  // On join
  client.message(`Welcome to ${APP_TITLE}!`);
  client.sendMessageHistory();
  client.sendListOfRooms();

  // Register handlers
  registerRoomHandlers(io, socket, client);
  registerGlobalHandlers(io, socket, client);
});

// Start the server
httpServer.listen(SERVER_PORT, () => {
  console.log(`Server running on port ${SERVER_PORT}`);
});
