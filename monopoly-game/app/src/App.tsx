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
}

interface Player {
  id: number;
  name: string;
  position: number;
  cash: number;
  token: "car" | "statue" | "book" | "tower";
  color: string;
}

const SPACES: Space[] = [
  { name: "NTU Main Gate", type: "go" },
  { name: "Hall 1", type: "property", color: "#8b5a33" },
  { name: "Campus Grants", type: "community" },
  { name: "Hall 2", type: "property", color: "#8b5a33" },
  { name: "Tuition Fees", type: "tax" },
  { name: "Shuttle North", type: "rail" },
  { name: "LWN Library", type: "property", color: "#7cc6de" },
  { name: "Chance", type: "chance" },
  { name: "The Hive", type: "property", color: "#7cc6de" },
  { name: "North Spine", type: "property", color: "#7cc6de" },
  { name: "Detention", type: "jail" },
  { name: "ADM", type: "property", color: "#e6a3c1" },
  { name: "Aircon Plant", type: "utility" },
  { name: "WKWSCI", type: "property", color: "#e6a3c1" },
  { name: "NIE", type: "property", color: "#e6a3c1" },
  { name: "Shuttle East", type: "rail" },
  { name: "SCSE", type: "property", color: "#d78b44" },
  { name: "Campus Aid Fund", type: "community" },
  { name: "SCE", type: "property", color: "#d78b44" },
  { name: "Canteen 1", type: "property", color: "#d78b44" },
  { name: "Student Plaza", type: "freeParking" },
  { name: "NBS", type: "property", color: "#ce4d45" },
  { name: "Chance", type: "chance" },
  { name: "MAE", type: "property", color: "#ce4d45" },
  { name: "SPMS", type: "property", color: "#ce4d45" },
  { name: "Shuttle South", type: "rail" },
  { name: "CCDS", type: "property", color: "#e6c24f" },
  { name: "LKC Medicine", type: "property", color: "#e6c24f" },
  { name: "Chiller Plant", type: "utility" },
  { name: "School of Art", type: "property", color: "#e6c24f" },
  { name: "Go To Detention", type: "goToJail" },
  { name: "EEE", type: "property", color: "#4f9b5a" },
  { name: "Campus Grants+", type: "community" },
  { name: "CEE", type: "property", color: "#4f9b5a" },
  { name: "SBS", type: "property", color: "#4f9b5a" },
  { name: "Shuttle West", type: "rail" },
  { name: "Chance", type: "chance" },
  { name: "Graduate Hall", type: "property", color: "#2c4a92" },
  { name: "Tech Fee", type: "tax" },
  { name: "Presidential Scholars", type: "property", color: "#2c4a92" },
];

const TOKENS: Player["token"][] = ["car", "statue", "book", "tower"];
const TOKEN_COLORS = ["#d3453a", "#2c7fb3", "#3b9b6d", "#d1a344"];

const createPlayers = (): Player[] =>
  [0, 1].map((index) => ({
    id: index,
    name: `Player ${index + 1}`,
    position: 0,
    cash: 1500,
    token: TOKENS[index],
    color: TOKEN_COLORS[index],
  }));

const BOARD_SIZE = 11;
const TOTAL_TILES = 40;

const getGridPosition = (index: number) => {
  if (index === 0) return { row: BOARD_SIZE, col: BOARD_SIZE };
  if (index > 0 && index < 10) return { row: BOARD_SIZE, col: BOARD_SIZE - index };
  if (index === 10) return { row: BOARD_SIZE, col: 1 };
  if (index > 10 && index < 20) return { row: BOARD_SIZE - (index - 10), col: 1 };
  if (index === 20) return { row: 1, col: 1 };
  if (index > 20 && index < 30) return { row: 1, col: index - 20 + 1 };
  if (index === 30) return { row: 1, col: BOARD_SIZE };
  return { row: index - 30 + 1, col: BOARD_SIZE };
};

export default function App() {
  const [players, setPlayers] = useState<Player[]>(() => createPlayers());
  const [current, setCurrent] = useState(0);
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [log, setLog] = useState<string[]>([
    "Welcome to the Monopoly frontend prototype.",
  ]);
  const [rolling, setRolling] = useState(false);
  const [moving, setMoving] = useState(false);
  const [canRoll, setCanRoll] = useState(true);
  const [canEnd, setCanEnd] = useState(false);
  const moveTimerRef = useRef<number | null>(null);

  const currentPlayer = players[current];

  const addLog = (message: string) => {
    setLog((prev) => [message, ...prev.slice(0, 6)]);
  };

  const rollDice = () => {
    if (!canRoll || moving) return;
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
            addLog(`${player.name} passed NTU Main Gate and collected 200.`);
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
        }
      }, 250);
    }, 500);
  };

  const endTurn = () => {
    if (!canEnd || moving) return;
    setCurrent((prev) => (prev + 1) % players.length);
    setCanRoll(true);
    setCanEnd(false);
    addLog(`It is now ${players[(current + 1) % players.length].name}'s turn.`);
  };

  const tilePositions = useMemo(() => {
    return SPACES.map((space, index) => ({
      ...space,
      index,
      ...getGridPosition(index),
    }));
  }, []);

  const getTilePercent = (index: number) => {
    const tile = tilePositions[index];
    const left = ((tile.col - 0.5) / BOARD_SIZE) * 100;
    const top = ((tile.row - 0.5) / BOARD_SIZE) * 100;
    return { left: `${left}%`, top: `${top}%` };
  };

  return (
    <div className="page">
      <header className="header">
        <div>
          <p className="eyebrow">Developer A - Frontend + UX</p>
          <h1>Monopoly Frontend Prototype</h1>
          <p className="subtitle">
            Board rendering, turn flow, dice feedback, and UI scaffolding.
          </p>
        </div>
        <div className="turn-card">
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
        <section className="board-panel">
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
                    background: player.color,
                    ...getTilePercent(player.position),
                  }}
                  title={player.name}
                />
              ))}
            </div>
          </div>
        </section>

        <aside className="side-panel">
          <div className="panel-card control-panel">
            <h3>Turn controls</h3>
            <div className={`dice ${rolling ? "rolling" : ""}`}>
              <span>{dice[0]}</span>
              <span>{dice[1]}</span>
            </div>
            <div className="actions">
              <button type="button" onClick={rollDice} disabled={!canRoll}>
                Roll Dice
              </button>
              <button type="button" onClick={endTurn} disabled={!canEnd}>
                End Turn
              </button>
            </div>
            <p className="status">
              {moving
                ? "Moving token..."
                : canRoll
                ? "Roll the dice to start."
                : "Resolve the turn, then end it."}
            </p>
          </div>
          <div className="panel-card">
            <h3>Players</h3>
            <div className="players">
              {players.map((player) => (
                <div key={player.id} className="player-row">
                  <span
                    className={`token token-${player.token}`}
                    style={{ background: player.color }}
                  />
                  <div>
                    <p>{player.name}</p>
                    <p className="cash">${player.cash}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="panel-card">
            <h3>Current space</h3>
            <p className="status">{SPACES[currentPlayer.position].name}</p>
          </div>
          <div className="panel-card">
            <h3>Activity log</h3>
            <ul className="log">
              {log.map((entry, index) => (
                <li key={`${entry}-${index}`}>{entry}</li>
              ))}
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}
