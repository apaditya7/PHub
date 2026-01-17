// Monopoly - Game Over Modal Component

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import type { GameState, UIPlayer } from "../lib/types";

interface GameOverModalProps {
  state: GameState;
  players: UIPlayer[];
}

export function GameOverModal({ state, players }: GameOverModalProps) {
  const worthOf = (pid: string) => {
    const cash = state.players[pid]?.cash ?? 0;
    let props = 0;
    for (const t of state.board) {
      if (t.ownerId === pid) props += t.price ?? 0;
    }
    return { cash, props, total: cash + props };
  };

  const entries = Object.keys(state.players)
    .map((pid) => ({
      pid,
      name: state.players[pid]?.name || pid,
      ...worthOf(pid),
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Game Over</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Winner:{" "}
            <span className="font-semibold">
              {state.winnerId
                ? players.find((p) => p.id === state.winnerId)?.name ||
                  state.winnerId
                : "—"}
            </span>
          </p>
          <div className="space-y-2">
            {entries.map((e, idx) => (
              <div
                key={e.pid}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-medium">
                  {idx + 1}. {e.name}
                </span>
                <span className="text-muted-foreground">
                  ${e.total}{" "}
                  <span className="text-xs">
                    (cash ${e.cash} + props ${e.props})
                  </span>
                </span>
              </div>
            ))}
          </div>
          <Button className="w-full" onClick={() => window.location.reload()}>
            New Game
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
