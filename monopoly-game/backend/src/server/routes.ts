import { Router } from "express";
import { RoomManager } from "../game/rooms";

export function buildRoutes(rooms?: RoomManager) {
  const router = Router();
  router.get("/health", (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
  });

  if (rooms) {
    // Create room/session
    router.post("/rooms", (req, res) => {
      try {
        const { playerName, passcode } = req.body || {};
        const { room, playerId, token } = rooms.createSession(playerName || "Player", passcode);
        res.json({ ok: true, roomId: room.id, playerId, token });
      } catch (e: any) {
        res.status(400).json({ ok: false, error: e?.message || "Failed to create room" });
      }
    });

    // Join room/session
    router.post("/rooms/:roomId/join", (req, res) => {
      try {
        const { playerName, passcode } = req.body || {};
        const { roomId } = req.params as any;
        const { room, playerId, token } = rooms.joinSession(roomId, playerName || "Player", passcode);
        res.json({ ok: true, roomId: room.id, playerId, token });
      } catch (e: any) {
        res.status(400).json({ ok: false, error: e?.message || "Failed to join room" });
      }
    });

    // Reconnect by token (HTTP-only check)
    router.post("/rooms/:roomId/reconnect", (req, res) => {
      try {
        const { token } = req.body || {};
        const { roomId } = req.params as any;
        const playerId = rooms.findPlayerIdByToken(roomId, token);
        if (!playerId) return res.status(400).json({ ok: false, error: "INVALID_TOKEN" });
        res.json({ ok: true, roomId, playerId });
      } catch (e: any) {
        res.status(400).json({ ok: false, error: e?.message || "Failed to reconnect" });
      }
    });

    // Fetch full game state (read-only)
    router.get("/rooms/:roomId/state", (req, res) => {
      const { roomId } = req.params as any;
      const room = rooms.getRoom(roomId);
      if (!room) return res.status(404).json({ ok: false, error: "ROOM_NOT_FOUND" });
      res.json({ ok: true, state: room.state });
    });

    // Fetch summary similar to roomUpdate
    router.get("/rooms/:roomId/summary", (req, res) => {
      const { roomId } = req.params as any;
      const room = rooms.getRoom(roomId);
      if (!room) return res.status(404).json({ ok: false, error: "ROOM_NOT_FOUND" });
      const s = room.state;
      res.json({
        ok: true,
        roomId,
        players: Object.values(s.players).map(p => ({ id: p.id, name: p.name, cash: p.cash, position: p.position, bankrupt: p.bankrupt, inJail: p.inJail })),
        currentTurn: s.turnOrder.length ? s.turnOrder[s.currentTurn] : null,
        started: s.started,
        board: s.board.map(t => ({ id: t.id, index: t.index, name: t.name, type: t.type, ownerId: t.ownerId || null }))
      });
    });
  }
  return router;
}
