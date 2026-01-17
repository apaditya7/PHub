// Monopoly - Property Ownership Panel Component

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import type { UIPlayer, Space } from "../lib/types";

interface PropertyPanelProps {
  players: UIPlayer[];
  ownedByPlayer: Map<string, Space[]>;
}

export function PropertyPanel({ players, ownedByPlayer }: PropertyPanelProps) {
  return (
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
  );
}
