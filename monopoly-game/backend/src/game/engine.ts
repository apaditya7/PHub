import { GameState, PlayerID, Tile } from "../types";
import { advanceTurn, currentPlayerId } from "./state";
import { cardById, CardEffect } from "./cards";

function roll2d6(): [number, number] {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  return [d1, d2];
}

export function handleRoll(state: GameState, playerId: PlayerID) {
  const [d1, d2] = roll2d6();
  return applyRoll(state, playerId, d1, d2);
}

export function applyRoll(state: GameState, playerId: PlayerID, d1: number, d2: number) {
  const current = currentPlayerId(state);
  if (current !== playerId) throw new Error("Not your turn");
  const player = state.players[playerId];
  if (!player) throw new Error("Unknown player");
  if (player.bankrupt) throw new Error("Player is bankrupt");
  if (state.hasRolledThisTurn) throw new Error("Already rolled this turn");

  state.lastRoll = [d1, d2];
  state.hasRolledThisTurn = true;
  // clear ephemeral effects for this roll
  state.lastDrawnCard = null;
  state.lastTaxCharged = null;

  // Jail handling: must roll doubles to get out, otherwise stay up to 3 attempts, then pay 50 and move
  if (player.inJail) {
    const isDoubles = d1 === d2;
    if (isDoubles) {
      player.inJail = false;
      player.jailTurns = 0;
      // Move normally by sum after release
      doMove(state, playerId, d1 + d2);
    } else {
      const jt = (player.jailTurns || 0) + 1;
      player.jailTurns = jt;
      if (jt >= 3) {
        // pay fine and move
        player.cash -= 50;
        player.inJail = false;
        player.jailTurns = 0;
        doMove(state, playerId, d1 + d2);
      } else {
        // no movement this turn
      }
    }
    return;
  }

  doMove(state, playerId, d1 + d2);
}

function applyTileEffect(state: GameState, playerId: PlayerID, tile: Tile) {
  const player = state.players[playerId];
  switch (tile.type) {
    case "GO":
    case "FREE_PARKING":
    case "JAIL":
      return; // no-op
    case "GO_TO_JAIL":
      player.inJail = true;
      player.position = 10; // Jail
      return;
    case "CHANCE":
      drawAndApply(state, playerId, "chance");
      return;
    case "COMMUNITY_CHEST":
      drawAndApply(state, playerId, "community");
      return;
    case "TAX":
      {
        const amount = tile.tax ?? 100;
        player.cash -= amount; // default to 100 if unspecified
        state.lastTaxCharged = { playerId, amount, tileIndex: tile.index };
      }
      return;
    case "PROPERTY":
      // If owned by someone else, pay rent
      if (tile.ownerId && tile.ownerId !== playerId && tile.rent) {
        const owner = state.players[tile.ownerId];
        const rent = tile.rent;
        player.cash -= rent;
        if (owner) owner.cash += rent;
      }
      return;
    default:
      return;
  }
}

export function handleBuyProperty(state: GameState, playerId: PlayerID) {
  const player = state.players[playerId];
  if (!player) throw new Error("Unknown player");
  const tile = state.board[player.position];
  if (tile.type !== "PROPERTY") throw new Error("Not a property");
  if (tile.ownerId) throw new Error("Already owned");
  if (!tile.price) throw new Error("No price set");
  if (player.cash < tile.price) throw new Error("Insufficient funds");
  player.cash -= tile.price;
  tile.ownerId = playerId;
}

export function handleEndTurn(state: GameState, playerId: PlayerID) {
  const current = currentPlayerId(state);
  if (current !== playerId) throw new Error("Not your turn");
  state.lastDrawnCard = null;
  advanceTurn(state);
}

export function handlePayJailFine(state: GameState, playerId: PlayerID) {
  const current = currentPlayerId(state);
  if (current !== playerId) throw new Error("Not your turn");
  const player = state.players[playerId];
  if (!player || !player.inJail) throw new Error("Not in jail");
  if (player.cash < 50) throw new Error("Insufficient funds");
  player.cash -= 50;
  player.inJail = false;
  player.jailTurns = 0;
}

export function handleUseGetOutOfJail(state: GameState, playerId: PlayerID) {
  const current = currentPlayerId(state);
  if (current !== playerId) throw new Error("Not your turn");
  const player = state.players[playerId];
  if (!player || !player.inJail) throw new Error("Not in jail");
  if (!player.getOutOfJailFree || player.getOutOfJailFree <= 0) throw new Error("No Get Out of Jail Free card");
  player.getOutOfJailFree -= 1;
  player.inJail = false;
  player.jailTurns = 0;
}

function doMove(state: GameState, playerId: PlayerID, steps: number) {
  const player = state.players[playerId];
  const oldPos = player.position;
  const len = state.board.length;
  const newPos = (((oldPos + steps) % len) + len) % len;
  if (steps > 0 && newPos < oldPos) player.cash += 200;
  player.position = newPos;
  const tile = state.board[newPos];
  applyTileEffect(state, playerId, tile);
}

function drawAndApply(state: GameState, playerId: PlayerID, which: "chance" | "community") {
  if (!state.decks) return;
  let deck = state.decks[which];
  if (!deck || deck.length === 0) return; // nothing to draw
  // Debug: log card draw
  try { console.log(`[CARD] draw from ${which} by ${playerId}. deck size before: ${deck.length}`); } catch {}
  const cardId = deck.shift()!; // draw from top
  state.lastDrawnCard = { deck: which, cardId: cardId, playerId };
  // Typical rule: place card at bottom unless it's GOOJF retained by player
  const card = cardById(cardId);
  if (!card) return;
  applyCardEffect(state, playerId, card.effect);
  // If not Get Out of Jail Free retained, put back to bottom
  if (card.effect.type !== "GET_OUT_OF_JAIL_FREE") {
    deck.push(cardId);
  }
  try { console.log(`[CARD] applied ${cardId}; deck size after: ${deck.length}`); } catch {}
}

function applyCardEffect(state: GameState, playerId: PlayerID, effect: CardEffect) {
  const player = state.players[playerId];
  switch (effect.type) {
    case "MOVE_TO": {
      moveToIndex(state, playerId, effect.index, Boolean(effect.passGo));
      return;
    }
    case "MOVE_STEPS": {
      doMove(state, playerId, effect.steps);
      return;
    }
    case "GO_TO_JAIL": {
      player.inJail = true;
      player.jailTurns = 0;
      player.position = 10;
      return;
    }
    case "COLLECT": {
      player.cash += effect.amount;
      return;
    }
    case "PAY": {
      player.cash -= effect.amount;
      return;
    }
    case "GET_OUT_OF_JAIL_FREE": {
      player.getOutOfJailFree = (player.getOutOfJailFree || 0) + 1;
      // Do not return card to bottom until used; handled by drawAndApply
      return;
    }
    default:
      return;
  }
}

function moveToIndex(state: GameState, playerId: PlayerID, index: number, passGo: boolean) {
  const player = state.players[playerId];
  const len = state.board.length;
  const pos = player.position;
  if (passGo && ((index + len) % len) < pos) {
    // moving forward across GO
    player.cash += 200;
  }
  player.position = ((index % len) + len) % len;
  const tile = state.board[player.position];
  applyTileEffect(state, playerId, tile);
}
