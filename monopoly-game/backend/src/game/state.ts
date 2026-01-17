import { GameState, PlayerID, PlayerInfo } from "../types";
import { buildDecks } from "./cards";
import { buildBoard } from "./board";

export function createInitialState(): GameState {
  return {
    board: buildBoard(),
    players: {},
    turnOrder: [],
    currentTurn: 0,
    started: false,
    decks: buildDecks(),
    lastDrawnCard: null,
    lastTaxCharged: null,
    pendingDraw: null,
    lastSentToJail: null
  };
}

export function addPlayer(state: GameState, id: PlayerID, name: string): PlayerInfo {
  const player: PlayerInfo = {
    id,
    name,
    cash: 1500,
    position: 0,
    inJail: false,
    jailTurns: 0,
    getOutOfJailFree: 0,
    bankrupt: false
  };
  state.players[id] = player;
  state.turnOrder.push(id);
  return player;
}

export function removePlayer(state: GameState, id: PlayerID) {
  delete state.players[id];
  const idx = state.turnOrder.indexOf(id);
  if (idx >= 0) state.turnOrder.splice(idx, 1);
  if (state.currentTurn >= state.turnOrder.length) state.currentTurn = 0;
}

export function currentPlayerId(state: GameState): PlayerID | null {
  if (!state.turnOrder.length) return null;
  return state.turnOrder[state.currentTurn];
}

export function advanceTurn(state: GameState) {
  if (!state.turnOrder.length) return;
  state.currentTurn = (state.currentTurn + 1) % state.turnOrder.length;
  state.hasRolledThisTurn = false;
  state.lastRoll = undefined;
  state.lastDrawnCard = null;
  state.lastTaxCharged = null;
  state.lastSentToJail = null;
  state.pendingDraw = null;
}
