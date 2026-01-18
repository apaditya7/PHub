import { GameState, PlayerID, RoomID } from "../types";
import { createInitialState, addPlayer, removePlayer, currentPlayerId } from "./state";

export interface Room {
  id: RoomID;
  state: GameState;
  hostId: PlayerID | null;
  passcode?: string;
  tokens: Map<string, PlayerID>;
  boardTheme?: 'main' | 'ntu' | 'nus' | 'smu';
}

function randomCode(): RoomID {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // avoid ambiguous chars
  return Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export class RoomManager {
  private rooms = new Map<RoomID, Room>();

  createRoom(hostId: PlayerID, hostName: string, passcode?: string, boardTheme: 'main' | 'ntu' | 'nus' | 'smu' = 'main'): Room {
    let id: RoomID;
    do {
      id = randomCode();
    } while (this.rooms.has(id));

    const state = createInitialState();
    addPlayer(state, hostId, hostName);
    const room: Room = { id, state, hostId, passcode, tokens: new Map(), boardTheme };
    this.rooms.set(id, room);
    return room;
  }

  getRoom(id: RoomID): Room | undefined {
    return this.rooms.get(id);
  }

  joinRoom(id: RoomID, playerId: PlayerID, name: string, passcode?: string): Room {
    const room = this.rooms.get(id);
    if (!room) throw new Error("Room not found");
    if (room.state.started) throw new Error("Game already started");
    if (room.passcode && room.passcode !== passcode) throw new Error("Invalid or missing passcode");
    addPlayer(room.state, playerId, name);
    return room;
  }

  // Session helpers
  generatePlayerId(): PlayerID {
    const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    const s = Array.from({ length: 10 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    return `P_${s}`;
  }

  generateToken(): string {
    const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const s = Array.from({ length: 24 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    return `T_${s}`;
  }

  createSession(hostName: string, passcode?: string) {
    const playerId = this.generatePlayerId();
    const room = this.createRoom(playerId, hostName, passcode);
    const token = this.generateToken();
    room.tokens.set(token, playerId);
    return { room, playerId, token };
  }

  joinSession(roomId: RoomID, playerName: string, passcode?: string) {
    const playerId = this.generatePlayerId();
    const room = this.joinRoom(roomId, playerId, playerName, passcode);
    const token = this.generateToken();
    room.tokens.set(token, playerId);
    return { room, playerId, token };
  }

  findPlayerIdByToken(roomId: RoomID, token: string): PlayerID | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    return room.tokens.get(token);
  }

  leaveRoom(id: RoomID, playerId: PlayerID) {
    const room = this.rooms.get(id);
    if (!room) return;
    removePlayer(room.state, playerId);
    if (Object.keys(room.state.players).length === 0) {
      this.rooms.delete(id);
      return;
    }
    if (room.hostId === playerId) {
      // Reassign host
      const next = room.state.turnOrder[0] || null;
      room.hostId = next;
    }
    // Auto-end if only one player remains in turn order
    if (room.state.started && room.state.turnOrder.length === 1) {
      room.state.ended = true;
      room.state.winnerId = room.state.turnOrder[0] || null;
      room.state.started = false;
    }
  }

  startGame(id: RoomID, requesterId: PlayerID) {
    const room = this.rooms.get(id);
    if (!room) throw new Error("Room not found");
    if (room.hostId !== requesterId) throw new Error("Only host can start");
    if (room.state.turnOrder.length < 2) throw new Error("Need at least 2 players");
    room.state.started = true;
  }

  currentTurnPlayer(id: RoomID): PlayerID | null {
    const room = this.rooms.get(id);
    if (!room) return null;
    return currentPlayerId(room.state);
  }
}
