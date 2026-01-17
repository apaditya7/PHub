// Monopoly - Player Dashboard Component (Left Panel)

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import type { UIPlayer } from "../lib/types";

interface PlayerDashboardProps {
  currentPlayer: UIPlayer;
  players: UIPlayer[];
  dice: [number, number];
  rolling: boolean;
  isStarted: boolean;
  canRoll: boolean;
  canEnd: boolean;
  moving: boolean;
  isHost: boolean;
  roomId: string | null;
  onRollDice: () => void;
  onEndTurn: () => void;
  onEndGame: () => void;
  onLeaveGame: () => void;
}

export function PlayerDashboard({
  currentPlayer,
  players,
  dice,
  rolling,
  isStarted,
  canRoll,
  canEnd,
  moving,
  isHost,
  roomId,
  onRollDice,
  onEndTurn,
  onEndGame,
  onLeaveGame,
}: PlayerDashboardProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Current Turn Header */}
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="h-4 w-4 rounded-full shadow-sm"
          style={{ background: currentPlayer.color }}
        />
        <div>
          <p className="font-medium">{currentPlayer.name}'s Turn</p>
          <p className="text-sm text-muted-foreground">${currentPlayer.cash}</p>
        </div>
        {isStarted && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => window.location.reload()}
          >
            New Game
          </Button>
        )}
      </div>

      {/* Turn Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Turn Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dice */}
          <div className="flex items-center justify-center gap-3">
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-xl font-bold ${
                rolling ? "animate-pulse" : ""
              }`}
            >
              {dice[0]}
            </span>
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-xl font-bold ${
                rolling ? "animate-pulse" : ""
              }`}
            >
              {dice[1]}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2">
            <Button size="sm" onClick={onRollDice} disabled={!isStarted || !canRoll}>
              Roll Dice
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onEndTurn}
              disabled={!isStarted || !canEnd}
            >
              End Turn
            </Button>
            {roomId &&
              (isHost ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEndGame}
                  disabled={!isStarted}
                >
                  End Game (Host)
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={onLeaveGame}>
                  Leave Game
                </Button>
              ))}
          </div>

          {/* Status Text */}
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

      {/* Players List */}
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
  );
}
