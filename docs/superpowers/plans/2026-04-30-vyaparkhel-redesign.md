# Vyaparkhel Visual + Flow Redesign

**Goal:** Make the app look and feel like a premium board game we'd be proud to share. Lobby first, board last (most complex). Inspired by the popular "Business" Indian Monopoly clone but with our own dark/soothing aesthetic.

**Approach:** 6 sprints, each producing a working testable slice. Build a design system foundation first (one-time cost) so every later sprint composes from it.

---

## Design language

### Theme — "dark but soothing"

Primary palette is **portage** (deep blue with lavender undertones):

| Token | Hex | Use |
|---|---|---|
| `portage-50` | `#f0f5fe` | Lightest text on dark surfaces |
| `portage-100` | `#dee8fb` | Body text on dark |
| `portage-200` | `#c5d7f8` | Muted secondary text |
| `portage-300` | `#9cbdf4` | Inactive icons, subtle accents |
| `portage-400` | `#81a8ef` | Active icons, links |
| `portage-500` | `#4b77e6` | **Primary button base** |
| `portage-600` | `#365ada` | Primary button hover/pressed |
| `portage-700` | `#2d47c8` | Borders on primary surfaces |
| `portage-800` | `#2b3ca2` | Card surface (elevated) |
| `portage-900` | `#273681` | Card surface (default) |
| `portage-950` | `#1c234f` | Page background |

**Supporting colors:**
- **Accent gold** `#f59e0b` (saffron) — sparingly, for highlights / "your turn" / royal property cards
- **Success green** `#22c55e` — built houses, money received, ready state
- **Destructive red** `#ef4444` — bankruptcy, mortgage, leave game
- **Neutral cream** `#fafaf9` — primary text on dark surfaces

### Typography

- **Display** (titles, "व्यापार खेल", section headings): Plus Jakarta Sans 700/800
- **Body / UI**: Inter 400/500/600
- **Devanagari**: Tiro Devanagari Hindi (already partial via system fonts)
- **Numbers / room codes / dice values**: JetBrains Mono (fixed-width, distinctive)

Both web fonts loaded via Next.js's `next/font` (no FOUC, optimal CLS).

### Buttons

| Variant | Background | Text | Use |
|---|---|---|---|
| `primary` | `portage-600` → `portage-500` hover | white | "Create Game", "Roll Dice", "Buy" |
| `destructive` | `red-600` → `red-500` hover | white | "Bankruptcy", "Leave game" |
| `success` | `emerald-600` | white | "Confirm", "Ready" |
| `ghost` | transparent → `portage-900` hover | `portage-100` | secondary actions, "Cancel" |
| `warning` | `amber-500` | charcoal | "Auction", "Are you sure?" |

All buttons share: rounded-xl, active-scale-[0.98] press, focus ring `portage-400/40`, disabled opacity 40%.

### Surfaces

- Page bg: `portage-950` with a subtle radial gradient towards `portage-900` at center (avoids flat darkness)
- Card: `portage-900` with `portage-700/30` border, rounded-2xl, soft shadow
- Modal overlay: `portage-950/80` with backdrop blur
- Tooltips / pills: `portage-800` rounded-full

### Motion

- Transitions: 150ms (UI), 250ms (cards), 600ms (page changes)
- Token movement on board: 250ms per space, ease-out, with a tiny bounce on landing
- Dice roll: 800ms 3D spin
- Card flip (chance/community chest): 600ms 3D rotate

---

## What we build vs. skip

### Build (Phase 1)
1. Mode-select home: avatar + display name + 4 mode cards (3 locked → "Coming soon" toast)
2. Settings cog modal (sound toggle, sign out, about)
3. Create/join flow with player count + turn-time controls
4. Room code share (copy + native share API)
5. Waiting Room redesign with player slots + ready states
6. Board static refresh: bottom player panels, bottom action bar, refined property cards, live center hub
7. **3D-look pawn tokens** (CSS, no engine)
8. **Animated token movement** (hop space-by-space)
9. **3D-look dice** with roll animation (CSS 3D transforms)
10. Centered Buy/Auction modal with rent tiers
11. Card flip animation for Chance/Community Chest
12. Sound effects (dice, money, click, victory)

### Skip / defer to Phase 2+
- vs Computer mode (separate game flow)
- Pass Device mode
- Online Multiplayer matchmaking (queue/elo)
- Friends system (auth + social graph)
- Background music
- Cosmetics / themes / skins

---

## Sprint plan

### Sprint 0 — Design system foundation (~2h)

Files:
- `frontend/app/globals.css` — Tailwind v4 `@theme` with portage tokens + font CSS variables
- `frontend/app/layout.js` — load Plus Jakarta Sans, Inter, JetBrains Mono via `next/font/google`
- `frontend/components/ui/Button.jsx` — variants: primary, destructive, success, ghost, warning + sizes sm/md/lg
- `frontend/components/ui/Card.jsx` — basic + elevated variants, optional header
- `frontend/components/ui/Modal.jsx` — overlay + content + close button + focus trap
- `frontend/components/ui/Avatar.jsx` — sizes sm/md/lg, with initial fallback if no image
- `frontend/components/ui/PageBackground.jsx` — the radial gradient bg used by every screen
- `sonner` toast library installed; toast helpers in `frontend/lib/toast.js`
- `frontend/components/ui/index.js` — barrel exports
- Replace all current button usage on home page with `<Button>` primitive (validation that the system works)

**Acceptance:** Open `/`, see same content but using new primitives. Click a button — bevel + press animation. Open settings (manually) — modal works. Toast helper test: `toast.info("Coming soon")` shows a toast.

---

### Sprint 1 — Home / Mode-select (~2h)

Files:
- `frontend/app/page.js` rewritten as the mode-select home
- `frontend/components/home/ModeCard.jsx` — locked + active variants
- `frontend/components/home/SettingsModal.jsx` — sound toggle, sign out, about
- `frontend/components/home/TopBar.jsx` — avatar (left) + settings cog + friends icon (right)

Behavior:
- Mode cards: "Play with Friends" active → routes to `/play/friends`. "vs Computer" / "Pass Device" / "Online Multiplayer" locked → click shows toast "Coming soon — Phase 2"
- Avatar shows real Clerk profile picture if available, else initial fallback
- Settings cog → Modal with sound on/off, "Sign out", "About व्यापार खेल"
- Display name still prompted on first sign-in (existing flow)

**Acceptance:** Home looks like a mode-picker. All 4 cards visible. Locked cards toast on click. Active card routes correctly.

---

### Sprint 2 — Create / Join / Waiting Room (~3h)

Files:
- `frontend/app/play/friends/page.jsx` — Create / Join / Back screen
- `frontend/app/play/friends/create/page.jsx` — player count slider + turn time slider + CREATE button
- `frontend/app/play/friends/join/page.jsx` — OTP-style 6-digit input + JOIN button
- `frontend/components/lobby/WaitingRoom.jsx` (new) — replaces existing `LobbyRoom.jsx`
- `frontend/lib/share.js` — copy + native Web Share API helper
- Backend: extend `POST /games` body to accept `{ settings: { maxPlayers, timePerTurnSec } }` (already supported)

Behavior:
- Create page: sliders for player count (2-6, default 4) + turn time (30/60/90/120/180s, default 60s). CREATE button shows spinner, then routes to `/game/[code]` waiting room
- Join page: 6 single-character inputs (auto-advance on type). JOIN routes to `/game/[code]`
- Waiting Room: big room code card with copy + share buttons; player slots showing "X / N" with empty slots as dashed cards; ready toggles; host's Start button enabled when all ready

**Acceptance:** Two-browser test: create → share code → join → ready → start.

---

### Sprint 3 — Board static visual upgrade (~3h)

Files:
- `frontend/components/board/BoardSpace.jsx` polish (custom SVG corner icons, owner indicator)
- `frontend/components/board/Board.jsx` redesign center area (live state hub)
- `frontend/components/game/PlayerPanel.jsx` redesigned for bottom-grid layout
- `frontend/components/game/ActionBar.jsx` (new) — bottom strip with all actions, disabled when not actionable
- `frontend/app/game/[code]/page.jsx` layout: board top, panels middle, action bar bottom
- Custom SVG icons in `frontend/public/icons/` for jail, parking, go, gotojail, railway, utility, chance, chest

Behavior:
- Property cards: thicker color band, owner-color dot in corner, stronger contrast
- Center hub: current player avatar + "Your turn / [Name]'s turn" text + dice + log button
- Player panels in 2×3 grid below the board
- Action bar always visible at bottom (Build / Sell / Mortgage / Trade / End Turn / Bankruptcy)

**Acceptance:** Board screen looks polished even without animation. Side-by-side comparison to current state should show clear improvement.

---

### Sprint 4 — Board interactivity: 3D pawns + animation (~4h)

Files:
- `frontend/components/board/PlayerToken.jsx` rewrite as 3D-look pawn (CSS gradients, perspective, shadow)
- `frontend/components/game/Dice.jsx` rewrite as 3D cube (CSS 3D transforms, 6 faces with pip layout, roll animation)
- `frontend/components/board/Board.jsx` adds animation engine: tracks previous position per player, animates from old → new with FLIP-style hop
- `frontend/components/game/BuyAuctionModal.jsx` (new) — centered modal replacing inline buy/decline
- `frontend/components/game/CardPopup.jsx` rewrite with 3D card flip

Behavior:
- Pawns are 3D-look colored pieces with proper shadow on the board
- When dice rolls and a player's `position` changes by N spaces, the pawn animates space-by-space (~250ms each, ease-out, slight bounce)
- Dice spin in 3D for ~800ms before showing the result
- Buy/Auction modal slides in from center with backdrop blur

**Acceptance:** Roll dice → see 3D spin → see pawn hop space-by-space → see Buy modal centered on screen.

---

### Sprint 5 — Sound + polish (~2h)

Files:
- `frontend/lib/sounds.js` — Howler.js wrapper, respects settings toggle
- `frontend/public/sounds/` — dice.mp3, coin.mp3, click.mp3, victory.mp3, error.mp3
- `frontend/components/game/GameOverScreen.jsx` redesign with confetti
- `frontend/components/board/BoardSpace.jsx` mortgage flip animation
- `frontend/components/board/HousesIndicator.jsx` building grow animation
- Mobile responsive pass on the game screen

**Acceptance:** Sounds fire on actions and respect the toggle. Game-over feels celebratory. Mobile (768px+) looks acceptable.

---

## Total scope

~16h focused work across 6 sprints. Each sprint produces a deliverable I can show before moving on.

## Locked decisions (post-discussion 2026-04-30)

- **Theme color:** portage palette (above)
- **Sprint 0 buy-in:** approved — design system first
- **Locked modes:** show all 4 cards, locked ones toast "Coming soon" on click
- **Asset style:** dark + soothing (deep portage navy, gentle gradients, no harsh contrasts)
