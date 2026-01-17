'use client'

import { io, Socket } from "socket.io-client";
import type { PlayerID, RoomID, GameState, RoomUpdatePayload } from "./types";

// Monopoly backend runs on port 3001
const SOCKET_URL = process.env.NEXT_PUBLIC_MONOPOLY_BACKEND_URL || "http://localhost:3001";

let socket: Socket | null = null;
let isInitialized = false;

export function getSocket(): Socket {
  if (!socket || !isInitialized) {
    console.log("[Monopoly] Creating socket connection to:", SOCKET_URL);

    // Disconnect existing socket if any
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
    }

    socket = io(SOCKET_URL, {
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 10000,
      autoConnect: true
    });

    socket.on("connect", () => {
      console.log("[Monopoly] ✅ Socket connected successfully! ID:", socket?.id);
    });

    socket.on("connect_error", (err) => {
      console.error("[Monopoly] ❌ Socket connection error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Monopoly] 🔌 Socket disconnected:", reason);
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log("[Monopoly] 🔄 Reconnection attempt #", attemptNumber);
    });

    socket.on("reconnect", () => {
      console.log("[Monopoly] ✅ Reconnected!");
    });

    isInitialized = true;
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    console.log("[Monopoly] Disconnecting socket...");
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    isInitialized = false;
  }
}

export function connectSocket(
  handlers: {
    onRoomUpdate?: (r: RoomUpdatePayload) => void;
    onGameUpdate?: (g: GameState) => void;
    onError?: (msg: string) => void;
    onConnect?: (id: string) => void;
    onPrivateCardDrawn?: (p: { deck: 'chance' | 'community'; cardId: string }) => void;
    onPrivateTaxCharged?: (p: { amount: number; tileIndex: number }) => void;
    onPrivateJail?: (p: { reason: 'tile' | 'card' }) => void;
  }
) {
  const s = getSocket();
  if (handlers.onConnect) s.on("connect", () => handlers.onConnect!(s.id ?? ""));
  if (handlers.onRoomUpdate) s.on("roomUpdate", handlers.onRoomUpdate);
  if (handlers.onGameUpdate) s.on("gameUpdate", handlers.onGameUpdate);
  if (handlers.onError) s.on("errorMessage", handlers.onError);
  if (handlers.onPrivateCardDrawn) s.on("privateCardDrawn", handlers.onPrivateCardDrawn);
  if (handlers.onPrivateTaxCharged) s.on("privateTaxCharged", handlers.onPrivateTaxCharged);
  if (handlers.onPrivateJail) s.on("privateJail", handlers.onPrivateJail);
  return s;
}

// Create a new room
export function createOrJoinRoom(playerName: string) {
  const s = getSocket();
  return new Promise<RoomID>((resolve, reject) => {
    s.emit("createRoom", playerName, (roomId: RoomID) => {
      if (roomId) {
        console.log("[Monopoly] Room created:", roomId);
        resolve(roomId);
      } else {
        reject(new Error("Failed to create room"));
      }
    });
  });
}

export function emitRoll(roomId: RoomID) {
  console.log("[Monopoly] Rolling dice...");
  getSocket().emit("rollDice", roomId);
}

export function emitEndTurn(roomId: RoomID) {
  console.log("[Monopoly] Ending turn...");
  getSocket().emit("endTurn", roomId);
}

export function emitBuy(roomId: RoomID) {
  console.log("[Monopoly] Buying property...");
  getSocket().emit("buyProperty", roomId);
}

export function emitPayJailFine(roomId: RoomID) {
  console.log("[Monopoly] Paying jail fine...");
  getSocket().emit("payJailFine", roomId);
}

export function emitUseGOOJF(roomId: RoomID) {
  console.log("[Monopoly] Using Get Out of Jail Free card...");
  getSocket().emit("useGetOutOfJailCard", roomId);
}

export function emitDrawCard(roomId: RoomID, which: 'chance' | 'community') {
  console.log("[Monopoly] Drawing card:", which);
  getSocket().emit("drawCard", roomId, which);
}

export function emitStartGame(roomId: RoomID) {
  console.log("[Monopoly] Starting game...");
  getSocket().emit("startGame", roomId);
}

export function emitEndGame(roomId: RoomID) {
  console.log("[Monopoly] Ending game...");
  getSocket().emit("endGame", roomId);
}

export function emitLeaveGame(roomId: RoomID) {
  console.log("[Monopoly] Leaving game...");
  getSocket().emit("leaveRoom", roomId);
}
