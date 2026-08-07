// Monopoly - Card Modal Component (Chance/Community Chest)

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { cardById } from "../lib/cards-data";

interface CardModalProps {
  cardId: string;
  onClose: () => void;
}

export function CardModal({ cardId, onClose }: CardModalProps) {
  const cardData = cardById(cardId);
  const drawnMeta = cardData
    ? { title: cardData.name, description: cardData.description }
    : { title: "Card", description: "..." };

  // Infer deck or default
  const deck = cardId.startsWith("chance") ? "chance" : "community";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle
            className={
              deck === "chance" ? "text-orange-600" : "text-blue-600"
            }
          >
            {deck === "chance" ? "🎲 CHANCE" : "📦 COMMUNITY CHEST"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center font-medium">{drawnMeta.title}</p>
          <p className="text-center text-sm text-muted-foreground">
            {drawnMeta.description}
          </p>
          <Button className="w-full" onClick={onClose}>
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
