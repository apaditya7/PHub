# Monopoly Frontend Prototype Notes

## What is implemented
- Custom board image is used via `app/public/Board.png` with token overlays.
- Token movement is aligned to the board image proportions (corner/edge spacing) and supports multiple tokens on the same tile with offsets.
- Game setup modal lets you start a new game and pick player count (2-4). Starting cash is fixed at $1500.
- Basic turn flow: roll dice, move step-by-step, pass GO for $200, end turn.
- Ownership and economy (simplified):
  - Properties, stations, and utilities can be bought once.
  - Flat rent is charged when landing on an owned tile.
  - Tax tiles deduct a fixed fee.
- Current space panel shows type, price/rent or fee, and owner (if owned).
- Ownership panel shows each player’s owned assets.
- Chance/Community actions are stubbed with buttons and log messages only (no card logic yet).

## Board data
The 40-space sequence is mapped to the provided NTU/NUS/SMU themed list, including:
- Prices for properties
- Fixed fees for tax tiles
- Stations and utilities with fixed prices/rent

## Rules currently implemented (simplified)
- Buy-once ownership (no auctions).
- Flat rent model:
  - Property rent = 10% of purchase price
  - Station rent = $25
  - Utility rent = $15
- Taxes: School Fees and Hall Fees deduct their listed amounts.
- Go/Jail/Free Parking are cosmetic (no jail rules or fines yet).

## Work still to be done
- Chance and Community card decks (actual card list and effects).
- Popup animation for Chance/Community draw.
- Full Monopoly rules if desired:
  - Jail/Campus Security logic
  - Houses/hotels and set bonuses
  - Utility/station rent scaling
  - Bankruptcy / game end conditions
  - Auctions if a player declines to buy
- Ownership interactions on board tiles (visual ownership markers or badges).
- Balancing/tuning of rent values and prices.
- Optional: transaction history UI and per-tile detail view.

## Files to look at
- `app/src/App.tsx` for board data, game logic, and UI layout.
- `app/src/styles.css` for layout and styling.

