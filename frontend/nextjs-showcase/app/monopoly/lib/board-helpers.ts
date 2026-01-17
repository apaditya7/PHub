// Monopoly Board Data and Helper Functions

import type { Space, SpaceType, UIPlayer } from "./types";

export const makeProperty = (name: string, color: string, price: number): Space => ({
  name,
  type: "property",
  color,
  price,
  rent: Math.round(price * 0.1),
});

export const makeRail = (name: string): Space => ({
  name,
  type: "rail",
  price: 200,
  rent: 25,
});

export const makeUtility = (name: string): Space => ({
  name,
  type: "utility",
  price: 150,
  rent: 15,
});

export const makeTax = (name: string, amount: number): Space => ({
  name,
  type: "tax",
  tax: amount,
});

export const createSpaces = (): Space[] => [
  { name: "GO", type: "go" },
  makeProperty("Core Curriculum Bidding Mods (SMU)", "#8b5a33", 60),
  { name: "Community Chest", type: "community" },
  makeProperty("ML004 / CC Mods (NTU)", "#8b5a33", 60),
  makeTax("School Fees", 150),
  makeRail("Hall Points System"),
  makeProperty("Yunnan Library (NTU)", "#7cc6de", 100),
  { name: "Chance", type: "chance" },
  makeProperty("Central Library (NUS)", "#7cc6de", 100),
  makeProperty("Campus Green (SMU)", "#7cc6de", 120),
  { name: "Campus Security (Just Visiting)", type: "jail" },
  makeProperty("One Stop SAC (NTU)", "#e6a3c1", 140),
  makeTax("Hall Aircon", 150),
  makeProperty("Office of Student Affairs (NUS)", "#e6a3c1", 140),
  makeProperty("Admin Offices (SMU)", "#e6a3c1", 160),
  makeRail("Overseas Exchange Allocation"),
  makeProperty("North Spine (NTU)", "#d78b44", 180),
  { name: "Community Chest", type: "community" },
  makeProperty("Supper Stretch (NUS)", "#d78b44", 180),
  makeProperty("T-Junction (SMU)", "#d78b44", 200),
  { name: "Free Parking", type: "freeParking" },
  makeProperty("Connexion (SMU)", "#ce4d45", 220),
  { name: "Chance", type: "chance" },
  makeProperty("UTown (NUS)", "#ce4d45", 220),
  makeProperty("CCDS (NTU)", "#ce4d45", 240),
  makeRail("Student Activity Centre (SAC)"),
  makeProperty("Hot Hideout (NTU)", "#e6c24f", 260),
  makeProperty("Deck / Frontier (NUS)", "#e6c24f", 260),
  makeTax("Campus WiFi", 150),
  makeProperty("WokExpress (NUS)", "#e6c24f", 280),
  { name: "Go To Campus Security", type: "goToJail" },
  makeProperty("NUS Overseas College (NUS)", "#4f9b5a", 300),
  { name: "Community Chest", type: "community" },
  makeProperty("PGP Residences (NUS)", "#4f9b5a", 300),
  makeProperty("Gaia (NTU)", "#4f9b5a", 320),
  makeRail("Student Activities (SAC)"),
  { name: "Chance", type: "chance" },
  makeProperty("LKC Medicine (NTU)", "#2c4a92", 350),
  makeTax("Hall Fees", 150),
  makeProperty("NUS Medicine (NUS)", "#2c4a92", 400),
];

export const TOKENS: UIPlayer["token"][] = ["car", "statue", "book", "tower"];
export const TOKEN_COLORS = ["#d3453a", "#2c7fb3", "#3b9b6d", "#d1a344"];
export const DEFAULT_STARTING_CASH = 1500;
export const OWNABLE_TYPES: SpaceType[] = ["property", "rail", "utility"];

export const createPlayers = (count: number, startingCash: number): UIPlayer[] =>
  Array.from({ length: count }, (_, index) => ({
    id: String(index),
    name: `Player ${index + 1}`,
    position: 0,
    cash: startingCash,
    token: TOKENS[index],
    color: TOKEN_COLORS[index],
  }));

export const TOTAL_TILES = 40;
export const BOARD_UNITS = 13;
export const CORNER_UNITS = 2;
export const EDGE_UNITS = 1;
export const MIN_TRACK = CORNER_UNITS / 2;
export const MAX_TRACK = BOARD_UNITS - CORNER_UNITS / 2;
export const EDGE_START = CORNER_UNITS;
export const EDGE_END = BOARD_UNITS - CORNER_UNITS;

export const getTilePosition = (index: number) => {
  if (index === 0) return { x: MAX_TRACK, y: MAX_TRACK };
  if (index > 0 && index < 10) {
    return { x: EDGE_END - (index - 0.5) * EDGE_UNITS, y: MAX_TRACK };
  }
  if (index === 10) return { x: MIN_TRACK, y: MAX_TRACK };
  if (index > 10 && index < 20) {
    return { x: MIN_TRACK, y: EDGE_END - (index - 10 - 0.5) * EDGE_UNITS };
  }
  if (index === 20) return { x: MIN_TRACK, y: MIN_TRACK };
  if (index > 20 && index < 30) {
    return { x: EDGE_START + (index - 20 - 0.5) * EDGE_UNITS, y: MIN_TRACK };
  }
  if (index === 30) return { x: MAX_TRACK, y: MIN_TRACK };
  if (index > 30 && index < 40) {
    return { x: MAX_TRACK, y: EDGE_START + (index - 30 - 0.5) * EDGE_UNITS };
  }
  return { x: 0, y: 0 };
};

export const getTokenOffset = (playerIndex: number, totalOnTile: number) => {
  const spacing = 0.3;
  const totalWidth = (totalOnTile - 1) * spacing;
  const startX = -totalWidth / 2;
  return startX + playerIndex * spacing;
};
