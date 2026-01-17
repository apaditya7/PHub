// Monopoly - Lobby Modal Component (Landing, Join, Waiting)

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import type { UIPlayer, GameState } from "../lib/types";

interface LobbyModalProps {
  // Screen state
  showLanding: boolean;
  showJoinInput: boolean;
  showLobby: boolean;
  isConnecting: boolean;
  isStarted: boolean;

  // Connection state
  isSocketConnected: boolean;
  connectionError: string | null;

  // Player/Room state
  playerName: string;
  joinRoomCode: string;
  roomId: string | null;
  isHost: boolean;
  state: GameState | null;
  players: UIPlayer[];

  // Handlers
  onPlayerNameChange: (name: string) => void;
  onJoinRoomCodeChange: (code: string) => void;
  onCreateGame: () => void;
  onShowJoinInput: () => void;
  onBackToLanding: () => void;
  onJoinGame: () => void;
  onStartGame: () => void;
}

export function LobbyModal({
  showLanding,
  showJoinInput,
  showLobby,
  isConnecting,
  isStarted,
  isSocketConnected,
  connectionError,
  playerName,
  joinRoomCode,
  roomId,
  isHost,
  state,
  players,
  onPlayerNameChange,
  onJoinRoomCodeChange,
  onCreateGame,
  onShowJoinInput,
  onBackToLanding,
  onJoinGame,
  onStartGame,
}: LobbyModalProps) {
  // Loading Screen
  if (isConnecting) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Connecting...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-muted-foreground">
              Please wait
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Landing Screen - Create or Join
  if (showLanding && !isConnecting) {
    return (
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
                    cd monopoly-backend && npm run dev
                  </code>
                </p>
                <Button
                  className="w-full"
                  onClick={() => window.location.reload()}
                >
                  Retry Connection
                </Button>
              </>
            ) : (
              <>
                <p className="text-center text-sm text-muted-foreground">
                  {!isSocketConnected
                    ? "🔄 Connecting to server..."
                    : "Choose an option to begin"}
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">
                      Your Name
                    </label>
                    <Input
                      type="text"
                      value={playerName}
                      onChange={(e) => onPlayerNameChange(e.target.value)}
                      placeholder="Enter your name"
                      maxLength={24}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <Button
                    className="w-full"
                    onClick={onCreateGame}
                    disabled={!isSocketConnected || !playerName.trim()}
                  >
                    Create New Game
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={onShowJoinInput}
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
    );
  }

  // Join Game - Enter Room Code
  if (showJoinInput) {
    return (
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
              onChange={(e) => onJoinRoomCodeChange(e.target.value.toUpperCase())}
              placeholder="Enter room code (e.g. ABC12)"
              maxLength={5}
              className="text-center text-lg uppercase tracking-widest"
              onKeyDown={(e) => {
                if (e.key === "Enter" && joinRoomCode.trim()) {
                  onJoinGame();
                }
              }}
              autoFocus
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onBackToLanding}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={onJoinGame}
                disabled={isConnecting || !joinRoomCode.trim()}
              >
                {isConnecting ? "Joining..." : "Join Game"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Lobby - Wait for Players
  if (showLobby && !isStarted && !isConnecting) {
    return (
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
                      <span className="ml-auto text-xs text-muted-foreground">
                        (Host)
                      </span>
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
                onClick={onStartGame}
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
    );
  }

  return null;
}
