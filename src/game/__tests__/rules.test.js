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
    // [3, 5] sums to 8 → position 8 = Agra (plain property, no side-effects)
    const ns = applyMove(s, rollAction([3, 5]));
    expect(ns.players[0].position).toBe(8);
  });

  test('wraps around board at position 40', () => {
    const s = makeState();
    s.players[0].position = 38;
    // [1, 2] → 38+3=41 → 41%40=1 = Guwahati (property, safe)
    const ns = applyMove(s, rollAction([1, 2]));
    expect(ns.players[0].position).toBe(1);
  });

  test('collecting GO salary when passing position 0', () => {
    const s = makeState();
    s.players[0].position = 38;
    // [1, 2] → wraps to position 1, collects M200
    const ns = applyMove(s, rollAction([1, 2]));
    expect(ns.players[0].balance).toBe(1700);
  });

  test('no GO salary when not passing', () => {
    const s = makeState();
    // [3, 5] → position 8 = Agra (property), no GO collected
    const ns = applyMove(s, rollAction([3, 5]));
    expect(ns.players[0].balance).toBe(1500);
  });

  test('stores last dice roll in state', () => {
    const s = makeState();
    // [2, 6] → position 8 = Agra (property, safe)
    const ns = applyMove(s, rollAction([2, 6]));
    expect(ns.lastDice).toEqual([2, 6]);
  });
});

describe('ROLL_DICE — doubles', () => {
  test('increments doublesCount on doubles roll', () => {
    const s = makeState();
    // [3, 3] → position 6 = Panaji (unowned property → post_roll)
    const ns = applyMove(s, rollAction([3, 3]));
    expect(ns.doublesCount).toBe(1);
  });

  test('resets doublesCount on non-doubles', () => {
    const s = makeState({ doublesCount: 1 });
    // [2, 5] → position 7 = Chance (non-deterministic position but doublesCount check is safe)
    // Use [3, 5] → position 8 = Agra (safe)
    const ns = applyMove(s, rollAction([3, 5]));
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
    // [1, 1] → 28+2=30 = Go To Jail; doubles but go_to_jail overrides
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
    s.players[0].position = 0;   // START: position 0
    s.properties['guwahati'].owner = 1;  // property at position 1 owned by player 1
    s.phase = 'roll';
    const ns = applyMove(s, rollAction([0, 1])); // roll sum 1 → position 0+1=1 (Guwahati)
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
    // roll 1 to land on pos 1 (Guwahati), monopoly on brown → 2 * 2 = 4
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

describe('Bug fixes from review', () => {
  // C7: Free Parking pool was collected (taxes, payments) but never paid out.
  test('free parking pays out pool to player who lands on it (when enabled)', () => {
    const s = makeState();
    s.settings = { ...s.settings, freeParkingMoney: 1 }; // truthy enables payout
    s.players[0].position = 0;
    s.freeParkingPool = 350;
    // Roll [10, 10] -> position 20 = Free Parking
    const ns = applyMove(s, rollAction([10, 10]));
    expect(ns.players[0].position).toBe(20);
    expect(ns.players[0].balance).toBe(1500 + 350);
    expect(ns.freeParkingPool).toBe(0);
  });

  test('free parking does nothing when freeParkingMoney is disabled', () => {
    const s = makeState();
    s.settings = { ...s.settings, freeParkingMoney: 0 };
    s.players[0].position = 0;
    s.freeParkingPool = 350; // would not even accumulate, but verify payout doesn't fire
    const ns = applyMove(s, rollAction([10, 10]));
    expect(ns.players[0].balance).toBe(1500);
    expect(ns.freeParkingPool).toBe(350);
  });

  // I8: "Advance to GO" card was paying 200 twice (card effect + landing-on-GO bonus).
  test('Advance to GO card pays salary exactly once', () => {
    const s = makeState();
    // Force the chance deck to draw the advance_go card first
    const { CHANCE_CARDS } = require('../cards');
    const cardIdx = CHANCE_CARDS.findIndex(c => c.effect === 'MOVE_TO:0');
    s.chanceDeck = [cardIdx, ...s.chanceDeck.filter(i => i !== cardIdx)];
    s.players[0].position = 5;
    // Roll [1, 1] -> pos 7 = Chance
    const ns = applyMove(s, rollAction([1, 1]));
    expect(ns.players[0].position).toBe(0);
    expect(ns.players[0].balance).toBe(1500 + 200); // not 1500 + 400
  });

  // C10: TIMEOUT in non-roll phases must reset state so the next player can act.
  test('TIMEOUT during post_roll triggers auction (forced decline)', () => {
    const s = makeState();
    s.players[0].position = 1; // Guwahati, unowned
    s.phase = 'post_roll';
    const ns = applyMove(s, { type: 'TIMEOUT', seat: 0 });
    expect(ns.phase).toBe('auction');
    expect(ns.auction.propertyId).toBe('guwahati');
  });

  test('TIMEOUT during auction marks the seat as passed', () => {
    const s = makeState();
    s.phase = 'auction';
    s.currentTurnSeat = 0;
    s.auction = { propertyId: 'guwahati', highBid: 0, highBidder: null, passedSeats: [1] };
    const ns = applyMove(s, { type: 'TIMEOUT', seat: 0 });
    // Both passed -> auction ends -> back to manage
    expect(ns.phase).toBe('manage');
    expect(ns.auction).toBeNull();
  });

  test('TIMEOUT during manage advances turn cleanly', () => {
    const s = makeState();
    s.phase = 'manage';
    s.currentTurnSeat = 0;
    const ns = applyMove(s, { type: 'TIMEOUT', seat: 0 });
    expect(ns.currentTurnSeat).toBe(1);
    expect(ns.phase).toBe('roll');
  });

  // C2: state.players entries should expose providerId so the frontend can identify itself.
  test('createInitialState exposes providerId on each player', () => {
    const { createInitialState } = require('../state');
    const game = { gameId: 'g1', settings: {} };
    const players = [
      { seat: 0, userId: 'u1', providerId: 'clerk_abc', displayName: 'Alice' },
      { seat: 1, userId: 'u2', providerId: 'clerk_xyz', displayName: 'Bob' },
    ];
    const s = createInitialState(game, players);
    expect(s.players[0].providerId).toBe('clerk_abc');
    expect(s.players[1].providerId).toBe('clerk_xyz');
  });
});
