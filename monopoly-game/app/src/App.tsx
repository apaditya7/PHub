import { useMemo, useRef, useState } from "react";

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
  ownerId?: number;
  price?: number;
  rent?: number;
  tax?: number;
}

interface Player {
  id: number;
  name: string;
  position: number;
  cash: number;
  token: "car" | "statue" | "book" | "tower";
  color: string;
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

const TOKENS: Player["token"][] = ["car", "statue", "book", "tower"];
const TOKEN_COLORS = ["#d3453a", "#2c7fb3", "#3b9b6d", "#d1a344"];
const PLAYER_COUNT_OPTIONS = [2, 3, 4] as const;
const DEFAULT_STARTING_CASH = 1500;
const OWNABLE_TYPES: SpaceType[] = ["property", "rail", "utility"];

const createPlayers = (count: number, startingCash: number): Player[] =>
  Array.from({ length: count }, (_, index) => ({
    id: index,
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
  const [players, setPlayers] = useState<Player[]>(() =>
    createPlayers(2, DEFAULT_STARTING_CASH),
  );
  const [spaces, setSpaces] = useState<Space[]>(() => createSpaces());
  const [current, setCurrent] = useState(0);
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [log, setLog] = useState<string[]>([
    "Welcome to the Monopoly frontend prototype.",
  ]);
  const [isStarted, setIsStarted] = useState(false);
  const [setupOpen, setSetupOpen] = useState(true);
  const [setupPlayerCount, setSetupPlayerCount] = useState<number>(2);
  const [rolling, setRolling] = useState(false);
  const [moving, setMoving] = useState(false);
  const [canRoll, setCanRoll] = useState(true);
  const [canEnd, setCanEnd] = useState(false);
  const moveTimerRef = useRef<number | null>(null);

  const currentPlayer = players[current];
  const currentSpace = spaces[currentPlayer.position];

  const addLog = (message: string) => {
    setLog((prev) => [message, ...prev.slice(0, 6)]);
  };

  const isOwnable = (space: Space) => OWNABLE_TYPES.includes(space.type);

  const resolveLanding = () => {
    setPlayers((prev) => {
      const next = [...prev];
      const player = { ...next[current] };
      const space = spaces[player.position];

      addLog(`${player.name} landed on ${space.name}.`);

      if (space.type === "tax" && space.tax) {
        player.cash -= space.tax;
        addLog(`${player.name} paid $${space.tax} in fees.`);
      }

      if (isOwnable(space) && space.ownerId != null && space.ownerId !== player.id) {
        const ownerIndex = next.findIndex((p) => p.id === space.ownerId);
        const rent = space.rent ?? 0;
        player.cash -= rent;
        if (ownerIndex >= 0) {
          const owner = { ...next[ownerIndex] };
          owner.cash += rent;
          next[ownerIndex] = owner;
        }
        addLog(`${player.name} paid $${rent} rent for ${space.name}.`);
      }

      next[current] = player;
      return next;
    });
  };

  const rollDice = () => {
    if (!isStarted || !canRoll || moving) return;
    setRolling(true);
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    setDice([d1, d2]);
    const steps = d1 + d2;
    setCanRoll(false);
    setCanEnd(false);
    setMoving(true);
    addLog(`${currentPlayer.name} rolled ${steps}.`);

    window.setTimeout(() => {
      setRolling(false);
      let remaining = steps;
      moveTimerRef.current = window.setInterval(() => {
        setPlayers((prev) => {
          const next = [...prev];
          const player = { ...next[current] };
          const oldPos = player.position;
          player.position = (player.position + 1) % TOTAL_TILES;
          if (oldPos === TOTAL_TILES - 1) {
            player.cash += 200;
            addLog(`${player.name} passed GO and collected 200.`);
          }
          next[current] = player;
          return next;
        });
        remaining -= 1;
        if (remaining <= 0) {
          if (moveTimerRef.current) {
            window.clearInterval(moveTimerRef.current);
          }
          setMoving(false);
          setCanEnd(true);
          resolveLanding();
        }
      }, 250);
    }, 500);
  };

  const endTurn = () => {
    if (!isStarted || !canEnd || moving) return;
    setCurrent((prev) => (prev + 1) % players.length);
    setCanRoll(true);
    setCanEnd(false);
    addLog(`It is now ${players[(current + 1) % players.length].name}'s turn.`);
  };

  const tilePositions = useMemo(() => {
    return spaces.map((space, index) => ({
      ...space,
      index,
      ...getTilePosition(index),
    }));
  }, [spaces]);

  const getTilePercent = (index: number) => {
    const tile = tilePositions[index];
    const left = (tile.x / BOARD_UNITS) * 100;
    const top = (tile.y / BOARD_UNITS) * 100;
    return { left: `${left}%`, top: `${top}%` };
  };

  const tokenOffsets = useMemo(() => {
    const offsets = new Map<number, { x: number; y: number }>();
    const grouped = new Map<number, Player[]>();

    players.forEach((player) => {
      const group = grouped.get(player.position) ?? [];
      group.push(player);
      grouped.set(player.position, group);
    });

    grouped.forEach((group) => {
      const count = group.length;
      const presets =
        count === 1
          ? [[0, 0]]
          : count === 2
          ? [[-8, 0], [8, 0]]
          : count === 3
          ? [
              [-8, -5],
              [8, -5],
              [0, 8],
            ]
          : [
              [-8, -8],
              [8, -8],
              [-8, 8],
              [8, 8],
            ];

      group.forEach((player, index) => {
        const [x, y] = presets[index] ?? [0, 0];
        offsets.set(player.id, { x, y });
      });
    });

    return offsets;
  }, [players]);

  const startGame = () => {
    if (moveTimerRef.current) {
      window.clearInterval(moveTimerRef.current);
    }
    setPlayers(createPlayers(setupPlayerCount, DEFAULT_STARTING_CASH));
    setSpaces(createSpaces());
    setCurrent(0);
    setDice([1, 1]);
    setRolling(false);
    setMoving(false);
    setCanRoll(true);
    setCanEnd(false);
    setLog(["Game started."]);
    setIsStarted(true);
    setSetupOpen(false);
  };

  const closeSetup = () => {
    if (!isStarted) return;
    setSetupOpen(false);
  };

  const canBuyCurrent =
    isStarted &&
    !moving &&
    isOwnable(currentSpace) &&
    currentSpace.ownerId == null &&
    (currentSpace.price ?? 0) <= currentPlayer.cash;

  const handleBuy = () => {
    if (!canBuyCurrent) return;
    const price = currentSpace.price ?? 0;
    setPlayers((prev) => {
      const next = [...prev];
      const player = { ...next[current], cash: next[current].cash - price };
      next[current] = player;
      return next;
    });
    setSpaces((prev) => {
      const next = [...prev];
      next[currentPlayer.position] = {
        ...next[currentPlayer.position],
        ownerId: currentPlayer.id,
      };
      return next;
    });
    addLog(`${currentPlayer.name} purchased ${currentSpace.name}.`);
  };

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

  const ownedByPlayer = useMemo(() => {
    const ownership = new Map<number, Space[]>();
    players.forEach((player) => ownership.set(player.id, []));
    spaces.forEach((space) => {
      if (!isOwnable(space)) return;
      if (space.ownerId == null) return;
      ownership.get(space.ownerId)?.push(space);
    });
    return ownership;
  }, [players, spaces]);

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Monopoly Frontend Prototype</h1>
          <p className="subtitle">
            Board rendering, turn flow, dice feedback, and UI scaffolding.
          </p>
        </div>
        <div className="turn-card">
          <button
            type="button"
            className="start-button"
            onClick={() => setSetupOpen(true)}
          >
            {isStarted ? "New Game" : "Start Game"}
          </button>
          <span className="label">Current turn</span>
          <p className="player">
            <span
              className="player-chip"
              style={{ background: currentPlayer.color }}
            />
            {currentPlayer.name}
          </p>
          <p className="cash">${currentPlayer.cash}</p>
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
              <span
                className="space-highlight"
                style={getTilePercent(currentPlayer.position)}
              />
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
            <p className="space-type">{currentSpace.type}</p>
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
            {canDrawChance && (
              <button type="button" onClick={handleDrawChance}>
                Draw chance
              </button>
            )}
            {canDrawCommunity && (
              <button type="button" onClick={handleDrawCommunity}>
                Draw community
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
                    {properties.length === 0 ? (
                      <p className="ownership-empty">No assets yet.</p>
                    ) : (
                      <div className="ownership-cards">
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
      {setupOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <p className="modal-eyebrow">Game setup</p>
            <h2>Choose players</h2>
            <p className="modal-subtitle">
              Starting cash is fixed at ${DEFAULT_STARTING_CASH}.
            </p>
            <div className="player-select">
              {PLAYER_COUNT_OPTIONS.map((count) => (
                <button
                  key={count}
                  type="button"
                  className={count === setupPlayerCount ? "active" : ""}
                  onClick={() => setSetupPlayerCount(count)}
                >
                  {count} players
                </button>
              ))}
            </div>
            <div className="modal-actions">
              {isStarted && (
                <button
                  type="button"
                  className="secondary"
                  onClick={closeSetup}
                >
                  Cancel
                </button>
              )}
              <button type="button" onClick={startGame}>
                Start game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
