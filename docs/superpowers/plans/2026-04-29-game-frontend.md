# Game Frontend (Next.js) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Next.js web frontend for the multiplayer Monopoly India Edition game — board rendering, lobby, real-time gameplay UI — talking to the existing Express + Socket.io backend.

**Architecture:** The frontend is a pure renderer. All game state comes from the server via Socket.io `state_update` events and is stored in a Zustand store. No local game logic — the server is the single source of truth. Clerk handles authentication.

**Tech Stack:** Next.js 15 (App Router), Tailwind CSS 3, Zustand 5, socket.io-client 4, @clerk/nextjs

**Prerequisite:** Backend plan (`2026-04-29-game-engine-backend.md`) must be complete first.

---

## File Map

```
frontend/
  app/
    layout.jsx                    — Root layout: ClerkProvider, global font
    page.jsx                      — Landing: create game or enter room code
    game/[code]/
      page.jsx                    — Game room: lobby or active board
  components/
    lobby/
      LobbyRoom.jsx               — Player list, ready button, start button (host)
    board/
      Board.jsx                   — 11×11 CSS Grid board with all 40 spaces
      BoardSpace.jsx              — Renders one board space by type
      PlayerToken.jsx             — Coloured player token overlay
    game/
      PlayerPanel.jsx             — Per-player status bar (name, balance, properties)
      Dice.jsx                    — Two dice + Roll button
      ActionPanel.jsx             — Context-sensitive action buttons
      AuctionPanel.jsx            — Live bidding UI
      TradeDialog.jsx             — Trade offer builder + response
      CardPopup.jsx               — Chance/Community Chest card reveal
      GameLog.jsx                 — Scrolling event log
  lib/
    socket.js                     — socket.io-client singleton
    gameStore.js                  — Zustand store (server-pushed state)
    boardLayout.js                — Board position → CSS grid cell mapping
  public/
    tokens/                       — SVG token icons (6 colours)
```

---

## Task 1: Initialise Next.js app

**Files:**
- Create: `frontend/` (new Next.js app)

- [ ] **Step 1: Scaffold the app**

```bash
cd /Users/uditrajmr3/Projects/vyaparkakhel.com
npx create-next-app@latest frontend \
  --app --js --tailwind --eslint \
  --src-dir=no \
  --import-alias="@/*"
```

When prompted: select defaults (App Router, no TypeScript — we use JS, Tailwind yes).

- [ ] **Step 2: Install dependencies**

```bash
cd frontend
npm install zustand socket.io-client @clerk/nextjs
```

- [ ] **Step 3: Set up .env.local**

Create `frontend/.env.local`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

Replace keys with values from your Clerk dashboard.

- [ ] **Step 4: Clean up default files**

```bash
# Remove default Next.js boilerplate
rm -rf app/page.js app/globals.css app/favicon.ico public/next.svg public/vercel.svg
```

- [ ] **Step 5: Update root layout with ClerkProvider**

Replace `app/layout.js`:

```jsx
import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = { title: 'Vyaparkakhel', description: 'Multiplayer Business Game' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white min-h-screen`}>
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
```

Replace `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Open `http://localhost:3001`. Expected: Next.js default page (or blank white page — no errors).

- [ ] **Step 7: Commit**

```bash
cd ..
git add frontend/
git commit -m "--added: Next.js frontend scaffold with Clerk + Zustand + socket.io-client"
```

---

## Task 2: Board layout helper

**Files:**
- Create: `frontend/lib/boardLayout.js`

The board is an 11×11 CSS grid. Corners occupy 1 cell each. The 9 spaces on each side fill the edge cells. This helper maps board position (0–39) to `{ row, col }` in the grid.

- [ ] **Step 1: Create boardLayout.js**

Create `frontend/lib/boardLayout.js`:

```js
// Maps board position 0–39 to CSS grid row/col (1-indexed, 11×11 grid)
// Position 0 = GO (bottom-right corner), player moves counter-clockwise
// Bottom row:  pos 0–10  → row 11, col 11 down to col 1
// Left side:   pos 11–20 → col 1,  row 10 down to row 1
// Top row:     pos 21–30 → row 1,  col 1  up to col 11
// Right side:  pos 31–39 + 0 → col 11, row 2 up to row 10

const POSITIONS = [];

// Bottom row: pos 0 (GO) at col 11, pos 10 (Jail) at col 1
for (let i = 0; i <= 10; i++) {
  POSITIONS[i] = { row: 11, col: 11 - i };
}

// Left side: pos 11 at row 10, pos 20 (Free Parking) at row 1
for (let i = 0; i <= 9; i++) {
  POSITIONS[11 + i] = { row: 10 - i, col: 1 };
}

// Top row: pos 21 at col 2, pos 30 (Go to Jail) at col 11
for (let i = 0; i <= 9; i++) {
  POSITIONS[21 + i] = { row: 1, col: 2 + i };
}

// Right side: pos 31 at row 2, pos 39 at row 10
for (let i = 0; i <= 8; i++) {
  POSITIONS[31 + i] = { row: 2 + i, col: 11 };
}

export function getGridPosition(boardPos) {
  return POSITIONS[boardPos] ?? { row: 1, col: 1 };
}

// Color group → Tailwind bg class
export const COLOR_CLASSES = {
  brown:      'bg-amber-900',
  light_blue: 'bg-sky-300',
  pink:       'bg-pink-400',
  orange:     'bg-orange-400',
  red:        'bg-red-500',
  yellow:     'bg-yellow-400',
  green:      'bg-green-500',
  dark_blue:  'bg-blue-800',
};

// Seat → player token colour
export const TOKEN_COLORS = ['#ef4444','#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ec4899'];
```

- [ ] **Step 2: Commit**

```bash
cd frontend && git add lib/boardLayout.js && cd ..
git commit -m "--added: board layout helper mapping positions to CSS grid cells"
```

---

## Task 3: Socket singleton and Zustand store

**Files:**
- Create: `frontend/lib/socket.js`
- Create: `frontend/lib/gameStore.js`

- [ ] **Step 1: Create socket.js**

Create `frontend/lib/socket.js`:

```js
import { io } from 'socket.io-client';

let socket = null;

export function getSocket(gameCode, clerkToken) {
  if (socket?.connected) return socket;
  socket = io(`${process.env.NEXT_PUBLIC_SOCKET_URL}/games`, {
    query: { gameId: gameCode },
    auth: { token: clerkToken },
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
```

- [ ] **Step 2: Create gameStore.js**

Create `frontend/lib/gameStore.js`:

```js
import { create } from 'zustand';

const useGameStore = create((set) => ({
  // Game state from server
  gameState: null,
  lobbyData: null,       // { players } from lobby_update events
  cardPopup: null,       // { description } — shown then auto-dismissed
  error: null,

  setGameState: (gameState) => set({ gameState }),
  setLobbyData: (lobbyData) => set({ lobbyData }),
  showCard: (card) => set({ cardPopup: card }),
  dismissCard: () => set({ cardPopup: null }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));

export default useGameStore;
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/socket.js frontend/lib/gameStore.js
git commit -m "--added: socket singleton and Zustand game store"
```

---

## Task 4: Landing page

**Files:**
- Create: `frontend/app/page.jsx`

- [ ] **Step 1: Create landing page**

Create `frontend/app/page.jsx`:

```jsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, SignInButton, UserButton, useUser } from '@clerk/nextjs';

export default function Home() {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function createGame() {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ settings: {} }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create game');
      router.push(`/game/${data.data.game.roomCode}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function joinGame(e) {
    e.preventDefault();
    if (!code.trim()) return;
    router.push(`/game/${code.trim().toUpperCase()}`);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-5xl font-black text-yellow-400 mb-2">व्यापार खेल</h1>
        <p className="text-gray-400 text-lg">Monopoly India — play with friends &amp; family</p>
      </div>

      {!isSignedIn ? (
        <SignInButton mode="modal">
          <button className="bg-yellow-400 text-black font-bold px-8 py-3 rounded-xl text-lg hover:bg-yellow-300 transition">
            Sign in to play
          </button>
        </SignInButton>
      ) : (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm">
          <div className="flex items-center gap-3 text-gray-300">
            <UserButton />
            <span>Hi, {user?.firstName || 'Player'}</span>
          </div>

          <button
            onClick={createGame}
            disabled={loading}
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl text-lg hover:bg-yellow-300 disabled:opacity-50 transition"
          >
            {loading ? 'Creating…' : 'Create New Game'}
          </button>

          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-gray-700" />
            <span className="text-gray-500 text-sm">or</span>
            <div className="flex-1 h-px bg-gray-700" />
          </div>

          <form onSubmit={joinGame} className="flex gap-2 w-full">
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ROOM CODE"
              className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-center text-xl font-mono tracking-widest focus:outline-none focus:border-yellow-400"
            />
            <button
              type="submit"
              className="bg-gray-700 text-white font-bold px-5 py-3 rounded-xl hover:bg-gray-600 transition"
            >
              Join
            </button>
          </form>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Start dev server and verify the page renders**

```bash
cd frontend && npm run dev
```

Open `http://localhost:3001`. Expected: landing page with title "व्यापार खेल", sign-in button, create game button, room code input.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/page.jsx
git commit -m "--added: landing page with create game and room code join"
```

---

## Task 5: Board space component

**Files:**
- Create: `frontend/components/board/BoardSpace.jsx`

- [ ] **Step 1: Create BoardSpace.jsx**

Create `frontend/components/board/BoardSpace.jsx`:

```jsx
import { COLOR_CLASSES } from '@/lib/boardLayout';

// Renders a single board space. `space` is from SPACES array in board-data.
// `propState` is { owner, houses, mortgaged } or null.
// `isCorner` — corners are larger.
export default function BoardSpace({ space, propState, isCorner, rotation = 0 }) {
  const baseClass = `
    relative flex flex-col items-center justify-end overflow-hidden border border-gray-600 text-center
    ${isCorner ? 'text-xs' : 'text-[9px]'}
    bg-green-100 text-black
  `;

  const colorBar = space.color ? (
    <div className={`w-full h-3 ${COLOR_CLASSES[space.color] ?? 'bg-gray-400'}`} />
  ) : null;

  const houseIcons = propState && propState.houses > 0 ? (
    <div className="flex gap-px justify-center mt-0.5">
      {Array.from({ length: Math.min(propState.houses, 4) }).map((_, i) => (
        <div key={i} className="w-2 h-2 bg-green-600 rounded-sm" />
      ))}
      {propState.houses === 5 && <div className="w-3 h-2 bg-red-600 rounded-sm" />}
    </div>
  ) : null;

  const mortgageOverlay = propState?.mortgaged ? (
    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
      <span className="text-white text-[8px] font-bold rotate-45">MORTGAGED</span>
    </div>
  ) : null;

  function spaceContent() {
    switch (space.type) {
      case 'go':
        return <div className="font-black text-red-600 text-sm leading-tight">COLLECT<br/>M200<br/>→ GO</div>;
      case 'jail':
        return <div className="text-[9px] font-semibold leading-tight">JUST<br/>VISITING<br/>/ JAIL</div>;
      case 'free_parking':
        return <div className="text-[9px] font-semibold leading-tight">FREE<br/>PARKING</div>;
      case 'go_to_jail':
        return <div className="text-[9px] font-bold text-red-600 leading-tight">GO TO<br/>JAIL</div>;
      case 'tax':
        return (
          <>
            <span className="font-semibold leading-tight">{space.name}</span>
            <span className="text-red-600 font-bold">M{space.amount}</span>
          </>
        );
      case 'chance':
        return <div className="text-2xl">?</div>;
      case 'community_chest':
        return <div className="text-[9px] font-semibold leading-tight">COMMUNITY<br/>CHEST</div>;
      case 'railway':
        return (
          <>
            <span className="font-semibold leading-tight px-1">{space.name}</span>
            <span className="text-gray-600">M{space.price}</span>
          </>
        );
      case 'utility':
        return (
          <>
            <span className="font-semibold leading-tight px-1">{space.name}</span>
            <span className="text-gray-600">M{space.price}</span>
          </>
        );
      case 'property':
        return (
          <>
            {colorBar}
            <span className="font-semibold leading-tight px-1 mt-0.5">{space.name}</span>
            <span className="text-gray-600">M{space.price}</span>
            {houseIcons}
          </>
        );
      default:
        return <span>{space.name}</span>;
    }
  }

  return (
    <div
      className={baseClass}
      style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined }}
    >
      {spaceContent()}
      {mortgageOverlay}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/board/BoardSpace.jsx
git commit -m "--added: BoardSpace component for all 40 space types"
```

---

## Task 6: Player token component

**Files:**
- Create: `frontend/components/board/PlayerToken.jsx`

- [ ] **Step 1: Create PlayerToken.jsx**

Create `frontend/components/board/PlayerToken.jsx`:

```jsx
import { TOKEN_COLORS } from '@/lib/boardLayout';

// Renders a small coloured circle with the player's initial.
// Positioned absolutely inside the parent board cell.
export default function PlayerToken({ player, index, total }) {
  const color = TOKEN_COLORS[player.seat % TOKEN_COLORS.length];
  // Stack tokens offset so they don't fully overlap
  const offsetX = (index % 3) * 10;
  const offsetY = Math.floor(index / 3) * 10;

  return (
    <div
      className="absolute w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow-md border border-white z-10"
      style={{
        backgroundColor: color,
        bottom: `${4 + offsetY}px`,
        left: `${4 + offsetX}px`,
      }}
      title={player.displayName}
    >
      {player.displayName[0].toUpperCase()}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/board/PlayerToken.jsx
git commit -m "--added: PlayerToken component"
```

---

## Task 7: Board component

**Files:**
- Create: `frontend/components/board/Board.jsx`

- [ ] **Step 1: Copy board-data to frontend**

```bash
cp /Users/uditrajmr3/Projects/vyaparkakhel.com/src/game/board-data.js \
   /Users/uditrajmr3/Projects/vyaparkakhel.com/frontend/lib/boardData.js
```

Then open `frontend/lib/boardData.js` and change the last line from `module.exports = ...` to:

```js
export { SPACES, COLOR_GROUPS, RAILWAYS, UTILITIES, getSpaceById, getColorGroup };
```

- [ ] **Step 2: Create Board.jsx**

Create `frontend/components/board/Board.jsx`:

```jsx
'use client';
import { SPACES } from '@/lib/boardData';
import { getGridPosition } from '@/lib/boardLayout';
import BoardSpace from './BoardSpace';
import PlayerToken from './PlayerToken';

const CORNER_POSITIONS = new Set([0, 10, 20, 30]);

export default function Board({ gameState }) {
  const players = gameState?.players ?? [];
  const properties = gameState?.properties ?? {};

  // Group players by their current board position
  const tokensByPosition = {};
  players.forEach(p => {
    if (!p.isBankrupt) {
      if (!tokensByPosition[p.position]) tokensByPosition[p.position] = [];
      tokensByPosition[p.position].push(p);
    }
  });

  return (
    <div
      className="w-full aspect-square"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(11, 1fr)',
        gridTemplateRows: 'repeat(11, 1fr)',
        gap: '1px',
        background: '#1a1a1a',
      }}
    >
      {SPACES.map(space => {
        const { row, col } = getGridPosition(space.pos);
        const isCorner = CORNER_POSITIONS.has(space.pos);
        const propState = properties[space.id] ?? null;
        const tokensHere = tokensByPosition[space.pos] ?? [];

        return (
          <div
            key={space.pos}
            style={{ gridRow: row, gridColumn: col, position: 'relative' }}
          >
            <BoardSpace
              space={space}
              propState={propState}
              isCorner={isCorner}
            />
            {tokensHere.map((player, idx) => (
              <PlayerToken
                key={player.seat}
                player={player}
                index={idx}
                total={tokensHere.length}
              />
            ))}
          </div>
        );
      })}

      {/* Centre: game title */}
      <div
        style={{ gridRow: '2 / 11', gridColumn: '2 / 11' }}
        className="flex items-center justify-center bg-green-900/40"
      >
        <div className="text-center select-none pointer-events-none">
          <div className="text-4xl font-black text-yellow-400">व्यापार खेल</div>
          <div className="text-green-400 text-sm mt-1">INDIA EDITION</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/board/ frontend/lib/boardData.js
git commit -m "--added: Board component with 11x11 CSS grid and player tokens"
```

---

## Task 8: Game UI components

**Files:**
- Create: `frontend/components/game/Dice.jsx`
- Create: `frontend/components/game/ActionPanel.jsx`
- Create: `frontend/components/game/PlayerPanel.jsx`
- Create: `frontend/components/game/GameLog.jsx`
- Create: `frontend/components/game/CardPopup.jsx`
- Create: `frontend/components/game/AuctionPanel.jsx`
- Create: `frontend/components/game/TradeDialog.jsx`

- [ ] **Step 1: Create Dice.jsx**

Create `frontend/components/game/Dice.jsx`:

```jsx
'use client';

const FACES = { 1:'⚀', 2:'⚁', 3:'⚂', 4:'⚃', 5:'⚄', 6:'⚅' };

export default function Dice({ dice, isMyTurn, phase, onRoll }) {
  const canRoll = isMyTurn && phase === 'roll';
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-3">
        {(dice ?? [null, null]).map((d, i) => (
          <div
            key={i}
            className="w-14 h-14 bg-white text-black rounded-xl flex items-center justify-center text-4xl shadow-lg select-none"
          >
            {d ? FACES[d] : '?'}
          </div>
        ))}
      </div>
      {canRoll && (
        <button
          onClick={onRoll}
          className="bg-yellow-400 text-black font-bold px-6 py-2 rounded-lg hover:bg-yellow-300 transition"
        >
          Roll Dice
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create ActionPanel.jsx**

Create `frontend/components/game/ActionPanel.jsx`:

```jsx
'use client';

// Renders context-sensitive action buttons based on game phase.
// `onAction(type, extra)` fires the socket game_action.
export default function ActionPanel({ gameState, myPlayer, onAction }) {
  if (!gameState || !myPlayer) return null;
  const { phase, pendingTrade } = gameState;
  const isMyTurn = gameState.currentTurnSeat === myPlayer.seat;

  const buttons = [];

  // Jail actions
  if (phase === 'roll' && isMyTurn && myPlayer.inJail) {
    if (myPlayer.balance >= 50) {
      buttons.push({ label: 'Pay M50 Bail', type: 'PAY_BAIL', style: 'yellow' });
    }
    if (myPlayer.jailFreeCards > 0) {
      buttons.push({ label: 'Use Jail Free Card', type: 'USE_JAIL_FREE_CARD', style: 'green' });
    }
  }

  // Post-roll (just landed on unowned property)
  if (phase === 'post_roll' && isMyTurn) {
    const space = gameState.currentSpace; // passed in from parent via boardData lookup
    buttons.push({ label: `Buy for M${gameState._landedPrice ?? '?'}`, type: 'BUY_PROPERTY', style: 'green' });
    buttons.push({ label: 'Decline (Auction)', type: 'DECLINE_PROPERTY', style: 'gray' });
  }

  // Manage phase
  if (phase === 'manage' && isMyTurn) {
    if (!pendingTrade) {
      buttons.push({ label: 'End Turn', type: 'END_TURN', style: 'yellow' });
      buttons.push({ label: 'Declare Bankruptcy', type: 'DECLARE_BANKRUPTCY', style: 'red' });
    }
  }

  // Trade response (not necessarily your turn)
  if (pendingTrade?.targetSeat === myPlayer.seat) {
    buttons.push({ label: 'Accept Trade', type: 'ACCEPT_TRADE', style: 'green' });
    buttons.push({ label: 'Reject Trade', type: 'REJECT_TRADE', style: 'red' });
  }
  if (pendingTrade?.offerSeat === myPlayer.seat) {
    buttons.push({ label: 'Cancel Trade Offer', type: 'CANCEL_TRADE', style: 'gray' });
  }

  if (buttons.length === 0) return null;

  const styleMap = {
    yellow: 'bg-yellow-400 text-black hover:bg-yellow-300',
    green:  'bg-green-600 text-white hover:bg-green-500',
    red:    'bg-red-600 text-white hover:bg-red-500',
    gray:   'bg-gray-600 text-white hover:bg-gray-500',
  };

  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map(btn => (
        <button
          key={btn.type}
          onClick={() => onAction(btn.type)}
          className={`font-semibold px-4 py-2 rounded-lg transition text-sm ${styleMap[btn.style]}`}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create PlayerPanel.jsx**

Create `frontend/components/game/PlayerPanel.jsx`:

```jsx
import { TOKEN_COLORS } from '@/lib/boardLayout';
import { SPACES } from '@/lib/boardData';

export default function PlayerPanel({ player, isCurrentTurn, properties }) {
  const color = TOKEN_COLORS[player.seat % TOKEN_COLORS.length];
  const ownedSpaces = Object.entries(properties ?? {})
    .filter(([, ps]) => ps.owner === player.seat)
    .map(([id]) => SPACES.find(s => s.id === id))
    .filter(Boolean);

  return (
    <div
      className={`rounded-xl p-3 border-2 transition ${
        player.isBankrupt ? 'opacity-40 border-gray-700' :
        isCurrentTurn ? 'border-yellow-400 bg-gray-800' : 'border-gray-700 bg-gray-900'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white"
          style={{ backgroundColor: color }}
        >
          {player.displayName[0].toUpperCase()}
        </div>
        <span className="font-semibold text-sm truncate">{player.displayName}</span>
        {player.isBot && <span className="text-xs text-gray-400">(bot)</span>}
        {isCurrentTurn && <span className="ml-auto text-yellow-400 text-xs font-bold">▶ TURN</span>}
      </div>
      <div className="text-green-400 font-bold text-lg">M{player.balance.toLocaleString()}</div>
      {player.inJail && <div className="text-red-400 text-xs mt-1">In Jail (turn {player.jailTurns})</div>}
      <div className="flex flex-wrap gap-1 mt-2">
        {ownedSpaces.slice(0, 8).map(space => (
          <div
            key={space.id}
            className="text-[9px] bg-gray-700 rounded px-1"
            title={space.name}
          >
            {space.name.slice(0, 6)}
          </div>
        ))}
        {ownedSpaces.length > 8 && (
          <div className="text-[9px] text-gray-400">+{ownedSpaces.length - 8}</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create GameLog.jsx**

Create `frontend/components/game/GameLog.jsx`:

```jsx
'use client';
import { useEffect, useRef } from 'react';

export default function GameLog({ log }) {
  const bottomRef = useRef(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  return (
    <div className="h-40 overflow-y-auto bg-gray-900 rounded-lg p-2 text-xs text-gray-300 flex flex-col gap-0.5">
      {(log ?? []).map((entry, i) => (
        <div key={i} className="leading-relaxed">{entry}</div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
```

- [ ] **Step 5: Create CardPopup.jsx**

Create `frontend/components/game/CardPopup.jsx`:

```jsx
'use client';
import { useEffect } from 'react';

export default function CardPopup({ card, onDismiss }) {
  useEffect(() => {
    if (!card) return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [card]);

  if (!card) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onDismiss}>
      <div className="bg-yellow-50 text-black rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center animate-bounce-once">
        <div className="text-5xl mb-4">?</div>
        <p className="text-lg font-semibold">{card.description}</p>
        <p className="text-sm text-gray-500 mt-4">tap to dismiss</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create AuctionPanel.jsx**

Create `frontend/components/game/AuctionPanel.jsx`:

```jsx
'use client';
import { useState } from 'react';
import { SPACES } from '@/lib/boardData';

export default function AuctionPanel({ auction, myPlayer, onAction }) {
  const [bid, setBid] = useState('');
  if (!auction) return null;
  const space = SPACES.find(s => s.id === auction.propertyId);

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-yellow-400">
      <div className="font-bold text-yellow-400 mb-1">AUCTION: {space?.name}</div>
      <div className="text-sm text-gray-300 mb-3">
        Current high bid: <span className="text-green-400 font-bold">M{auction.highBid}</span>
        {auction.highBidder !== null && ` (Seat ${auction.highBidder})`}
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          value={bid}
          onChange={e => setBid(e.target.value)}
          min={auction.highBid + 1}
          max={myPlayer?.balance}
          placeholder={`Min M${auction.highBid + 1}`}
          className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
        />
        <button
          onClick={() => { onAction('AUCTION_BID', { amount: parseInt(bid) }); setBid(''); }}
          disabled={!bid || parseInt(bid) <= auction.highBid || parseInt(bid) > (myPlayer?.balance ?? 0)}
          className="bg-green-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-green-500 disabled:opacity-40 transition text-sm"
        >
          Bid
        </button>
        <button
          onClick={() => onAction('AUCTION_PASS', {})}
          className="bg-gray-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-gray-500 transition text-sm"
        >
          Pass
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create TradeDialog.jsx**

Create `frontend/components/game/TradeDialog.jsx`:

```jsx
'use client';
import { useState } from 'react';
import { SPACES } from '@/lib/boardData';

export default function TradeDialog({ gameState, myPlayer, players, onAction, onClose }) {
  const [targetSeat, setTargetSeat] = useState('');
  const [offerProperties, setOfferProperties] = useState([]);
  const [offerCash, setOfferCash] = useState(0);
  const [requestProperties, setRequestProperties] = useState([]);
  const [requestCash, setRequestCash] = useState(0);

  if (!gameState) return null;
  const properties = gameState.properties;

  const myProperties = Object.entries(properties)
    .filter(([, ps]) => ps.owner === myPlayer.seat && !ps.mortgaged && ps.houses === 0)
    .map(([id]) => SPACES.find(s => s.id === id)).filter(Boolean);

  const targetPlayer = players.find(p => p.seat === parseInt(targetSeat));
  const theirProperties = targetSeat ? Object.entries(properties)
    .filter(([, ps]) => ps.owner === parseInt(targetSeat) && !ps.mortgaged && ps.houses === 0)
    .map(([id]) => SPACES.find(s => s.id === id)).filter(Boolean) : [];

  function toggleProp(id, list, setList) {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  }

  function submitTrade() {
    if (!targetSeat) return;
    onAction('OFFER_TRADE', {
      offer: {
        targetSeat: parseInt(targetSeat),
        offerProperties,
        offerCash: parseInt(offerCash) || 0,
        requestProperties,
        requestCash: parseInt(requestCash) || 0,
      }
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-yellow-400 mb-4">Offer Trade</h3>

        <div className="mb-3">
          <label className="text-sm text-gray-400">Trade with:</label>
          <select
            value={targetSeat}
            onChange={e => setTargetSeat(e.target.value)}
            className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select player…</option>
            {players.filter(p => p.seat !== myPlayer.seat && !p.isBankrupt).map(p => (
              <option key={p.seat} value={p.seat}>{p.displayName}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-400 mb-1">You offer:</div>
            {myProperties.map(s => (
              <label key={s.id} className="flex items-center gap-2 text-xs mb-1 cursor-pointer">
                <input type="checkbox" checked={offerProperties.includes(s.id)}
                  onChange={() => toggleProp(s.id, offerProperties, setOfferProperties)} />
                {s.name}
              </label>
            ))}
            <input type="number" value={offerCash} min={0} max={myPlayer.balance}
              onChange={e => setOfferCash(e.target.value)}
              placeholder="Cash M0"
              className="w-full mt-2 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs" />
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">You want:</div>
            {theirProperties.map(s => (
              <label key={s.id} className="flex items-center gap-2 text-xs mb-1 cursor-pointer">
                <input type="checkbox" checked={requestProperties.includes(s.id)}
                  onChange={() => toggleProp(s.id, requestProperties, setRequestProperties)} />
                {s.name}
              </label>
            ))}
            <input type="number" value={requestCash} min={0}
              onChange={e => setRequestCash(e.target.value)}
              placeholder="Cash M0"
              className="w-full mt-2 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs" />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={submitTrade} disabled={!targetSeat}
            className="flex-1 bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-500 disabled:opacity-40 transition text-sm">
            Send Offer
          </button>
          <button onClick={onClose}
            className="bg-gray-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-gray-500 transition text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add frontend/components/game/
git commit -m "--added: game UI components (Dice, ActionPanel, PlayerPanel, GameLog, CardPopup, AuctionPanel, TradeDialog)"
```

---

## Task 9: Lobby component

**Files:**
- Create: `frontend/components/lobby/LobbyRoom.jsx`

- [ ] **Step 1: Create LobbyRoom.jsx**

Create `frontend/components/lobby/LobbyRoom.jsx`:

```jsx
'use client';
import { TOKEN_COLORS } from '@/lib/boardLayout';

export default function LobbyRoom({ game, lobbyData, myUserId, onReady, onStart }) {
  if (!game) return null;
  const players = lobbyData?.players ?? game.players ?? [];
  const isHost = game.hostUserId?._id === myUserId || game.hostUserId === myUserId;
  const allReady = players.length >= 2 && players.every(p => p.isReady);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-black text-yellow-400">Waiting Room</h1>
        <p className="text-gray-400 mt-1">Share this code with friends:</p>
        <div className="text-4xl font-mono font-black text-white tracking-widest mt-2">
          {game.roomCode}
        </div>
      </div>

      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-sm text-gray-400 font-semibold mb-3">PLAYERS ({players.length}/{game.settings?.maxPlayers ?? 4})</h2>
        <div className="flex flex-col gap-2">
          {players.map(p => (
            <div key={p.seat} className="flex items-center gap-3 bg-gray-700 rounded-lg px-4 py-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white"
                style={{ backgroundColor: TOKEN_COLORS[p.seat % TOKEN_COLORS.length] }}
              >
                {(p.displayName ?? '?')[0].toUpperCase()}
              </div>
              <span className="flex-1 font-semibold">{p.displayName}</span>
              {game.hostUserId === p.userId?.toString() && (
                <span className="text-xs text-yellow-400 font-bold">HOST</span>
              )}
              <span className={`text-xs font-bold ${p.isReady ? 'text-green-400' : 'text-gray-500'}`}>
                {p.isReady ? '✓ READY' : 'NOT READY'}
              </span>
            </div>
          ))}
          {players.length < (game.settings?.maxPlayers ?? 4) && (
            <div className="flex items-center gap-3 bg-gray-700/50 rounded-lg px-4 py-3 border border-dashed border-gray-600">
              <span className="text-gray-500 text-sm">Waiting for players…</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 w-full max-w-md">
        <button
          onClick={onReady}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-500 transition"
        >
          Toggle Ready
        </button>
        {isHost && (
          <button
            onClick={onStart}
            disabled={!allReady}
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl hover:bg-yellow-300 disabled:opacity-40 transition"
          >
            {allReady ? 'Start Game!' : `Waiting for all players to be ready…`}
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/lobby/LobbyRoom.jsx
git commit -m "--added: LobbyRoom component with ready/start logic"
```

---

## Task 10: Game room page — wires everything together

**Files:**
- Create: `frontend/app/game/[code]/page.jsx`

- [ ] **Step 1: Create the game page**

Create `frontend/app/game/[code]/page.jsx`:

```jsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import useGameStore from '@/lib/gameStore';
import { getSocket, disconnectSocket } from '@/lib/socket';
import Board from '@/components/board/Board';
import PlayerPanel from '@/components/game/PlayerPanel';
import Dice from '@/components/game/Dice';
import ActionPanel from '@/components/game/ActionPanel';
import AuctionPanel from '@/components/game/AuctionPanel';
import TradeDialog from '@/components/game/TradeDialog';
import CardPopup from '@/components/game/CardPopup';
import GameLog from '@/components/game/GameLog';
import LobbyRoom from '@/components/lobby/LobbyRoom';

export default function GameRoom() {
  const { code } = useParams();
  const router = useRouter();
  const { getToken, userId: clerkUserId } = useAuth();
  const { user } = useUser();

  const { gameState, lobbyData, cardPopup, setGameState, setLobbyData, showCard, dismissCard } = useGameStore();

  const [game, setGame] = useState(null);       // REST game doc (for lobby)
  const [socket, setSocket] = useState(null);
  const [showTrade, setShowTrade] = useState(false);
  const [error, setError] = useState('');

  // Fetch game doc and connect socket on mount
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const token = await getToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/games/code/${code}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { router.push('/'); return; }
        const data = await res.json();
        if (mounted) setGame(data.data.game);

        const sock = getSocket(data.data.game.gameId, token);
        sock.on('state_update', (state) => { if (mounted) setGameState(state); });
        sock.on('lobby_update', (lobby) => { if (mounted) setLobbyData(lobby); });
        sock.on('connect_error', (err) => { if (mounted) setError(err.message); });
        sock.connect();
        if (mounted) setSocket(sock);
      } catch (e) {
        if (mounted) setError(e.message);
      }
    }
    init();
    return () => {
      mounted = false;
      disconnectSocket();
    };
  }, [code]);

  const emitAction = useCallback((type, extra = {}) => {
    if (!socket) return;
    socket.emit('game_action', { type, ...extra }, (ack) => {
      if (!ack?.ok) setError(ack?.error || 'Action failed');
    });
  }, [socket]);

  function handleReady() {
    socket?.emit('player_ready', {}, () => {});
  }

  async function handleStart() {
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/games/${game.gameId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) setError(data.message);
    } catch (e) { setError(e.message); }
  }

  if (!game) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-400">Loading game…</div>
    </div>
  );

  // Lobby view
  if (!gameState || gameState.status === 'waiting' || game.status === 'waiting') {
    return (
      <LobbyRoom
        game={game}
        lobbyData={lobbyData}
        myUserId={user?.id}
        onReady={handleReady}
        onStart={handleStart}
      />
    );
  }

  // Active game view
  const myPlayer = gameState.players.find(p => p.userId === user?.id) ??
                   gameState.players.find(p => p.seat === 0); // fallback for spectators
  const isMyTurn = gameState.currentTurnSeat === myPlayer?.seat;

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      {error && (
        <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg text-sm z-50">
          {error}
          <button onClick={() => setError('')} className="ml-3 font-bold">×</button>
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-[1fr_320px] gap-4 h-[calc(100vh-2rem)]">
        {/* Board */}
        <div className="flex items-start">
          <Board gameState={gameState} />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-3 overflow-y-auto">
          {/* Player panels */}
          {gameState.players.map(p => (
            <PlayerPanel
              key={p.seat}
              player={p}
              isCurrentTurn={gameState.currentTurnSeat === p.seat}
              properties={gameState.properties}
            />
          ))}

          {/* Dice */}
          <Dice
            dice={gameState.lastDice}
            isMyTurn={isMyTurn}
            phase={gameState.phase}
            onRoll={() => emitAction('ROLL_DICE')}
          />

          {/* Action panel */}
          <ActionPanel
            gameState={gameState}
            myPlayer={myPlayer}
            onAction={(type, extra) => emitAction(type, extra)}
          />

          {/* Auction */}
          {gameState.phase === 'auction' && (
            <AuctionPanel
              auction={gameState.auction}
              myPlayer={myPlayer}
              onAction={(type, extra) => emitAction(type, extra)}
            />
          )}

          {/* Trade button (manage phase, my turn) */}
          {gameState.phase === 'manage' && isMyTurn && !gameState.pendingTrade && gameState.settings?.allowTrading && (
            <button
              onClick={() => setShowTrade(true)}
              className="bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg hover:bg-purple-600 transition text-sm"
            >
              Offer Trade
            </button>
          )}

          {/* Manage actions: Build/Mortgage */}
          {gameState.phase === 'manage' && isMyTurn && (
            <ManageActions gameState={gameState} myPlayer={myPlayer} onAction={emitAction} />
          )}

          {/* Game log */}
          <GameLog log={gameState.log} />
        </div>
      </div>

      {/* Overlays */}
      {showTrade && (
        <TradeDialog
          gameState={gameState}
          myPlayer={myPlayer}
          players={gameState.players}
          onAction={(type, extra) => emitAction(type, extra)}
          onClose={() => setShowTrade(false)}
        />
      )}
      <CardPopup card={cardPopup} onDismiss={dismissCard} />

      {gameState.status === 'finished' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-gray-800 rounded-2xl p-8 text-center max-w-sm">
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="text-2xl font-black text-yellow-400">Game Over!</h2>
            <p className="text-gray-300 mt-2">
              {gameState.players.find(p => !p.isBankrupt)?.displayName} wins!
            </p>
            <button onClick={() => router.push('/')} className="mt-4 bg-yellow-400 text-black font-bold px-6 py-2 rounded-xl">
              Back to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Build/Mortgage mini-panel shown during manage phase
function ManageActions({ gameState, myPlayer, onAction }) {
  const { SPACES } = require('@/lib/boardData');
  const { ownsFullColorGroup } = require('@/lib/boardData'); // we'll add this export

  const myProperties = Object.entries(gameState.properties)
    .filter(([, ps]) => ps.owner === myPlayer.seat)
    .map(([id, ps]) => ({ space: SPACES.find(s => s.id === id), ps, id }))
    .filter(x => x.space);

  if (myProperties.length === 0) return null;

  return (
    <div className="bg-gray-800 rounded-xl p-3">
      <div className="text-xs text-gray-400 font-semibold mb-2">MANAGE PROPERTIES</div>
      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
        {myProperties.map(({ space, ps, id }) => (
          <div key={id} className="flex items-center gap-2 text-xs">
            <span className="flex-1 truncate">{space.name}</span>
            {!ps.mortgaged && ps.houses < 5 && (
              <button onClick={() => onAction('BUILD_HOUSE', { propertyId: id })}
                className="bg-green-700 px-1.5 py-0.5 rounded text-[10px] hover:bg-green-600">+🏠</button>
            )}
            {ps.houses > 0 && (
              <button onClick={() => onAction('SELL_HOUSE', { propertyId: id })}
                className="bg-red-800 px-1.5 py-0.5 rounded text-[10px] hover:bg-red-700">-🏠</button>
            )}
            {!ps.mortgaged && ps.houses === 0 && (
              <button onClick={() => onAction('MORTGAGE', { propertyId: id })}
                className="bg-gray-600 px-1.5 py-0.5 rounded text-[10px] hover:bg-gray-500">Mtg</button>
            )}
            {ps.mortgaged && (
              <button onClick={() => onAction('UNMORTGAGE', { propertyId: id })}
                className="bg-blue-700 px-1.5 py-0.5 rounded text-[10px] hover:bg-blue-600">UnMtg</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/game/
git commit -m "--added: game room page wiring socket, board, lobby, and all game UI together"
```

---

## Task 11: End-to-end smoke test

- [ ] **Step 1: Start backend**

```bash
# In the project root
npm run dev
```

Expected: `Server listening on port 3000`

- [ ] **Step 2: Start frontend**

```bash
cd frontend && npm run dev
```

Expected: Next.js running on `http://localhost:3001`

- [ ] **Step 3: Test the full flow in browser**

1. Open `http://localhost:3001`
2. Sign in with Clerk
3. Click "Create New Game" — should redirect to `/game/XXXXXX`
4. See the Waiting Room with your room code
5. Open a second browser tab, sign in as a different user, enter the room code and join
6. Both players click "Toggle Ready"
7. Host clicks "Start Game!"
8. Board should render with all 40 spaces, both player tokens at GO
9. Current player clicks "Roll Dice" — tokens move, log updates
10. Test property purchase: land on unowned property → Buy button appears → click → property attributed
11. Verify the game continues to the next player's turn

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "--frontend: game frontend complete and smoke-tested"
```
