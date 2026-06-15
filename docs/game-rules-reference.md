# Indian Business Board Game — Complete Rules Reference

> Source: research compiled 2026-05-01. Cross-referenced against multiple editions.
> Engine status: notes in §24 cover where our implementation differs.

---

## 1. Board — All 40 Spaces

| Pos | Type | Name | Color | Price |
|-----|------|------|-------|-------|
| 0 | GO | GO | — | — |
| 1 | Property | Guwahati | Brown | 60 |
| 2 | Community Chest | Community Chest | — | — |
| 3 | Property | Bhubaneshwar | Brown | 60 |
| 4 | Tax | Income Tax | — | 200 |
| 5 | Railway | Chennai Central Railway Station | — | 200 |
| 6 | Property | Panaji (Goa) | Light Blue | 100 |
| 7 | Chance | Chance | — | — |
| 8 | Property | Agra | Light Blue | 100 |
| 9 | Property | Vadodara | Light Blue | 120 |
| 10 | Jail | Just Visiting / Jail | — | — |
| 11 | Property | Ludhiana | Pink | 140 |
| 12 | Utility | Electric Company | — | 150 |
| 13 | Property | Patna | Pink | 140 |
| 14 | Property | Bhopal | Pink | 160 |
| 15 | Railway | Howrah Station | — | 200 |
| 16 | Property | Indore | Orange | 180 |
| 17 | Community Chest | Community Chest | — | — |
| 18 | Property | Nagpur | Orange | 180 |
| 19 | Property | Meerut | Orange | 200 |
| 20 | Free Parking | Free Parking | — | — |
| 21 | Property | Lucknow | Red | 220 |
| 22 | Chance | Chance | — | — |
| 23 | Property | Chandigarh | Red | 220 |
| 24 | Property | Jaipur | Red | 240 |
| 25 | Railway | New Delhi Railway Station | — | 200 |
| 26 | Property | Pune | Yellow | 260 |
| 27 | Property | Hyderabad | Yellow | 260 |
| 28 | Utility | Water Works | — | 150 |
| 29 | Property | Ahmedabad | Yellow | 280 |
| 30 | Go to Jail | Go to Jail | — | — |
| 31 | Property | Kolkata | Green | 300 |
| 32 | Property | Chennai | Green | 300 |
| 33 | Community Chest | Community Chest | — | — |
| 34 | Property | Bengaluru | Green | 320 |
| 35 | Railway | Chhatrapati Shivaji Station | — | 200 |
| 36 | Chance | Chance | — | — |
| 37 | Property | Delhi | Dark Blue | 350 |
| 38 | Tax | Super Tax | — | 100 |
| 39 | Property | Mumbai | Dark Blue | 400 |

---

## 2. Rent Table

Format: base rent / 1H / 2H / 3H / 4H / Hotel

| Property | Price | Mortgage | Rents |
|----------|-------|----------|-------|
| Guwahati | 60 | 30 | 2/10/30/90/160/250 |
| Bhubaneshwar | 60 | 30 | 4/20/60/180/320/450 |
| Panaji | 100 | 50 | 6/30/90/270/400/550 |
| Agra | 100 | 50 | 6/30/90/270/400/550 |
| Vadodara | 120 | 60 | 8/40/100/300/450/600 |
| Ludhiana | 140 | 70 | 10/50/150/450/625/750 |
| Patna | 140 | 70 | 10/50/150/450/625/750 |
| Bhopal | 160 | 80 | 12/60/180/500/700/900 |
| Indore | 180 | 90 | 14/70/200/550/750/950 |
| Nagpur | 180 | 90 | 14/70/200/550/750/950 |
| Meerut | 200 | 100 | 16/80/220/600/800/1000 |
| Lucknow | 220 | 110 | 18/90/250/700/875/1050 |
| Chandigarh | 220 | 110 | 18/90/250/700/875/1050 |
| Jaipur | 240 | 120 | 20/100/300/750/925/1100 |
| Pune | 260 | 130 | 22/110/330/800/975/1150 |
| Hyderabad | 260 | 130 | 22/110/330/800/975/1150 |
| Ahmedabad | 280 | 140 | 24/120/360/850/1025/1200 |
| Kolkata | 300 | 150 | 26/130/390/900/1100/1275 |
| Chennai | 300 | 150 | 26/130/390/900/1100/1275 |
| Bengaluru | 320 | 160 | 28/150/450/1000/1200/1400 |
| Delhi | 350 | 175 | 35/175/500/1100/1300/1500 |
| Mumbai | 400 | 200 | 50/200/600/1400/1700/2000 |

House cost per color group: Brown/Light Blue = 50 · Pink/Orange = 100 · Red/Yellow = 150 · Green/Dark Blue = 200

---

## 3. Railways

Rent: 1 owned = M25, 2 = M50, 3 = M100, 4 = M200 (M25 × 2^(n-1)).
Nearest-railway Chance card: owner gets 2× normal rent.
No houses/hotels.

---

## 4. Utilities

- 1 utility owned → rent = 4× dice roll
- Both owned → rent = 10× dice roll
- Nearest-utility Chance card when owned → always 10× dice

---

## 5. Jail

Go to jail when: land on Go to Jail (pos 30), draw Go-to-Jail card, roll 3 doubles in a row.
Move directly to pos 10. Do not pass GO.

Getting out:
1. **Pay M50 bail** before rolling — then roll and move normally.
2. **Roll doubles** — escape; move sum of dice; no extra turn for doubles.
3. **Use Jail Free card** — escape; then roll and move.
4. **Forced (3rd failed roll)** — must pay M50 bail; move sum of third roll.

While in jail: collect rent, build/sell, trade — but cannot move.

---

## 6. Chance Cards (16)

1. Advance to GO. Collect M200. → MOVE_TO:0
2. Advance to Panaji (Goa). → MOVE_TO:6
3. Advance to Mumbai. → MOVE_TO:39
4. Advance to nearest Railway. 2× rent if owned. → MOVE_TO_NEAREST:railway
5. Advance to nearest Railway. 2× rent if owned. → MOVE_TO_NEAREST:railway
6. Advance to nearest Utility. 10× dice if owned. → MOVE_TO_NEAREST:utility
7. Bank dividend M50. → COLLECT:50
8. Get Out of Jail Free. → JAIL_FREE
9. Go back 3 spaces. → MOVE_BACK:3
10. Go to Jail. → GO_TO_JAIL
11. Street repairs: M25/house, M100/hotel. → STREET_REPAIRS:25:100
12. Pay poor tax M15. → PAY:15
13. Advance to New Delhi Railway Station. → MOVE_TO:25
14. Advance to Bengaluru. → MOVE_TO:34
15. Elected Chairman — pay each player M50. → PAY_EACH:50
16. Building loan matures — collect M150. → COLLECT:150

---

## 7. Community Chest Cards (16)

1. Advance to GO. Collect M200. → MOVE_TO:0
2. Bank error in your favour. Collect M200. → COLLECT:200
3. Doctor's fees. Pay M50. → PAY:50
4. From sale of stock, get M50. → COLLECT:50
5. Get Out of Jail Free. → JAIL_FREE
6. Go to Jail. → GO_TO_JAIL
7. Grand Opera Night — collect M50 from each player. → COLLECT_EACH:50
8. Holiday fund matures. Collect M100. → COLLECT:100
9. Income tax refund. Collect M20. → COLLECT:20
10. Birthday — collect M10 from each player. → COLLECT_EACH:10
11. Life insurance matures. Collect M100. → COLLECT:100
12. Hospital fees. Pay M100. → PAY:100
13. School fees. Pay M50. → PAY:50
14. Consultancy fee. Receive M25. → COLLECT:25
15. Street repairs: M40/house, M115/hotel. → STREET_REPAIRS:40:115
16. Second prize beauty contest. Collect M10. → COLLECT:10

---

## 8. Key Rules

**Income Tax (pos 4):** Flat M200 (India editions usually omit the 10%-of-assets option).

**Super Tax (pos 38):** Flat M100.

**Free Parking:** Standard = nothing. Our engine supports `settings.freeParkingMoney` toggle to pool all tax/fine payments for the landing player to collect.

**GO salary:** Collect M200 when passing OR landing on GO.

**Monopoly (color group, no houses):** Rent is 2× base.

**Even-build rule:** Must build/sell evenly across all properties in a color group. Cannot have 2 more houses on one property than another in the same group.

**Mortgage:** Receive mortgage value from bank. No rent while mortgaged. Unmortgage cost = ceil(mortgage × 1.1).

**Bankruptcy to player:** All cash + properties transfer to creditor (mortgaged properties included; creditor takes on the 10% redemption obligation). Hotels/houses return to bank.

**Bankruptcy to bank:** All properties return to bank unimproved. Cash goes to bank.

---

## 9. India-Specific Variants (NOT in our engine currently)

| Rule | Common India House Rule | Our Engine |
|------|------------------------|------------|
| First circuit rule | Cannot buy property until completing one full loop | Not implemented |
| Who goes first | Roll until someone gets 12 (double sixes) | Player 0 starts |
| Max houses | 3 before hotel (many physical editions) | 4 before hotel (standard) |
| GO salary | Rs 1500 (scaled editions) | M200 |
| Jail bail | Rs 200 (some editions) | M50 |
| Club House / Rest House | Extra spaces in some editions | Not on our board |
| GST Space | GST variant only | Not on our board |

These are **not bugs** — they're known variant differences. Implement if user requests.

---

## 10. What the Engine Currently Has vs Needs

### Implemented ✓
- All 40 board spaces
- All 16 Chance cards + 16 Community Chest cards  
- Rent calculation (properties, railways, utilities, monopoly bonus)
- Houses/hotels (even-build, sell at half price)
- Mortgage/unmortgage (10% interest)
- Jail (pay bail, roll doubles, Jail Free card, forced release on 3rd attempt)
- Auctions
- Trading
- Bankruptcy (to player + to bank)
- Free Parking pool (toggle)
- Card popup triggered by cardSeq/lastCard in state
- 90s turn timer (no bot auto-play)
- Doubles extra-turn + triple-doubles-to-jail

### Missing / Not Yet Implemented ✗
- **Nearest-railway 2× rent** — MOVE_TO_NEAREST:railway lands correctly but `_nearestCard` flag in state is set but the 2× multiplier is not applied in `calcRent` (engine bug)
- **Nearest-utility 10× dice** — same issue; the 10× is hardcoded in calcRent for "both owned" but nearest-utility card should force 10× even with 1 owned
- **Income Tax choice** — currently flat M200 only (acceptable per India variants)
- **First-circuit restriction** — common India rule, not implemented
- **3-house max** — common India physical rule, not implemented (4 houses allowed)
