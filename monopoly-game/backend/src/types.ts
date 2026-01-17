export type PlayerID = string; // socket.id
export type RoomID = string;

export interface PlayerInfo {
  id: PlayerID;
  name: string;
  cash: number;
  position: number; // 0-39 board index
  inJail: boolean;
  jailTurns?: number; // attempts while in jail (0-2)
  getOutOfJailFree?: number; // count of cards
  bankrupt: boolean;
}

export type TileType =
  | "GO"
  | "PROPERTY"
  | "COMMUNITY_CHEST"
  | "CHANCE"
  | "TAX"
  | "JAIL"
  | "FREE_PARKING"
  | "GO_TO_JAIL";

export interface Tile {
  id: string; // stable identifier for frontend mapping
  index: number;
  name: string;
  type: TileType;
  price?: number;
  rent?: number;
  tax?: number;
  ownerId?: PlayerID | null;
}

export interface GameState {
  board: Tile[];
  players: Record<PlayerID, PlayerInfo>;
  turnOrder: PlayerID[];
  currentTurn: number; // index into turnOrder
  started: boolean;
  lastRoll?: [number, number];
  hasRolledThisTurn?: boolean; // true if current player has rolled this turn
  lastDrawnCard?: {
    deck: 'chance' | 'community';
    cardId: string;
    playerId?: PlayerID;
  } | null;
  lastTaxCharged?: {
    playerId: PlayerID;
    amount: number;
    tileIndex: number;
  } | null;
  // Card decks by ID; order is draw order (shift/pop based on policy)
  decks?: {
    chance: string[];
    community: string[];
  };
}

// Socket events
export interface ClientToServerEvents {
  createRoom: (playerName: string, ack: (roomId: RoomID) => void) => void;
  createRoomWithPass: (
    playerName: string,
    passcode: string,
    ack: (roomId: RoomID) => void
  ) => void;
  joinRoom: (
    roomId: RoomID,
    playerName: string,
    ack: (ok: boolean, message?: string) => void
  ) => void;
  joinRoomWithPass: (
    roomId: RoomID,
    passcode: string,
    playerName: string,
    ack: (ok: boolean, message?: string) => void
  ) => void;
  // Session-oriented APIs (recommended)
  createSession: (
    playerName: string,
    passcode: string | undefined,
    ack: (res: { roomId: RoomID; playerId: PlayerID; token: string }) => void
  ) => void;
  joinSession: (
    roomId: RoomID,
    playerName: string,
    passcode: string | undefined,
    ack: (res: { ok: boolean; reason?: string; roomId?: RoomID; playerId?: PlayerID; token?: string }) => void
  ) => void;
  reconnectSession: (
    roomId: RoomID,
    token: string,
    ack: (res: { ok: boolean; playerId?: PlayerID; reason?: string }) => void
  ) => void;
  startGame: (roomId: RoomID) => void;
  rollDice: (roomId: RoomID) => void;
  buyProperty: (roomId: RoomID) => void;
  endTurn: (roomId: RoomID) => void;
  leaveRoom: (roomId: RoomID) => void;
  // Dev-only helpers (enabled when DEV_TOOLS=true)
  dev_forcePosition?: (roomId: RoomID, playerId: PlayerID, position: number) => void;
  dev_forceRoll?: (roomId: RoomID, playerId: PlayerID, d1: number, d2: number) => void;
  dev_setDeck?: (roomId: RoomID, which: 'chance' | 'community', deckIds: string[]) => void;
  // Jail helpers
  payJailFine: (roomId: RoomID) => void;
  useGetOutOfJailCard: (roomId: RoomID) => void;
}

export interface ServerToClientEvents {
  errorMessage: (message: string) => void;
  roomUpdate: (payload: {
    roomId: RoomID;
    players: Array<Pick<PlayerInfo, "id" | "name" | "cash" | "position" | "bankrupt" | "inJail">>;
    currentTurn: PlayerID | null;
    started: boolean;
  }) => void;
  gameUpdate: (state: GameState) => void;
  privateCardDrawn?: (payload: { deck: 'chance' | 'community'; cardId: string }) => void;
  privateTaxCharged?: (payload: { amount: number; tileIndex: number }) => void;
}
