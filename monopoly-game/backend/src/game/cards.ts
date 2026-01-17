import data from "./cards-data.json";

export type CardEffect =
  | { type: "MOVE_TO"; index: number; passGo?: boolean }
  | { type: "GO_TO_JAIL" }
  | { type: "COLLECT"; amount: number }
  | { type: "PAY"; amount: number }
  | { type: "GET_OUT_OF_JAIL_FREE" };

export interface CardDef {
  id: string;
  name: string;
  description: string;
  effect: CardEffect;
}

export interface CardSets {
  chance: CardDef[];
  community: CardDef[];
}

export const cards: CardSets = data as any;

export function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildDecks() {
  return {
    chance: shuffled(cards.chance.map(c => c.id)),
    community: shuffled(cards.community.map(c => c.id))
  };
}

export function cardById(id: string): CardDef | undefined {
  return cards.chance.find(c => c.id === id) || cards.community.find(c => c.id === id);
}
