import { Tile } from "../types";
import raw from "./board-data.json";

// Build board from JSON data and ensure indices and defaults are applied.
export function buildBoard(): Tile[] {
  const data = raw as Array<any>;
  const tiles: Tile[] = new Array(40);
  for (let i = 0; i < 40; i++) {
    const d = data[i] || {};
    const t: Tile = {
      id: d.id || `TILE_${i}`,
      index: i,
      name: d.name || `Tile ${i}`,
      type: d.type || "PROPERTY",
      price: d.price ?? (d.type === "PROPERTY" ? 100 : undefined),
      rent: d.rent ?? (d.type === "PROPERTY" ? 10 : undefined),
      ownerId: null
    };
    tiles[i] = t;
  }
  return tiles;
}
