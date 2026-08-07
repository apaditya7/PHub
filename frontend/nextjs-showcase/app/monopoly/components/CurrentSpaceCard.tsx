// Monopoly - Current Space Card Component

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import type { UIPlayer, Space } from "../lib/types";

interface CurrentSpaceCardProps {
  space: Space;
  players?: UIPlayer[];
  canBuy: boolean;
  onBuy: () => void;
}

export function CurrentSpaceCard({
  space,
  players = [],
  canBuy,
  onBuy,
}: CurrentSpaceCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Space</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="font-medium">{space.name}</p>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {space.type}
          </p>
        </div>
        {space.price && (
          <p className="text-xs text-muted-foreground">
            Price: ${space.price} · Rent: ${space.rent ?? 0}
          </p>
        )}
        {space.tax && (
          <p className="text-xs text-muted-foreground">Fee: ${space.tax}</p>
        )}
        {space.ownerId != null && (
          <p className="text-xs text-muted-foreground">
            Owner:{" "}
            {players.find((p) => p.id === space.ownerId)?.name ?? "Unknown"}
          </p>
        )}
        <div className="flex flex-col gap-2">
          {canBuy && (
            <Button size="sm" onClick={onBuy}>
              Buy property
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
