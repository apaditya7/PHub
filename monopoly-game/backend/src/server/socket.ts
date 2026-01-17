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
        // Notify payer about rent paid
        if (s.lastRentPaid && s.lastRentPaid.payerId === pid) {
          const ownerName = s.players[s.lastRentPaid.ownerId]?.name || 'the owner';
          socket.emit("privateRentPaid", {
            amount: s.lastRentPaid.amount,
            ownerName,
            propertyName: s.lastRentPaid.propertyName,
          });
        }
        // Notify owner about rent received
        if (s.lastRentPaid && s.lastRentPaid.ownerId) {
          const ownerSocket = [...io.sockets.sockets.values()].find(
            (sock) => sock.id === s.lastRentPaid!.ownerId || sock.data?.mappedId === s.lastRentPaid!.ownerId
          );
          if (ownerSocket) {
            const payerName = s.players[s.lastRentPaid.payerId]?.name || 'A player';
            ownerSocket.emit("privateRentReceived", {
              amount: s.lastRentPaid.amount,
              payerName,
              propertyName: s.lastRentPaid.propertyName,
            });
          }
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

    // Demo Mode: Simulate 2 rounds with guaranteed card draws
    socket.on("startDemo", (roomId) => {
      console.log("[DEMO] Starting demo mode for room:", roomId);
      const room = rooms.getRoom(roomId);
      if (!room) return socket.emit("errorMessage", "Room not found");
      
      const s = room.state;
      if (!s.started) return socket.emit("errorMessage", "Game not started");
      
      const currentPid = s.turnOrder[s.currentTurn];
      if (!currentPid) return socket.emit("errorMessage", "No current player");
      
      console.log("[DEMO] Current player:", currentPid, "Turn order:", s.turnOrder);
      
      const runDemoSequence = async () => {
        try {
          // Helper to wait
          const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
          
          // ===== ROUND 1: Force landing on Community Chest (position 2) =====
          console.log("[DEMO] === ROUND 1 START ===");
          const p1 = s.players[currentPid];
          if (!p1) throw new Error("Player not found");
          
          console.log("[DEMO] Player 1 position before roll:", p1.position);
          
          // Reset to ensure clean state
          s.hasRolledThisTurn = false;
          
          // Apply the forced roll (1+1 = 2 to land on Community Chest from GO)
          console.log("[DEMO] Forcing roll 1+1 for player:", currentPid);
          applyRoll(s, currentPid, 1, 1);
          console.log("[DEMO] Player 1 position after roll:", p1.position);
          console.log("[DEMO] Pending draw:", s.pendingDraw);
          broadcastRoom(roomId);
          
          // Wait, then auto-draw the Community Chest card
          console.log("[DEMO] Waiting 1.5s before drawing card...");
          await wait(1500);
          
          if (s.pendingDraw && s.pendingDraw.playerId === currentPid) {
            console.log("[DEMO] Drawing card for player:", currentPid, "Deck:", s.pendingDraw.deck);
            
            // DEMO: Force a monetary card - "CCA Funding Approved" (Collect $100)
            if (s.decks && s.decks.community) {
              const targetCardId = "CC_CCA_FUNDING";
              const idx = s.decks.community.indexOf(targetCardId);
              if (idx > 0) {
                // Move the target card to the front
                s.decks.community.splice(idx, 1);
                s.decks.community.unshift(targetCardId);
                console.log("[DEMO] Forced CC_CCA_FUNDING to top of community deck");
              }
            }
            
            handleDrawCard(s, currentPid, s.pendingDraw.deck);
            // Emit to all players in room about the card
            if (s.lastDrawnCard) {
              console.log("[DEMO] Card drawn:", s.lastDrawnCard);
              io.to(roomId).emit("privateCardDrawn", { 
                deck: s.lastDrawnCard.deck, 
                cardId: s.lastDrawnCard.cardId 
              });
            }
            broadcastRoom(roomId);
          } else {
            console.log("[DEMO] No pending draw found or player mismatch. pendingDraw:", s.pendingDraw);
          }
          
          // Wait, then end turn
          console.log("[DEMO] Waiting 2.5s before ending turn...");
          await wait(2500);
          console.log("[DEMO] Ending turn for player:", currentPid);
          console.log("[DEMO] hasRolledThisTurn before endTurn:", s.hasRolledThisTurn);
          console.log("[DEMO] pendingDraw before endTurn:", s.pendingDraw);
          handleEndTurn(s, currentPid);
          console.log("[DEMO] Turn ended. New currentTurn index:", s.currentTurn);
          broadcastRoom(roomId);
          
          // ===== ROUND 2: Next player rolls to Chance (position 7) =====
          console.log("[DEMO] === ROUND 2 START ===");
          await wait(1500);
          
          const pid2 = s.turnOrder[s.currentTurn];
          console.log("[DEMO] Player 2:", pid2);
          if (!pid2) throw new Error("No second player");
          
          const p2 = s.players[pid2];
          console.log("[DEMO] Player 2 position before roll:", p2?.position);
          
          // Reset roll state
          s.hasRolledThisTurn = false;
          
          // Roll 4+3 = 7 to land on Chance
          console.log("[DEMO] Forcing roll 4+3 for player:", pid2);
          applyRoll(s, pid2, 4, 3);
          console.log("[DEMO] Player 2 position after roll:", p2?.position);
          console.log("[DEMO] Pending draw:", s.pendingDraw);
          broadcastRoom(roomId);
          
          // Wait, then draw the Chance card if pending
          console.log("[DEMO] Waiting 1.5s before drawing card...");
          await wait(1500);
          
          if (s.pendingDraw && s.pendingDraw.playerId === pid2) {
            console.log("[DEMO] Drawing card for player:", pid2, "Deck:", s.pendingDraw.deck);
            
            // DEMO: Force a monetary card - "Orientation Week" (Collect $200)
            if (s.decks && s.decks.chance) {
              const targetCardId = "CH_ORIENTATION_WEEK";
              const idx = s.decks.chance.indexOf(targetCardId);
              if (idx > 0) {
                // Move the target card to the front
                s.decks.chance.splice(idx, 1);
                s.decks.chance.unshift(targetCardId);
                console.log("[DEMO] Forced CH_ORIENTATION_WEEK to top of chance deck");
              }
            }
            
            handleDrawCard(s, pid2, s.pendingDraw.deck);
            if (s.lastDrawnCard) {
              console.log("[DEMO] Card drawn:", s.lastDrawnCard);
              io.to(roomId).emit("privateCardDrawn", { 
                deck: s.lastDrawnCard.deck, 
                cardId: s.lastDrawnCard.cardId 
              });
            }
            broadcastRoom(roomId);
          } else {
            console.log("[DEMO] No pending draw found or player mismatch. pendingDraw:", s.pendingDraw);
          }
          
          // Wait, then end turn
          console.log("[DEMO] Waiting 2.5s before ending turn...");
          await wait(2500);
          console.log("[DEMO] Ending turn for player:", pid2);
          handleEndTurn(s, pid2);
          console.log("[DEMO] Turn ended. New currentTurn index:", s.currentTurn);
          broadcastRoom(roomId);
          
          // ===== ROUND 3: Player 1 rolls to a property AHEAD of Player 2 and BUYS it =====
          console.log("[DEMO] === ROUND 3 START (Buy Property) ===");
          await wait(1500);
          
          const pid3 = s.turnOrder[s.currentTurn]; // Should be player 1 again
          console.log("[DEMO] Player for round 3:", pid3);
          if (!pid3) throw new Error("No player for round 3");
          
          const p3 = s.players[pid3];
          console.log("[DEMO] Player 1 position before roll:", p3?.position);
          console.log("[DEMO] Player 1 cash before roll:", p3?.cash);
          
          // Reset roll state
          s.hasRolledThisTurn = false;
          
          // Player 1 is at position 2. Player 2 is at position 7.
          // We need Player 1 to buy a property that Player 2 can land on next turn.
          // Player 2 at position 7, with roll 1+1=2, will land on position 9.
          // So let's have Player 1 roll to position 9 (Campus Green SMU - property)
          // From position 2, need to roll 7 = 4+3 or 5+2 or 6+1 to reach position 9
          console.log("[DEMO] Forcing roll 4+3 (=7) for player 1 to land on position 9 (Campus Green SMU)");
          applyRoll(s, pid3, 4, 3);
          console.log("[DEMO] Player 1 position after roll:", p3?.position);
          
          // Check if there's a pending draw (shouldn't be, position 9 is a property)
          if (s.pendingDraw) {
            console.log("[DEMO] Unexpected pending draw, handling it...");
            await wait(1000);
            handleDrawCard(s, pid3, s.pendingDraw.deck);
            broadcastRoom(roomId);
          }
          
          broadcastRoom(roomId);
          
          // Wait, then buy the property
          console.log("[DEMO] Waiting 1.5s before buying property...");
          await wait(1500);
          
          // Check if the tile is buyable
          const tile = s.board[p3!.position];
          console.log("[DEMO] Current tile:", tile?.name, "Type:", tile?.type, "Owner:", tile?.ownerId, "Price:", tile?.price);
          
          if (tile && tile.type === 'PROPERTY' && !tile.ownerId && tile.price && p3!.cash >= tile.price) {
            console.log("[DEMO] 💰 Buying property for player:", pid3);
            handleBuyProperty(s, pid3);
            console.log("[DEMO] ✅ Property bought! New owner:", tile.ownerId);
            console.log("[DEMO] Player 1 cash after purchase:", p3?.cash);
            broadcastRoom(roomId);
          } else {
            console.log("[DEMO] Cannot buy - tile not a property or already owned or insufficient funds");
          }
          
          // Store the position for round 4
          const boughtPropertyPosition = p3!.position;
          
          // Wait, then end turn
          console.log("[DEMO] Waiting 2s before ending turn...");
          await wait(2000);
          handleEndTurn(s, pid3);
          console.log("[DEMO] Turn ended. New currentTurn index:", s.currentTurn);
          broadcastRoom(roomId);
          
          // ===== ROUND 4: Player 2 lands on Player 1's property and pays rent =====
          console.log("[DEMO] === ROUND 4 START (Pay Rent) ===");
          await wait(1500);
          
          const pid4 = s.turnOrder[s.currentTurn]; // Should be player 2
          console.log("[DEMO] Player for round 4:", pid4);
          if (!pid4) throw new Error("No player for round 4");
          
          const p4 = s.players[pid4];
          const p1ForRent = s.players[pid3]; // Player 1 (property owner)
          console.log("[DEMO] Player 2 position before roll:", p4?.position);
          console.log("[DEMO] Player 2 cash BEFORE landing:", p4?.cash);
          console.log("[DEMO] Player 1 (owner) cash BEFORE rent:", p1ForRent?.cash);
          
          // Reset roll state
          s.hasRolledThisTurn = false;
          
          // Player 2 is at position 7. Player 1 bought position 9.
          // Roll 1+1=2 to move from 7 to 9 and land on the owned property!
          console.log("[DEMO] 🎲 Rolling 1+1 (=2) for Player 2 to land on position 9 (owned by Player 1)");
          applyRoll(s, pid4, 1, 1);
          console.log("[DEMO] Player 2 position after roll:", p4?.position);
          console.log("[DEMO] 💸 Player 2 cash AFTER landing (rent deducted):", p4?.cash);
          console.log("[DEMO] 💵 Player 1 (owner) cash AFTER rent received:", p1ForRent?.cash);
          
          // Show rent info
          const rentTile = s.board[p4!.position];
          if (rentTile && rentTile.rent) {
            console.log("[DEMO] 🏠 Rent paid: $" + rentTile.rent + " (base rent for " + rentTile.name + ")");
          }
          
          broadcastRoom(roomId);
          
          // Wait, then end turn
          await wait(2500);
          handleEndTurn(s, pid4);
          broadcastRoom(roomId);
          
          // Notify completion
          console.log("[DEMO] === DEMO COMPLETE ===");
          io.to(roomId).emit("errorMessage", "🎬 Demo complete! 4 rounds simulated: Card draws + Property purchase.");
          
        } catch (err: any) {
          console.error("[DEMO] Error:", err);
          socket.emit("errorMessage", err?.message || "Demo failed");
        }
      };
      
      runDemoSequence();
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
