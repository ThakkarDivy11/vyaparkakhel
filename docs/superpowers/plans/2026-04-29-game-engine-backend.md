# Game Engine — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete server-side Monopoly India Edition game engine — board data, rules, timers, and Socket.io server — on top of the existing Express/MongoDB/Redis scaffold.

**Architecture:** All game logic lives in a pure `applyMove(state, action) → newState` function. The socket server generates dice, acquires a Redis lock, loads state, calls `applyMove`, saves new state, and broadcasts to all clients. No game logic runs outside `applyMove`.

**Tech Stack:** Node.js (CommonJS), MongoDB/Mongoose, ioredis, Socket.io 4, BullMQ 5, Jest (new)

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/game/board-data.js` | Create | 40-space board definition + color group helpers |
| `src/game/cards.js` | Create | 16 Chance + 16 Community Chest card definitions |
| `src/game/state.js` | Create | `createInitialState()` + state accessor helpers |
| `src/game/rules.js` | Create | `applyMove(state, action)` — pure function, all 17 action types |
| `src/game/bot.js` | Create | Simple AI for disconnected players |
| `src/game/timer.js` | Create | BullMQ turn timer + reconnection window manager |
| `src/game/__tests__/board-data.test.js` | Create | Board data tests |
| `src/game/__tests__/cards.test.js` | Create | Cards tests |
| `src/game/__tests__/state.test.js` | Create | State factory tests |
| `src/game/__tests__/rules.test.js` | Create | Rules engine tests (main test file) |
| `src/game/__tests__/bot.test.js` | Create | Bot AI tests |
| `src/services/realtime/socketServer.js` | Rewrite | Full turn management with lock + broadcast |
| `src/models/game.model.js` | Modify | Add `roomCode` field (6-char, unique index) |
| `src/models/move.model.js` | Modify | Expand `type` enum to include all action types |
| `src/controllers/game.controller.js` | Modify | `createGame` generates room code; add `getGameByCode` |
| `src/routers/user/game.routes.js` | Create | Game REST routes |
| `src/app.js` | Modify | Mount game router + connect socket server |
| `package.json` | Modify | Add jest + jest.config |

---

## Task 1: Add Jest test framework

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install jest**

```bash
npm install --save-dev jest
```

Expected output: jest added to devDependencies

- [ ] **Step 2: Add test script and config to package.json**

Open `package.json` and update the `scripts` section and add `jest` config:

```json
"scripts": {
  "dev": "nodemon src/server.js",
  "start": "nodemon src/server.js",
  "test": "jest --runInBand",
  "test:watch": "jest --watch --runInBand",
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "format": "prettier --write .",
  "addDemoId": "node src/scripts/addIdsToDemoData.js"
},
"jest": {
  "testEnvironment": "node",
  "testMatch": ["**/src/game/__tests__/**/*.test.js"]
}
```

- [ ] **Step 3: Create the test directory**

```bash
mkdir -p src/game/__tests__
```

- [ ] **Step 4: Verify jest runs**

```bash
npm test
```

Expected: `No tests found` — this means jest is configured correctly.

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "--added: jest test framework"
```

---

## Task 2: Board data

**Files:**
- Create: `src/game/board-data.js`
- Create: `src/game/__tests__/board-data.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/game/__tests__/board-data.test.js`:

```js
const { SPACES, COLOR_GROUPS, RAILWAYS, UTILITIES, getSpaceById } = require('../board-data');

test('board has exactly 40 spaces', () => {
  expect(SPACES).toHaveLength(40);
});

test('spaces have sequential positions 0-39', () => {
  SPACES.forEach((space, idx) => {
    expect(space.pos).toBe(idx);
  });
});

test('corners are at positions 0, 10, 20, 30', () => {
  expect(SPACES[0].type).toBe('go');
  expect(SPACES[10].type).toBe('jail');
  expect(SPACES[20].type).toBe('free_parking');
  expect(SPACES[30].type).toBe('go_to_jail');
});

test('Mumbai is at position 39 with price 400', () => {
  expect(SPACES[39].id).toBe('mumbai');
  expect(SPACES[39].price).toBe(400);
});

test('brown group has exactly 2 properties', () => {
  expect(COLOR_GROUPS.brown).toHaveLength(2);
});

test('there are 4 railways', () => {
  expect(RAILWAYS).toHaveLength(4);
});

test('there are 2 utilities', () => {
  expect(UTILITIES).toHaveLength(2);
});

test('all properties have 6-tier rent arrays', () => {
  SPACES.filter(s => s.type === 'property').forEach(p => {
    expect(p.rent).toHaveLength(6);
    p.rent.forEach(r => expect(typeof r).toBe('number'));
  });
});

test('all properties have houseCost and mortgage', () => {
  SPACES.filter(s => s.type === 'property').forEach(p => {
    expect(typeof p.houseCost).toBe('number');
    expect(typeof p.mortgage).toBe('number');
  });
});

test('getSpaceById returns correct space', () => {
  const space = getSpaceById('mumbai');
  expect(space.pos).toBe(39);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test board-data
```

Expected: `Cannot find module '../board-data'`

- [ ] **Step 3: Create board-data.js**

Create `src/game/board-data.js`:

```js
// Hasbro Monopoly India Edition — 40-space board
// rent arrays: [base, 1H, 2H, 3H, 4H, hotel]
// All amounts in M (same denomination as ₹)

const SPACES = [
  { pos: 0,  type: 'go',            name: 'GO' },
  { pos: 1,  type: 'property', id: 'guwahati',    name: 'Guwahati',    color: 'brown',     price: 60,  houseCost: 50,  mortgage: 30,  rent: [2,  10,  30,  90,  160, 250]  },
  { pos: 2,  type: 'community_chest', name: 'Community Chest' },
  { pos: 3,  type: 'property', id: 'bhubaneshwar', name: 'Bhubaneshwar', color: 'brown',    price: 60,  houseCost: 50,  mortgage: 30,  rent: [4,  20,  60,  180, 320, 450]  },
  { pos: 4,  type: 'tax',           name: 'Income Tax',   amount: 200 },
  { pos: 5,  type: 'railway', id: 'chennai_central', name: 'Chennai Central Railway Station', price: 200, mortgage: 100 },
  { pos: 6,  type: 'property', id: 'panaji',      name: 'Panaji (Goa)', color: 'light_blue', price: 100, houseCost: 50,  mortgage: 50,  rent: [6,  30,  90,  270, 400, 550]  },
  { pos: 7,  type: 'chance',        name: 'Chance' },
  { pos: 8,  type: 'property', id: 'agra',        name: 'Agra',        color: 'light_blue', price: 100, houseCost: 50,  mortgage: 50,  rent: [6,  30,  90,  270, 400, 550]  },
  { pos: 9,  type: 'property', id: 'vadodara',    name: 'Vadodara',    color: 'light_blue', price: 120, houseCost: 50,  mortgage: 60,  rent: [8,  40,  100, 300, 450, 600]  },
  { pos: 10, type: 'jail',          name: 'Just Visiting' },
  { pos: 11, type: 'property', id: 'ludhiana',    name: 'Ludhiana',    color: 'pink',      price: 140, houseCost: 100, mortgage: 70,  rent: [10, 50,  150, 450, 625, 750]  },
  { pos: 12, type: 'utility', id: 'electric_company', name: 'Electric Company', price: 150, mortgage: 75 },
  { pos: 13, type: 'property', id: 'patna',       name: 'Patna',       color: 'pink',      price: 140, houseCost: 100, mortgage: 70,  rent: [10, 50,  150, 450, 625, 750]  },
  { pos: 14, type: 'property', id: 'bhopal',      name: 'Bhopal',      color: 'pink',      price: 160, houseCost: 100, mortgage: 80,  rent: [12, 60,  180, 500, 700, 900]  },
  { pos: 15, type: 'railway', id: 'howrah',       name: 'Howrah Station', price: 200, mortgage: 100 },
  { pos: 16, type: 'property', id: 'indore',      name: 'Indore',      color: 'orange',    price: 180, houseCost: 100, mortgage: 90,  rent: [14, 70,  200, 550, 750, 950]  },
  { pos: 17, type: 'community_chest', name: 'Community Chest' },
  { pos: 18, type: 'property', id: 'nagpur',      name: 'Nagpur',      color: 'orange',    price: 180, houseCost: 100, mortgage: 90,  rent: [14, 70,  200, 550, 750, 950]  },
  { pos: 19, type: 'property', id: 'meerut',      name: 'Meerut',      color: 'orange',    price: 200, houseCost: 100, mortgage: 100, rent: [16, 80,  220, 600, 800, 1000] },
  { pos: 20, type: 'free_parking',  name: 'Free Parking' },
  { pos: 21, type: 'property', id: 'lucknow',     name: 'Lucknow',     color: 'red',       price: 220, houseCost: 150, mortgage: 110, rent: [18, 90,  250, 700, 875, 1050] },
  { pos: 22, type: 'chance',        name: 'Chance' },
  { pos: 23, type: 'property', id: 'chandigarh',  name: 'Chandigarh',  color: 'red',       price: 220, houseCost: 150, mortgage: 110, rent: [18, 90,  250, 700, 875, 1050] },
  { pos: 24, type: 'property', id: 'jaipur',      name: 'Jaipur',      color: 'red',       price: 240, houseCost: 150, mortgage: 120, rent: [20, 100, 300, 750, 925, 1100] },
  { pos: 25, type: 'railway', id: 'new_delhi',    name: 'New Delhi Railway Station', price: 200, mortgage: 100 },
  { pos: 26, type: 'property', id: 'pune',        name: 'Pune',        color: 'yellow',    price: 260, houseCost: 150, mortgage: 130, rent: [22, 110, 330, 800, 975, 1150] },
  { pos: 27, type: 'property', id: 'hyderabad',   name: 'Hyderabad',   color: 'yellow',    price: 260, houseCost: 150, mortgage: 130, rent: [22, 110, 330, 800, 975, 1150] },
  { pos: 28, type: 'utility', id: 'water_works',  name: 'Water Works', price: 150, mortgage: 75 },
  { pos: 29, type: 'property', id: 'ahmedabad',   name: 'Ahmedabad',   color: 'yellow',    price: 280, houseCost: 150, mortgage: 140, rent: [24, 120, 360, 850, 1025, 1200] },
  { pos: 30, type: 'go_to_jail',    name: 'Go to Jail' },
  { pos: 31, type: 'property', id: 'kolkata',     name: 'Kolkata',     color: 'green',     price: 300, houseCost: 200, mortgage: 150, rent: [26, 130, 390, 900, 1100, 1275] },
  { pos: 32, type: 'property', id: 'chennai_city', name: 'Chennai',    color: 'green',     price: 300, houseCost: 200, mortgage: 150, rent: [26, 130, 390, 900, 1100, 1275] },
  { pos: 33, type: 'community_chest', name: 'Community Chest' },
  { pos: 34, type: 'property', id: 'bengaluru',   name: 'Bengaluru',   color: 'green',     price: 320, houseCost: 200, mortgage: 160, rent: [28, 150, 450, 1000, 1200, 1400] },
  { pos: 35, type: 'railway', id: 'chhatrapati',  name: 'Chhatrapati Shivaji Station', price: 200, mortgage: 100 },
  { pos: 36, type: 'chance',        name: 'Chance' },
  { pos: 37, type: 'property', id: 'delhi',       name: 'Delhi',       color: 'dark_blue', price: 350, houseCost: 200, mortgage: 175, rent: [35, 175, 500, 1100, 1300, 1500] },
  { pos: 38, type: 'tax',           name: 'Super Tax',    amount: 100 },
  { pos: 39, type: 'property', id: 'mumbai',      name: 'Mumbai',      color: 'dark_blue', price: 400, houseCost: 200, mortgage: 200, rent: [50, 200, 600, 1400, 1700, 2000] },
];

const COLOR_GROUPS = {
  brown:      ['guwahati', 'bhubaneshwar'],
  light_blue: ['panaji', 'agra', 'vadodara'],
  pink:       ['ludhiana', 'patna', 'bhopal'],
  orange:     ['indore', 'nagpur', 'meerut'],
  red:        ['lucknow', 'chandigarh', 'jaipur'],
  yellow:     ['pune', 'hyderabad', 'ahmedabad'],
  green:      ['kolkata', 'chennai_city', 'bengaluru'],
  dark_blue:  ['delhi', 'mumbai'],
};

const RAILWAYS = ['chennai_central', 'howrah', 'new_delhi', 'chhatrapati'];
const UTILITIES = ['electric_company', 'water_works'];

// Lookup by property id — build map once at module load
const SPACE_BY_ID = {};
SPACES.forEach(s => { if (s.id) SPACE_BY_ID[s.id] = s; });

function getSpaceById(id) {
  return SPACE_BY_ID[id] || null;
}

// Returns the color group name a property belongs to, or null
function getColorGroup(propertyId) {
  for (const [color, ids] of Object.entries(COLOR_GROUPS)) {
    if (ids.includes(propertyId)) return color;
  }
  return null;
}

module.exports = { SPACES, COLOR_GROUPS, RAILWAYS, UTILITIES, getSpaceById, getColorGroup };
```

- [ ] **Step 4: Run tests**

```bash
npm test board-data
```

Expected: All 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/game/board-data.js src/game/__tests__/board-data.test.js
git commit -m "--added: board-data.js with full 40-space Monopoly India board"
```

---

## Task 3: Card definitions

**Files:**
- Create: `src/game/cards.js`
- Create: `src/game/__tests__/cards.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/game/__tests__/cards.test.js`:

```js
const { CHANCE_CARDS, COMMUNITY_CHEST_CARDS } = require('../cards');

test('chance deck has 16 cards', () => {
  expect(CHANCE_CARDS).toHaveLength(16);
});

test('community chest deck has 16 cards', () => {
  expect(COMMUNITY_CHEST_CARDS).toHaveLength(16);
});

test('every card has id, description, and effect string', () => {
  [...CHANCE_CARDS, ...COMMUNITY_CHEST_CARDS].forEach(card => {
    expect(typeof card.id).toBe('string');
    expect(typeof card.description).toBe('string');
    expect(typeof card.effect).toBe('string');
  });
});

test('exactly one get-out-of-jail-free card in each deck', () => {
  expect(CHANCE_CARDS.filter(c => c.effect === 'JAIL_FREE')).toHaveLength(1);
  expect(COMMUNITY_CHEST_CARDS.filter(c => c.effect === 'JAIL_FREE')).toHaveLength(1);
});

test('GO_TO_JAIL effect exists in chance cards', () => {
  expect(CHANCE_CARDS.some(c => c.effect === 'GO_TO_JAIL')).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test cards
```

Expected: `Cannot find module '../cards'`

- [ ] **Step 3: Create cards.js**

Create `src/game/cards.js`:

```js
// effect string format:
//   'COLLECT:n'        — player collects n from bank
//   'PAY:n'            — player pays n to bank (goes to free parking pool if enabled)
//   'PAY_EACH:n'       — player pays n to each other active player
//   'COLLECT_EACH:n'   — player collects n from each other active player
//   'MOVE_TO:pos'      — move player to board position pos (collect GO if passing)
//   'MOVE_TO_NEAREST:railway' — advance to nearest railway, pay 2x rent
//   'MOVE_TO_NEAREST:utility' — advance to nearest utility, pay 10x dice
//   'MOVE_BACK:n'      — move back n spaces (no GO collection)
//   'GO_TO_JAIL'       — go to jail immediately
//   'JAIL_FREE'        — get out of jail free card (keep until used)
//   'STREET_REPAIRS:h:H' — pay h per house, H per hotel owned

const CHANCE_CARDS = [
  { id: 'ch_advance_go',      description: 'Advance to GO. Collect M200.',              effect: 'MOVE_TO:0'              },
  { id: 'ch_advance_goa',     description: 'Advance to Panaji (Goa).',                  effect: 'MOVE_TO:6'              },
  { id: 'ch_advance_mumbai',  description: 'Advance to Mumbai.',                         effect: 'MOVE_TO:39'             },
  { id: 'ch_advance_nearest_railway_1', description: 'Advance to nearest Railway. Pay owner twice the usual rent.', effect: 'MOVE_TO_NEAREST:railway' },
  { id: 'ch_advance_nearest_railway_2', description: 'Advance to nearest Railway. Pay owner twice the usual rent.', effect: 'MOVE_TO_NEAREST:railway' },
  { id: 'ch_advance_nearest_utility',   description: 'Advance to nearest Utility. If unowned you may buy. If owned pay owner 10x dice roll.', effect: 'MOVE_TO_NEAREST:utility' },
  { id: 'ch_bank_dividend',   description: 'Bank pays you a dividend of M50.',           effect: 'COLLECT:50'             },
  { id: 'ch_jail_free',       description: 'Get Out of Jail Free.',                      effect: 'JAIL_FREE'              },
  { id: 'ch_go_back_3',       description: 'Go back 3 spaces.',                          effect: 'MOVE_BACK:3'            },
  { id: 'ch_go_to_jail',      description: 'Go to Jail.',                                effect: 'GO_TO_JAIL'             },
  { id: 'ch_street_repairs',  description: 'Make general repairs: pay M25 per house, M100 per hotel.', effect: 'STREET_REPAIRS:25:100' },
  { id: 'ch_poor_tax',        description: 'Pay poor tax of M15.',                       effect: 'PAY:15'                 },
  { id: 'ch_advance_delhi',   description: 'Take a trip to New Delhi Railway Station.',  effect: 'MOVE_TO:25'             },
  { id: 'ch_advance_bengaluru', description: 'Advance to Bengaluru.',                    effect: 'MOVE_TO:34'             },
  { id: 'ch_elected_chairman', description: 'You have been elected Chairman of the Board. Pay each player M50.', effect: 'PAY_EACH:50' },
  { id: 'ch_investment',      description: 'Your building loan matures. Collect M150.',  effect: 'COLLECT:150'            },
];

const COMMUNITY_CHEST_CARDS = [
  { id: 'cc_advance_go',      description: 'Advance to GO. Collect M200.',              effect: 'MOVE_TO:0'              },
  { id: 'cc_bank_error',      description: 'Bank error in your favour. Collect M200.',  effect: 'COLLECT:200'            },
  { id: 'cc_doctor_fee',      description: "Doctor's fees. Pay M50.",                    effect: 'PAY:50'                 },
  { id: 'cc_stock_sale',      description: 'From sale of stock you get M50.',           effect: 'COLLECT:50'             },
  { id: 'cc_jail_free',       description: 'Get Out of Jail Free.',                      effect: 'JAIL_FREE'              },
  { id: 'cc_go_to_jail',      description: 'Go to Jail.',                                effect: 'GO_TO_JAIL'             },
  { id: 'cc_grand_opera',     description: 'Grand Opera Night. Collect M50 from each player.', effect: 'COLLECT_EACH:50'  },
  { id: 'cc_holiday_fund',    description: 'Holiday fund matures. Receive M100.',       effect: 'COLLECT:100'            },
  { id: 'cc_income_tax',      description: 'Income tax refund. Collect M20.',           effect: 'COLLECT:20'             },
  { id: 'cc_birthday',        description: "It is your birthday. Collect M10 from each player.", effect: 'COLLECT_EACH:10' },
  { id: 'cc_life_insurance',  description: 'Life insurance matures. Collect M100.',     effect: 'COLLECT:100'            },
  { id: 'cc_hospital_fee',    description: 'Pay hospital fees of M100.',                effect: 'PAY:100'                },
  { id: 'cc_school_fees',     description: 'Pay school fees of M50.',                   effect: 'PAY:50'                 },
  { id: 'cc_consultancy',     description: 'Receive M25 consultancy fee.',              effect: 'COLLECT:25'             },
  { id: 'cc_street_repairs',  description: 'You are assessed for street repairs: M40 per house, M115 per hotel.', effect: 'STREET_REPAIRS:40:115' },
  { id: 'cc_beauty_contest',  description: 'You have won second prize in a beauty contest. Collect M10.', effect: 'COLLECT:10' },
];

module.exports = { CHANCE_CARDS, COMMUNITY_CHEST_CARDS };
```

- [ ] **Step 4: Run tests**

```bash
npm test cards
```

Expected: All 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/game/cards.js src/game/__tests__/cards.test.js
git commit -m "--added: chance and community chest card definitions"
```

---

## Task 4: Game state factory

**Files:**
- Create: `src/game/state.js`
- Create: `src/game/__tests__/state.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/game/__tests__/state.test.js`:

```js
const { createInitialState, getPlayer, getActivePlayers, ownsFullColorGroup, countOwnedRailways } = require('../state');

const MOCK_GAME = {
  gameId: 'test-game-1',
  settings: { timePerTurnSec: 60, freeParkingMoney: 0, allowTrading: true },
};
const MOCK_PLAYERS = [
  { seat: 0, userId: 'u1', displayName: 'Alice' },
  { seat: 1, userId: 'u2', displayName: 'Bob' },
];

describe('createInitialState', () => {
  let state;
  beforeEach(() => { state = createInitialState(MOCK_GAME, MOCK_PLAYERS); });

  test('has correct player count', () => expect(state.players).toHaveLength(2));
  test('each player starts with M1500', () => state.players.forEach(p => expect(p.balance).toBe(1500)));
  test('each player starts at position 0', () => state.players.forEach(p => expect(p.position).toBe(0)));
  test('initial phase is roll', () => expect(state.phase).toBe('roll'));
  test('first turn is seat 0', () => expect(state.currentTurnSeat).toBe(0));
  test('doublesCount starts at 0', () => expect(state.doublesCount).toBe(0));
  test('all properties start unowned', () => Object.values(state.properties).forEach(p => expect(p.owner).toBeNull()));
  test('all properties have 0 houses', () => Object.values(state.properties).forEach(p => expect(p.houses).toBe(0)));
  test('chance deck has 16 entries', () => expect(state.chanceDeck).toHaveLength(16));
  test('community deck has 16 entries', () => expect(state.communityDeck).toHaveLength(16));
  test('freeParkingPool starts at 0', () => expect(state.freeParkingPool).toBe(0));
});

describe('getPlayer', () => {
  test('returns player by seat', () => {
    const state = createInitialState(MOCK_GAME, MOCK_PLAYERS);
    expect(getPlayer(state, 0).displayName).toBe('Alice');
    expect(getPlayer(state, 1).displayName).toBe('Bob');
  });
  test('returns undefined for unknown seat', () => {
    const state = createInitialState(MOCK_GAME, MOCK_PLAYERS);
    expect(getPlayer(state, 99)).toBeUndefined();
  });
});

describe('ownsFullColorGroup', () => {
  test('returns false when properties are split', () => {
    const state = createInitialState(MOCK_GAME, MOCK_PLAYERS);
    state.properties['guwahati'].owner = 0;
    state.properties['bhubaneshwar'].owner = 1;
    expect(ownsFullColorGroup(state, 0, 'brown')).toBe(false);
  });
  test('returns true when player owns all in group', () => {
    const state = createInitialState(MOCK_GAME, MOCK_PLAYERS);
    state.properties['guwahati'].owner = 0;
    state.properties['bhubaneshwar'].owner = 0;
    expect(ownsFullColorGroup(state, 0, 'brown')).toBe(true);
  });
});

describe('countOwnedRailways', () => {
  test('counts railways owned by a seat', () => {
    const state = createInitialState(MOCK_GAME, MOCK_PLAYERS);
    state.properties['chennai_central'].owner = 0;
    state.properties['howrah'].owner = 0;
    expect(countOwnedRailways(state, 0)).toBe(2);
    expect(countOwnedRailways(state, 1)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test state
```

Expected: `Cannot find module '../state'`

- [ ] **Step 3: Create state.js**

Create `src/game/state.js`:

```js
const { SPACES, COLOR_GROUPS, RAILWAYS } = require('./board-data');
const { CHANCE_CARDS, COMMUNITY_CHEST_CARDS } = require('./cards');

function shuffleDeck(length) {
  const deck = Array.from({ length }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function createInitialState(gameDoc, playerDocs) {
  const properties = {};
  SPACES.forEach(space => {
    if (space.type === 'property' || space.type === 'railway' || space.type === 'utility') {
      properties[space.id] = { owner: null, houses: 0, mortgaged: false };
    }
  });

  const players = playerDocs.map(p => ({
    seat: p.seat,
    userId: String(p.userId),
    displayName: p.displayName,
    balance: 1500,
    position: 0,
    inJail: false,
    jailTurns: 0,
    jailFreeCards: 0,
    isBankrupt: false,
    isConnected: true,
    disconnectedAt: null,
    isBot: false,
  }));

  return {
    gameId: gameDoc.gameId,
    status: 'active',
    phase: 'roll',
    currentTurnSeat: players[0].seat,
    turnDeadline: Date.now() + (gameDoc.settings?.timePerTurnSec || 60) * 1000,
    doublesCount: 0,
    lastDice: null,
    auction: null,
    pendingTrade: null,
    freeParkingPool: 0,
    chanceDeck: shuffleDeck(CHANCE_CARDS.length),
    communityDeck: shuffleDeck(COMMUNITY_CHEST_CARDS.length),
    log: [],
    players,
    properties,
    settings: gameDoc.settings || {},
  };
}

function getPlayer(state, seat) {
  return state.players.find(p => p.seat === seat);
}

function getActivePlayers(state) {
  return state.players.filter(p => !p.isBankrupt);
}

function ownsFullColorGroup(state, seat, color) {
  const group = COLOR_GROUPS[color];
  if (!group) return false;
  return group.every(id => state.properties[id]?.owner === seat);
}

function countOwnedRailways(state, seat) {
  return RAILWAYS.filter(id => state.properties[id]?.owner === seat).length;
}

function nextActiveSeat(state, fromSeat) {
  const active = getActivePlayers(state);
  if (active.length === 0) return fromSeat;
  const sorted = active.map(p => p.seat).sort((a, b) => a - b);
  const next = sorted.find(s => s > fromSeat);
  return next !== undefined ? next : sorted[0];
}

function addLog(state, message) {
  state.log = [...state.log.slice(-29), message];
}

module.exports = {
  createInitialState,
  getPlayer,
  getActivePlayers,
  ownsFullColorGroup,
  countOwnedRailways,
  nextActiveSeat,
  addLog,
};
```

- [ ] **Step 4: Run tests**

```bash
npm test state
```

Expected: All 14 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/game/state.js src/game/__tests__/state.test.js
git commit -m "--added: game state factory and accessor helpers"
```

---

## Task 5: Rules engine — ROLL_DICE and movement

**Files:**
- Create: `src/game/rules.js`
- Create: `src/game/__tests__/rules.test.js`

- [ ] **Step 1: Write failing tests for ROLL_DICE**

Create `src/game/__tests__/rules.test.js`:

```js
const { applyMove } = require('../rules');
const { createInitialState } = require('../state');

const GAME = { gameId: 'g1', settings: { timePerTurnSec: 60, freeParkingMoney: 0, allowTrading: true } };
const TWO_PLAYERS = [
  { seat: 0, userId: 'u1', displayName: 'A' },
  { seat: 1, userId: 'u2', displayName: 'B' },
];

function makeState(overrides = {}) {
  const base = createInitialState(GAME, TWO_PLAYERS);
  return { ...base, ...overrides };
}

function rollAction(dice, seat = 0) {
  return { type: 'ROLL_DICE', dice, seat };
}

describe('ROLL_DICE — movement', () => {
  test('advances position by dice sum', () => {
    const s = makeState();
    const ns = applyMove(s, rollAction([3, 4]));
    expect(ns.players[0].position).toBe(7);
  });

  test('wraps around board at position 40', () => {
    const s = makeState();
    s.players[0].position = 38;
    const ns = applyMove(s, rollAction([1, 3]));
    expect(ns.players[0].position).toBe(2);
  });

  test('collecting GO salary when passing position 0', () => {
    const s = makeState();
    s.players[0].position = 38;
    const ns = applyMove(s, rollAction([1, 3]));
    expect(ns.players[0].balance).toBe(1700);
  });

  test('no GO salary when not passing', () => {
    const s = makeState();
    const ns = applyMove(s, rollAction([3, 4]));
    expect(ns.players[0].balance).toBe(1500);
  });

  test('stores last dice roll in state', () => {
    const s = makeState();
    const ns = applyMove(s, rollAction([2, 5]));
    expect(ns.lastDice).toEqual([2, 5]);
  });
});

describe('ROLL_DICE — doubles', () => {
  test('increments doublesCount on doubles roll', () => {
    const s = makeState();
    const ns = applyMove(s, rollAction([3, 3]));
    expect(ns.doublesCount).toBe(1);
  });

  test('resets doublesCount on non-doubles', () => {
    const s = makeState({ doublesCount: 1 });
    const ns = applyMove(s, rollAction([2, 5]));
    expect(ns.doublesCount).toBe(0);
  });

  test('third doubles sends player to jail at position 10', () => {
    const s = makeState({ doublesCount: 2 });
    const ns = applyMove(s, rollAction([3, 3]));
    expect(ns.players[0].inJail).toBe(true);
    expect(ns.players[0].position).toBe(10);
    expect(ns.doublesCount).toBe(0);
  });

  test('third doubles sets phase to roll for next player', () => {
    const s = makeState({ doublesCount: 2 });
    const ns = applyMove(s, rollAction([3, 3]));
    expect(ns.phase).toBe('roll');
    expect(ns.currentTurnSeat).toBe(1);
  });
});

describe('ROLL_DICE — Go To Jail space', () => {
  test('landing on position 30 sends player to jail', () => {
    const s = makeState();
    s.players[0].position = 28;
    const ns = applyMove(s, rollAction([1, 1]));
    expect(ns.players[0].inJail).toBe(true);
    expect(ns.players[0].position).toBe(10);
  });

  test('landing on Go To Jail advances turn to next player', () => {
    const s = makeState();
    s.players[0].position = 28;
    const ns = applyMove(s, rollAction([1, 1]));
    expect(ns.currentTurnSeat).toBe(1);
    expect(ns.phase).toBe('roll');
  });
});

describe('ROLL_DICE — phase transitions', () => {
  test('landing on unowned property sets phase to post_roll', () => {
    const s = makeState();
    // position 1 = Guwahati (unowned by default)
    const ns = applyMove(s, rollAction([1, 0]));
    expect(ns.phase).toBe('post_roll');
  });

  test('landing on tax space auto-deducts and sets phase to manage', () => {
    const s = makeState();
    s.players[0].position = 3;
    // position 4 = Income Tax M200
    const ns = applyMove(s, rollAction([0, 1]));
    expect(ns.players[0].balance).toBe(1300);
    expect(ns.phase).toBe('manage');
  });
});
```

> Note: `rollAction([1, 0])` uses dice `[1, 0]` — 0 is valid for testing only. In production the socket server always generates dice with `Math.ceil(Math.random() * 6)`.

- [ ] **Step 2: Run to verify failure**

```bash
npm test rules
```

Expected: `Cannot find module '../rules'`

- [ ] **Step 3: Create rules.js with ROLL_DICE**

Create `src/game/rules.js`:

```js
const { SPACES, COLOR_GROUPS, RAILWAYS, UTILITIES, getSpaceById, getColorGroup } = require('./board-data');
const { CHANCE_CARDS, COMMUNITY_CHEST_CARDS } = require('./cards');
const { getPlayer, getActivePlayers, ownsFullColorGroup, countOwnedRailways, nextActiveSeat, addLog } = require('./state');

// ─── Public API ──────────────────────────────────────────────────────────────

function applyMove(state, action) {
  const s = structuredClone(state);
  validateTurn(s, action);
  switch (action.type) {
    case 'ROLL_DICE':          return handleRollDice(s, action);
    case 'PAY_BAIL':           return handlePayBail(s, action);
    case 'USE_JAIL_FREE_CARD': return handleJailFreeCard(s, action);
    case 'BUY_PROPERTY':       return handleBuyProperty(s, action);
    case 'DECLINE_PROPERTY':   return handleDeclineProperty(s, action);
    case 'AUCTION_BID':        return handleAuctionBid(s, action);
    case 'AUCTION_PASS':       return handleAuctionPass(s, action);
    case 'BUILD_HOUSE':        return handleBuildHouse(s, action);
    case 'SELL_HOUSE':         return handleSellHouse(s, action);
    case 'MORTGAGE':           return handleMortgage(s, action);
    case 'UNMORTGAGE':         return handleUnmortgage(s, action);
    case 'OFFER_TRADE':        return handleOfferTrade(s, action);
    case 'ACCEPT_TRADE':       return handleAcceptTrade(s, action);
    case 'REJECT_TRADE':       return handleRejectTrade(s, action);
    case 'CANCEL_TRADE':       return handleCancelTrade(s, action);
    case 'END_TURN':           return handleEndTurn(s, action);
    case 'DECLARE_BANKRUPTCY': return handleDeclareBankruptcy(s, action);
    case 'TIMEOUT':            return handleTimeout(s, action);
    default: throw new Error(`Unknown action: ${action.type}`);
  }
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateTurn(state, action) {
  // TIMEOUT and AUCTION actions can come from server (no seat check)
  if (['TIMEOUT', 'AUCTION_BID', 'AUCTION_PASS'].includes(action.type)) return;
  // ACCEPT/REJECT trade: trade target, not current player
  if (['ACCEPT_TRADE', 'REJECT_TRADE'].includes(action.type)) {
    if (state.pendingTrade?.targetSeat !== action.seat) throw new Error('not_your_trade');
    return;
  }
  if (action.seat !== state.currentTurnSeat) throw new Error('not_your_turn');
  if (state.status !== 'active') throw new Error('game_not_active');
}

// ─── ROLL_DICE ────────────────────────────────────────────────────────────────

function handleRollDice(state, action) {
  const [d1, d2] = action.dice;
  const player = getPlayer(state, action.seat);

  if (state.phase !== 'roll') throw new Error('invalid_phase');

  // In-jail roll: attempt to escape with doubles
  if (player.inJail) return handleJailRoll(state, player, d1, d2);

  const isDoubles = d1 === d2;
  if (isDoubles) {
    state.doublesCount += 1;
    if (state.doublesCount >= 3) return sendToJail(state, player);
  } else {
    state.doublesCount = 0;
  }

  state.lastDice = [d1, d2];
  const newPos = (player.position + d1 + d2) % 40;
  if (newPos < player.position + d1 + d2 - 39) {
    // wrapped — passed GO
    player.balance += 200;
    addLog(state, `${player.displayName} passed GO, collected M200`);
  }
  player.position = newPos;

  return resolveLanding(state, player);
}

function handleJailRoll(state, player, d1, d2) {
  state.lastDice = [d1, d2];
  if (d1 === d2) {
    // escape by doubles
    player.inJail = false;
    player.jailTurns = 0;
    state.doublesCount = 0; // doubles used to escape don't give extra turn
    const newPos = (player.position + d1 + d2) % 40;
    player.position = newPos;
    addLog(state, `${player.displayName} rolled doubles and escaped jail`);
    return resolveLanding(state, player);
  }
  player.jailTurns += 1;
  if (player.jailTurns >= 3) {
    // 3 failed rolls — forced bail
    if (player.balance < 50) throw new Error('cannot_afford_bail');
    player.balance -= 50;
    addFreeParking(state, 50);
    player.inJail = false;
    player.jailTurns = 0;
    const newPos = (10 + d1 + d2) % 40;
    player.position = newPos;
    addLog(state, `${player.displayName} paid forced bail and moved`);
    return resolveLanding(state, player);
  }
  addLog(state, `${player.displayName} failed to roll doubles in jail (turn ${player.jailTurns})`);
  // Turn ends (no doubles = no extra roll, no move)
  return advanceTurn(state);
}

// ─── Landing resolution ───────────────────────────────────────────────────────

function resolveLanding(state, player) {
  const space = SPACES[player.position];
  addLog(state, `${player.displayName} landed on ${space.name}`);

  switch (space.type) {
    case 'go':
      player.balance += 200; // landing ON go also awards salary
      addLog(state, `${player.displayName} landed on GO, collected M200`);
      return setManage(state);

    case 'go_to_jail':
      return sendToJail(state, player);

    case 'jail':
    case 'free_parking':
      return setManage(state);

    case 'tax':
      player.balance -= space.amount;
      addFreeParking(state, space.amount);
      addLog(state, `${player.displayName} paid ${space.name} M${space.amount}`);
      return setManage(state);

    case 'chance':
      return drawCard(state, player, 'chance');

    case 'community_chest':
      return drawCard(state, player, 'community_chest');

    case 'property':
    case 'railway':
    case 'utility': {
      const propState = state.properties[space.id];
      if (!propState) return setManage(state);
      if (propState.owner === null) {
        state.phase = 'post_roll';
        return state;
      }
      if (propState.owner === player.seat || propState.mortgaged) {
        return setManage(state);
      }
      // owned by another player — charge rent
      const rent = calcRent(state, space, player);
      chargeRent(state, player, getPlayer(state, propState.owner), rent);
      return setManage(state);
    }

    default:
      return setManage(state);
  }
}

// ─── Rent calculation ────────────────────────────────────────────────────────

function calcRent(state, space, landingPlayer) {
  const propState = state.properties[space.id];
  if (space.type === 'railway') {
    const count = countOwnedRailways(state, propState.owner);
    return 25 * Math.pow(2, count - 1);
  }
  if (space.type === 'utility') {
    const utilitiesOwned = UTILITIES.filter(id => state.properties[id]?.owner === propState.owner).length;
    const diceSum = state.lastDice[0] + state.lastDice[1];
    return utilitiesOwned === 2 ? diceSum * 10 : diceSum * 4;
  }
  // Regular property
  const houses = propState.houses;
  if (houses > 0) {
    // rent[0]=base, rent[1]=1H, ..., rent[5]=hotel
    return space.rent[Math.min(houses, 5)];
  }
  // No houses: check for monopoly (2x base)
  const color = space.color;
  if (ownsFullColorGroup(state, propState.owner, color)) {
    return space.rent[0] * 2;
  }
  return space.rent[0];
}

function chargeRent(state, payer, receiver, amount) {
  const actual = Math.min(amount, payer.balance);
  payer.balance -= actual;
  receiver.balance += actual;
  addLog(state, `${payer.displayName} paid M${actual} rent to ${receiver.displayName}`);
  if (payer.balance <= 0) {
    addLog(state, `${payer.displayName} is insolvent after rent payment`);
  }
}

// ─── Card drawing ────────────────────────────────────────────────────────────

function drawCard(state, player, deckType) {
  const isDeckChance = deckType === 'chance';
  const deck = isDeckChance ? state.chanceDeck : state.communityDeck;
  const cards = isDeckChance ? CHANCE_CARDS : COMMUNITY_CHEST_CARDS;

  if (deck.length === 0) {
    // reshuffle
    const newDeck = Array.from({ length: cards.length }, (_, i) => i);
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    if (isDeckChance) state.chanceDeck = newDeck;
    else state.communityDeck = newDeck;
  }

  const deckRef = isDeckChance ? state.chanceDeck : state.communityDeck;
  const cardIndex = deckRef.shift();
  const card = cards[cardIndex];

  if (card.effect !== 'JAIL_FREE') {
    if (isDeckChance) state.chanceDeck.push(cardIndex);
    else state.communityDeck.push(cardIndex);
  }

  addLog(state, `${player.displayName} drew: ${card.description}`);
  return applyCardEffect(state, player, card);
}

function applyCardEffect(state, player, card) {
  const [effectType, ...params] = card.effect.split(':');

  switch (effectType) {
    case 'COLLECT':
      player.balance += parseInt(params[0]);
      return setManage(state);

    case 'PAY':
      player.balance -= parseInt(params[0]);
      addFreeParking(state, parseInt(params[0]));
      return setManage(state);

    case 'COLLECT_EACH': {
      const amount = parseInt(params[0]);
      getActivePlayers(state).forEach(p => {
        if (p.seat !== player.seat) {
          p.balance -= amount;
          player.balance += amount;
        }
      });
      return setManage(state);
    }

    case 'PAY_EACH': {
      const amount = parseInt(params[0]);
      getActivePlayers(state).forEach(p => {
        if (p.seat !== player.seat) {
          player.balance -= amount;
          p.balance += amount;
        }
      });
      return setManage(state);
    }

    case 'MOVE_TO': {
      const targetPos = parseInt(params[0]);
      if (targetPos < player.position) {
        player.balance += 200; // passed GO
      }
      player.position = targetPos;
      return resolveLanding(state, player);
    }

    case 'MOVE_BACK': {
      player.position = (player.position - parseInt(params[0]) + 40) % 40;
      return resolveLanding(state, player);
    }

    case 'MOVE_TO_NEAREST': {
      const type = params[0];
      const nearest = findNearest(player.position, type);
      if (nearest < player.position) player.balance += 200; // passed GO
      player.position = nearest;
      // mark as "nearest" for 2x rent calculation
      state._nearestCard = type;
      return resolveLanding(state, player);
    }

    case 'GO_TO_JAIL':
      return sendToJail(state, player);

    case 'JAIL_FREE':
      player.jailFreeCards += 1;
      return setManage(state);

    case 'STREET_REPAIRS': {
      const houseCost = parseInt(params[0]);
      const hotelCost = parseInt(params[1]);
      let total = 0;
      Object.entries(state.properties).forEach(([id, ps]) => {
        if (ps.owner === player.seat && ps.houses > 0) {
          total += ps.houses === 5 ? hotelCost : ps.houses * houseCost;
        }
      });
      player.balance -= total;
      addFreeParking(state, total);
      return setManage(state);
    }

    default:
      return setManage(state);
  }
}

// ─── Jail actions ─────────────────────────────────────────────────────────────

function handlePayBail(state, action) {
  if (state.phase !== 'roll') throw new Error('invalid_phase');
  const player = getPlayer(state, action.seat);
  if (!player.inJail) throw new Error('not_in_jail');
  if (player.balance < 50) throw new Error('cannot_afford');
  player.balance -= 50;
  addFreeParking(state, 50);
  player.inJail = false;
  player.jailTurns = 0;
  state.phase = 'roll'; // player now rolls normally
  addLog(state, `${player.displayName} paid M50 bail`);
  return state;
}

function handleJailFreeCard(state, action) {
  if (state.phase !== 'roll') throw new Error('invalid_phase');
  const player = getPlayer(state, action.seat);
  if (!player.inJail) throw new Error('not_in_jail');
  if (player.jailFreeCards < 1) throw new Error('no_jail_free_card');
  player.jailFreeCards -= 1;
  player.inJail = false;
  player.jailTurns = 0;
  state.phase = 'roll';
  addLog(state, `${player.displayName} used Get Out of Jail Free card`);
  return state;
}

// ─── Property purchase ────────────────────────────────────────────────────────

function handleBuyProperty(state, action) {
  if (state.phase !== 'post_roll') throw new Error('invalid_phase');
  const player = getPlayer(state, action.seat);
  const space = SPACES[player.position];
  if (!space || !['property', 'railway', 'utility'].includes(space.type)) throw new Error('not_a_property');
  const propState = state.properties[space.id];
  if (propState.owner !== null) throw new Error('already_owned');
  if (player.balance < space.price) throw new Error('cannot_afford');
  player.balance -= space.price;
  propState.owner = player.seat;
  addLog(state, `${player.displayName} bought ${space.name} for M${space.price}`);
  return setManage(state);
}

function handleDeclineProperty(state, action) {
  if (state.phase !== 'post_roll') throw new Error('invalid_phase');
  const player = getPlayer(state, action.seat);
  const space = SPACES[player.position];
  const propState = state.properties[space.id];
  if (propState.owner !== null) throw new Error('already_owned');
  // Start auction
  state.phase = 'auction';
  state.auction = {
    propertyId: space.id,
    highBid: 0,
    highBidder: null,
    passedSeats: [],
  };
  addLog(state, `${space.name} goes to auction`);
  return state;
}

// ─── Auction ──────────────────────────────────────────────────────────────────

function handleAuctionBid(state, action) {
  if (state.phase !== 'auction') throw new Error('invalid_phase');
  if (!state.auction) throw new Error('no_auction');
  const player = getPlayer(state, action.seat);
  if (player.isBankrupt) throw new Error('bankrupt_player');
  if (action.amount <= state.auction.highBid) throw new Error('bid_too_low');
  if (action.amount > player.balance) throw new Error('cannot_afford');
  state.auction.highBid = action.amount;
  state.auction.highBidder = action.seat;
  // Remove from passed list if they bid after passing
  state.auction.passedSeats = state.auction.passedSeats.filter(s => s !== action.seat);
  addLog(state, `${player.displayName} bids M${action.amount} for ${state.auction.propertyId}`);
  return state;
}

function handleAuctionPass(state, action) {
  if (state.phase !== 'auction') throw new Error('invalid_phase');
  const player = getPlayer(state, action.seat);
  if (!state.auction.passedSeats.includes(action.seat)) {
    state.auction.passedSeats.push(action.seat);
  }
  addLog(state, `${player.displayName} passes auction`);
  return checkAuctionEnd(state);
}

function checkAuctionEnd(state) {
  const active = getActivePlayers(state);
  const allPassed = active.every(p => state.auction.passedSeats.includes(p.seat));
  if (!allPassed) return state;

  // Auction over
  if (state.auction.highBidder !== null) {
    const winner = getPlayer(state, state.auction.highBidder);
    winner.balance -= state.auction.highBid;
    state.properties[state.auction.propertyId].owner = state.auction.highBidder;
    addLog(state, `${winner.displayName} won auction for ${state.auction.propertyId} at M${state.auction.highBid}`);
  } else {
    addLog(state, `${state.auction.propertyId} returned to bank unsold`);
  }
  state.auction = null;
  return setManage(state);
}

// ─── Manage phase ─────────────────────────────────────────────────────────────

function handleBuildHouse(state, action) {
  if (state.phase !== 'manage') throw new Error('invalid_phase');
  if (state.pendingTrade) throw new Error('trade_pending');
  const player = getPlayer(state, action.seat);
  const space = getSpaceById(action.propertyId);
  if (!space || space.type !== 'property') throw new Error('not_a_property');
  const propState = state.properties[action.propertyId];
  if (propState.owner !== action.seat) throw new Error('not_owner');
  if (propState.mortgaged) throw new Error('property_mortgaged');
  if (!ownsFullColorGroup(state, action.seat, space.color)) throw new Error('need_full_color_group');
  if (propState.houses >= 5) throw new Error('max_houses');
  // Even build rule: no property in group can have more than 1 house ahead of others
  const group = COLOR_GROUPS[space.color];
  const minHouses = Math.min(...group.map(id => state.properties[id].houses));
  if (propState.houses > minHouses) throw new Error('even_build_rule');
  if (player.balance < space.houseCost) throw new Error('cannot_afford');
  player.balance -= space.houseCost;
  propState.houses += 1;
  const label = propState.houses === 5 ? 'hotel' : `house #${propState.houses}`;
  addLog(state, `${player.displayName} built ${label} on ${space.name}`);
  return state;
}

function handleSellHouse(state, action) {
  if (state.phase !== 'manage') throw new Error('invalid_phase');
  const player = getPlayer(state, action.seat);
  const space = getSpaceById(action.propertyId);
  const propState = state.properties[action.propertyId];
  if (propState.owner !== action.seat) throw new Error('not_owner');
  if (propState.houses < 1) throw new Error('no_houses');
  // Even sell rule: can't leave another in group with 2 more than this one
  const group = COLOR_GROUPS[space.color];
  const maxHouses = Math.max(...group.map(id => state.properties[id].houses));
  if (maxHouses > propState.houses) throw new Error('even_build_rule');
  propState.houses -= 1;
  player.balance += Math.floor(space.houseCost / 2);
  addLog(state, `${player.displayName} sold a house on ${space.name}`);
  return state;
}

function handleMortgage(state, action) {
  if (state.phase !== 'manage') throw new Error('invalid_phase');
  const player = getPlayer(state, action.seat);
  const space = getSpaceById(action.propertyId);
  if (!space) throw new Error('invalid_property');
  const propState = state.properties[action.propertyId];
  if (propState.owner !== action.seat) throw new Error('not_owner');
  if (propState.mortgaged) throw new Error('already_mortgaged');
  if (propState.houses > 0) throw new Error('sell_houses_first');
  propState.mortgaged = true;
  player.balance += space.mortgage;
  addLog(state, `${player.displayName} mortgaged ${space.name} for M${space.mortgage}`);
  return state;
}

function handleUnmortgage(state, action) {
  if (state.phase !== 'manage') throw new Error('invalid_phase');
  const player = getPlayer(state, action.seat);
  const space = getSpaceById(action.propertyId);
  if (!space) throw new Error('invalid_property');
  const propState = state.properties[action.propertyId];
  if (propState.owner !== action.seat) throw new Error('not_owner');
  if (!propState.mortgaged) throw new Error('not_mortgaged');
  const cost = Math.ceil(space.mortgage * 1.1);
  if (player.balance < cost) throw new Error('cannot_afford');
  propState.mortgaged = false;
  player.balance -= cost;
  addLog(state, `${player.displayName} unmortgaged ${space.name} for M${cost}`);
  return state;
}

function handleEndTurn(state, action) {
  if (state.phase !== 'manage') throw new Error('invalid_phase');
  if (state.pendingTrade) throw new Error('trade_pending');
  return advanceTurn(state);
}

// ─── Trading ──────────────────────────────────────────────────────────────────

function handleOfferTrade(state, action) {
  if (state.phase !== 'manage') throw new Error('invalid_phase');
  if (!state.settings.allowTrading) throw new Error('trading_disabled');
  if (state.pendingTrade) throw new Error('trade_already_pending');
  const { offer } = action; // { targetSeat, offerProperties[], offerCash, requestProperties[], requestCash }
  state.pendingTrade = {
    offerSeat: action.seat,
    targetSeat: offer.targetSeat,
    offerProperties: offer.offerProperties || [],
    offerCash: offer.offerCash || 0,
    requestProperties: offer.requestProperties || [],
    requestCash: offer.requestCash || 0,
  };
  addLog(state, `${getPlayer(state, action.seat).displayName} offered a trade`);
  return state;
}

function handleAcceptTrade(state, action) {
  const trade = state.pendingTrade;
  if (!trade || trade.targetSeat !== action.seat) throw new Error('no_trade_for_you');
  const offerer = getPlayer(state, trade.offerSeat);
  const target = getPlayer(state, trade.targetSeat);
  // Validate ownership
  trade.offerProperties.forEach(id => {
    if (state.properties[id].owner !== trade.offerSeat) throw new Error('trade_invalid_property');
  });
  trade.requestProperties.forEach(id => {
    if (state.properties[id].owner !== trade.targetSeat) throw new Error('trade_invalid_property');
  });
  if (offerer.balance < trade.offerCash) throw new Error('offerer_cannot_afford');
  if (target.balance < trade.requestCash) throw new Error('target_cannot_afford');
  // Execute swap
  trade.offerProperties.forEach(id => { state.properties[id].owner = trade.targetSeat; });
  trade.requestProperties.forEach(id => { state.properties[id].owner = trade.offerSeat; });
  offerer.balance -= trade.offerCash;
  target.balance += trade.offerCash;
  target.balance -= trade.requestCash;
  offerer.balance += trade.requestCash;
  state.pendingTrade = null;
  addLog(state, `Trade accepted between ${offerer.displayName} and ${target.displayName}`);
  return state;
}

function handleRejectTrade(state, action) {
  if (!state.pendingTrade || state.pendingTrade.targetSeat !== action.seat) throw new Error('no_trade_for_you');
  addLog(state, `${getPlayer(state, action.seat).displayName} rejected the trade`);
  state.pendingTrade = null;
  return state;
}

function handleCancelTrade(state, action) {
  if (!state.pendingTrade || state.pendingTrade.offerSeat !== action.seat) throw new Error('not_your_trade');
  addLog(state, `${getPlayer(state, action.seat).displayName} cancelled the trade offer`);
  state.pendingTrade = null;
  return state;
}

// ─── Bankruptcy ───────────────────────────────────────────────────────────────

function handleDeclareBankruptcy(state, action) {
  const player = getPlayer(state, action.seat);
  const creditorSeat = action.creditorSeat ?? null; // null = owed to bank

  player.isBankrupt = true;
  player.balance = 0;

  // Transfer all properties to creditor or back to bank
  Object.entries(state.properties).forEach(([id, ps]) => {
    if (ps.owner === action.seat) {
      if (creditorSeat !== null) {
        ps.owner = creditorSeat;
        ps.mortgaged = false; // transferred properties come unmortgaged
      } else {
        ps.owner = null;
        ps.houses = 0;
        ps.mortgaged = false;
      }
    }
  });

  addLog(state, `${player.displayName} has declared bankruptcy`);

  const remaining = getActivePlayers(state);
  if (remaining.length === 1) {
    state.status = 'finished';
    state.phase = 'finished';
    addLog(state, `${remaining[0].displayName} wins!`);
    return state;
  }

  return advanceTurn(state);
}

// ─── Timeout (server-triggered) ───────────────────────────────────────────────

function handleTimeout(state, action) {
  addLog(state, `${getPlayer(state, state.currentTurnSeat)?.displayName ?? 'Player'} timed out`);
  return advanceTurn(state);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function advanceTurn(state) {
  // If player rolled doubles and is not in jail, they get another roll
  if (state.doublesCount > 0 && !getPlayer(state, state.currentTurnSeat)?.inJail) {
    state.phase = 'roll';
    return state;
  }
  state.doublesCount = 0;
  state.currentTurnSeat = nextActiveSeat(state, state.currentTurnSeat);
  state.phase = 'roll';
  state.pendingTrade = null;
  return state;
}

function setManage(state) {
  state.phase = 'manage';
  return state;
}

function sendToJail(state, player) {
  player.position = 10;
  player.inJail = true;
  player.jailTurns = 0;
  state.doublesCount = 0;
  addLog(state, `${player.displayName} was sent to Jail`);
  return advanceTurn(state);
}

function addFreeParking(state, amount) {
  if (state.settings?.freeParkingMoney) {
    state.freeParkingPool += amount;
  }
}

function findNearest(currentPos, type) {
  const positions = type === 'railway'
    ? RAILWAYS.map(id => SPACES.find(s => s.id === id).pos)
    : UTILITIES.map(id => SPACES.find(s => s.id === id).pos);

  let nearest = null;
  let minDist = 41;
  positions.forEach(pos => {
    const dist = (pos - currentPos + 40) % 40;
    if (dist > 0 && dist < minDist) { minDist = dist; nearest = pos; }
  });
  return nearest;
}

module.exports = { applyMove };
```

- [ ] **Step 4: Run tests**

```bash
npm test rules
```

Expected: All tests in the movement and doubles sections pass. The post_roll and tax tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/game/rules.js src/game/__tests__/rules.test.js
git commit -m "--added: rules engine with full applyMove implementation"
```

---

## Task 6: Rules engine — extended test coverage

**Files:**
- Modify: `src/game/__tests__/rules.test.js`

- [ ] **Step 1: Add tests for property purchase, rent, auction, trading, building, bankruptcy**

Append to `src/game/__tests__/rules.test.js`:

```js
describe('BUY_PROPERTY', () => {
  test('buys unowned property and deducts balance', () => {
    const s = makeState();
    s.players[0].position = 1; // Guwahati M60
    s.phase = 'post_roll';
    const ns = applyMove(s, { type: 'BUY_PROPERTY', seat: 0 });
    expect(ns.properties['guwahati'].owner).toBe(0);
    expect(ns.players[0].balance).toBe(1440);
    expect(ns.phase).toBe('manage');
  });

  test('throws if not enough balance', () => {
    const s = makeState();
    s.players[0].position = 39; // Mumbai M400
    s.players[0].balance = 300;
    s.phase = 'post_roll';
    expect(() => applyMove(s, { type: 'BUY_PROPERTY', seat: 0 })).toThrow('cannot_afford');
  });
});

describe('Rent payment', () => {
  test('charges base rent when owner has no monopoly', () => {
    const s = makeState();
    s.players[0].position = 1;   // Guwahati
    s.properties['guwahati'].owner = 1;
    s.phase = 'roll';
    s.lastDice = [0, 1];
    const ns = applyMove(s, rollAction([0, 1]));
    // base rent for Guwahati = 2
    expect(ns.players[0].balance).toBe(1498);
    expect(ns.players[1].balance).toBe(1502);
  });

  test('charges double rent when owner has monopoly', () => {
    const s = makeState();
    s.players[0].position = 0;
    s.properties['guwahati'].owner = 1;
    s.properties['bhubaneshwar'].owner = 1;
    s.phase = 'roll';
    // roll 1 to land on pos 1 (Guwahati)
    const ns = applyMove(s, rollAction([0, 1]));
    expect(ns.players[0].balance).toBe(1496); // base 2 × 2 = 4
    expect(ns.players[1].balance).toBe(1504);
  });
});

describe('MORTGAGE and UNMORTGAGE', () => {
  test('mortgages property and adds mortgage value to balance', () => {
    const s = makeState();
    s.properties['guwahati'].owner = 0;
    s.phase = 'manage';
    const ns = applyMove(s, { type: 'MORTGAGE', seat: 0, propertyId: 'guwahati' });
    expect(ns.properties['guwahati'].mortgaged).toBe(true);
    expect(ns.players[0].balance).toBe(1530); // 1500 + 30
  });

  test('unmortgages property for 110% of mortgage value', () => {
    const s = makeState();
    s.properties['guwahati'].owner = 0;
    s.properties['guwahati'].mortgaged = true;
    s.phase = 'manage';
    const ns = applyMove(s, { type: 'UNMORTGAGE', seat: 0, propertyId: 'guwahati' });
    expect(ns.properties['guwahati'].mortgaged).toBe(false);
    expect(ns.players[0].balance).toBe(1467); // 1500 - ceil(30 * 1.1) = 1500 - 33
  });
});

describe('BUILD_HOUSE', () => {
  test('builds house when player owns full color group', () => {
    const s = makeState();
    s.properties['guwahati'].owner = 0;
    s.properties['bhubaneshwar'].owner = 0;
    s.phase = 'manage';
    const ns = applyMove(s, { type: 'BUILD_HOUSE', seat: 0, propertyId: 'guwahati' });
    expect(ns.properties['guwahati'].houses).toBe(1);
    expect(ns.players[0].balance).toBe(1450); // 1500 - 50
  });

  test('enforces even build rule', () => {
    const s = makeState();
    s.properties['guwahati'].owner = 0;
    s.properties['bhubaneshwar'].owner = 0;
    s.properties['guwahati'].houses = 1;
    s.properties['bhubaneshwar'].houses = 0;
    s.phase = 'manage';
    expect(() => applyMove(s, { type: 'BUILD_HOUSE', seat: 0, propertyId: 'guwahati' })).toThrow('even_build_rule');
  });

  test('throws when player does not own full group', () => {
    const s = makeState();
    s.properties['guwahati'].owner = 0;
    s.properties['bhubaneshwar'].owner = 1;
    s.phase = 'manage';
    expect(() => applyMove(s, { type: 'BUILD_HOUSE', seat: 0, propertyId: 'guwahati' })).toThrow('need_full_color_group');
  });
});

describe('DECLARE_BANKRUPTCY', () => {
  test('marks player as bankrupt and returns properties to bank', () => {
    const s = makeState();
    s.properties['guwahati'].owner = 0;
    s.phase = 'manage';
    const ns = applyMove(s, { type: 'DECLARE_BANKRUPTCY', seat: 0, creditorSeat: null });
    expect(ns.players[0].isBankrupt).toBe(true);
    expect(ns.properties['guwahati'].owner).toBeNull();
  });

  test('ends game when only one player remains', () => {
    const s = makeState();
    s.phase = 'manage';
    const ns = applyMove(s, { type: 'DECLARE_BANKRUPTCY', seat: 0, creditorSeat: null });
    expect(ns.status).toBe('finished');
  });
});

describe('TRADING', () => {
  test('offer trade sets pendingTrade', () => {
    const s = makeState();
    s.properties['guwahati'].owner = 0;
    s.phase = 'manage';
    const ns = applyMove(s, {
      type: 'OFFER_TRADE', seat: 0,
      offer: { targetSeat: 1, offerProperties: ['guwahati'], offerCash: 0, requestProperties: [], requestCash: 100 }
    });
    expect(ns.pendingTrade).not.toBeNull();
    expect(ns.pendingTrade.offerSeat).toBe(0);
  });

  test('accept trade swaps property ownership', () => {
    const s = makeState();
    s.properties['guwahati'].owner = 0;
    s.phase = 'manage';
    s.pendingTrade = { offerSeat: 0, targetSeat: 1, offerProperties: ['guwahati'], offerCash: 0, requestProperties: [], requestCash: 0 };
    const ns = applyMove(s, { type: 'ACCEPT_TRADE', seat: 1 });
    expect(ns.properties['guwahati'].owner).toBe(1);
    expect(ns.pendingTrade).toBeNull();
  });
});

describe('AUCTION', () => {
  test('DECLINE_PROPERTY starts auction', () => {
    const s = makeState();
    s.players[0].position = 1;
    s.phase = 'post_roll';
    const ns = applyMove(s, { type: 'DECLINE_PROPERTY', seat: 0 });
    expect(ns.phase).toBe('auction');
    expect(ns.auction.propertyId).toBe('guwahati');
  });

  test('AUCTION_BID updates high bid', () => {
    const s = makeState();
    s.phase = 'auction';
    s.auction = { propertyId: 'guwahati', highBid: 0, highBidder: null, passedSeats: [] };
    const ns = applyMove(s, { type: 'AUCTION_BID', seat: 0, amount: 45 });
    expect(ns.auction.highBid).toBe(45);
    expect(ns.auction.highBidder).toBe(0);
  });

  test('all pass returns property to bank', () => {
    const s = makeState();
    s.phase = 'auction';
    s.auction = { propertyId: 'guwahati', highBid: 0, highBidder: null, passedSeats: [0] };
    const ns = applyMove(s, { type: 'AUCTION_PASS', seat: 1 });
    expect(ns.phase).toBe('manage');
    expect(ns.auction).toBeNull();
    expect(ns.properties['guwahati'].owner).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test rules
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/game/__tests__/rules.test.js
git commit -m "--added: extended rules engine test coverage"
```

---

## Task 7: Bot AI

**Files:**
- Create: `src/game/bot.js`
- Create: `src/game/__tests__/bot.test.js`

- [ ] **Step 1: Write failing test**

Create `src/game/__tests__/bot.test.js`:

```js
const { getBotAction } = require('../bot');
const { createInitialState } = require('../state');

const GAME = { gameId: 'g1', settings: { timePerTurnSec: 60, freeParkingMoney: 0, allowTrading: true } };
const PLAYERS = [
  { seat: 0, userId: 'u1', displayName: 'Bot' },
  { seat: 1, userId: 'u2', displayName: 'Human' },
];

function makeState(overrides = {}) {
  return { ...createInitialState(GAME, PLAYERS), ...overrides };
}

test('returns ROLL_DICE when phase is roll', () => {
  const s = makeState({ phase: 'roll' });
  const action = getBotAction(s, 0);
  expect(action.type).toBe('ROLL_DICE');
  expect(action.dice).toHaveLength(2);
  action.dice.forEach(d => expect(d).toBeGreaterThanOrEqual(1));
  action.dice.forEach(d => expect(d).toBeLessThanOrEqual(6));
});

test('returns BUY_PROPERTY when landed on unowned property and can afford', () => {
  const s = makeState({ phase: 'post_roll' });
  s.players[0].position = 1; // Guwahati M60
  s.players[0].balance = 1500;
  const action = getBotAction(s, 0);
  expect(action.type).toBe('BUY_PROPERTY');
});

test('returns DECLINE_PROPERTY when cannot afford', () => {
  const s = makeState({ phase: 'post_roll' });
  s.players[0].position = 39; // Mumbai M400
  s.players[0].balance = 300;
  const action = getBotAction(s, 0);
  expect(action.type).toBe('DECLINE_PROPERTY');
});

test('returns END_TURN when phase is manage and nothing to do', () => {
  const s = makeState({ phase: 'manage' });
  const action = getBotAction(s, 0);
  expect(action.type).toBe('END_TURN');
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test bot
```

Expected: `Cannot find module '../bot'`

- [ ] **Step 3: Create bot.js**

Create `src/game/bot.js`:

```js
const { SPACES } = require('./board-data');
const { getPlayer, ownsFullColorGroup, getActivePlayers } = require('./state');

function rollDie() {
  return Math.ceil(Math.random() * 6);
}

function getBotAction(state, seat) {
  const player = getPlayer(state, seat);

  switch (state.phase) {
    case 'roll':
      return { type: 'ROLL_DICE', seat, dice: [rollDie(), rollDie()] };

    case 'post_roll': {
      const space = SPACES[player.position];
      if (!space || !state.properties[space.id]) return { type: 'END_TURN', seat };
      const propState = state.properties[space.id];
      if (propState.owner !== null) return { type: 'END_TURN', seat };
      // Buy if we can afford it
      return player.balance >= space.price
        ? { type: 'BUY_PROPERTY', seat }
        : { type: 'DECLINE_PROPERTY', seat };
    }

    case 'auction':
      return { type: 'AUCTION_PASS', seat };

    case 'manage': {
      // Reject any pending trade
      if (state.pendingTrade?.targetSeat === seat) {
        return { type: 'REJECT_TRADE', seat };
      }
      // Try to build a house if we have a monopoly and cash > 500
      if (player.balance > 500) {
        const buildTarget = findBuildTarget(state, seat);
        if (buildTarget) return { type: 'BUILD_HOUSE', seat, propertyId: buildTarget };
      }
      return { type: 'END_TURN', seat };
    }

    default:
      return { type: 'END_TURN', seat };
  }
}

function findBuildTarget(state, seat) {
  const { COLOR_GROUPS } = require('./board-data');
  for (const [color, ids] of Object.entries(COLOR_GROUPS)) {
    if (!ownsFullColorGroup(state, seat, color)) continue;
    // Find property with fewest houses
    const eligible = ids
      .filter(id => !state.properties[id].mortgaged && state.properties[id].houses < 5)
      .sort((a, b) => state.properties[a].houses - state.properties[b].houses);
    if (eligible.length > 0) return eligible[0];
  }
  return null;
}

module.exports = { getBotAction };
```

- [ ] **Step 4: Run tests**

```bash
npm test bot
```

Expected: All 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/game/bot.js src/game/__tests__/bot.test.js
git commit -m "--added: bot AI for disconnected players"
```

---

## Task 8: Turn timer and reconnection window (BullMQ)

**Files:**
- Create: `src/game/timer.js`

- [ ] **Step 1: Create timer.js**

Create `src/game/timer.js`:

```js
const { Queue, Worker } = require('bullmq');
const { redis } = require('../services/redis/redisClient');

const connection = { host: process.env.REDIS_HOST || '127.0.0.1', port: parseInt(process.env.REDIS_PORT || '6379') };

const turnTimerQueue = new Queue('turn-timers', { connection });
const reconnectQueue = new Queue('reconnect-windows', { connection });

// Called after every game action to reset the turn timer
async function resetTurnTimer(gameId, seat, durationMs) {
  // Remove any existing timer for this game
  const existing = await turnTimerQueue.getJob(`turn:${gameId}`);
  if (existing) await existing.remove();
  await turnTimerQueue.add(
    'timeout',
    { gameId, seat },
    { jobId: `turn:${gameId}`, delay: durationMs }
  );
}

async function cancelTurnTimer(gameId) {
  const job = await turnTimerQueue.getJob(`turn:${gameId}`);
  if (job) await job.remove();
}

// Called when a player disconnects — starts a 2-minute reconnection window
async function startReconnectWindow(gameId, userId) {
  await reconnectQueue.add(
    'reconnect-expire',
    { gameId, userId },
    { jobId: `reconnect:${gameId}:${userId}`, delay: 120_000 }
  );
}

async function cancelReconnectWindow(gameId, userId) {
  const job = await reconnectQueue.getJob(`reconnect:${gameId}:${userId}`);
  if (job) await job.remove();
}

// Processors — call initTimerWorkers(io) from socketServer.js after io is created
function initTimerWorkers(io) {
  new Worker('turn-timers', async (job) => {
    const { gameId, seat } = job.data;
    const { processGameAction } = require('../services/realtime/socketServer');
    await processGameAction(io, gameId, { type: 'TIMEOUT', seat });
  }, { connection });

  new Worker('reconnect-windows', async (job) => {
    const { gameId, userId } = job.data;
    const { markPlayerAsBot } = require('../services/realtime/socketServer');
    await markPlayerAsBot(io, gameId, userId);
  }, { connection });
}

module.exports = { resetTurnTimer, cancelTurnTimer, startReconnectWindow, cancelReconnectWindow, initTimerWorkers };
```

- [ ] **Step 2: Commit**

```bash
git add src/game/timer.js
git commit -m "--added: BullMQ turn timer and reconnection window manager"
```

---

## Task 9: Game model and controller — room code

**Files:**
- Modify: `src/models/game.model.js`
- Modify: `src/models/move.model.js`
- Modify: `src/controllers/game.controller.js`
- Create: `src/routers/user/game.routes.js`
- Modify: `src/app.js`

- [ ] **Step 1: Add roomCode to Game model**

In `src/models/game.model.js`, add `roomCode` to the `GameSchema`:

```js
// Add inside GameSchema definition, after gameId:
roomCode: {
  type: String,
  required: true,
  unique: true,
  uppercase: true,
  trim: true,
  index: true,
  minlength: 6,
  maxlength: 6,
},
```

Also add index at the bottom of the file (before `module.exports`):
```js
GameSchema.index({ roomCode: 1 }, { unique: true, background: true });
```

- [ ] **Step 2: Expand Move model type enum**

In `src/models/move.model.js`, replace the `type` enum array:

```js
enum: [
  'ROLL_DICE', 'PAY_BAIL', 'USE_JAIL_FREE_CARD',
  'BUY_PROPERTY', 'DECLINE_PROPERTY',
  'AUCTION_BID', 'AUCTION_PASS',
  'BUILD_HOUSE', 'SELL_HOUSE', 'MORTGAGE', 'UNMORTGAGE',
  'OFFER_TRADE', 'ACCEPT_TRADE', 'REJECT_TRADE', 'CANCEL_TRADE',
  'END_TURN', 'DECLARE_BANKRUPTCY', 'TIMEOUT',
  'system',
],
```

- [ ] **Step 3: Update createGame controller to generate roomCode**

In `src/controllers/game.controller.js`, add `generateRoomCode` after the imports:

```js
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
```

In `createGame`, add `roomCode` to the game creation (inside the `catchAsync`):

```js
// After: const gameId = uuidv4();
// Add:
let roomCode;
let attempts = 0;
do {
  roomCode = generateRoomCode();
  const existing = await Game.findOne({ roomCode });
  if (!existing) break;
  attempts++;
} while (attempts < 5);

// Then pass roomCode to Game.create:
const game = await Game.create({
  gameId,
  roomCode,
  hostUserId: user._id,
  players: [player],
  settings,
});
```

- [ ] **Step 4: Add getGameByCode controller export**

Append to `src/controllers/game.controller.js`:

```js
exports.getGameByCode = catchAsync(async (req, res, next) => {
  const { code } = req.params;
  if (!code) return next(commonError(400, 'BadRequest', 'Missing room code'));
  const game = await Game.findOne({ roomCode: code.toUpperCase() })
    .populate('hostUserId', 'username displayName avatarUrl')
    .lean();
  if (!game) return next(commonError(404, 'GameNotFound', 'No game with that code'));
  return responseHandler(res, { game }, 'Game fetched', 200);
});
```

- [ ] **Step 5: Create game router**

Create `src/routers/user/game.routes.js`:

```js
const express = require('express');
const { requireAuth } = require('@clerk/express');
const {
  createGame,
  joinGame,
  startGame,
  getGame,
  getGameByCode,
  getHistory,
  finalizeGame,
} = require('../../controllers/game.controller');

const router = express.Router();

router.use(requireAuth());

router.post('/',                  createGame);
router.get('/code/:code',         getGameByCode);
router.get('/:gameId',            getGame);
router.post('/:gameId/join',      joinGame);
router.post('/:gameId/start',     startGame);
router.get('/:gameId/history',    getHistory);
router.post('/:gameId/finalize',  finalizeGame);

module.exports = router;
```

- [ ] **Step 6: Mount game router in app.js**

In `src/app.js`, after existing router imports, add:

```js
const gameRouter = require('./routers/user/game.routes');
```

And after existing route mounts:

```js
app.use('/api/v1/games', gameRouter);
```

- [ ] **Step 7: Commit**

```bash
git add src/models/game.model.js src/models/move.model.js \
        src/controllers/game.controller.js \
        src/routers/user/game.routes.js src/app.js
git commit -m "--updated: game model with roomCode, game routes, updated move enum"
```

---

## Task 10: Socket server — full rewrite

**Files:**
- Rewrite: `src/services/realtime/socketServer.js`

- [ ] **Step 1: Rewrite socketServer.js**

Replace the entire content of `src/services/realtime/socketServer.js`:

```js
const { Server } = require('socket.io');
const { createClerkClient } = require('@clerk/backend');
const { redis, acquireLock, releaseLock } = require('../redis/redisClient');
const { applyMove } = require('../../game/rules');
const { createInitialState } = require('../../game/state');
const { getBotAction } = require('../../game/bot');
const { resetTurnTimer, cancelTurnTimer, startReconnectWindow, cancelReconnectWindow, initTimerWorkers } = require('../../game/timer');
const Game = require('../../models/game.model');
const Move = require('../../models/move.model');
const Snapshot = require('../../models/snapshot.model');
const User = require('../../models/user.model');

const GAME_STATE_KEY = (gameId) => `game:${gameId}:state`;
const SNAPSHOT_INTERVAL = 20;

// ─── State helpers ────────────────────────────────────────────────────────────

async function loadGameState(gameId) {
  const raw = await redis.get(GAME_STATE_KEY(gameId));
  return raw ? JSON.parse(raw) : null;
}

async function saveGameState(gameId, state) {
  await redis.set(GAME_STATE_KEY(gameId), JSON.stringify(state));
}

async function getPlayerSeat(gameId, userId) {
  const game = await Game.findOne({ gameId }).lean();
  if (!game) return null;
  const player = game.players.find(p => p.userId.toString() === userId);
  return player ? player.seat : null;
}

// ─── Socket init ──────────────────────────────────────────────────────────────

function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: process.env.FRONTEND_URL || '*', methods: ['GET', 'POST'] },
  });

  initTimerWorkers(io);

  io.of('/games').use(async (socket, next) => {
    try {
      const { gameId } = socket.handshake.query;
      if (!gameId) return next(new Error('Missing gameId'));

      // Verify Clerk token
      const token = socket.handshake.auth?.token;
      const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      let userId;
      try {
        const payload = await clerk.verifyToken(token);
        userId = payload.sub;
      } catch {
        return next(new Error('Unauthorized'));
      }

      const user = await User.findOne({ providerId: userId }).lean();
      if (!user) return next(new Error('User not registered'));

      const seat = await getPlayerSeat(gameId, user._id.toString());

      socket.data.gameId = gameId;
      socket.data.userId = user._id.toString();
      socket.data.providerId = userId;
      socket.data.seat = seat; // null if spectator
      next();
    } catch (err) {
      next(new Error('Auth failed'));
    }
  });

  io.of('/games').on('connection', async (socket) => {
    const { gameId, userId, seat } = socket.data;
    socket.join(gameId);

    // Push current state to connecting client
    const state = await loadGameState(gameId);
    if (state) socket.emit('state_update', state);

    // Mark player connected + cancel reconnect window
    if (seat !== null) {
      await cancelReconnectWindow(gameId, userId);
      await updateConnectionStatus(io, gameId, userId, seat, true);
    }

    socket.on('player_ready', async (_, ack) => {
      if (seat === null) return ack?.({ ok: false, error: 'spectator' });
      const lockKey = `lock:game:${gameId}`;
      const lockId = await acquireLock(lockKey, 3000);
      if (!lockId) return ack?.({ ok: false, error: 'game_busy' });
      try {
        const game = await Game.findOne({ gameId });
        if (!game || game.status !== 'waiting') return ack?.({ ok: false, error: 'invalid_state' });
        const player = game.players.find(p => p.seat === seat);
        if (player) {
          player.isReady = !player.isReady;
          await game.save();
        }
        io.of('/games').to(gameId).emit('lobby_update', { players: game.players });
        ack?.({ ok: true });
      } finally {
        await releaseLock(lockKey, lockId);
      }
    });

    socket.on('game_action', async (rawAction, ack) => {
      if (seat === null) return ack?.({ ok: false, error: 'spectator' });
      const action = { ...rawAction, seat };

      // Server generates dice for ROLL_DICE
      if (action.type === 'ROLL_DICE') {
        action.dice = [
          Math.ceil(Math.random() * 6),
          Math.ceil(Math.random() * 6),
        ];
      }

      try {
        await processGameAction(io, gameId, action);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('disconnect', async () => {
      if (seat === null) return;
      await updateConnectionStatus(io, gameId, userId, seat, false);
      await startReconnectWindow(gameId, userId);
    });
  });

  return io;
}

// ─── Shared action processor (used by socket + timer workers) ─────────────────

async function processGameAction(io, gameId, action) {
  const lockKey = `lock:game:${gameId}`;
  const lockId = await acquireLock(lockKey, 5000);
  if (!lockId) throw new Error('game_busy');

  try {
    let state = await loadGameState(gameId);
    if (!state) throw new Error('game_state_not_found');

    const newState = applyMove(state, action);
    await saveGameState(gameId, newState);

    // Append move log
    const seq = (newState.players.reduce((max, _) => max, 0) + Date.now()); // simple seq
    await Move.create({
      gameId,
      seq: Date.now(), // use timestamp as seq; real seq from state.lastMoveSeq if tracked
      type: action.type,
      payload: action,
      playerUserId: null,
    }).catch(() => null); // non-blocking

    // Snapshot every SNAPSHOT_INTERVAL moves
    const moveCount = await Move.countDocuments({ gameId });
    if (moveCount % SNAPSHOT_INTERVAL === 0) {
      await Snapshot.create({ gameId, state: newState, lastSeq: moveCount }).catch(() => null);
    }

    // Broadcast to all in room
    io.of('/games').to(gameId).emit('state_update', newState);

    // Reset turn timer for next player
    const timePerTurn = (newState.settings?.timePerTurnSec || 60) * 1000;
    if (newState.status === 'active') {
      await resetTurnTimer(gameId, newState.currentTurnSeat, timePerTurn);
    } else {
      await cancelTurnTimer(gameId);
      if (newState.status === 'finished') {
        await Game.findOneAndUpdate({ gameId }, { status: 'finished', endedAt: new Date() });
        io.of('/games').to(gameId).emit('game_over', {
          winnerSeat: newState.players.find(p => !p.isBankrupt)?.seat,
        });
      }
    }

    // Bot auto-play: if next player is a bot, schedule their action
    const nextPlayer = newState.players.find(p => p.seat === newState.currentTurnSeat);
    if (nextPlayer?.isBot && newState.status === 'active') {
      setTimeout(async () => {
        const botAction = getBotAction(newState, nextPlayer.seat);
        await processGameAction(io, gameId, botAction).catch(() => null);
      }, 1500); // 1.5s delay so it feels less instant
    }
  } finally {
    await releaseLock(lockKey, lockId);
  }
}

async function markPlayerAsBot(io, gameId, userId) {
  const lockKey = `lock:game:${gameId}`;
  const lockId = await acquireLock(lockKey, 3000);
  if (!lockId) return;
  try {
    const state = await loadGameState(gameId);
    if (!state) return;
    const player = state.players.find(p => p.userId === userId);
    if (player) {
      player.isBot = true;
      await saveGameState(gameId, state);
      io.of('/games').to(gameId).emit('state_update', state);
      io.of('/games').to(gameId).emit('player_disconnected', {
        seat: player.seat,
        displayName: player.displayName,
        isBot: true,
      });
    }
  } finally {
    await releaseLock(lockKey, lockId);
  }
}

async function updateConnectionStatus(io, gameId, userId, seat, connected) {
  const state = await loadGameState(gameId);
  if (!state) return;
  const player = state.players.find(p => p.seat === seat);
  if (!player) return;
  player.isConnected = connected;
  player.disconnectedAt = connected ? null : new Date().toISOString();
  await saveGameState(gameId, state);
  io.of('/games').to(gameId).emit(
    connected ? 'player_connected' : 'player_disconnected',
    { seat, displayName: player.displayName }
  );
}

module.exports = { initSocket, processGameAction, markPlayerAsBot };
```

- [ ] **Step 2: Wire socket server into server.js**

In `src/server.js`, update `startServer`:

```js
const { initSocket } = require('./services/realtime/socketServer');

const startServer = async () => {
  try {
    await connectDb();
    const http = require('http');
    const server = http.createServer(app);
    initSocket(server);                          // ← add this line
    server.listen(port, () => {
      console.log(`Server listening on port ${port} in ${env} mode`);
    });
    // ... rest unchanged
  }
};
```

- [ ] **Step 3: Also wire socket when game starts — seed Redis state**

In `src/controllers/game.controller.js`, update `startGame` to seed Redis:

```js
// Add import at top:
const { createInitialState } = require('../game/state');
const { redis } = require('../services/redis/redisClient');

// Inside startGame, after game.save({ session }):
const initialState = createInitialState(startedGame, startedGame.players);
await redis.set(`game:${startedGame.gameId}:state`, JSON.stringify(initialState));
```

- [ ] **Step 4: Commit**

```bash
git add src/services/realtime/socketServer.js src/server.js src/controllers/game.controller.js
git commit -m "--updated: socket server full rewrite with turn management, timers, bot auto-play"
```

---

## Task 11: Smoke test the backend

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All tests in `src/game/__tests__/` pass.

- [ ] **Step 2: Start server (requires Redis + MongoDB running)**

```bash
npm run dev
```

Expected: `Server listening on port <port> in development mode`

- [ ] **Step 3: Create a game via curl**

```bash
# Replace CLERK_TOKEN with a valid token from your Clerk dashboard
curl -X POST http://localhost:3000/api/v1/games \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CLERK_TOKEN" \
  -d '{"settings": {"maxPlayers": 2}}'
```

Expected: `201` response with `game.roomCode` (6-char uppercase string) in the response body.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "--backend: game engine complete and smoke-tested"
```
