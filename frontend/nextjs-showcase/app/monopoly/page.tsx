// Monopoly - Main Game Page
'use client'

import { useEffect, useMemo, useRef, useState } from "react";
import {
  connectSocket,
  createOrJoinRoom,
  emitBuy,
  emitEndTurn,
  emitRoll,
  emitStartGame,
  emitDrawCard,
  emitLeaveGame,
  emitEndGame,
  getSocket,
} from "./lib/socket";
import type { GameState, RoomUpdatePayload, UIPlayer } from "./lib/types";
import { createSpaces } from "./lib/board-helpers";
import { cardById } from "./lib/cards-data";
import { LobbyModal } from "./components/LobbyModal";
import { PlayerDashboard } from "./components/PlayerDashboard";
import { GameBoard } from "./components/GameBoard";
import { CurrentSpaceCard } from "./components/CurrentSpaceCard";
import { PropertyPanel } from "./components/PropertyPanel";
import { ActivityLog } from "./components/ActivityLog";
import { TaxModal } from "./components/TaxModal";
import { CardModal } from "./components/CardModal";
import { GameOverModal } from "./components/GameOverModal";
import "./monopoly.css";

const PLAYER_COLORS = ["#c34b3a", "#2a7fc5", "#3a8a3a", "#c5872b"];
const PLAYER_TOKENS = ["car", "statue", "book", "tower"];

export default function MonopolyGame() {
  // ─────────────────────────────────────────────────────────────────────────
  // State - Players & Board
  // ─────────────────────────────────────────────────────────────────────────
  const [players, setPlayers] = useState<UIPlayer[]>([]);
  const [spaces, setSpaces] = useState(createSpaces());

  // ─────────────────────────────────────────────────────────────────────────
  // State - Game Flow
  // ─────────────────────────────────────────────────────────────────────────
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [rolling, setRolling] = useState(false);
  const [moving, setMoving] = useState(false);
  const [state, setState] = useState<GameState | null>(null);
  const [log, setLog] = useState<string[]>([]);

  // ─────────────────────────────────────────────────────────────────────────
  // State - Connection & Lobby
  // ─────────────────────────────────────────────────────────────────────────
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState(
    typeof window !== "undefined" ? localStorage.getItem("monopolyPlayerName") || "" : ""
  );
  const [meId, setMeId] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("monopolyPlayerId") || null : null
  );
  const [roomId, setRoomId] = useState<string | null>(
    typeof window !== "undefined" ? sessionStorage.getItem("monopolyRoomId") || null : null
  );
  const [isHost, setIsHost] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState("");

  // ─────────────────────────────────────────────────────────────────────────
  // State - Screens
  // ─────────────────────────────────────────────────────────────────────────
  const [showLanding, setShowLanding] = useState(!roomId);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [showLobby, setShowLobby] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // State - Modals & UI
  // ─────────────────────────────────────────────────────────────────────────
  const [taxModal, setTaxModal] = useState<{ show: boolean; amount: number }>({
    show: false,
    amount: 0,
  });
  const [cardModal, setCardModal] = useState<{ show: boolean; cardId: string | null }>({
    show: false,
    cardId: null,
  });
  const [showFlyCard, setShowFlyCard] = useState<{
    deck: "chance" | "community";
    from: { leftPct: number; topPct: number };
  } | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Refs
  // ─────────────────────────────────────────────────────────────────────────
  const animationTimersRef = useRef<Record<string, number>>({});
  const displayPositionsRef = useRef<Map<string, number>>(new Map());
  const [displayPositions, setDisplayPositions] = useState<Record<string, number>>({});
  const tokenOffsetsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const [tokenOffsets, setTokenOffsets] = useState(new Map<string, { x: number; y: number }>());
  const socketRef = useRef<ReturnType<typeof connectSocket> | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Derived values
  // ─────────────────────────────────────────────────────────────────────────
  const currentPlayerId = state?.turnOrder[state.currentTurnIndex] || "";
  const currentPlayer = players.find((p) => p.id === currentPlayerId) || players[0];
  const canRoll = state?.phase === "ROLL" && currentPlayerId === meId && !rolling && !moving;
  const canEnd = state?.phase === "RESOLVE" && currentPlayerId === meId && !moving;

  // ─────────────────────────────────────────────────────────────────────────
  // Token Animation
  // ─────────────────────────────────────────────────────────────────────────
  const cancelAnimation = (pid: string) => {
    const timerId = animationTimersRef.current[pid];
    if (timerId) {
      clearTimeout(timerId);
      delete animationTimersRef.current[pid];
    }
  };

  const startStepAnimation = (pid: string, fromPos: number, toPos: number) => {
    cancelAnimation(pid);
    let current = fromPos;
    const distance = toPos >= fromPos ? toPos - fromPos : 40 - fromPos + toPos;
    let step = 0;

    const tick = () => {
      if (step >= distance) {
        displayPositionsRef.current.set(pid, toPos);
        setDisplayPositions({ ...Object.fromEntries(displayPositionsRef.current) });
        setMoving(false);
        return;
      }
      step++;
      current = (current + 1) % 40;
      displayPositionsRef.current.set(pid, current);
      setDisplayPositions({ ...Object.fromEntries(displayPositionsRef.current) });
      animationTimersRef.current[pid] = window.setTimeout(tick, 220);
    };

    setMoving(true);
    tick();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Lobby Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleCreateGame = () => {
    if (!playerName.trim() || !socketRef.current) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("monopolyPlayerName", playerName.trim());
    }
    setIsConnecting(true);
    createOrJoinRoom(socketRef.current, "create", playerName.trim(), undefined);
  };

  const handleJoinGame = () => {
    if (!playerName.trim() || !joinRoomCode.trim() || !socketRef.current) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("monopolyPlayerName", playerName.trim());
    }
    setIsConnecting(true);
    createOrJoinRoom(socketRef.current, "join", playerName.trim(), joinRoomCode.toUpperCase());
  };

  const handleStartGame = () => {
    if (!roomId || !socketRef.current) return;
    emitStartGame(socketRef.current, roomId);
  };

  const handleLeaveGame = () => {
    if (!roomId || !meId || !socketRef.current) return;
    emitLeaveGame(socketRef.current, roomId, meId);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("monopolyRoomId");
    }
    window.location.reload();
  };

  const handleEndGame = () => {
    if (!roomId || !socketRef.current) return;
    emitEndGame(socketRef.current, roomId);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Game Action Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleRollDice = () => {
    if (!canRoll || !roomId || !socketRef.current) return;
    setRolling(true);
    emitRoll(socketRef.current, roomId);
  };

  const handleEndTurn = () => {
    if (!canEnd || !roomId || !socketRef.current) return;
    emitEndTurn(socketRef.current, roomId);
  };

  const handleBuyProperty = () => {
    if (!roomId || !meId || !socketRef.current) return;
    const myPos = state?.players[meId]?.position ?? 0;
    const tile = state?.board[myPos];
    if (!tile || tile.ownerId) return;
    emitBuy(socketRef.current, roomId, meId, myPos);
  };

  const handleDrawCard = (deck: "chance" | "community") => {
    if (!roomId || !meId || !socketRef.current) return;
    emitDrawCard(socketRef.current, roomId, meId, deck);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Socket Connection & Event Handlers
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    console.log("[Monopoly] Setting up socket connection...");

    // Initialize socket immediately
    const s = getSocket();
    socketRef.current = s;

    // Set up event handlers
    const handleConnect = (id: string) => {
      console.log("[Monopoly] Socket connected with ID:", id);
      setMeId(id);
      setIsSocketConnected(true);
      setConnectionError(null);
    };

    connectSocket({
      onConnect: handleConnect,
      onRoomUpdate: (r: RoomUpdatePayload) => {
        // Determine host on the client using socket id
        if (meId) setIsHost(r.hostId === meId);
      },
      onGameUpdate: (gs: GameState) => {
        console.log("[Monopoly] Game update:", gs);
        setState(gs);
        setDice(gs.lastRoll || [1, 1]);
        setIsStarted(gs.started);

        // Close lobby when game starts
        if (gs.started && showLobby) {
          setShowLobby(false);
        }
      },
      onError: (msg) => {
        console.error("[Monopoly] Socket error:", msg);
        setLog((prev) => [String(msg), ...prev.slice(0, 6)]);
      },
      onPrivateCardDrawn: (p) => {
        console.log("[Monopoly] Card drawn:", p.cardId);
        const card = cardById(p.cardId);
        if (card) {
          const deck = p.deck;
          const deckPos = deck === "chance" ? { leftPct: 70, topPct: 70 } : { leftPct: 30, topPct: 30 };
          setShowFlyCard({ deck, from: deckPos });
          setTimeout(() => setShowFlyCard(null), 600);
          setTimeout(() => {
            setCardModal({ show: true, cardId: p.cardId });
          }, 650);
        }
      },
      onPrivateTaxCharged: (p) => {
        console.log("[Monopoly] Tax charged:", p.amount);
        setTaxModal({ show: true, amount: p.amount });
        setTimeout(() => setTaxModal({ show: false, amount: 0 }), 2500);
      },
      onPrivateJail: () => {
        console.log("[Monopoly] Sent to jail");
        setLog((prev) => [...prev, "You were sent to jail!"]);
      }
    });

    // Check if already connected
    if (s.connected) {
      console.log("[Monopoly] Socket already connected:", s.id);
      handleConnect(s.id ?? "");
    }

    s.on("connect_error", (err) => {
      console.error("[Monopoly] Connection error:", err);
      setConnectionError(`Cannot connect to server. Is the backend running on port 3001?`);
      setIsSocketConnected(false);
    });

    s.on("disconnect", () => {
      console.log("[Monopoly] Socket disconnected");
      setIsSocketConnected(false);
    });

    // Cleanup function
    return () => {
      console.log("[Monopoly] Component unmounting, keeping socket alive");
      // Don't close the socket on unmount in dev mode
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Current Space Info
  // ─────────────────────────────────────────────────────────────────────────
  const currentSpace = useMemo(() => {
    if (!state || !meId) return null;
    const myPos = state.players[meId]?.position ?? 0;
    return spaces[myPos] || null;
  }, [state, meId, spaces]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background p-4">
      {/* Lobby/Join/Landing Modals */}
      <LobbyModal
        showLanding={showLanding}
        showJoinInput={showJoinInput}
        showLobby={showLobby}
        isConnecting={isConnecting}
        isStarted={isStarted}
        isSocketConnected={isSocketConnected}
        connectionError={connectionError}
        playerName={playerName}
        joinRoomCode={joinRoomCode}
        roomId={roomId}
        isHost={isHost}
        state={state}
        players={players}
        onPlayerNameChange={setPlayerName}
        onJoinRoomCodeChange={setJoinRoomCode}
        onCreateGame={handleCreateGame}
        onShowJoinInput={() => {
          setShowLanding(false);
          setShowJoinInput(true);
        }}
        onBackToLanding={() => {
          setShowJoinInput(false);
          setShowLanding(true);
        }}
        onJoinGame={handleJoinGame}
        onStartGame={handleStartGame}
      />

      {/* Tax Modal */}
      {taxModal.show && <TaxModal amount={taxModal.amount} />}

      {/* Card Modal */}
      {cardModal.show && cardModal.cardId && (
        <CardModal cardId={cardModal.cardId} onClose={() => setCardModal({ show: false, cardId: null })} />
      )}

      {/* Game Over Modal */}
      {state?.phase === "GAME_OVER" && state.winnerId && <GameOverModal state={state} players={players} />}

      {/* Main Game Layout */}
      {isStarted && (
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Panel - Player Dashboard */}
          <aside className="lg:col-span-3">
            <PlayerDashboard
              currentPlayer={currentPlayer}
              players={players}
              dice={dice}
              rolling={rolling}
              isStarted={isStarted}
              canRoll={canRoll}
              canEnd={canEnd}
              moving={moving}
              isHost={isHost}
              roomId={roomId}
              onRollDice={handleRollDice}
              onEndTurn={handleEndTurn}
              onEndGame={handleEndGame}
              onLeaveGame={handleLeaveGame}
            />
          </aside>

          {/* Center Panel - Game Board */}
          <main className="lg:col-span-6">
            <GameBoard
              players={players}
              displayPositions={displayPositions}
              tokenOffsets={tokenOffsets}
              currentPlayerId={currentPlayerId}
              state={state}
              meId={meId}
              roomId={roomId}
              isStarted={isStarted}
              showFlyCard={showFlyCard}
              onDrawCard={handleDrawCard}
            />

            {/* Current Space Card */}
            {currentSpace && (
              <div className="mt-6">
                <CurrentSpaceCard
                  space={currentSpace}
                  canBuy={state?.phase === "RESOLVE" && currentPlayerId === meId && !currentSpace.owner}
                  onBuy={handleBuyProperty}
                />
              </div>
            )}
          </main>

          {/* Right Panel - Property & Activity */}
          <aside className="lg:col-span-3 space-y-4">
            <PropertyPanel players={players} spaces={spaces} />
            <ActivityLog log={log} />
          </aside>
        </div>
      )}
    </div>
  );
}
