import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

export type PlayerID = string;
export type RoomID = string;

// Minimal types mirrored from backend events we use
export type PlayerInfo = {
  id: PlayerID;
  name: string;
  cash: number;
  position: number;
  inJail: boolean;
  bankrupt: boolean;
};

export type Tile = {
  id: string;
  index: number;
  name: string;
  type: string; // PROPERTY | GO | ...
  ownerId?: PlayerID | null;
  price?: number;
  rent?: number;
};

export type GameState = {
  board: Tile[];
  players: Record<PlayerID, PlayerInfo>;
  turnOrder: PlayerID[];
  currentTurn: number;
  started: boolean;
  lastRoll?: [number, number];
  hasRolledThisTurn?: boolean;
};

let socket: Socket | null = null;
let isInitialized = false;

export function getSocket(): Socket {
  if (!socket || !isInitialized) {
    console.log("Creating socket connection to:", SOCKET_URL);

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
      console.log("✅ Socket connected successfully! ID:", socket?.id);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket connection error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log("🔄 Reconnection attempt #", attemptNumber);
    });

    socket.on("reconnect", () => {
      console.log("✅ Reconnected!");
    });

    isInitialized = true;
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    isInitialized = false;
  }
}

export type RoomUpdatePayload = {
  roomId: RoomID;
  players: Array<Pick<PlayerInfo, "id" | "name" | "cash" | "position" | "bankrupt" | "inJail">>;
  currentTurn: PlayerID | null;
  started: boolean;
};

export function connectSocket(
  handlers: {
    onRoomUpdate?: (r: RoomUpdatePayload) => void;
    onGameUpdate?: (g: GameState) => void;
    onError?: (msg: string) => void;
    onConnect?: (id: string) => void;
  }
) {
  const s = getSocket();
  if (handlers.onConnect) s.on("connect", () => handlers.onConnect!(s.id ?? ""));
  if (handlers.onRoomUpdate) s.on("roomUpdate", handlers.onRoomUpdate);
  if (handlers.onGameUpdate) s.on("gameUpdate", handlers.onGameUpdate);
  if (handlers.onError) s.on("errorMessage", handlers.onError);
  return s;
}

// Create a new room
export function createOrJoinRoom(playerName: string) {
  const s = getSocket();
  return new Promise<RoomID>((resolve, reject) => {
    s.emit("createRoom", playerName, (roomId: RoomID) => {
      if (roomId) {
        resolve(roomId);
      } else {
        reject(new Error("Failed to create room"));
      }
    });
  });
}

export function emitRoll(roomId: RoomID) {
  getSocket().emit("rollDice", roomId);
}
export function emitEndTurn(roomId: RoomID) {
  getSocket().emit("endTurn", roomId);
}
export function emitBuy(roomId: RoomID) {
  getSocket().emit("buyProperty", roomId);
}
export function emitPayJailFine(roomId: RoomID) {
  getSocket().emit("payJailFine", roomId);
}
export function emitUseGOOJF(roomId: RoomID) {
  getSocket().emit("useGetOutOfJailCard", roomId);
}

export function emitStartGame(roomId: RoomID) {
  getSocket().emit("startGame", roomId);
}
