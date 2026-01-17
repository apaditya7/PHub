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
import Nav from "./components/Nav";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";

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
  makeUtility("Aircon"),
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
  makeUtility("Campus WiFi"),
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

  const canDrawChance = isStarted && !moving && currentSpace.type === "chance";
  const canDrawCommunity =
    isStarted && !moving && currentSpace.type === "community";

  const handleDrawChance = () => {
    if (!canDrawChance) return;
    addLog("Chance card drawn (stub).");
  };

  const handleDrawCommunity = () => {
    if (!canDrawCommunity) return;
    addLog("Community Chest card drawn (stub).");
  };

  const handleBuy = () => {
    if (!roomId) return;
    if (!canBuyCurrent) return;
    emitBuy(roomId);
  };

  const handleCreateGame = () => {
    setIsConnecting(true);
    setShowLanding(false);
    const name = localStorage.getItem("playerName") || "Player";
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
    const name = localStorage.getItem("playerName") || "Player";
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full flex-col gap-5 px-8 py-6">
        <Nav title="Monopoly" />

        <div className="grid gap-5 lg:grid-cols-[260px_1fr_260px]">
          {/* Left Panel */}
          <div className="flex flex-col gap-4">
            {/* Current Turn Header */}
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="h-4 w-4 rounded-full shadow-sm"
                style={{ background: cp.color }}
              />
              <div>
                <p className="font-medium">{cp.name}'s Turn</p>
                <p className="text-sm text-muted-foreground">${cp.cash}</p>
              </div>
              {isStarted && (
                <Button variant="outline" size="sm" className="ml-auto" onClick={() => window.location.reload()}>
                  New Game
                </Button>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Turn Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-xl font-bold ${rolling ? "animate-pulse" : ""}`}>
                    {dice[0]}
                  </span>
                  <span className={`flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-xl font-bold ${rolling ? "animate-pulse" : ""}`}>
                    {dice[1]}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    onClick={rollDice}
                    disabled={!isStarted || !canRoll}
                  >
                    Roll Dice
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={endTurn}
                    disabled={!isStarted || !canEnd}
                  >
                    End Turn
                  </Button>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  {!isStarted
                    ? "Start a new game to begin."
                    : moving
                    ? "Moving token..."
                    : canRoll
                    ? "Roll the dice to start."
                    : "Resolve the turn, then end it."}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Players</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {players.map((player) => (
                  <div key={player.id} className="flex items-center gap-3">
                    <span
                      className={`token token-${player.token}`}
                      style={{ backgroundColor: player.color }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{player.name}</p>
                      <p className="text-xs text-muted-foreground">${player.cash}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Board */}
          <section className="board-panel">
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

          {/* Right Panel */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Current Space</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{currentSpace.name}</p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {currentSpace.type}
                  </p>
                </div>
                {currentSpace.price && (
                  <p className="text-xs text-muted-foreground">
                    Price: ${currentSpace.price} · Rent: ${currentSpace.rent ?? 0}
                  </p>
                )}
                {currentSpace.tax && (
                  <p className="text-xs text-muted-foreground">Fee: ${currentSpace.tax}</p>
                )}
                {currentSpace.ownerId != null && (
                  <p className="text-xs text-muted-foreground">
                    Owner: {players.find((p) => p.id === currentSpace.ownerId)?.name ?? "Unknown"}
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  {canBuyCurrent && (
                    <Button size="sm" onClick={handleBuy}>
                      Buy property
                    </Button>
                  )}
                  {canDrawChance && (
                    <Button size="sm" variant="outline" onClick={handleDrawChance}>
                      Draw chance
                    </Button>
                  )}
                  {canDrawCommunity && (
                    <Button size="sm" variant="outline" onClick={handleDrawCommunity}>
                      Draw community
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Property Ownership</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {players.map((player) => {
                  const properties = ownedByPlayer.get(player.id) ?? [];
                  return (
                    <div key={player.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`token token-${player.token}`}
                          style={{ backgroundColor: player.color, width: 14, height: 14 }}
                        />
                        <span className="text-sm font-medium">{player.name}</span>
                      </div>
                      {properties.length === 0 ? (
                        <p className="text-xs text-muted-foreground pl-5">No assets yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1 pl-5">
                          {properties.map((space) => (
                            <span
                              key={space.name}
                              className="rounded px-1.5 py-0.5 text-xs text-white"
                              style={{ backgroundColor: space.color ?? "#666" }}
                            >
                              {space.name.split(" ")[0]}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                  {log.map((entry, index) => (
                    <p key={`${entry}-${index}`}>{entry}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {/* Loading Screen */}
      {isConnecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Connecting...</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-sm text-muted-foreground">Please wait</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Landing Screen - Create or Join */}
      {showLanding && !isConnecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Monopoly Game</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {connectionError ? (
                <>
                  <p className="text-center text-sm font-medium text-red-600">
                    ⚠️ {connectionError}
                  </p>
                  <p className="text-center text-sm text-muted-foreground">
                    Make sure the backend server is running:
                    <br />
                    <code className="mt-1 inline-block rounded bg-muted px-2 py-1 text-xs">
                      cd backend && npm run dev
                    </code>
                  </p>
                  <Button className="w-full" onClick={() => window.location.reload()}>
                    Retry Connection
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-center text-sm text-muted-foreground">
                    {!isSocketConnected ? "🔄 Connecting to server..." : "Choose an option to begin"}
                  </p>
                  <div className="flex flex-col gap-3">
                    <Button
                      className="w-full"
                      onClick={handleCreateGame}
                      disabled={!isSocketConnected}
                    >
                      Create New Game
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleShowJoinInput}
                      disabled={!isSocketConnected}
                    >
                      Join Existing Game
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Join Game - Enter Room Code */}
      {showJoinInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Join Game</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                Enter the room code to join
              </p>
              <Input
                value={joinRoomCode}
                onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter room code (e.g. ABC12)"
                maxLength={5}
                className="text-center text-lg uppercase tracking-widest"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && joinRoomCode.trim()) {
                    handleJoinGame();
                  }
                }}
                autoFocus
              />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={handleBackToLanding}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleJoinGame}
                  disabled={isConnecting || !joinRoomCode.trim()}
                >
                  {isConnecting ? "Joining..." : "Join Game"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lobby - Wait for Players */}
      {showLobby && !isStarted && !isConnecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Game Lobby</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-sm text-muted-foreground">Room Code</p>
                <p className="text-2xl font-bold tracking-widest">{roomId}</p>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Share this code with other players!
              </p>

              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Players ({state?.turnOrder.length || 0})
                </p>
                <div className="space-y-2">
                  {players.map((player, idx) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 rounded-lg bg-muted p-3"
                    >
                      <span
                        className={`token token-${player.token}`}
                        style={{ backgroundColor: player.color }}
                      />
                      <span className="text-sm">{player.name}</span>
                      {idx === 0 && (
                        <span className="ml-auto text-xs text-muted-foreground">(Host)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {state && state.turnOrder.length < 2 && (
                <p className="text-center text-sm text-muted-foreground">
                  Waiting for at least 2 players to start...
                </p>
              )}

              {isHost ? (
                <Button
                  className="w-full"
                  onClick={handleStartGame}
                  disabled={!state || state.turnOrder.length < 2}
                >
                  Start Game
                </Button>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  Waiting for host to start the game...
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
