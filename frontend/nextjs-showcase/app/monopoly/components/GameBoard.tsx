// Monopoly - Game Board Component

import type { UIPlayer, GameState } from "../lib/types";
import { getTilePosition, BOARD_UNITS } from "../lib/board-helpers";

interface GameBoardProps {
  players: UIPlayer[];
  displayPositions: Record<string, number>;
  tokenOffsets: Map<string, { x: number; y: number }>;
  currentPlayerId: string;
  state: GameState | null;
  meId: string | null;
  roomId: string | null;
  isStarted: boolean;
  showFlyCard: { deck: 'chance' | 'community'; from: { leftPct: number; topPct: number } } | null;
  onDrawCard: (deck: 'chance' | 'community') => void;
}

const deckCenters = {
  chance: { leftPct: 70, topPct: 70 },
  community: { leftPct: 30, topPct: 30 },
} as const;

export function GameBoard({
  players,
  displayPositions,
  tokenOffsets,
  currentPlayerId,
  state,
  meId,
  roomId,
  isStarted,
  showFlyCard,
  onDrawCard,
}: GameBoardProps) {
  const getTilePercent = (index: number) => {
    const tile = getTilePosition(index);
    const left = (tile.x / BOARD_UNITS) * 100;
    const top = (tile.y / BOARD_UNITS) * 100;
    return { left: `${left}%`, top: `${top}%` };
  };

  return (
    <section className="board-panel">
      <div className="board">
        <div className="token-layer">
          {/* Current Space Highlight */}
          <span
            className="space-highlight"
            style={getTilePercent(displayPositions[currentPlayerId] ?? 0)}
          />

          {/* Center Deck Placeholders */}
          {(['chance', 'community'] as const).map((deck) => {
            const pd = state?.pendingDraw;
            const isMyPending = pd && pd.deck === deck && pd.playerId === meId;
            const clickable = Boolean(isStarted && isMyPending);
            const pos = deckCenters[deck];
            return (
              <div
                key={`center-deck-${deck}`}
                className={`deck ${deck} ${clickable ? 'clickable' : ''}`}
                style={{ left: `${pos.leftPct}%`, top: `${pos.topPct}%` }}
                onClick={() => clickable && roomId && onDrawCard(deck)}
                title={deck.toUpperCase()}
              >
                {deck === 'chance' ? '🎲' : '🃏'}
              </div>
            );
          })}

          {/* Fly Card Animation */}
          {showFlyCard && (
            <div
              className="fly-card"
              style={{
                ['--from-left' as any]: `${showFlyCard.from.leftPct}%`,
                ['--from-top' as any]: `${showFlyCard.from.topPct}%`,
              }}
            />
          )}

          {/* Player Tokens */}
          {players.map((player) => (
            <span
              key={player.id}
              className={`token token-${player.token}`}
              style={{
                backgroundColor: player.color,
                ...getTilePercent(displayPositions[player.id] ?? 0),
                ['--token-offset-x' as any]: `${tokenOffsets.get(player.id)?.x ?? 0}px`,
                ['--token-offset-y' as any]: `${tokenOffsets.get(player.id)?.y ?? 0}px`,
              }}
              title={player.name}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
