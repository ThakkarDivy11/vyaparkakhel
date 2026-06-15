# Vyaparkhel Redesign — Coverage Tracker

Source of truth: 39 reference images in `images/`. Built reference: codebase as of branch `feat/game-mvp`.

Status legend:
- **[x] Covered** — built and behavior/layout matches the reference closely enough to ship.
- **[~] Partial** — component exists but the visual or interaction diverges from the reference and needs another pass.
- **[ ] Missing** — no implementation in the codebase yet.

We will sweep the **Covered** bucket first (verify each one really matches), then **Partial**, then **Missing**.

---

## Pre-game flow

### [x] Covered

- [x] **Mode-select home** — 4 mode cards, avatar top-left, friends + settings icons top-right.
  - Reference: `images/lobby.jpeg`
  - Code: [`frontend/app/page.js`](frontend/app/page.js), [`frontend/components/home/`](frontend/components/home/)
  - Verify: 4 cards render; locked ones toast "Coming soon"; active one routes to `/play/friends`.

- [x] **Private screen (Create / Join / Back)**.
  - Reference: `images/play_with_friends.jpeg`
  - Code: [`frontend/app/play/friends/page.jsx`](frontend/app/play/friends/page.jsx)
  - Verify: layout + routing.

- [x] **Create-room loading state**.
  - Reference: `images/creating_room.jpeg`
  - Code: [`frontend/app/play/friends/create/page.jsx`](frontend/app/play/friends/create/page.jsx)
  - Verify: spinner shown while POST /games is in-flight; routes to room on success.

- [x] **Join-room screen**.
  - Reference: `images/join_room.jpeg`
  - Code: [`frontend/app/play/friends/join/page.jsx`](frontend/app/play/friends/join/page.jsx)
  - Verify: code input → JOIN → routes to `/game/[code]`.

- [x] **Player-count slider (friends room)**.
  - Reference: `images/select_number_of_players_friends_room.jpeg`
  - Code: [`frontend/app/play/friends/create/page.jsx`](frontend/app/play/friends/create/page.jsx)
  - Verify: slider 2–6, default value, value reaches backend `settings.maxPlayers`.

- [x] **Room-created share screen**.
  - Reference: `images/room_created.jpeg`
  - Code: [`frontend/components/lobby/WaitingRoom.jsx`](frontend/components/lobby/WaitingRoom.jsx)
  - Verify: room code visible + copy/share buttons. (Reference also shows JOIN button + "No friends found" — out of scope, ignore.)

- [x] **Waiting-room (players joined N/M)**.
  - Reference: `images/waiting_for_others_to_join.jpeg`
  - Code: [`frontend/components/lobby/WaitingRoom.jsx`](frontend/components/lobby/WaitingRoom.jsx)
  - Verify: live count updates via socket; back button works.

---

## In-game

### [x] Covered

- [x] **Board layout (11×11 grid, 40 spaces, owner color dot, mortgage overlay, houses)**.
  - Reference: `images/board.jpeg`, `WhatsApp …14.jpeg` (and most of the dump)
  - Code: [`frontend/components/board/Board.jsx`](frontend/components/board/Board.jsx), [`frontend/components/board/BoardSpace.jsx`](frontend/components/board/BoardSpace.jsx), [`frontend/components/board/PlayerToken.jsx`](frontend/components/board/PlayerToken.jsx)
  - Verify: corner spaces, color bands, owner dot in top-right when owned, mortgage overlay reads "MORTGAGED".

- [x] **Player panels grid (6 players, avatar + token + balance, active glow)**.
  - Reference: most board screenshots
  - Code: [`frontend/components/game/PlayerPanel.jsx`](frontend/components/game/PlayerPanel.jsx)
  - Verify: 2×3 / 3×2 grid layout, current-turn ring/border, bankrupt dim state.

- [x] **Persistent action bar (Manage / Trade / End-turn / Bankrupt / Log + jail-only buttons)**.
  - Reference: action strip across all in-game screenshots (`MENU · BUILD · SELL · MORTGAGE · REDEEM · TRADE`)
  - Code: [`frontend/components/game/ActionBar.jsx`](frontend/components/game/ActionBar.jsx)
  - Verify: button visibility honors `phase` and `myPlayer` flags; trade-response variant works.

- [x] **Dice (two dice + roll button on your turn)**.
  - Reference: every board screenshot
  - Code: [`frontend/components/game/Dice.jsx`](frontend/components/game/Dice.jsx)
  - Verify: pip layout matches face value; roll button disabled when not your turn.

- [x] **Center hub (current-turn avatar + dice + free-parking pool)**.
  - Reference: all board screenshots show dice + log icon between panels
  - Code: `CenterHub` in [`frontend/app/game/[code]/page.jsx`](frontend/app/game/[code]/page.jsx)
  - Verify: avatar reflects `currentTurnSeat`; pool only visible when > 0.

- [x] **Buy / Auction modal (FOR SALE)**.
  - Reference: `images/buy_or_acution.jpeg`, `WhatsApp …14 (8).jpeg`
  - Code: [`frontend/components/game/BuyAuctionModal.jsx`](frontend/components/game/BuyAuctionModal.jsx)
  - Verify: auto-shows in `post_roll` on unowned ownable space; rent tiers, mortgage value, BUY/AUCTION buttons; insufficient-funds disables BUY.

- [x] **Manage-properties list modal**.
  - Reference: implicit (our own design — reference uses a tap-on-board flow we are not copying)
  - Code: `ManageModal` in [`frontend/app/game/[code]/page.jsx`](frontend/app/game/[code]/page.jsx)
  - Verify: lists owned properties; per-row Build / Sell / Mortgage / Unmortgage; matches design system.

- [x] **Game log modal**.
  - Reference: log icon visible mid-screen in every board screenshot
  - Code: `GameLog` wrapped in `Modal` in [`frontend/app/game/[code]/page.jsx`](frontend/app/game/[code]/page.jsx)
  - Verify: opens via ActionBar Log button; events render in order.

### [~] Partial → now [x] Covered

- [x] **Live auction UI**.
  - Reference: `WhatsApp …14 (9).jpeg`
  - Code: [`frontend/components/game/AuctionPanel.jsx`](frontend/components/game/AuctionPanel.jsx) — converted to modal using design-system primitives, color-banded property preview, current-high-bid display with bidder, fold-state via `passedSeats`, can-bid validation against `myBalance` and `minBid`.

- [x] **Trade builder dialog**.
  - Reference: `WhatsApp …14 (13).jpeg`
  - Code: [`frontend/components/game/TradeDialog.jsx`](frontend/components/game/TradeDialog.jsx) — chip-style player picker, two-column "You offer / You want" with property cards (color band + price) and cash inputs, validation that *something* is being exchanged before submit.

- [x] **Trade response modal**.
  - Reference: `WhatsApp …14 (15).jpeg`
  - Code: [`frontend/components/game/TradeResponseModal.jsx`](frontend/components/game/TradeResponseModal.jsx) — new modal that auto-shows when `pendingTrade.targetSeat === myPlayer.seat`. Shows offerer's name, two-column "They give / They want" preview, Accept (success) + Decline (destructive). The inline Accept/Reject buttons in ActionBar were removed.

- [x] **Card popup (Chance / Community Chest reveal)**.
  - Code: [`frontend/components/game/CardPopup.jsx`](frontend/components/game/CardPopup.jsx) — restyled with a 3D flip animation (back face shows deck label + icon, flips over to reveal the card text). Color-coded by `deckType` (Chance saffron, Community Chest portage). Falls back gracefully when the store passes a bare description.
  - Note: server-side broadcast of the drawn card is still missing — `gameStore.showCard` is never called from a socket handler. Tracked in Missing.

- [x] **Jail-decision modal**.
  - Reference: `WhatsApp …14 (19).jpeg`
  - Code: [`frontend/components/game/JailModal.jsx`](frontend/components/game/JailModal.jsx) — auto-shows when it's my roll phase and I'm in jail. Three buttons: Pay ₹50 bail (disabled if balance < 50), Use free card (only if I have one), Roll for doubles. Inline jail buttons were removed from ActionBar.

### [ ] Missing

- [ ] **"PAID RENT" / rent-transfer animation** — pawn → pawn arc with amount.
  - Reference: `WhatsApp …14 (1).jpeg` (₹18), `(11)` (₹18), `(17)` (₹50)

- [ ] **"PAID TAX" notification** — pawn + "X paid ₹Y to the bank".
  - Reference: `WhatsApp …14 (12).jpeg`

- [ ] **"GO TO JAIL" notification** — pawn + "X was sent to jail".
  - Reference: `WhatsApp …14 (14).jpeg`

- [ ] **"STATION BOUGHT" / "LAND BOUGHT" confirmation** — post-buy summary with rent table.
  - Reference: `WhatsApp …13.jpeg`, `…13 (1).jpeg`, `…14 (16).jpeg`

- [ ] **"TRADED" summary** — arc animation showing exchanged cards/cash.
  - Reference: `WhatsApp …14 (10).jpeg`, `(18).jpeg`

- [ ] **"INSUFFICIENT FUNDS" error modal**.
  - Reference: `WhatsApp …14 (21).jpeg`

- [ ] **Bankrupt-player tile state** — dimmed tile labelled "Bankrupt".
  - Reference: `WhatsApp …14 (21).jpeg` (Quinn shown bankrupt)
  - Code: `PlayerPanel` already has `isBankrupt` opacity styling; verify it matches the reference's red/dim treatment.

- [ ] **"DONE" end-of-turn affordance** — visible in `(21)` instead of dice when it's manage phase.
  - Reference: `WhatsApp …14 (21).jpeg` shows a "DONE" button between the dice slots.
  - We have `END_TURN` in ActionBar — verify the placement / discoverability is good enough or add a center-hub "Done" treatment.

- [ ] **Pass-GO collect ₹200 animation / toast**.
  - Reference: not in the dump but rules require the cue.

- [ ] **Free-parking pool collection event** — toast / modal when landing on Free Parking with pool > 0.
  - Reference: not in the dump.

- [ ] **Game-over / winner screen**.
  - Reference: not in the dump.
  - Code: inline `🏆 Game Over!` overlay exists in `app/game/[code]/page.jsx` — needs proper design pass.

- [ ] **Settings cog modal** — sound toggle, sign out, about.
  - Reference: cog icon visible in `lobby.jpeg`, contents not shown.
  - Code: `frontend/components/home/SettingsModal.jsx` exists — verify against plan.

- [ ] **Avatar / display-name onboarding**.
  - Reference: not shown.
  - Code: existing Clerk-driven flow; needs a visual pass if used.

- [ ] **Mortgaged-property visual on board**.
  - Reference: implied by "highlighted land" copy in mortgage modal but no example shown.
  - Code: BoardSpace has a "MORTGAGED" overlay — verify it's readable on all space types.

- [ ] **Hotel vs. multi-house visual** — green house, red hotel.
  - Reference: building icons in BUILD/SELL modals (`(1)`, `(2)`).
  - Code: `BoardSpace` already renders hotel as a single red rect — verify color/proportion match.

- [ ] **Card-drawn server broadcast** — when a Chance/Community Chest card is drawn, server should emit `card_drawn` (or include it in `state_update`) with `{ description, deckType }` so the client `gameStore.showCard()` is called and `CardPopup` actually appears. Currently the popup is wired but never invoked.

---

## Out of scope (locked Phase 2+)

- vs Computer mode (`select_number_of_players_computer_*` images)
- Pass Device mode
- Online Multiplayer matchmaking
- Friends list ("No friends found." in `room_created.jpeg`)
- Push notifications / iOS toasts (`(20)` is OS-level, not our UI)

---

## Decisions (locked 2026-05-01)

1. **Theme.** Keep the dark portage/alabaster design system already shipped on the home, lobby, and pre-game pages. The reference images are inspiration for *flow and content*, not pixel targets.

2. **Build / Sell / Mortgage / Redeem.** Keep the list-modal approach (one modal listing all owned properties with per-row buttons). Allow the modal to grow on larger screens. Do not adopt the reference's tap-on-board mode.
