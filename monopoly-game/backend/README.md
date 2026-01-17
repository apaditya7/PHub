Backend: Monopoly Game Server (Node + TypeScript)

Overview
- Express HTTP server with Socket.IO for real-time gameplay.
- In-memory RoomManager for rooms, players, and turn flow.
- Minimal rule engine: dice roll, movement, pass GO, basic property purchase stub.

Getting Started
- Install Node.js 18+.
- Run `npm install` in this folder.
- Dev: `npm run dev` (TS + reload)
- Build: `npm run build`
- Start: `npm start`
 - Enable dev tools for deterministic tests: set `DEV_TOOLS=true` in `.env` or environment.

Environment
- `PORT`: HTTP port (default 4000).

Project Structure
- `src/index.ts`: Entry point; bootstraps HTTP + Socket.IO.
- `src/config.ts`: Env config.
- `src/server/socket.ts`: Socket.IO handlers.
- `src/server/routes.ts`: Basic health route.
- `src/game/rooms.ts`: RoomManager for rooms/players.
- `src/game/state.ts`: Core domain types and state helpers.
- `src/game/board.ts`: Minimal board data.
- `src/game/board-data.json`: Board tile list with stable `id`s.
- `src/game/engine.ts`: Rule engine (roll, move, end turn).
- `src/game/cards-data.json`: Chance/Community Chest card definitions.
- `src/game/cards.ts`: Card loading and deck helpers.
- `src/types.ts`: Shared event types.

Notes
- This is server-authoritative: server validates actions and broadcasts updates.
- Persistence and Redis pub/sub can be added later for scaling.
- Dev-only socket events available when `DEV_TOOLS=true`:
  - `dev_forcePosition(roomId, playerId, position)`
  - `dev_forceRoll(roomId, playerId, d1, d2)`
  
Jail Logic
- Rolling while in jail: doubles frees you and you move; else your `jailTurns` increments.
- After 3 failed attempts, you automatically pay $50 and move by the rolled amount.
- You may also call `payJailFine` on your turn to pay $50 and leave jail, or `useGetOutOfJailCard` if you have one.

Session & Reconnect
- Socket events (recommended for frontend):
  - `createSession(playerName, passcode?, ack => { roomId, playerId, token })`
  - `joinSession(roomId, playerName, passcode?, ack => { ok, reason?, roomId, playerId, token })`
  - `reconnectSession(roomId, token, ack => { ok, playerId, reason? })`
- REST endpoints:
  - `POST /api/rooms` { playerName, passcode? } → { ok, roomId, playerId, token }
  - `POST /api/rooms/:roomId/join` { playerName, passcode? } → { ok, roomId, playerId, token }
  - `POST /api/rooms/:roomId/reconnect` { token } → { ok, roomId, playerId }
  - `GET /api/rooms/:roomId/state` → full game state
  - `GET /api/rooms/:roomId/summary` → lightweight summary with board ownership

Action Cards
- Card data is editable in `src/game/cards.json` with `id`, `name`, `description`, and `effect`.
- Supported effects: `MOVE_TO {index, passGo?}`, `GO_TO_JAIL`, `COLLECT {amount}`, `PAY {amount}`, `GET_OUT_OF_JAIL_FREE`.
- Decks are shuffled per room; Get Out of Jail Free is removed from the deck until used.

Simple Auth
- Optional room passcode support.
- Create a protected room: `createRoomWithPass(playerName, passcode, ack)`.
- Join a protected room: `joinRoomWithPass(roomId, passcode, playerName, ack)`.
- Joining a protected room via `joinRoom` returns an error.

Testing Without Frontend
- Health: `curl http://localhost:4000/api/health`
- Socket scenarios: `npm run test:socket` (requires server running and `DEV_TOOLS=true` for deterministic parts)
- Cards scenarios: `npm run test:cards` (requires server running with `DEV_TOOLS=true`)
- Auth scenarios: `npm run test:auth`

Dev Tools
- Enable: `export DEV_TOOLS=true` before starting the server.
- Helpers used by tests:
  - `dev_setDeck(roomId, which, deckIds)` to set Chance/Community deck order.
  - `dev_forcePosition(roomId, playerId, position)` to place a player.
  - `dev_forceRoll(roomId, playerId, d1, d2)` to apply a specific roll.
