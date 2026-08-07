// Monopoly Game Types
// These types mirror the backend game state structure

export type PlayerID = string;
export type RoomID = string;

export type PlayerInfo = {
  id: PlayerID;
  name: string;
  cash: number;
  position: number;
  inJail: boolean;
  bankrupt: boolean;
  getOutOfJailFree?: number;
};

export type Tile = {
  id: string;
  index: number;
  name: string;
  type: string; // PROPERTY | GO | RAIL | UTILITY | TAX | CHANCE | COMMUNITY | JAIL | FREE_PARKING | GO_TO_JAIL
  ownerId?: PlayerID | null;
  price?: number;
  rent?: number;
};

export type GameState = {
  board: Tile[];
  players: Record<PlayerID, PlayerInfo>;
  turnOrder: PlayerID[];
  currentTurn: number;
  phase: string;
  started: boolean;
  ended?: boolean;
  winnerId?: PlayerID | null;
  lastRoll?: [number, number];
  hasRolledThisTurn?: boolean;
  lastDrawnCard?: {
    deck: 'chance' | 'community';
    cardId: string;
  } | null;
  pendingDraw?: {
    deck: 'chance' | 'community';
    playerId: PlayerID;
    tileIndex: number;
  } | null;
};

export type RoomUpdatePayload = {
  roomId: RoomID;
  players: Array<Pick<PlayerInfo, "id" | "name" | "cash" | "position" | "bankrupt" | "inJail">>;
  currentTurn: PlayerID | null;
  started: boolean;
  hostId: PlayerID | null;
};

// UI-specific types
export type SpaceType =
  | "go"
  | "property"
  | "tax"
  | "rail"
  | "utility"
  | "chance"
  | "community"
  | "jail"
  | "freeParking"
  | "goToJail";

export interface Space {
  name: string;
  type: SpaceType;
  color?: string;
  ownerId?: string;
  price?: number;
  rent?: number;
  tax?: number;
}

export interface UIPlayer {
  id: string;
  name: string;
  position: number;
  cash: number;
  token: "car" | "statue" | "book" | "tower";
  color: string;
  inJail?: boolean;
  getOutOfJailFree?: number;
}
