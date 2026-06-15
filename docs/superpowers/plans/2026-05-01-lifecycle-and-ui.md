# Lifecycle, Resilience, and UI-Elevation Plan

**Date:** 2026-05-01
**Branch:** `feat/game-mvp`
**Goal:** Make the game robust across the full session lifecycle (join → leave → bankrupt → reconnect → game over → new game), then layer in a polished animation pass and Rive-driven 3D-style assets.

---

## Part 1 — Why this plan exists

The user reported a concrete bug and a class of bugs:

1. **Cross-game state leak (concrete):** After leaving a finished game, creating a new game (different `roomCode`, different `gameId`) shows the previous game's "Game Over" overlay until the socket eventually catches up.
2. **Lifecycle ambiguity (class of bugs):** What happens when a player leaves, declares bankruptcy, drops their network, closes the tab, or reconnects after a game has ended? The current implementation has partial answers; this plan makes them explicit.

Plus the user has approved a UI elevation:

3. **Option A** — framer-motion animation pass on the existing components.
4. **Option C** — Rive-driven assets (pawn, dice) for that polished, "made-by-a-real-studio" feel.

Each section below covers: *what currently happens*, *what should happen*, *exact files*, and *concrete steps*.

---

## Part 2 — Critical bug investigation

### Bug 2.1 — Cross-game state leak

**File:** [`frontend/lib/gameStore.js`](frontend/lib/gameStore.js), [`frontend/app/game/[code]/page.jsx`](frontend/app/game/[code]/page.jsx)

**Root cause:**
- `gameStore` is a module-level Zustand store. `gameState` (`status: 'finished'`, players, etc.) persists across React route changes.
- The game page's init `useEffect` deliberately has no cleanup.
- The socket singleton in [`frontend/lib/socket.js`](frontend/lib/socket.js) only rebuilds when `gameCode` changes — fine — but until the new game's `state_update` arrives, the page renders with the old store contents.
- The page's "Game Over" overlay is gated only on `gameState.status === 'finished'`, so it shows immediately on the new route until overwritten.

**Repro:**
1. Play game A to completion (someone wins).
2. Click "Back to Home" or "Leave game".
3. Create a new game B from the home page.
4. Browser flashes / sticks on Game A's "Game Over" screen at `/game/{B}`.

**Fix (minimal):**
- Add `resetGameState()` action to `gameStore`.
- Call it on every mount of `/game/[code]` *before* any fetch.
- Also call it from `MenuModal`'s "Leave game" flow before `router.push('/')`.
- Tighten the Game Over overlay gate: only show when `gameState.status === 'finished'` *and* `gameState.gameId === currentGameId` (defense in depth).

**Code (target shape, do not implement yet):**

```js
// gameStore.js — add
resetGameState: () => set({ gameState: null, lobbyData: null, cardPopup: null, error: null }),
```

```jsx
// page.jsx — top of init useEffect
const { resetGameState } = useGameStore();
useEffect(() => {
  resetGameState(); // wipe any prior game's state
  // ...existing init...
}, [code, clerkUserId, isLoaded, isSignedIn]);
```

```jsx
// MenuModal "Leave game" handler in page.jsx
onLeaveGame={() => {
  emitAction('LEAVE_GAME');     // (see §3.2 below)
  disconnectSocket();
  resetGameState();
  router.push('/');
}}
```

**Verification:** play → end → leave → create-new → assert no flash of old Game Over.

---

## Part 3 — Game lifecycle: explicit answers for every transition

For each transition: state we update, broadcasts we emit, UX the user sees.

### 3.1 — Player joins

**Already handled.** REST `POST /games/:gameId/join` adds the player record; socket connection refreshes the lobby. Add only:
- **Late-join after game has started** → REST currently rejects with "game already started." Keep this. Show a clear error on the frontend (`This game is already in progress`) with a Back button.

### 3.2 — Player leaves voluntarily ("Leave game" in MenuModal)

**Currently:** the frontend just routes to home. The server keeps the player in the game. The reconnect window eventually fires and bot-replaces them after 5 minutes.

**Should be:** explicit forfeit, instant.

**Server changes:**
- New action type `LEAVE_GAME` in [`src/game/rules.js`](src/game/rules.js):
  - If `state.status === 'waiting'` and the player is the *host*: dissolve the room. Set `status='cancelled'`, broadcast `room_cancelled` event, all clients route home with toast "Host left the game".
  - If `state.status === 'waiting'` and they're not host: remove from `players[]`, broadcast `lobby_update`.
  - If `state.status === 'active'`: treat as bankruptcy (re-use the bankruptcy code path). Their properties go to the bank, they're marked `isBankrupt: true` and `leftAt: <timestamp>`. If only one non-bankrupt player remains, end the game.
- Cancel the disconnected-reconnect window for that player so they don't get re-bot-replaced.

**Client changes:**
- `MenuModal` "Leave game" → emit `LEAVE_GAME` action, then `disconnectSocket()` + `resetGameState()` + `router.push('/')`.
- WaitingRoom listens for `room_cancelled` → toast + route home.

### 3.3 — Player declares bankruptcy

**Currently:** [`src/game/rules.js`](src/game/rules.js) handles `DECLARE_BANKRUPTCY`. Confirm:
- Properties: should return to the bank (owner=null, houses=0, mortgaged=false).
- isBankrupt=true, balance=0.
- Turn should advance immediately.
- If only one non-bankrupt player remains → game over with that player as winner.

**Audit task:** read the current `handleBankruptcy` (or equivalent) and fill any gaps. The user reported "other player declared bankruptcy" working, so this likely mostly works — verify the property cleanup specifically.

### 3.4 — Network drops / browser closes

**Currently:** disconnect → 5-min reconnect window → if no reconnect, `markPlayerAsBot` converts them.

**Already added today (this session):** un-bot on real reconnect (in `updateConnectionStatus`).

**Polish:**
- Show "disconnected" badge on PlayerPanel when `player.isConnected === false`. (Currently `isConnected` is set on the state but no UI surfaces it.)
- Show a thin banner on the disconnected user's *own* screen if/when they reconnect: "Reconnected — picking up where you left off."
- Reduce the reconnect window in dev (e.g. 60s) to make iteration faster — gate on `NODE_ENV`.

### 3.5 — All other players leave / go bankrupt

**Auto-end:** if `players.filter(p => !p.isBankrupt).length <= 1`, set `status='finished'`, `winner = lastPlayerStanding`, broadcast `state_update` (the existing Game Over overlay handles the rest).

This already happens in `handleBankruptcy`; verify it also fires from `LEAVE_GAME` and the auto-bot conversion path.

### 3.6 — Server crash / restart

**Currently:** game state lives in Redis. If Redis is wiped, game state is lost. Mongo has periodic snapshots (every 20 moves, in [`src/services/realtime/socketServer.js`](src/services/realtime/socketServer.js)).

**Hardening:**
- On `loadGameState` returning null for an *active* game, fall back to the latest `Snapshot` for that gameId and replay any `Move` records since the snapshot's `lastSeq`.
- This is a recovery path, not a hot path — keep it simple; only invoke when Redis miss + game is active per Mongo.

### 3.7 — Game already finished, user navigates back to its URL

**Should:** show the Game Over screen with the result, plus a "Back to Home" button. No socket connection necessary — REST `GET /games/code/:code` returns enough info.

**Currently:** spectator path may show "cannot join" — verify and adjust.

### 3.8 — Two clients act on the same property simultaneously

**Already handled** by the Redis distributed lock (`lock:game:{gameId}`) wrapping `processGameAction`. Verify the lock TTL is short enough (5s currently) that a stuck handler doesn't deadlock the whole game.

### 3.9 — Reconnect after game ended

**Should:** join the socket room (no auth issues), receive a final `state_update` with `status='finished'` + result, render Game Over overlay.

**Currently:** likely works but unverified. Add an integration test or manual repro.

### 3.10 — Host leaves before game starts

**Currently:** room sits in waiting state forever; players see nothing change.

**Should:** dissolve room (per §3.2), kick everyone home with a toast.

**Decision lock:** dissolve > transfer-host. Simpler. Users can re-create.

---

## Part 4 — UI elevation: Option A (framer-motion)

Add depth, motion, and feedback to existing components. No new tech beyond what we installed today (`framer-motion`).

### 4.1 — Pawn movement on board

**File:** [`frontend/components/board/PlayerToken.jsx`](frontend/components/board/PlayerToken.jsx) + [`frontend/components/board/Board.jsx`](frontend/components/board/Board.jsx)

**Currently:** when a player's `position` changes, the token jumps directly to the new cell.

**Target:**
- Track previous position per player in a ref (`prevPositions[seat] = position`).
- When position changes by N steps, animate the token through each intermediate space at ~250ms each, ease-out, with a tiny vertical bounce on each hop.
- Use `framer-motion`'s `animate` with a sequence of waypoints (`animate={{ x: [...], y: [...] }}` keyframes).
- Total duration: `min(N * 250, 1500)` — cap at 1.5s for big jumps so it feels snappy.
- During the animation, defer rendering of the destination space's "landed on" effects (e.g. BuyAuctionModal opens *after* the hop completes). Wire this via an `onAnimationComplete` callback.

### 4.2 — Modal entrances

**Files:** [`frontend/components/ui/Modal.jsx`](frontend/components/ui/Modal.jsx)

**Currently:** uses Tailwind animations: `animate-in fade-in zoom-in-95 duration-200`.

**Target:**
- Replace with framer-motion `motion.div` + `AnimatePresence`:
  - Backdrop: fade in 200ms.
  - Card: spring-in (`type: 'spring', stiffness: 260, damping: 22`) from `scale: 0.92, y: 10` to `scale: 1, y: 0`.
  - Exit: scale 0.97, fade 150ms.
- This single change cascades to every modal in the app (Buy/Auction, Trade, Manage, Menu, Jail, etc.).

### 4.3 — Button micro-interactions

**File:** [`frontend/components/ui/Button.jsx`](frontend/components/ui/Button.jsx)

**Currently:** `active:scale-[0.97]` only.

**Target:**
- Wrap in `motion.button` with `whileHover={{ y: -1, boxShadow: '...' }}` and `whileTap={{ y: 0, scale: 0.97 }}`.
- Add a saffron focus glow ring with motion.

### 4.4 — Property "landed on" pulse

**File:** [`frontend/components/board/BoardSpace.jsx`](frontend/components/board/BoardSpace.jsx) + [`frontend/components/board/Board.jsx`](frontend/components/board/Board.jsx)

**Target:**
- When the current player lands on a space, that BoardSpace pulses (saffron glow ring) for ~1s before any modal appears.
- Wire via a `landedOn` prop pushed from Board (computed from `currentTurnPlayer.position`).

### 4.5 — Houses appear / sell with grow + shrink

**File:** [`frontend/components/board/BoardSpace.jsx`](frontend/components/board/BoardSpace.jsx)

**Target:**
- Wrap each house indicator in `motion.div` with `initial={{ scale: 0 }} animate={{ scale: 1 }}` (spring) and `exit={{ scale: 0 }}`.
- Use `AnimatePresence` so removing a house (sell) animates out.

### 4.6 — Owner pawn pop-in on purchase

**File:** [`frontend/components/board/BoardSpace.jsx`](frontend/components/board/BoardSpace.jsx)

**Target:**
- The newly-added `OwnerPawn` SVG already exists. Wrap in `motion.svg` with `initial={{ y: -20, opacity: 0, scale: 0.5 }} animate={{ y: 0, opacity: 1, scale: 1 }}` (spring) so it drops in on first appearance.

### 4.7 — Mortgage flip

**File:** [`frontend/components/board/BoardSpace.jsx`](frontend/components/board/BoardSpace.jsx)

**Target:**
- When a property is mortgaged, the property card flips on its X axis to reveal a darker back side with the "MORTGAGED" stamp (currently a 45° text overlay). Use `motion.div` with `rotateX` keyframes.

### 4.8 — Page transitions

**Files:** root layout + per-route pages.

**Target:**
- Use Next.js's `Template` component or wrap with `framer-motion`'s `AnimatePresence` at layout level.
- Route changes fade + slide 8px from below.

### 4.9 — Dice roll button feedback

**Already shipped today:** dice spin 700ms with 360° rotation. Polish only:
- Add a subtle screen shake (wrapper transform `x: [0, -2, 2, -1, 1, 0]`) for ~150ms when dice land — sells the impact.

### 4.10 — Turn indicator transition

**Files:** [`frontend/app/game/[code]/page.jsx`](frontend/app/game/[code]/page.jsx) `CenterHub`

**Target:**
- When `currentTurnSeat` changes, the avatar in the center hub crossfades + slides slightly. Use `AnimatePresence` keyed on seat.

---

## Part 5 — UI elevation: Option C (Rive)

Use Rive (rive.app) for production-quality animated assets. Replaces our 2D pip dice and CSS pawns with motion-rich, designer-made artwork.

### 5.1 — Setup

- Install `@rive-app/react-canvas` (10kb, MIT-licensed).
- Add a `frontend/public/rive/` directory for `.riv` files.
- Create a thin `frontend/components/rive/RiveAsset.jsx` wrapper to render any `.riv` with state-machine inputs.

### 5.2 — Asset sourcing

This is the rate-limiting step. Two paths:

**Path 1 — Marketplace / community (preferred per user):**
- Browse https://rive.app/community/ for: dice, board-game pawn, money/coin, trophy. Filter for "free / CC0 / commercial use".
- Likely candidates (to evaluate): "3D Dice Roll", "Chess Piece Pawn", "Coin Flip", "Confetti".
- License check: download only if license allows commercial use without attribution requirements we can't honor.
- **Decision required from user:** which assets to source. I can shortlist 3 candidates per slot and link them; user picks.

**Path 2 — Commission / build:**
- Out of scope for this plan unless Path 1 fails.

### 5.3 — Components

Build these as drop-in replacements for the existing CSS components, behind a feature flag (`NEXT_PUBLIC_USE_RIVE=true`) so we can A/B them.

**`RivePawn.jsx`** — replaces `PlayerToken.jsx`
- Inputs: `color` (hex), `state` ('idle' | 'walking' | 'jumping' | 'bankrupt')
- Animation triggers: `walk` fires when position changes, `jump` fires on landing, `idle` is the default.
- Tint: most pawn .riv files are designed for a single-color tint; we'll feed `color` as a colorPicker input.

**`RiveDice.jsx`** — replaces the pip dice in `Dice.jsx`
- Inputs: `value` (1-6), `rolling` (bool)
- Animation: `roll` triggers a 3D spin; settles on `value`.

**`RiveCoinBurst.jsx`** — for money flow events
- Triggers: `burst` plays a one-shot coin spray.
- Used as an overlay above PlayerPanel during balance changes (replaces the simple text floater for a richer effect).

**`RiveConfetti.jsx`** — Game Over winner celebration
- Triggers: `play` on game over.

### 5.4 — Wiring

- Each Rive component takes the same props its CSS counterpart took, plus state-machine inputs.
- Wire from existing state. No backend changes.
- Fallback: if `NEXT_PUBLIC_USE_RIVE` is false (or the .riv file 404s), render the CSS version.

### 5.5 — Performance

- Rive runs on canvas with hardware acceleration; 6 pawns + 2 dice + occasional coin burst should be well under budget on mobile.
- Pre-load all `.riv` files at the start of `/game/[code]` so they're cached when needed.
- Lazy-load `@rive-app/react-canvas` via dynamic import to keep the initial bundle small.

### 5.6 — Open question

**User decision required:** are you sourcing the Rive files yourself (your design preference seems strong), or would you like me to shortlist 2-3 community assets per component for you to pick? This is the single thing blocking implementation of Part 5.

---

## Part 6 — Implementation order

Each phase is independently shippable. Don't start a new phase until the previous one is verified.

### Phase 1 — Critical bug + lifecycle (highest urgency, no design dependency)

**Day 1 (~3h):**
- §2.1 fix the cross-game leak (`resetGameState` action, page mount call).
- §3.2 wire `LEAVE_GAME` action: backend handler + frontend MenuModal call.
- §3.10 host-leaves-lobby dissolves room.
- §3.4 surface `isConnected=false` as a "disconnected" badge on PlayerPanel.

### Phase 2 — Lifecycle hardening (no design dependency)

**Day 2 (~3h):**
- §3.3 audit + tighten `handleBankruptcy` (property cleanup verification).
- §3.5 confirm auto-end fires from all bankruptcy / leave / bot paths.
- §3.6 Redis miss → snapshot+moves recovery.
- §3.7 navigation to a finished game shows Game Over from REST.

### Phase 3 — UI elevation Option A (framer-motion polish)

**Day 3 (~5h):**
- §4.2 modal spring entrances (one-shot win across the app).
- §4.3 button micro-interactions.
- §4.5 + §4.6 houses + owner pawn pop-in.
- §4.4 landed-on pulse.
- §4.7 mortgage flip.
- §4.8 page transitions.
- §4.10 turn indicator crossfade.

**Day 4 (~3h):**
- §4.1 pawn space-by-space hop (the marquee animation; biggest single-payoff item).
- §4.9 dice impact shake.

### Phase 4 — UI elevation Option C (Rive integration)

**Day 5 — preparation (~1h):**
- §5.1 install + scaffold.
- §5.2 user-driven asset sourcing decision.

**Day 6 (~4h, gated on §5.2):**
- §5.3 `RivePawn`, `RiveDice` behind feature flag.
- §5.4 wiring.
- §5.5 lazy-load + preloads.

**Day 7 (~2h):**
- §5.3 `RiveCoinBurst`, `RiveConfetti`.
- Polish + final demo.

---

## Part 7 — Testing strategy

For each lifecycle scenario in §3, add a manual repro script to `docs/superpowers/manual-tests.md` (new file, created in Phase 1):

```
[3.1] Late join after start
- Open game in window A, sign in as host
- Open same code in window B before host clicks Start → join works
- Host clicks Start → both move to active view
- Open same code in window C → see "game already started" error + Back button

[3.2] Host leaves
- Window A (host) opens MenuModal → Leave game
- Confirms → routes home
- Window B (other player) → sees toast "Host left the game" → routes home

… (similar for §3.3 through §3.10)
```

Automated tests (defer): integration tests for socket events would catch regressions, but they're a separate plan. Manual scripts now, automation later.

---

## Part 8 — What this plan does NOT cover

- Friends list / social graph (Phase 2+ per CLAUDE.md decision).
- vs Computer / Pass & Play modes.
- Tournament / leaderboard features.
- Sound effects (separate from animations).
- Three.js full-3D board (over-scoped).
- Background music.
- Mobile-app-style native gestures.

These remain on the backlog and get their own plans when prioritized.

---

## Decisions still pending from the user

1. **Rive asset sourcing** (§5.2 / §5.6): self-source vs. shortlist-from-me?
2. **Reconnect window length in dev** (§3.4): keep 5min, drop to 60s, or make it configurable per-game?
3. **Voluntary leave during active game** (§3.2): treat as bankruptcy (cleanest), or keep their properties locked until the game ends (allows rejoin)? My recommendation: **treat as bankruptcy** — cleaner state, no zombie players.
4. **Phase order** (§6): start with Phase 1 (bug + lifecycle) as I've ordered, or interleave UI work? My recommendation: **finish Phases 1–2 before any UI work** — animating a buggy game wastes effort.
