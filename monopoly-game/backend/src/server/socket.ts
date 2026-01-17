import { Server, Socket } from "socket.io";
import { RoomManager } from "../game/rooms";
import { ClientToServerEvents, ServerToClientEvents, RoomID } from "../types";
import { handleBuyProperty, handleEndTurn, handleRoll, applyRoll, handlePayJailFine, handleUseGetOutOfJail, handleDrawCard } from "../game/engine";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerSocket(io: IOServer, rooms: RoomManager) {
  io.on("connection", (socket: Socket) => {
    const sid = socket.id;
    // sid -> { roomId, playerId }
    const getPlayerId = (roomId?: string): string | null => {
      // For session-aware flow, we store mapping on socket.data
      const pid = (socket.data && (socket.data as any).playerId) as string | undefined;
      return pid || null;
    };

    // Emit helper
    const broadcastRoom = (roomId: RoomID) => {
      const room = rooms.getRoom(roomId);
      if (!room) return;
      const state = room.state;
      io.to(roomId).emit("roomUpdate", {
        roomId,
        players: Object.values(state.players).map(p => ({
          id: p.id, name: p.name, cash: p.cash, position: p.position, bankrupt: p.bankrupt, inJail: p.inJail
        })),
        currentTurn: state.turnOrder.length ? state.turnOrder[state.currentTurn] : null,
        started: state.started,
        hostId: room.hostId
      });
      io.to(roomId).emit("gameUpdate", state);
    };

    socket.on("createRoom", (playerName, ack) => {
      const room = rooms.createRoom(sid, playerName || "Player");
      // Legacy flow uses socket.id as playerId
      (socket.data as any).playerId = sid;
      socket.join(room.id);
      ack(room.id);
      broadcastRoom(room.id);
    });

    socket.on("createRoomWithPass", (playerName, passcode, ack) => {
      const room = rooms.createRoom(sid, playerName || "Player", passcode);
      (socket.data as any).playerId = sid;
      socket.join(room.id);
      ack(room.id);
      broadcastRoom(room.id);
    });

    socket.on("joinRoom", (roomId, playerName, ack) => {
      console.log(`Player ${sid} attempting to join room: ${roomId}`);
      try {
        const room = rooms.joinRoom(roomId, sid, playerName || "Player");
        (socket.data as any).playerId = sid;
        socket.join(room.id);
        console.log(`Player ${sid} (${playerName}) joined room ${roomId} successfully`);
        ack(true);
        broadcastRoom(room.id);
      } catch (err: any) {
        console.error(`Failed to join room ${roomId}:`, err?.message);
        ack(false, err?.message || "Failed to join");
      }
    });

    socket.on("joinRoomWithPass", (roomId, passcode, playerName, ack) => {
      try {
        const room = rooms.joinRoom(roomId, sid, playerName || "Player", passcode);
        (socket.data as any).playerId = sid;
        socket.join(room.id);
        ack(true);
        broadcastRoom(room.id);
      } catch (err: any) {
        ack(false, err?.message || "Failed to join");
      }
    });

    // Session-oriented APIs
    socket.on("createSession", (playerName, passcode, ack) => {
      const { room, playerId, token } = rooms.createSession(playerName || "Player", passcode);
      (socket.data as any).playerId = playerId;
      socket.join(room.id);
      ack({ roomId: room.id, playerId, token });
      broadcastRoom(room.id);
    });

    socket.on("joinSession", (roomId, playerName, passcode, ack) => {
      try {
        const { room, playerId, token } = rooms.joinSession(roomId, playerName || "Player", passcode);
        (socket.data as any).playerId = playerId;
        socket.join(room.id);
        ack({ ok: true, roomId: room.id, playerId, token });
        broadcastRoom(room.id);
      } catch (err: any) {
        ack({ ok: false, reason: err?.message || "JOIN_FAILED" });
      }
    });

    socket.on("reconnectSession", (roomId, token, ack) => {
      const pid = rooms.findPlayerIdByToken(roomId, token);
      if (!pid) return ack({ ok: false, reason: "INVALID_TOKEN" });
      (socket.data as any).playerId = pid;
      socket.join(roomId);
      ack({ ok: true, playerId: pid });
      broadcastRoom(roomId);
    });

    socket.on("startGame", (roomId) => {
      try {
        const pid = getPlayerId(roomId) || sid;
        rooms.startGame(roomId, pid);
        broadcastRoom(roomId);
      } catch (err: any) {
        socket.emit("errorMessage", err?.message || "Failed to start game");
      }
    });

    socket.on("rollDice", (roomId) => {
      const room = rooms.getRoom(roomId);
      if (!room) return socket.emit("errorMessage", "Room not found");
      try {
        const pid = getPlayerId(roomId) || sid;
        handleRoll(room.state, pid);
        // Private events only for acting player
        const s = room.state;
        if (s.lastDrawnCard && s.lastDrawnCard.playerId === pid) {
          socket.emit("privateCardDrawn", { deck: s.lastDrawnCard.deck, cardId: s.lastDrawnCard.cardId });
        }
        if (s.lastTaxCharged && s.lastTaxCharged.playerId === pid) {
          socket.emit("privateTaxCharged", { amount: s.lastTaxCharged.amount, tileIndex: s.lastTaxCharged.tileIndex });
        }
        if (s.lastSentToJail && s.lastSentToJail.playerId === pid) {
          socket.emit("privateJail", { reason: s.lastSentToJail.reason });
        }
        broadcastRoom(roomId);
      } catch (err: any) {
        socket.emit("errorMessage", err?.message || "Roll failed");
      }
    });

    socket.on("buyProperty", (roomId) => {
      const room = rooms.getRoom(roomId);
      if (!room) return socket.emit("errorMessage", "Room not found");
      try {
        const pid = getPlayerId(roomId) || sid;
        handleBuyProperty(room.state, pid);
        broadcastRoom(roomId);
      } catch (err: any) {
        socket.emit("errorMessage", err?.message || "Buy failed");
      }
    });

    socket.on("payJailFine", (roomId) => {
      const room = rooms.getRoom(roomId);
      if (!room) return socket.emit("errorMessage", "Room not found");
      try {
        handlePayJailFine(room.state, sid);
        broadcastRoom(roomId);
      } catch (err: any) {
        socket.emit("errorMessage", err?.message || "Pay fine failed");
      }
    });

    socket.on("useGetOutOfJailCard", (roomId) => {
      const room = rooms.getRoom(roomId);
      if (!room) return socket.emit("errorMessage", "Room not found");
      try {
        handleUseGetOutOfJail(room.state, sid);
        broadcastRoom(roomId);
      } catch (err: any) {
        socket.emit("errorMessage", err?.message || "Use card failed");
      }
    });

    socket.on("endTurn", (roomId) => {
      const room = rooms.getRoom(roomId);
      if (!room) return socket.emit("errorMessage", "Room not found");
      try {
        const pid = getPlayerId(roomId) || sid;
        if (room.state.pendingDraw && room.state.pendingDraw.playerId === pid) {
          throw new Error("You must draw your card first");
        }
        handleEndTurn(room.state, pid);
        broadcastRoom(roomId);
      } catch (err: any) {
        socket.emit("errorMessage", err?.message || "End turn failed");
      }
    });

    socket.on("endGame", (roomId) => {
      const room = rooms.getRoom(roomId);
      if (!room) return socket.emit("errorMessage", "Room not found");
      try {
        const pid = getPlayerId(roomId) || sid;
        if (room.hostId !== pid) throw new Error("Only host can end");
        const s = room.state;
        const active = s.turnOrder.slice();
        let winner: string | null = null;
        if (active.length <= 1) {
          winner = active[0] || null;
        } else {
          // compute net worth: cash + property prices
          const worth = (id: string) => {
            const cash = s.players[id]?.cash || 0;
            let props = 0;
            for (const t of s.board) {
              if (t.ownerId === id) props += t.price || 0;
            }
            return cash + props;
          };
          winner = active.sort((a,b) => worth(b) - worth(a))[0] || null;
        }
        s.ended = true;
        s.winnerId = winner;
        s.started = false;
        broadcastRoom(roomId);
      } catch (err: any) {
        socket.emit("errorMessage", err?.message || "End game failed");
      }
    });

    socket.on("drawCard", (roomId, which) => {
      const room = rooms.getRoom(roomId);
      if (!room) return socket.emit("errorMessage", "Room not found");
      try {
        const pid = getPlayerId(roomId) || sid;
        const s = room.state;
        const pd = s.pendingDraw;
        if (!pd) throw new Error("No card to draw");
        if (pd.playerId !== pid) throw new Error("Not your draw");
        if (pd.deck !== which) throw new Error("Wrong deck");
        handleDrawCard(s, pid, which);
        // Private event to acting player
        if (s.lastDrawnCard && s.lastDrawnCard.playerId === pid) {
          socket.emit("privateCardDrawn", { deck: s.lastDrawnCard.deck, cardId: s.lastDrawnCard.cardId });
        }
        if (s.lastSentToJail && s.lastSentToJail.playerId === pid) {
          socket.emit("privateJail", { reason: s.lastSentToJail.reason });
        }
        broadcastRoom(roomId);
      } catch (err: any) {
        socket.emit("errorMessage", err?.message || "Draw failed");
      }
    });

    socket.on("leaveRoom", (roomId) => {
      const pid = getPlayerId(roomId) || sid;
      rooms.leaveRoom(roomId, pid);
      socket.leave(roomId);
      broadcastRoom(roomId);
    });

    socket.on("disconnect", () => {
      // Do not auto-remove player; allow reconnect via token.
      // Socket will be removed from room automatically by Socket.IO.
    });

    // Dev-only helpers
    if (process.env.DEV_TOOLS === "true") {
      socket.on("dev_forcePosition", (roomId, playerId, position) => {
        const room = rooms.getRoom(roomId);
        if (!room) return;
        const p = room.state.players[playerId];
        if (!p) return;
        const len = room.state.board.length;
        p.position = ((position % len) + len) % len;
        io.to(roomId).emit("gameUpdate", room.state);
        io.to(roomId).emit("roomUpdate", {
          roomId,
          players: Object.values(room.state.players).map(pl => ({
            id: pl.id, name: pl.name, cash: pl.cash, position: pl.position, bankrupt: pl.bankrupt, inJail: pl.inJail
          })),
          currentTurn: room.state.turnOrder.length ? room.state.turnOrder[room.state.currentTurn] : null,
          started: room.state.started,
          hostId: room.hostId
        });
      });

      socket.on("dev_forceRoll", (roomId, playerId, d1, d2) => {
        const room = rooms.getRoom(roomId);
        if (!room) return;
        try {
          applyRoll(room.state, playerId, d1, d2);
          broadcastRoom(roomId);
        } catch (err: any) {
          socket.emit("errorMessage", err?.message || "Force roll failed");
        }
      });

      socket.on("dev_setDeck", (roomId, which, deckIds) => {
        const room = rooms.getRoom(roomId);
        if (!room) return;
        if (!room.state.decks) room.state.decks = { chance: [], community: [] };
        if (which !== 'chance' && which !== 'community') return;
        (room.state.decks as any)[which as 'chance'|'community'] = Array.isArray(deckIds) ? deckIds.slice() : [];
        io.to(roomId).emit("gameUpdate", room.state);
      });
    }
  });
}
