# Categories.LIVE Server

This is the backend server component for Categories.LIVE, a real-time multiplayer word game inspired by Scattergories. The server handles game logic, room management, and real-time communication between players.

## Server Architecture

### Core Components

- **Game Engine**: Manages game state, rounds, scoring, and letter selection
- **Room Management**: Handles creation and management of game rooms, including public/private rooms
- **Socket.IO Integration**: Enables real-time bidirectional communication
- **GPT-4 Integration**: Provides AI-powered answer validation

### Key Features

- Real-time multiplayer support with Socket.IO
- Dynamic room creation and management
- Public and private game rooms
- Single-player mode
- AI-powered answer validation using GPT-4
- Live chat functionality in rooms
- Automatic game state management
- Configurable game settings
- Random room joining capability

### Game Flow

1. Players can create or join rooms
2. Each game consists of 3 rounds
3. Rounds follow this sequence:
   - 3-second lobby countdown
   - 90-second answer period
   - Answer collection and GPT-4 validation
   - Score calculation and display
   - Results shown for 60 seconds
   - Return to lobby for next round

### Technical Implementation

The server is built with:
- Node.js for the runtime environment
- Express for the web server
- Socket.IO for real-time communication
- OpenAI's GPT-4 API for answer validation

Key files and their responsibilities:
- `app.js`: Main server entry point and Socket.IO setup
- `game.js`: Core game logic and state management
- `room.js`: Room creation and management
- `client.js`: Client connection handling
- `gpt.js`: OpenAI integration for answer validation
- `prompts.txt`: Database of game categories
