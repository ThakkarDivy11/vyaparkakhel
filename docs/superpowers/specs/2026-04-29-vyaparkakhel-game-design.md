# Vyaparkakhel.com — Full Game Design Spec
**Date:** 2026-04-29
**Phase:** 1 — Playable with friends and family
**Stack:** Node.js/Express + Next.js (web), Socket.io, Redis, MongoDB, Clerk auth

---

## 1. Scope (Phase 1)

A fully playable Indian Business (Monopoly-variant) multiplayer game playable in a browser. Friends join by room code. Full classic rules. Future phases (leaderboard, skins, mobile, monetization) are explicitly out of scope here.

**In scope:**
- Create game, share 6-character room code, friends join
- Full Indian Business board (40 spaces, Indian cities)
- Complete rules: dice, movement, property purchase/auction, rent, houses/hotels, mortgage, jail, Chance/Community Chest, trading, bankruptcy
- Turn timer (60s default) with reconnection window (2 min) → auto-play bot
- Next.js web frontend
- Clerk auth + basic game history per user

**Out of scope (Phase 2+):**
- Leaderboard, friends list, seasonal skins, payments, mobile app, public matchmaking

---

## 2. Architecture

### Principle
`applyMove(state, action) → newState` is a pure function. All game logic is inside it. All I/O (Redis, MongoDB, Socket.io broadcasts) happens outside it.

### Request Flow

```
Player action
  → Socket.io game_action event
  → Acquire Redis lock (game:{id}:lock)
  → Load state from Redis (game:{id}:state)
  → applyMove(state, action) → newState
  → Save newState to Redis
  → Append Move to MongoDB
  → Every 20 moves: save Snapshot to MongoDB
  → Release lock
  → Broadcast state_update to all sockets in room
  → All clients re-render
```

### Components

| Component | Role |
|---|---|
| `src/game/board-data.js` | Static Indian Business board definition |
| `src/game/cards.js` | Chance + Community Chest card definitions |
| `src/game/state.js` | `createInitialState()`, state accessors |
| `src/game/rules.js` | `applyMove(state, action) → newState` — pure, no I/O |
| `src/game/bot.js` | Simple AI for disconnected players |
| `src/game/timer.js` | Turn timer management using Redis TTL + BullMQ |
| `src/services/realtime/socketServer.js` | Socket event handling, orchestrates everything |
| `frontend/` | Next.js app |

---

## 3. Board Data

Indian Business board — 40 spaces, modelled after the Funskool classic edition.

### Space Types
- `go` — collect ₹200 when passing
- `property` — buyable, has color group, prices, rent tiers
- `railroad` — Airport (4 total), rent scales with number owned
- `utility` — Electric Company, Water Works (2 total)
- `tax` — Income Tax (₹200), Luxury Tax (₹100)
- `chance` — draw Chance card
- `community_chest` — draw Community Chest card
- `jail` — just visiting / in jail
- `go_to_jail` — sends player to jail
- `free_parking` — collect free parking pool (if setting enabled)

### Full 40-Space Board Layout (Hasbro Monopoly India Edition)

Player starts at GO and moves counter-clockwise. Prices in M (same denomination as ₹).

**Bottom row** (GO → Jail, right to left):
| # | Space | Type | Price |
|---|---|---|---|
| 1 | GO — Collect M200 | corner | — |
| 2 | Guwahati | Brown | M60 |
| 3 | Community Chest | card | — |
| 4 | Bhubaneshwar | Brown | M60 |
| 5 | Income Tax | tax | Pay M200 |
| 6 | Chennai Central Railway Station | railway | M100 |
| 7 | Chance | card | — |
| 8 | Panaji (Goa) | Light Blue | M100 |
| 9 | Agra | Light Blue | M100 |
| 10 | Vadodara | Light Blue | M120 |
| 11 | Just Visiting / Jail | corner | — |

**Left side** (Jail → Free Parking, bottom to top):
| # | Space | Type | Price |
|---|---|---|---|
| 12 | Ludhiana | Pink | M140 |
| 13 | Electric Company | utility | M150 |
| 14 | Patna | Pink | M140 |
| 15 | Bhopal | Pink | M160 |
| 16 | Howrah Station | railway | M100 |
| 17 | Indore | Orange | M180 |
| 18 | Community Chest | card | — |
| 19 | Nagpur | Orange | M180 |
| 20 | Meerut | Orange | M200 |
| 21 | Free Parking | corner | — |

**Top row** (Free Parking → Go to Jail, left to right):
| # | Space | Type | Price |
|---|---|---|---|
| 22 | Lucknow | Red | M220 |
| 23 | Chance | card | — |
| 24 | Chandigarh | Red | M220 |
| 25 | Jaipur | Red | M240 |
| 26 | New Delhi Railway Station | railway | M100 |
| 27 | Pune | Yellow | M260 |
| 28 | Hyderabad | Yellow | M260 |
| 29 | Water Works | utility | M150 |
| 30 | Ahmedabad | Yellow | M280 |
| 31 | Go to Jail | corner | — |

**Right side** (Go to Jail → GO, top to bottom):
| # | Space | Type | Price |
|---|---|---|---|
| 32 | Kolkata | Green | M300 |
| 33 | Chennai | Green | M300 |
| 34 | Community Chest | card | — |
| 35 | Bengaluru | Green | M320 |
| 36 | Chhatrapati Shivaji Station | railway | M100 |
| 37 | Chance | card | — |
| 38 | Delhi | Dark Blue | M350 |
| 39 | Super Tax | tax | Pay M100 |
| 40 | Mumbai | Dark Blue | M400 |

### Color Group Rent Tiers

| Color | Properties | Price | Base | Monopoly | 1H | 2H | 3H | 4H | Hotel |
|---|---|---|---|---|---|---|---|---|---|
| Brown | Guwahati, Bhubaneshwar | M60 | M2 | M4 | M10 | M30 | M90 | M160 | M250 |
| Light Blue | Panaji, Agra, Vadodara | M100–M120 | M6–M8 | M12–M16 | M30–M40 | M90–M100 | M270–M300 | M400–M450 | M550–M600 |
| Pink | Ludhiana, Patna, Bhopal | M140–M160 | M10–M12 | M20–M24 | M50–M60 | M150–M180 | M450–M500 | M625–M700 | M750–M900 |
| Orange | Indore, Nagpur, Meerut | M180–M200 | M14–M16 | M28–M32 | M70–M80 | M200–M220 | M550–M600 | M750–M800 | M950–M1000 |
| Red | Lucknow, Chandigarh, Jaipur | M220–M240 | M18–M20 | M36–M40 | M90–M100 | M250–M300 | M700–M750 | M875–M950 | M1050–M1100 |
| Yellow | Pune, Hyderabad, Ahmedabad | M260–M280 | M22–M24 | M44–M48 | M110–M120 | M330–M360 | M800–M850 | M975–M1025 | M1150–M1200 |
| Green | Kolkata, Chennai, Bengaluru | M300–M320 | M26–M28 | M52–M56 | M130–M150 | M390–M450 | M900–M1000 | M1100–M1100 | M1275–M1275 |
| Dark Blue | Delhi, Mumbai | M350–M400 | M35–M50 | M70–M100 | M175–M200 | M500–M600 | M1100–M1400 | M1300–M1700 | M1500–M2000 |

House/hotel build cost: same as property purchase price (standard rule).
Mortgage value: 50% of purchase price. Unmortgage: 55% (10% interest).

### Railway Stations
Own 1: M25 | Own 2: M50 | Own 3: M100 | Own 4: M200. Purchase price: M200 each.
Stations: Chennai Central, Howrah, New Delhi, Chhatrapati Shivaji (Mumbai).

### Utilities
Own 1: dice roll × 4. Own 2: dice roll × 10. Purchase price: M150 each.
Utilities: Electric Company, Water Works.

---

## 4. Game State Shape (Redis JSON blob)

```json
{
  "gameId": "string",
  "status": "active | finished",
  "phase": "roll | post_roll | auction | manage",
  "currentTurnSeat": 0,
  "turnDeadline": 1234567890,
  "doublesCount": 0,
  "lastDice": [3, 4],
  "auction": null,
  "pendingTrade": null,
  "freeParkingPool": 0,
  "chanceDeck": [0,1,2,...],
  "communityDeck": [0,1,2,...],
  "log": ["...last 30 game events for UI display"],
  "players": [
    {
      "seat": 0,
      "userId": "string",
      "displayName": "string",
      "balance": 1500,
      "position": 0,
      "inJail": false,
      "jailTurns": 0,
      "jailFreeCards": 0,
      "isBankrupt": false,
      "isConnected": true,
      "disconnectedAt": null,
      "isBot": false
    }
  ],
  "properties": {
    "mumbai": { "owner": null, "houses": 0, "mortgaged": false },
    "kolkata": { "owner": null, "houses": 0, "mortgaged": false }
  }
}
```

`phase` drives what actions are valid on a given turn:
- `roll` — current player must roll (or pay bail / use jail-free card if in jail)
- `post_roll` — player has landed; system resolves landing effect (rent is auto-paid, cards auto-drawn). Transitions to `manage` or triggers `auction` sub-phase
- `auction` — any player can bid; ends when all active players pass in a single round. If no one bids, property returns to bank unbought; turn advances to `manage`
- `manage` — player can build, mortgage, end turn. Trading is a sub-state: when `pendingTrade` is non-null, only `ACCEPT_TRADE` / `REJECT_TRADE` are valid for the trade target; the offering player can cancel with `CANCEL_TRADE`

---

## 5. Rules Engine (`applyMove`)

`applyMove(state, action) → newState` handles all of:

### Actions

| Action type | Valid in phase | Description |
|---|---|---|
| `ROLL_DICE` | `roll` | Roll 2d6, move player, advance to `post_roll` |
| `PAY_BAIL` | `roll` (in jail) | Pay ₹50, move out of jail, roll |
| `USE_JAIL_FREE_CARD` | `roll` (in jail) | Use card, move out, roll |
| `BUY_PROPERTY` | `post_roll` | Buy landed property at list price |
| `DECLINE_PROPERTY` | `post_roll` | Start auction for landed property |
| `AUCTION_BID` | `auction` | Bid amount; must exceed current high bid |
| `AUCTION_PASS` | `auction` | Pass on current auction round |
| `BUILD_HOUSE` | `manage` | Build 1 house on property (must own color group, even build rule) |
| `SELL_HOUSE` | `manage` | Sell 1 house back at half price |
| `MORTGAGE` | `manage` | Mortgage property for 50% of price |
| `UNMORTGAGE` | `manage` | Unmortgage at 55% of price (10% interest) |
| `OFFER_TRADE` | `manage` (no pending trade) | Propose trade to another player |
| `ACCEPT_TRADE` | `manage` (pendingTrade non-null, trade target only) | Accept trade offer |
| `REJECT_TRADE` | `manage` (pendingTrade non-null, trade target only) | Reject trade offer |
| `CANCEL_TRADE` | `manage` (pendingTrade non-null, trade offerer only) | Cancel own trade offer |
| `END_TURN` | `manage` (no pending trade) | Advance turn to next non-bankrupt player |
| `DECLARE_BANKRUPTCY` | any | Player gives all assets to creditor/bank, is eliminated |

### Key Rule Details

**Doubles:** Roll doubles → take another turn. Three doubles in a row → go to jail.

**Jail:** Three ways out: (1) roll doubles in 3 turns, (2) pay ₹50 bail before rolling, (3) use Get Out of Jail Free card. After 3 turns in jail with no doubles → must pay ₹50 and roll.

**Rent:** Auto-paid immediately when player lands on owned property. If player can't pay, they must mortgage/sell houses to cover it. If still can't cover → bankrupt.

**Bankruptcy:** Player owes more than they can raise. All properties revert to: the creditor (if a player) or the bank (if tax/card). Game ends when only one player remains solvent.

**Even build rule:** Houses must be built evenly across a color group. Can't put 2 houses on one property before all in the group have 1.

**Auction:** When a player declines to buy a property, it goes to auction. All players (including the decliner) can bid. Minimum bid: ₹1. Bidding ends when all active players pass in a round. Highest bidder pays and receives property.

**Free Parking (optional setting):** Taxes and fines go into the pool. Player landing on Free Parking collects it. Off by default.

---

## 6. Chance & Community Chest Cards

16 Chance cards, 16 Community Chest cards (standard Monopoly card sets adapted for Indian theme).

### Chance Card Examples
- Advance to Go (collect ₹200)
- Go to Jail
- Go to nearest Airport
- Bank pays you dividend ₹50
- Pay school fees ₹150
- Advance to Goa
- Get out of jail free
- Street repairs: pay ₹25/house, ₹100/hotel
- Go back 3 spaces
- Pay poor tax ₹15

### Community Chest Examples
- Collect ₹200 salary
- Go to Jail
- Doctor's fee: pay ₹50
- Life insurance matures: collect ₹100
- Income tax refund: collect ₹20
- Get out of jail free
- Pay hospital fees ₹100
- Receive interest on investment ₹25
- You inherit ₹100
- Grand prize: collect ₹10 from each player

---

## 7. Socket.io Protocol

### Namespace: `/games`

### Client → Server

```js
// All in-game actions use one event
socket.emit('game_action', { type: 'ROLL_DICE' }, (ack) => {
  // ack: { ok: true } or { ok: false, error: 'not_your_turn' }
});

// Lobby events
socket.emit('player_ready', {}, (ack) => {});
```

### Server → Client

```js
// Full state push after every action
socket.on('state_update', (state) => { /* re-render */ });

// Player connected/disconnected notifications
socket.on('player_connected', ({ seat, displayName }));
socket.on('player_disconnected', ({ seat, displayName, reconnectWindowSecs: 120 }));

// Turn timer updates
socket.on('turn_timer', ({ seat, secondsLeft }));

// Game over
socket.on('game_over', ({ winnerSeat, rankings }));
```

### Error codes (ack errors)
`not_your_turn`, `invalid_phase`, `cannot_afford`, `invalid_action`, `game_not_active`, `game_busy`

---

## 8. Turn Timer & Reconnection

### Turn Timer
- Default: 60 seconds per turn (configurable in game settings)
- Stored in Redis as a BullMQ delayed job: `turn-timeout:{gameId}:{seat}:{seq}`
- On `game_action` received: cancel current timer job, process action, create new timer job for next player
- Timer fires → server emits `TIMEOUT` action via `applyMove` → advances turn

### Disconnection
1. Player disconnects → `player_disconnected` broadcast → 2-minute reconnection window starts (BullMQ job)
2. During window: their turn is skipped (timer advances)
3. Player reconnects within window: `player_connected` broadcast, game continues normally; server pushes full state on reconnect
4. Window expires without reconnect: player's `isBot = true`; bot logic takes over for their turns
5. Bot strategy: always buys property if affordable, never trades, builds houses when has monopoly and cash > ₹500, declares bankruptcy when forced

---

## 9. Frontend Structure (Next.js App Router)

```
frontend/
  app/
    page.jsx                  — Landing: enter room code or create game
    game/[code]/
      page.jsx                — Game room (lobby + active game)
  components/
    board/
      Board.jsx               — 40-space board layout (CSS Grid)
      BoardSpace.jsx          — Individual space (property, tax, chance, etc.)
      PlayerToken.jsx         — Colored circle with initials
      PropertyCard.jsx        — Popup showing property details
    game/
      PlayerPanel.jsx         — Player status cards (balance, properties)
      Dice.jsx                — Dice display + Roll button
      ActionPanel.jsx         — Context-sensitive action buttons
      TradeDialog.jsx         — Trade offer UI
      CardPopup.jsx           — Chance/Community Chest card reveal
      GameLog.jsx             — Scrolling event log
      AuctionPanel.jsx        — Live auction bidding UI
    lobby/
      LobbyRoom.jsx           — Waiting room: player list, ready, settings
  lib/
    socket.js                 — Socket.io client singleton
    gameStore.js              — Zustand store (single source: server-pushed state)
    boardData.js              — Board definition (mirrored from backend)
```

### State Management
Zustand store with one slice: the full game state as pushed by the server. No derived client state — everything computed from the server state object.

### Board Rendering
CSS Grid: 11×11 grid. Corner spaces occupy 1 corner cell. Sides fill remaining cells. Properties rendered as colored strips with city names. Player tokens overlaid as absolute-positioned circles.

### Routing
- `/` — Home page: create new game (calls `POST /games`) or enter room code
- `/game/[code]` — Handles both lobby (status=waiting) and active game (status=active) based on pushed game state. No separate `/lobby` route.

---

## 10. File Changes Summary

### New backend files
- `src/game/board-data.js`
- `src/game/cards.js`
- `src/game/state.js`
- `src/game/rules.js`
- `src/game/bot.js`
- `src/game/timer.js`

### Modified backend files
- `src/services/realtime/socketServer.js` — full rewrite with turn management
- `src/models/game.model.js` — minor: add `roomCode` field (6-char, indexed)
- `src/controllers/game.controller.js` — add room code generation to `createGame`

### New frontend (separate app)
- `frontend/` — full Next.js app as described in section 9

---

## 11. Out of Scope Decisions (for later)

- Authentication flow UI (Clerk handles this, just add Clerk provider to Next.js)
- Leaderboard UI (backend controller already exists)
- Skins/themes
- Friends list
- Mobile app (React Native or Flutter — decide when Phase 1 ships)
- Payments (Stripe/Razorpay)
- Public matchmaking
