import { useEffect, useMemo, useRef, useState } from "react";
import {
  connectSocket,
  createOrJoinRoom,
  emitBuy,
  emitEndTurn,
  emitPayJailFine,
  emitRoll,
  emitStartGame,
  emitUseGOOJF,
  getSocket,
  type GameState,
  type RoomUpdatePayload,
} from "./services/socket";
import { cardById } from "./game/cards-data";

type SpaceType =
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

interface Space {
  name: string;
  type: SpaceType;
  color?: string;
  ownerId?: string;
  price?: number;
  rent?: number;
  tax?: number;
}

interface UIPlayer {
  id: string;
  name: string;
  position: number;
  cash: number;
  token: "car" | "statue" | "book" | "tower";
  color: string;
  inJail?: boolean;
  getOutOfJailFree?: number;
}

const makeProperty = (name: string, color: string, price: number): Space => ({
  name,
  type: "property",
  color,
  price,
  rent: Math.round(price * 0.1),
});

const makeRail = (name: string): Space => ({
  name,
  type: "rail",
  price: 200,
  rent: 25,
});

const makeUtility = (name: string): Space => ({
  name,
  type: "utility",
  price: 150,
  rent: 15,
});

const makeTax = (name: string, amount: number): Space => ({
  name,
  type: "tax",
  tax: amount,
});


const createSpaces = (): Space[] => [
  { name: "GO", type: "go" },
  makeProperty("Core Curriculum Bidding Mods (SMU)", "#8b5a33", 60),
  { name: "Community Chest", type: "community" },
  makeProperty("ML004 / CC Mods (NTU)", "#8b5a33", 60),
  makeTax("School Fees", 150),
  makeRail("Hall Points System"),
  makeProperty("Yunnan Library (NTU)", "#7cc6de", 100),
  { name: "Chance", type: "chance" },
  makeProperty("Central Library (NUS)", "#7cc6de", 100),
  makeProperty("Campus Green (SMU)", "#7cc6de", 120),
  { name: "Campus Security (Just Visiting)", type: "jail" },
  makeProperty("One Stop SAC (NTU)", "#e6a3c1", 140),
  makeTax("Hall Aircon", 150),
  makeProperty("Office of Student Affairs (NUS)", "#e6a3c1", 140),
  makeProperty("Admin Offices (SMU)", "#e6a3c1", 160),
  makeRail("Overseas Exchange Allocation"),
  makeProperty("North Spine (NTU)", "#d78b44", 180),
  { name: "Community Chest", type: "community" },
  makeProperty("Supper Stretch (NUS)", "#d78b44", 180),
  makeProperty("T-Junction (SMU)", "#d78b44", 200),
  { name: "Free Parking", type: "freeParking" },
  makeProperty("Connexion (SMU)", "#ce4d45", 220),
  { name: "Chance", type: "chance" },
  makeProperty("UTown (NUS)", "#ce4d45", 220),
  makeProperty("CCDS (NTU)", "#ce4d45", 240),
  makeRail("Student Activity Centre (SAC)"),
  makeProperty("Hot Hideout (NTU)", "#e6c24f", 260),
  makeProperty("Deck / Frontier (NUS)", "#e6c24f", 260),
  makeTax("Campus WiFi", 150),
  makeProperty("WokExpress (NUS)", "#e6c24f", 280),
  { name: "Go To Campus Security", type: "goToJail" },
  makeProperty("NUS Overseas College (NUS)", "#4f9b5a", 300),
  { name: "Community Chest", type: "community" },
  makeProperty("PGP Residences (NUS)", "#4f9b5a", 300),
  makeProperty("Gaia (NTU)", "#4f9b5a", 320),
  makeRail("Student Activities (SAC)"),
  { name: "Chance", type: "chance" },
  makeProperty("LKC Medicine (NTU)", "#2c4a92", 350),
  makeTax("Hall Fees", 150),
  makeProperty("NUS Medicine (NUS)", "#2c4a92", 400),
];

const TOKENS: UIPlayer["token"][] = ["car", "statue", "book", "tower"];
const TOKEN_COLORS = ["#d3453a", "#2c7fb3", "#3b9b6d", "#d1a344"];
const DEFAULT_STARTING_CASH = 1500;
const OWNABLE_TYPES: SpaceType[] = ["property", "rail", "utility"];

const createPlayers = (count: number, startingCash: number): UIPlayer[] =>
  Array.from({ length: count }, (_, index) => ({
    id: String(index),
    name: `Player ${index + 1}`,
    position: 0,
    cash: startingCash,
    token: TOKENS[index],
    color: TOKEN_COLORS[index],
  }));

const TOTAL_TILES = 40;
const BOARD_UNITS = 13;
const CORNER_UNITS = 2;
const EDGE_UNITS = 1;
const MIN_TRACK = CORNER_UNITS / 2;
const MAX_TRACK = BOARD_UNITS - CORNER_UNITS / 2;
const EDGE_START = CORNER_UNITS;
const EDGE_END = BOARD_UNITS - CORNER_UNITS;

const getTilePosition = (index: number) => {
  if (index === 0) return { x: MAX_TRACK, y: MAX_TRACK };
  if (index > 0 && index < 10) {
    return { x: EDGE_END - (index - 0.5) * EDGE_UNITS, y: MAX_TRACK };
  }
  if (index === 10) return { x: MIN_TRACK, y: MAX_TRACK };
  if (index > 10 && index < 20) {
    return { x: MIN_TRACK, y: EDGE_END - (index - 10 - 0.5) * EDGE_UNITS };
  }
  if (index === 20) return { x: MIN_TRACK, y: MIN_TRACK };
  if (index > 20 && index < 30) {
    return { x: EDGE_START + (index - 20 - 0.5) * EDGE_UNITS, y: MIN_TRACK };
  }
  if (index === 30) return { x: MAX_TRACK, y: MIN_TRACK };
  return { x: MAX_TRACK, y: EDGE_START + (index - 30 - 0.5) * EDGE_UNITS };
};

export default function App() {
  const [players, setPlayers] = useState<UIPlayer[]>([]);
  const [spaces, setSpaces] = useState<Space[]>(() => createSpaces());
  const [current, setCurrent] = useState(0);
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [log, setLog] = useState<string[]>([
    "Welcome to the Monopoly frontend prototype.",
  ]);
  const [isStarted, setIsStarted] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [showLobby, setShowLobby] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [moving, setMoving] = useState(false);
  const [canRoll, setCanRoll] = useState(false);
  const [canEnd, setCanEnd] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const meRef = useRef<string | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [localDrawnCard, setLocalDrawnCard] = useState<{ deck: 'chance' | 'community'; cardId: string } | null>(null);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [taxInfo, setTaxInfo] = useState<{ amount: number; tileIndex: number } | null>(null);
  const [playerName, setPlayerName] = useState<string>(() => (localStorage.getItem('playerName') || ''));

  const currentPlayer = players[current];
  const cp = currentPlayer ?? { name: "...", cash: 0, position: 0, color: "#999", id: "-", token: "car" as const };
  const currentSpace = spaces[cp.position] ?? spaces[0];

  const addLog = (message: string) => {
    setLog((prev) => [message, ...prev.slice(0, 6)]);
  };

  const isOwnable = (space: Space) => OWNABLE_TYPES.includes(space.type);

  const rollDice = () => {
    if (!roomId || !canRoll || moving) return;
    setCanRoll(false);
    emitRoll(roomId);
  };

  const endTurn = () => {
    if (!roomId || !canEnd || moving) return;
    setCanEnd(false);
    emitEndTurn(roomId);
  };

  const tilePositions = useMemo(() => {
    return spaces.map((space, index) => ({
      ...space,
      index,
      ...getTilePosition(index),
    }));
  }, [spaces]);

  const ownedByPlayer = useMemo(() => {
    const map = new Map<string, Space[]>();
    for (const player of players) {
      map.set(player.id, []);
    }
    for (const space of spaces) {
      if (space.ownerId != null) {
        const arr = map.get(String(space.ownerId)) || [];
        arr.push(space);
        map.set(String(space.ownerId), arr);
      }
    }
    return map;
  }, [spaces, players]);

  const getTilePercent = (index: number) => {
    const tile = tilePositions[index];
    const left = (tile.x / BOARD_UNITS) * 100;
    const top = (tile.y / BOARD_UNITS) * 100;
    return { left: `${left}%`, top: `${top}%` };
  };

  const canBuyCurrent =
    isStarted &&
    !moving &&
    isOwnable(currentSpace) &&
    currentSpace.ownerId == null &&
    (currentSpace.price ?? 0) <= (currentPlayer?.cash ?? 0);

  const handleBuy = () => {
    if (!roomId) return;
    if (!canBuyCurrent) return;
    emitBuy(roomId);
  };

  const handleCreateGame = () => {
    setIsConnecting(true);
    setShowLanding(false);
    const name = (playerName || "").trim() || "Player";
    localStorage.setItem("playerName", name);
    console.log("Creating room for player:", name);

    // If not connected, try to wait a bit for connection
    const attemptCreate = () => {
      createOrJoinRoom(name).then((rid) => {
        console.log("Room created:", rid);
        roomIdRef.current = rid;
        setRoomId(rid);
        setIsHost(true);
        setIsConnecting(false);
        setShowLobby(true);
        addLog(`Created room ${rid}`);
      }).catch((err) => {
        console.error("Failed to create room:", err);
        addLog("Failed to create room - is backend running?");
        setIsConnecting(false);
        setShowLanding(true);
        setConnectionError("Cannot create room. Make sure backend is running.");
      });
    };

    if (!isSocketConnected) {
      console.log("Socket not connected yet, waiting 2 seconds...");
      addLog("Connecting to server...");
      setTimeout(() => {
        if (isSocketConnected) {
          attemptCreate();
        } else {
          console.error("Socket still not connected after timeout");
          setIsConnecting(false);
          setShowLanding(true);
          setConnectionError("Cannot connect to server. Is the backend running on port 4000?");
        }
      }, 2000);
    } else {
      attemptCreate();
    }
  };

  const handleJoinGame = () => {
    if (!joinRoomCode.trim()) {
      addLog("Please enter a room code");
      return;
    }

    setIsConnecting(true);
    setShowJoinInput(false);
    const name = (playerName || "").trim() || "Player";
    localStorage.setItem("playerName", name);
    const code = joinRoomCode.trim().toUpperCase();

    const attemptJoin = () => {
      const s = getSocket();
      console.log("Joining room:", code, "as player:", name);
      s.emit("joinRoom", code, name, (ok: boolean, message?: string) => {
        console.log("Join room response - ok:", ok, "message:", message);
        if (ok) {
          console.log("Successfully joined, setting room state...");
          roomIdRef.current = code;
          setRoomId(code);
          setIsHost(false);
          setIsConnecting(false);
          setShowLobby(true);
          addLog(`Joined room ${code}`);
        } else {
          console.error("Failed to join room:", message);
          addLog(`Failed to join room - ${message || "room not found"}`);
          setIsConnecting(false);
          setShowJoinInput(true);
        }
      });
    };

    if (!isSocketConnected) {
      console.log("Socket not connected yet, waiting 2 seconds...");
      addLog("Connecting to server...");
      setTimeout(() => {
        if (isSocketConnected) {
          attemptJoin();
        } else {
          console.error("Socket still not connected after timeout");
          setIsConnecting(false);
          setShowJoinInput(true);
          setConnectionError("Cannot connect to server. Is the backend running on port 4000?");
        }
      }, 2000);
    } else {
      attemptJoin();
    }
  };

  const handleShowJoinInput = () => {
    setShowLanding(false);
    setShowJoinInput(true);
  };

  const handleBackToLanding = () => {
    setShowJoinInput(false);
    setShowLanding(true);
    setJoinRoomCode("");
  };

  const handleStartGame = () => {
    const currentRoomId = roomIdRef.current;
    if (currentRoomId) {
      emitStartGame(currentRoomId);
      addLog("Starting game...");
    }
  };

  // Token/color assignment per playerId
  const tokenMapRef = useRef<Record<string, UIPlayer["token"]>>({});
  const colorMapRef = useRef<Record<string, string>>({});

  useEffect(() => {
    console.log("Setting up socket connection...");

    // Initialize socket immediately
    const s = getSocket();

    // Set up event handlers
    const handleConnect = (id: string) => {
      console.log("Socket connected with ID:", id);
      meRef.current = id;
      setMeId(id);
      setIsSocketConnected(true);
      setConnectionError(null);
      addLog(`Connected to server`);
    };

    const s2 = connectSocket({
      onConnect: handleConnect,
      onRoomUpdate: (r: RoomUpdatePayload) => {
        // This is a lightweight summary; we map turn to index later using full state
        setCanEnd(false);
      },
      onGameUpdate: (g: GameState) => {
        console.log("Received gameUpdate:", g);
        setState(g);
        setDice(g.lastRoll || [1, 1]);
        // Sync isStarted with backend state
        setIsStarted(g.started);
        
        // Update spaces with owner information from the server
        setSpaces(prevSpaces => 
          prevSpaces.map((space, index) => {
            const boardTile = g.board[index];
            return {
              ...space,
              ownerId: boardTile ? (boardTile.ownerId || undefined) : undefined,
            };
          })
        );

        // Build UI players array in turn order
        const ids = g.turnOrder;
        const ui: UIPlayer[] = ids.map((pid, i) => {
          const p = g.players[pid];
          if (!p) {
            console.warn(`Player ${pid} in turnOrder but not in players object!`);
          }
          if (!tokenMapRef.current[pid]) {
            tokenMapRef.current[pid] = TOKENS[(Object.keys(tokenMapRef.current).length) % TOKENS.length];
            colorMapRef.current[pid] = TOKEN_COLORS[(Object.keys(colorMapRef.current).length) % TOKEN_COLORS.length];
          }
          return {
            id: pid,
            name: p?.name || `P${i + 1}`,
            position: p?.position ?? 0,
            cash: p?.cash ?? 1500,
            token: tokenMapRef.current[pid],
            color: colorMapRef.current[pid],
            inJail: p?.inJail,
            getOutOfJailFree: p?.getOutOfJailFree,
          };
        });
        setPlayers(ui);
        // Who's turn index
        const turnPid = ids[g.currentTurn];
        const idx = ids.findIndex((x) => x === turnPid);
        setCurrent(idx >= 0 ? idx : 0);

        const myPid = meRef.current && g.players[meRef.current] ? meRef.current : null;
        const isMyTurn = myPid ? ids[g.currentTurn] === myPid : false;
        // canRoll: my turn, game started, and haven't rolled yet
        setCanRoll(Boolean(isMyTurn && g.started && !g.hasRolledThisTurn));
        // canEnd: my turn, game started, and have rolled
        setCanEnd(Boolean(isMyTurn && g.started && g.hasRolledThisTurn));
        setMoving(false);

        // When game starts, close lobby and show game board
        if (g.started && showLobby) {
          setShowLobby(false);
        }
      },
      onError: (msg) => {
        console.error("Socket error:", msg);
        setLog((prev) => [String(msg), ...prev.slice(0, 6)]);
      },
      onPrivateCardDrawn: (p) => {
        setLocalDrawnCard(p);
        setShowCardModal(true);
      },
      onPrivateTaxCharged: (p) => {
        setTaxInfo(p);
        setShowTaxModal(true);
        setTimeout(() => setShowTaxModal(false), 2000);
      }
    });

    // Add error and disconnect handlers
    // Check if already connected
    if (s.connected) {
      console.log("Socket already connected:", s.id);
      handleConnect(s.id ?? "");
    }

    s.on("connect_error", (err) => {
      console.error("Connection error:", err);
      setConnectionError(`Cannot connect to server. Is the backend running on port 4000?`);
      setIsSocketConnected(false);
    });

    s.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsSocketConnected(false);
    });

    // Cleanup function - but don't close the socket
    return () => {
      console.log("Component unmounting, but keeping socket alive");
      // Don't close the socket on unmount in dev mode
      // s.close();
    };
  }, []);

  const myPid = meRef.current && state && state.players[meRef.current] ? meRef.current : null;
  const myPlayer = myPid && state ? state.players[myPid] : null;
  const onProperty = state ? state.board[myPlayer?.position ?? 0]?.type === "PROPERTY" : false;
  const propertyOwned = state ? Boolean(state.board[myPlayer?.position ?? 0]?.ownerId) : false;
  const canBuy = Boolean(myPlayer && onProperty && !propertyOwned && (myPlayer.cash ?? 0) > (state?.board[myPlayer.position].price ?? Infinity) - 1 && canRoll === false);
  const isInJail = Boolean(myPlayer?.inJail);

  // Distribute tokens slightly when multiple players share a tile
  const tokenOffsets = useMemo(() => {
    const map = new Map<any, { x: number; y: number }>();
    const byPos = new Map<number, typeof players>();
    for (const p of players) {
      const arr = byPos.get(p.position) || [];
      arr.push(p);
      byPos.set(p.position, arr);
    }
    const patterns: Array<{ x: number; y: number }> = [
      { x: -8, y: -8 },
      { x: 8, y: -8 },
      { x: -8, y: 8 },
      { x: 8, y: 8 },
      { x: 0, y: -12 },
      { x: -12, y: 0 },
      { x: 12, y: 0 },
      { x: 0, y: 12 },
    ];
    byPos.forEach((arr) => {
      arr.forEach((p, i) => {
        const off = patterns[i] || { x: 0, y: 0 };
        map.set(p.id as any, off);
      });
    });
    return map;
  }, [players]);

  // Card modal is driven by a private event from the server (only for acting player)
  const drawnCard = localDrawnCard ? cardById(localDrawnCard.cardId) : null;
  const drawnMeta = localDrawnCard
    ? {
        deck: localDrawnCard.deck,
        title: drawnCard?.name || `Card Drawn (${localDrawnCard.cardId})`,
        description: drawnCard?.description || "A card was drawn, but details are unavailable on the client.",
      }
    : null;

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Monopoly Frontend Prototype</h1>
          <p className="subtitle">
            Board rendering, turn flow, dice feedback, and Socket.IO wiring.
          </p>
        </div>
        <div className="turn-card">
          {isStarted && (
            <button
              type="button"
              className="start-button"
              onClick={() => window.location.reload()}
            >
              New Game
            </button>
          )}
          <span className="label">Current turn</span>
          <p className="player">
            <span className="player-chip" style={{ background: cp.color }} />
            {cp.name}
          </p>
          <p className="cash">${cp.cash}</p>
        </div>
      </header>

      <main className="layout">
        <section className="panel-card control-panel">
          <h3>Turn controls</h3>
          <div className={`dice ${rolling ? "rolling" : ""}`}>
            <span>{dice[0]}</span>
            <span>{dice[1]}</span>
          </div>
          <div className="actions">
            <button
              type="button"
              onClick={rollDice}
              disabled={!isStarted || !canRoll}
            >
              Roll Dice
            </button>
            <button
              type="button"
              onClick={endTurn}
              disabled={!isStarted || !canEnd}
            >
              End Turn
            </button>
          </div>
          <p className="status">
            {!isStarted
              ? "Start a new game to begin."
              : moving
              ? "Moving token..."
              : canRoll
              ? "Roll the dice to start."
              : "Resolve the turn, then end it."}
          </p>
        </section>

        <section className="panel-card players-panel">
          <h3>Players</h3>
          <div className="players">
            {players.map((player) => (
              <div key={player.id} className="player-row">
                <span
                  className={`token token-${player.token}`}
                  style={{ backgroundColor: player.color }}
                />
                <div>
                  <p>{player.name}</p>
                  <p className="cash">${player.cash}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="board-panel layout-board">
          <div className="board">
            <div className="token-layer">
              <span className="space-highlight" style={getTilePercent(cp.position)} />
              {players.map((player) => (
                <span
                  key={player.id}
                  className={`token token-${player.token}`}
                  style={{
                    backgroundColor: player.color,
                    ...getTilePercent(player.position),
                    ["--token-offset-x" as any]: `${
                      tokenOffsets.get(player.id)?.x ?? 0
                    }px`,
                    ["--token-offset-y" as any]: `${
                      tokenOffsets.get(player.id)?.y ?? 0
                    }px`,
                  }}
                  title={player.name}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="panel-card current-space-panel">
          <h3>Current space</h3>
          <div className="space-details">
            <p className="space-name">{currentSpace.name}</p>
            <p className="space-type">{String(currentSpace.type).toUpperCase()}</p>
            {currentSpace.price && (
              <p className="space-cost">
                Price: ${currentSpace.price} · Rent: ${currentSpace.rent ?? 0}
              </p>
            )}
            {currentSpace.tax && (
              <p className="space-cost">Fee: ${currentSpace.tax}</p>
            )}
            {currentSpace.ownerId != null && (
              <p className="space-owner">
                Owner:{" "}
                {players.find((p) => p.id === currentSpace.ownerId)?.name ??
                  "Unknown"}
              </p>
            )}
          </div>
          <div className="space-actions">
            {canBuyCurrent && (
              <button type="button" onClick={handleBuy}>
                Buy property
              </button>
            )}
          </div>
        </section>

        <section className="panel-card property-panel">
          <h3>Property ownership</h3>
          <div className="ownership-list">
            {players.map((player) => {
              const properties = ownedByPlayer.get(player.id) ?? [];
              return (
                <div key={player.id} className="ownership-row">
                  <span
                    className={`token token-${player.token}`}
                    style={{ backgroundColor: player.color }}
                  />
                  <div className="ownership-details">
                    <p>{player.name}</p>
                    {(properties.length === 0 && !player.getOutOfJailFree) ? (
                      <p className="ownership-empty">No assets yet.</p>
                    ) : (
                      <div className="ownership-cards">
                        {player.getOutOfJailFree && player.getOutOfJailFree > 0 && (
                          <span className="property-pill property-pill-goojf">
                            Get Out of Jail Free ({player.getOutOfJailFree})
                          </span>
                        )}
                        {properties.map((space) => (
                          <span
                            key={space.name}
                            className={`property-pill property-pill-${space.type}`}
                            style={{
                              backgroundColor: space.color ?? undefined,
                            }}
                          >
                            {space.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel-card log-panel">
          <h3>Activity log</h3>
          <ul className="log">
            {log.map((entry, index) => (
              <li key={`${entry}-${index}`}>{entry}</li>
            ))}
          </ul>
        </section>
      </main>
      {/* Loading Screen */}
      {isConnecting && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Connecting...</h2>
            <p className="modal-subtitle">Please wait</p>
          </div>
        </div>
      )}

      {/* Landing Screen - Create or Join */}
      {showLanding && !isConnecting && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Monopoly Game</h2>
            {connectionError ? (
              <>
                <p className="modal-subtitle" style={{ color: "#d9534f", fontWeight: "bold" }}>
                  ⚠️ {connectionError}
                </p>
                <p style={{ fontSize: "0.875rem", margin: "1rem 0", color: "#666" }}>
                  Make sure the backend server is running:
                  <br />
                  <code style={{ background: "#f5f5f5", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>
                    cd backend && npm run dev
                  </code>
                </p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  style={{ width: "100%", marginTop: "1rem" }}
                >
                  Retry Connection
                </button>
              </>
            ) : (
              <>
                <p className="modal-subtitle">
                  {!isSocketConnected ? "🔄 Connecting to server..." : "Choose an option to begin"}
                </p>
                <div style={{ margin: '0.5rem 0 1rem 0' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', color: '#555', marginBottom: '0.25rem' }}>Your Name</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    maxLength={24}
                    style={{ width: '100%', padding: '0.6rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: 4 }}
                  />
                </div>
                <div className="modal-actions" style={{ flexDirection: "column", gap: "1rem" }}>
                  <button
                    type="button"
                    onClick={handleCreateGame}
                    disabled={!isSocketConnected || !playerName.trim()}
                    style={{ width: "100%" }}
                  >
                    Create New Game
                  </button>
                  <button
                    type="button"
                    onClick={handleShowJoinInput}
                    disabled={!isSocketConnected || !playerName.trim()}
                    className="secondary"
                    style={{ width: "100%" }}
                  >
                    Join Existing Game
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Join Game - Enter Room Code */}
      {showJoinInput && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Join Game</h2>
            <p className="modal-subtitle">Enter your name and the room code</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Your name"
                maxLength={24}
                style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}
              />
              <input
                type="text"
                value={joinRoomCode}
                onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter room code (e.g. ABC12)"
                maxLength={5}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  fontSize: "1.25rem",
                  textAlign: "center",
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  border: "2px solid #ccc",
                  borderRadius: "4px",
                  marginBottom: "0.25rem"
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && joinRoomCode.trim() && playerName.trim()) {
                    handleJoinGame();
                  }
                }}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                onClick={handleBackToLanding}
                className="secondary"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleJoinGame}
                disabled={isConnecting || !joinRoomCode.trim() || !playerName.trim()}
              >
                {isConnecting ? "Joining..." : "Join Game"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lobby - Wait for Players */}
      {showLobby && !isStarted && !isConnecting && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Game Lobby</h2>
            <p className="modal-subtitle" style={{ fontSize: "1.5rem", margin: "1rem 0" }}>
              Room Code: <strong style={{ letterSpacing: "0.2em" }}>{roomId}</strong>
            </p>
            <p className="modal-subtitle">Share this code with other players!</p>

            <div style={{ margin: "2rem 0" }}>
              <h3 style={{ marginBottom: "1rem" }}>
                Players ({state?.turnOrder.length || 0})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {players.map((player, idx) => (
                  <div
                    key={player.id}
                    style={{
                      padding: "0.75rem",
                      background: "#f5f5f5",
                      borderRadius: "4px",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem"
                    }}
                  >
                    <span
                      className={`token token-${player.token}`}
                      style={{ backgroundColor: player.color }}
                    />
                    <span>{player.name}</span>
                    {idx === 0 && <span style={{ marginLeft: "auto", fontSize: "0.875rem", color: "#666" }}>(Host)</span>}
                  </div>
                ))}
              </div>
            </div>

            {state && state.turnOrder.length < 2 && (
              <p style={{ color: "#666", fontSize: "0.875rem", marginBottom: "1rem" }}>
                Waiting for at least 2 players to start...
              </p>
            )}

            <div className="modal-actions">
              {isHost ? (
                <button
                  type="button"
                  onClick={handleStartGame}
                  disabled={!state || state.turnOrder.length < 2}
                  style={{ width: "100%" }}
                >
                  Start Game
                </button>
              ) : (
                <p style={{ textAlign: "center", color: "#666" }}>
                  Waiting for host to start the game...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Card Modal (only for acting player via private event) */}
      {showCardModal && localDrawnCard && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2 className={`card-title card-title-${localDrawnCard?.deck}`}>
              {localDrawnCard?.deck === 'chance' ? '🎲 CHANCE' : 'COMMUNITY CHEST'}
            </h2>
            <p className="modal-subtitle" style={{ margin: '1rem 0' }}>
              {drawnMeta?.title}
            </p>
            <p style={{ fontSize: '1.125rem', margin: '2rem 0', lineHeight: 1.5 }}>
              {drawnMeta?.description}
            </p>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => { setShowCardModal(false); setLocalDrawnCard(null); }}
                style={{ width: "100%" }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tax popup (only acting player) */}
      {showTaxModal && taxInfo && (
        <div className="modal-backdrop" style={{ background: 'transparent', pointerEvents: 'none' }}>
          <div className="modal" style={{ pointerEvents: 'auto' }}>
            <h2 className="card-title">TAX</h2>
            <p style={{ fontSize: '1.125rem', margin: '1rem 0' }}>
              You paid ${taxInfo.amount}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
