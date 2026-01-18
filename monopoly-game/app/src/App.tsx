import { useEffect, useMemo, useRef, useState } from "react";
import {
  connectSocket,
  createOrJoinRoom,
  createRoomWithBoard,
  emitBuy,
  emitEndTurn,
  emitPayJailFine,
  emitRoll,
  emitStartGame,
  emitUseGOOJF,
  emitDrawCard,
  emitEndGame,
  emitStartDemo,
  getSocket,
  type GameState,
  type RoomUpdatePayload,
} from "./services/socket";
import Nav from "./components/Nav";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
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
  makeProperty("Hall Points System", "#8b5a33", 200),
  makeProperty("Yunnan Garden (NTU)", "#7cc6de", 100),
  { name: "Chance", type: "chance" },
  makeProperty("Central Library (NUS)", "#7cc6de", 100),
  makeProperty("Campus Green (SMU)", "#7cc6de", 120),
  { name: "Visiting (Campus Security)", type: "jail" },
  makeProperty("One Stop (NTU) SAC", "#e6a3c1", 140),
  makeTax("Aircon", 150),
  makeProperty("Office of Student Affairs (NUS)", "#e6a3c1", 140),
  makeProperty("Admin Offices (SMU)", "#e6a3c1", 160),
  makeProperty("Overseas Exchange (NTU)", "#e6a3c1", 200),
  makeProperty("North Spine (NTU)", "#d78b44", 180),
  { name: "Community Chest", type: "community" },
  makeProperty("Supper Stretch (NUS)", "#d78b44", 180),
  makeProperty("Junction (SMU)", "#d78b44", 200),
  { name: "Free Parking", type: "freeParking" },
  makeProperty("CCDS (NTU)", "#ce4d45", 220),
  { name: "Chance", type: "chance" },
  makeProperty("UTown (NUS)", "#ce4d45", 240),
  makeProperty("Connexion (NUS)", "#ce4d45", 260),
  makeRail("Campus Shuttle Buses"),
  makeProperty("Hot Hideout (NUS)", "#e6c24f", 260),
  makeProperty("Deck / Frontier (NUS)", "#e6c24f", 280),
  makeTax("Campus WiFi", 150),
  makeProperty("Koufu (NUS)", "#e6c24f", 300),
  { name: "Go To Jail", type: "goToJail" },
  makeProperty("Gaia (NTU)", "#4f9b5a", 300),
  makeProperty("PGP Residences (NUS)", "#4f9b5a", 300),
  { name: "Community Chest", type: "community" },
  makeProperty("NUS Overseas College (NUS)", "#4f9b5a", 320),
  makeProperty("Student Activity Center (SAC)", "#4f9b5a", 200),
  { name: "Chance", type: "chance" },
  makeProperty("LKC Medicine (NTU)", "#2c4a92", 350),
  makeTax("Hall Fees", 150),
  makeProperty("NUS Med (NUS)", "#2c4a92", 400),
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
const TRACK_OFFSET = 0.6; // Increased to move tokens closer to board edges

const getTilePosition = (index: number) => {
  const minEdge = MIN_TRACK - TRACK_OFFSET;
  const maxEdge = MAX_TRACK + TRACK_OFFSET;
  if (index === 0) return { x: maxEdge, y: maxEdge };
  if (index > 0 && index < 10) {
    return { x: EDGE_END - (index - 0.5) * EDGE_UNITS, y: maxEdge };
  }
  if (index === 10) return { x: minEdge, y: maxEdge };
  if (index > 10 && index < 20) {
    return { x: minEdge, y: EDGE_END - (index - 10 - 0.5) * EDGE_UNITS };
  }
  if (index === 20) return { x: minEdge, y: minEdge };
  if (index > 20 && index < 30) {
    return { x: EDGE_START + (index - 20 - 0.5) * EDGE_UNITS, y: minEdge };
  }
  if (index === 30) return { x: maxEdge, y: minEdge };
  return { x: maxEdge, y: EDGE_START + (index - 30 - 0.5) * EDGE_UNITS };
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
  const [pendingDrawDeck, setPendingDrawDeck] = useState<'chance' | 'community' | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const meRef = useRef<string | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [displayPositions, setDisplayPositions] = useState<Record<string, number>>({});
  const animationTimersRef = useRef<Record<string, number>>({});
  const activeAnimationIdsRef = useRef<Set<string>>(new Set());
  const prevPositionsRef = useRef<Record<string, number>>({});
  const displayPositionsRef = useRef<Record<string, number>>({});
  const [showCardModal, setShowCardModal] = useState(false);
  const [localDrawnCard, setLocalDrawnCard] = useState<{ deck: 'chance' | 'community'; cardId: string } | null>(null);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [taxInfo, setTaxInfo] = useState<{ amount: number; tileIndex: number } | null>(null);
  const [showRentModal, setShowRentModal] = useState(false);
  const [rentInfo, setRentInfo] = useState<{ amount: number; ownerName?: string; payerName?: string; propertyName: string; type: 'paid' | 'received' } | null>(null);
  const [playerName, setPlayerName] = useState<string>(() => (localStorage.getItem('playerName') || ''));
  const [showFlyCard, setShowFlyCard] = useState<null | { deck: 'chance'|'community'; from: { leftPct: number; topPct: number } }>(null);
  const lastPendingTileRef = useRef<number | null>(null);
  const [boardTheme, setBoardTheme] = useState<'main'|'ntu'|'nus'|'smu'>(() => (localStorage.getItem('boardTheme') as any) || 'main');
  const setTheme = (t: 'main'|'ntu'|'nus'|'smu') => { setBoardTheme(t); try { localStorage.setItem('boardTheme', t); } catch {} };

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

  // Center deck placeholder positions (% of board). Adjust as needed to match image.
  const deckCenters = {
    chance: { leftPct: 70, topPct: 70 },
    community: { leftPct: 30, topPct: 30 },
  } as const;

  useEffect(() => {
    displayPositionsRef.current = displayPositions;
  }, [displayPositions]);

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

  const [createBoard, setCreateBoard] = useState<'main'|'ntu'|'nus'|'smu'>(() => (localStorage.getItem('boardTheme') as any) || 'main');
  const [showBoardPicker, setShowBoardPicker] = useState(false);

  const handleCreateGame = () => {
    // Show board selection screen first
    setShowLanding(false);
    setShowBoardPicker(true);
  };

  const confirmCreateGame = () => {
    setIsConnecting(true);
    const name = (playerName || "").trim() || "Player";
    localStorage.setItem("playerName", name);
    localStorage.setItem('boardTheme', createBoard);
    const attemptCreate = () => {
      createRoomWithBoard(name, createBoard).then((rid) => {
        roomIdRef.current = rid;
        setRoomId(rid);
        setIsHost(true);
        setIsConnecting(false);
        setShowBoardPicker(false);
        setShowLobby(true);
        addLog(`Created room ${rid}`);
      }).catch((err) => {
        console.warn("createRoomWithBoard failed, falling back to createRoom:");
        createOrJoinRoom(name).then((rid) => {
          roomIdRef.current = rid;
          setRoomId(rid);
          setIsHost(true);
          setIsConnecting(false);
          setShowBoardPicker(false);
          setShowLobby(true);
          addLog(`Created room ${rid}`);
        }).catch((e2) => {
          console.error("Failed to create room:", e2);
          addLog("Failed to create room - is backend running?");
          setIsConnecting(false);
          setShowBoardPicker(false);
          setShowLanding(true);
          setConnectionError("Cannot create room. Make sure backend is running.");
        });
      });
    };
    if (!isSocketConnected) {
      addLog("Connecting to server...");
      setTimeout(() => {
        if (isSocketConnected) attemptCreate();
        else {
          setIsConnecting(false);
          setShowBoardPicker(false);
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
  const updateMovingFlag = () => setMoving(activeAnimationIdsRef.current.size > 0);

  const cancelAnimation = (playerId: string) => {
    const timer = animationTimersRef.current[playerId];
    if (timer) {
      window.clearTimeout(timer);
      delete animationTimersRef.current[playerId];
    }
    if (activeAnimationIdsRef.current.delete(playerId)) {
      updateMovingFlag();
    }
  };

  const startStepAnimation = (playerId: string, from: number, to: number, total: number) => {
    const steps = (to - from + total) % total;
    if (steps === 0) {
      displayPositionsRef.current = { ...displayPositionsRef.current, [playerId]: to };
      setDisplayPositions((prev) => ({ ...prev, [playerId]: to }));
      return;
    }

    cancelAnimation(playerId);
    activeAnimationIdsRef.current.add(playerId);
    updateMovingFlag();

    let step = 0;
    const stepDelayMs = 220;

    const tick = () => {
      step += 1;
      const nextPos = (from + step) % total;
      // Update ref immediately so rapid state updates have correct current position
      displayPositionsRef.current = { ...displayPositionsRef.current, [playerId]: nextPos };
      setDisplayPositions((prev) => ({ ...prev, [playerId]: nextPos }));

      if (step < steps) {
        animationTimersRef.current[playerId] = window.setTimeout(tick, stepDelayMs);
      } else {
        cancelAnimation(playerId);
      }
    };

    animationTimersRef.current[playerId] = window.setTimeout(tick, stepDelayMs);
  };

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
        // Determine host on the client using socket id
        const myId = meRef.current;
        if (myId) setIsHost(r.hostId === myId);
        if (r.boardTheme) setTheme(r.boardTheme);
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
        const nextPositions: Record<string, number> = {};
        ids.forEach((pid) => {
          nextPositions[pid] = g.players[pid]?.position ?? 0;
        });
        const prevPositions = prevPositionsRef.current;
        const totalSpaces = g.board.length;
        const hasPrev = Object.keys(prevPositions).length > 0;
        const currentDisplays = displayPositionsRef.current;

        const nextDisplayPositions: Record<string, number> = {};
        ids.forEach((pid) => {
          const nextPos = nextPositions[pid];
          const prevPos = prevPositions[pid];
          const currentDisplay = currentDisplays[pid];
          const isAnimating = activeAnimationIdsRef.current.has(pid);
          
          // If currently animating and position unchanged, keep animating from current display
          if (isAnimating) {
            if (prevPos !== undefined && nextPos === prevPos) {
              nextDisplayPositions[pid] = currentDisplay ?? prevPos;
              return;
            }
            // Position changed mid-animation - let animation complete to new target
            if (prevPos !== undefined && nextPos !== prevPos) {
              cancelAnimation(pid);
              // Start new animation from current display position to new target
              const fromPos = currentDisplay ?? prevPos;
              const steps = (nextPos - fromPos + totalSpaces) % totalSpaces;
              if (steps > 0 && steps <= 12) {
                nextDisplayPositions[pid] = fromPos;
                startStepAnimation(pid, fromPos, nextPos, totalSpaces);
              } else {
                nextDisplayPositions[pid] = nextPos;
              }
              return;
            }
          }
          
          // First update - no previous position, just set directly
          if (!hasPrev || prevPos === undefined) {
            nextDisplayPositions[pid] = nextPos;
            return;
          }
          
          // Position hasn't changed, keep current
          if (prevPos === nextPos) {
            nextDisplayPositions[pid] = currentDisplay ?? nextPos;
            return;
          }
          
          // Calculate steps for animation
          const steps = (nextPos - prevPos + totalSpaces) % totalSpaces;
          if (steps > 0 && steps <= 12) {
            nextDisplayPositions[pid] = prevPos;
            startStepAnimation(pid, prevPos, nextPos, totalSpaces);
          } else {
            cancelAnimation(pid);
            nextDisplayPositions[pid] = nextPos;
          }
        });

        // Update ref immediately (before React's async state update) so subsequent 
        // rapid updates have the correct current display positions
        displayPositionsRef.current = nextDisplayPositions;
        setDisplayPositions(nextDisplayPositions);
        prevPositionsRef.current = nextPositions;
        // Who's turn index
        const turnPid = ids[g.currentTurn];
        const idx = ids.findIndex((x) => x === turnPid);
        setCurrent(idx >= 0 ? idx : 0);

        const myPid = meRef.current && g.players[meRef.current] ? meRef.current : null;
        const isMyTurn = myPid ? ids[g.currentTurn] === myPid : false;
        // canRoll: my turn, game started, and haven't rolled yet
        setCanRoll(Boolean(isMyTurn && g.started && !g.hasRolledThisTurn));
        // canEnd: my turn, game started, have rolled, and no pending card draw
        const pd = (g as any).pendingDraw;
        const hasPending = Boolean(pd && pd.playerId === myPid);
        
        // Debug logging for pendingDraw
        if (pd) {
          console.log("[DEBUG] pendingDraw:", pd);
          console.log("[DEBUG] meRef.current:", meRef.current);
          console.log("[DEBUG] myPid:", myPid);
          console.log("[DEBUG] pd.playerId:", pd.playerId);
          console.log("[DEBUG] hasPending:", hasPending);
          console.log("[DEBUG] g.players keys:", Object.keys(g.players));
        }
        
        setCanEnd(Boolean(isMyTurn && g.started && g.hasRolledThisTurn && !hasPending));
        // Track pending draw for "Draw Card" button
        setPendingDrawDeck(hasPending ? pd.deck : null);
        setMoving(false);

        // When game starts, close lobby and show game board
        if (g.started && showLobby) {
          setShowLobby(false);
        }
        // Track pending draw tile index for animation and interactivity
        if ((g as any).pendingDraw) {
          try {
            lastPendingTileRef.current = (g as any).pendingDraw.tileIndex as number;
          } catch {}
        } else {
          lastPendingTileRef.current = null;
        }
      },
      onError: (msg) => {
        console.error("Socket error:", msg);
        setLog((prev) => [String(msg), ...prev.slice(0, 6)]);
      },
      onPrivateCardDrawn: (p) => {
        // Animate from center deck placeholder to center, then open modal
        const from = p.deck === 'chance' ? deckCenters.chance : deckCenters.community;
        setShowFlyCard({ deck: p.deck, from });
        setTimeout(() => {
          setShowFlyCard(null);
          setLocalDrawnCard(p);
          setShowCardModal(true);
        }, 650);
      },
      onPrivateTaxCharged: (p) => {
        setTaxInfo(p);
        setShowTaxModal(true);
        setTimeout(() => setShowTaxModal(false), 2000);
      },
      onPrivateJail: () => {
        // Show brief jail popup for acting player
        setTaxInfo(null);
        setShowTaxModal(false);
        // Reuse a lightweight modal styled as jail
        const el = document.createElement('div');
        el.className = 'fixed inset-0 z-50 flex items-center justify-center pointer-events-none';
        el.innerHTML = `<div class="pointer-events-auto rounded-2xl border-2 border-black/20 bg-white px-6 py-4 shadow-2xl" style="background:#fff5f5"><div class="text-center text-lg font-bold">🚓 GOING TO JAIL</div></div>`;
        document.body.appendChild(el);
        setTimeout(() => { try { document.body.removeChild(el); } catch {} }, 2000);
      },
      onPrivateRentPaid: (p) => {
        setRentInfo({ ...p, type: 'paid' });
        setShowRentModal(true);
        setTimeout(() => setShowRentModal(false), 2500);
      },
      onPrivateRentReceived: (p) => {
        setRentInfo({ ...p, type: 'received' });
        setShowRentModal(true);
        setTimeout(() => setShowRentModal(false), 2500);
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
      Object.values(animationTimersRef.current).forEach((timer) => window.clearTimeout(timer));
      animationTimersRef.current = {};
      activeAnimationIdsRef.current.clear();
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
      const displayPos = displayPositions[p.id] ?? p.position ?? 0;
      const arr = byPos.get(displayPos) || [];
      arr.push(p);
      byPos.set(displayPos, arr);
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
  }, [players, displayPositions]);

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
                  {/* Draw Card Button - appears when player lands on Chance/Community Chest */}
                  {pendingDrawDeck && roomId && (
                    <Button
                      size="sm"
                      onClick={() => emitDrawCard(roomId, pendingDrawDeck)}
                      className={pendingDrawDeck === 'chance' 
                        ? "bg-orange-500 hover:bg-orange-600 text-white animate-pulse" 
                        : "bg-blue-500 hover:bg-blue-600 text-white animate-pulse"}
                    >
                      {pendingDrawDeck === 'chance' ? '🎲 Draw Chance Card' : '🃏 Draw Community Chest'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={endTurn}
                    disabled={!isStarted || !canEnd}
                  >
                    End Turn
                  </Button>
                  {/* Demo Mode Button */}
                  {roomId && isStarted && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => emitStartDemo(roomId)}
                      className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"
                    >
                      🎬 Demo Mode
                    </Button>
                  )}
                  {roomId && (
                    isHost ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => emitEndGame(roomId)}
                        disabled={!isStarted}
                      >
                        End Game (Host)
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => getSocket().emit('leaveRoom', roomId)}
                      >
                        Leave Game
                      </Button>
                    )
                  )}
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  {!isStarted
                    ? "Start a new game to begin."
                    : moving
                    ? "Moving token..."
                    : canRoll
                    ? "Roll the dice to start."
                    : pendingDrawDeck
                    ? `Draw your ${pendingDrawDeck === 'chance' ? 'Chance' : 'Community Chest'} card!`
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
            <div className={`board board-${boardTheme}`}>
              <div className="token-layer">
              {/* Center deck placeholders */}
              {(['chance','community'] as const).map((deck) => {
                const pd = (state as any)?.pendingDraw as any;
                const isMyPending = pd && pd.deck === deck && pd.playerId === meRef.current;
                const clickable = Boolean(isStarted && isMyPending);
                const pos = deck === 'chance' ? deckCenters.chance : deckCenters.community;
                return (
                  <div
                    key={`center-deck-${deck}`}
                    className={`deck ${deck} ${clickable ? 'clickable' : ''}`}
                    style={{ left: `${pos.leftPct}%`, top: `${pos.topPct}%` }}
                    onClick={() => clickable && roomId && emitDrawCard(roomId, deck)}
                    title={deck.toUpperCase()}
                  >
                    {deck === 'chance' ? '🎲' : '🃏'}
                  </div>
                );
              })}

              {showFlyCard && (
                <div
                  className="fly-card"
                  style={{ ["--from-left" as any]: `${showFlyCard.from.leftPct}%`, ["--from-top" as any]: `${showFlyCard.from.topPct}%` }}
                />
              )}
                {players.map((player) => (
                  <span
                    key={player.id}
                    className={`token token-${player.token}`}
                    style={{
                      backgroundColor: player.color,
                      ...getTilePercent(displayPositions[player.id] ?? player.position ?? 0),
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
                              {space.name}
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
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">Your Name</label>
                      <Input
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="Enter your name"
                        maxLength={24}
                      />
                    </div>
                    {/* Board selection moved to the next modal after Create is clicked */}
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button
                      className="w-full"
                      onClick={handleCreateGame}
                      disabled={!isSocketConnected || !playerName.trim()}
                    >
                      Create New Game
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleShowJoinInput}
                      disabled={!isSocketConnected || !playerName.trim()}
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

      {/* Board Picker after Create pressed */}
      {showBoardPicker && !isConnecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Select Board</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Choose which board to play</label>
                <select
                  value={createBoard}
                  onChange={(e) => setCreateBoard(e.target.value as any)}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                >
                  <option value="main">Main Board (Mixed)</option>
                  <option value="ntu">NTU</option>
                  <option value="nus">NUS</option>
                  <option value="smu">SMU</option>
                </select>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => { setShowBoardPicker(false); setShowLanding(true); }}>Back</Button>
                <Button className="flex-1" onClick={confirmCreateGame} disabled={!playerName.trim()}>Create Game</Button>
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

      {/* Card Modal (only for acting player via private event) */}
      {showCardModal && localDrawnCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className={localDrawnCard.deck === 'chance' ? 'text-orange-600' : 'text-blue-600'}>
                {localDrawnCard.deck === 'chance' ? '🎲 CHANCE' : '📦 COMMUNITY CHEST'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center font-medium">{drawnMeta?.title}</p>
              <p className="text-center text-sm text-muted-foreground">{drawnMeta?.description}</p>
              <Button
                className="w-full"
                onClick={() => { setShowCardModal(false); setLocalDrawnCard(null); }}
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Game Ended Overlay with standings */}
      {state?.ended && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Game Over</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                Winner: <span className="font-semibold">{state.winnerId ? (players.find(p => p.id === state.winnerId)?.name || state.winnerId) : '—'}</span>
              </p>
              {(() => {
                if (!state) return null;
                const worthOf = (pid: string) => {
                  const cash = state.players[pid]?.cash ?? 0;
                  let props = 0;
                  for (const t of state.board) {
                    if (t.ownerId === pid) props += t.price ?? 0;
                  }
                  return { cash, props, total: cash + props };
                };
                const entries = Object.keys(state.players)
                  .map(pid => ({ pid, name: state.players[pid]?.name || pid, ...worthOf(pid) }))
                  .sort((a, b) => b.total - a.total);
                return (
                  <div className="space-y-2">
                    {entries.map((e, idx) => (
                      <div key={e.pid} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{idx + 1}. {e.name}</span>
                        <span className="text-muted-foreground">${e.total} <span className="text-xs">(cash ${e.cash} + props ${e.props})</span></span>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <Button className="w-full" onClick={() => window.location.reload()}>New Game</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tax popup (only acting player) */}
      {showTaxModal && taxInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <Card className="w-full max-w-sm pointer-events-auto">
            <CardHeader className="text-center">
              <CardTitle>💰 TAX</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-lg">You paid ${taxInfo.amount}.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rent popup (payer or receiver) */}
      {showRentModal && rentInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <Card className="w-full max-w-sm pointer-events-auto" style={{ background: rentInfo.type === 'paid' ? '#fff5f5' : '#f0fff4' }}>
            <CardHeader className="text-center">
              <CardTitle>{rentInfo.type === 'paid' ? '🏠 RENT PAID' : '💵 RENT RECEIVED'}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-lg font-semibold">${rentInfo.amount}</p>
              <p className="text-center text-sm text-muted-foreground mt-1">
                {rentInfo.type === 'paid' 
                  ? `Paid to ${rentInfo.ownerName} for ${rentInfo.propertyName}`
                  : `${rentInfo.payerName} landed on ${rentInfo.propertyName}`
                }
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
