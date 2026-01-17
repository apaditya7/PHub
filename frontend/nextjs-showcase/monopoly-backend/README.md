# Monopoly Game Backend Server

This is the **separate backend server** for the Monopoly multiplayer game.

## Purpose
- Handles real-time multiplayer game logic via Socket.IO
- Manages game rooms and player sessions
- Validates all game actions server-side to prevent cheating

## Running the Backend

```bash
# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run dev

# Run in production mode
npm run build
npm start
```

The server will run on **port 3001** by default.

## What's Inside
- `src/game/` - Core game engine, board data, card system
- `src/server/` - Socket.IO handlers and REST API routes
- `src/types.ts` - TypeScript type definitions
- `src/config.ts` - Server configuration

## Frontend Connection
The Next.js frontend at `/app/monopoly` connects to this backend via Socket.IO.

## Important
⚠️ This backend must be running for the Monopoly game to work!
