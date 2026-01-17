// Monopoly - Current Space Card Component

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import type { UIPlayer, Space } from "../lib/types";

interface CurrentSpaceCardProps {
  currentSpace: Space;
  players: UIPlayer[];
  canBuyCurrent: boolean;
  onBuy: () => void;
}

export function CurrentSpaceCard({
  currentSpace,
  players,
  canBuyCurrent,
  onBuy,
}: CurrentSpaceCardProps) {
  return (
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
            Owner:{" "}
            {players.find((p) => p.id === currentSpace.ownerId)?.name ?? "Unknown"}
          </p>
        )}
        <div className="flex flex-col gap-2">
          {canBuyCurrent && (
            <Button size="sm" onClick={onBuy}>
              Buy property
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
