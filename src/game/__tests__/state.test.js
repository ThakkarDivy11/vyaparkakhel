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

describe('createInitialState dedupe invariants', () => {
  test('drops duplicate playerDocs by userId', () => {
    const { createInitialState } = require('../state');
    const game = { gameId: 'g1', settings: {} };
    const playerDocs = [
      { seat: 0, userId: 'u1', providerId: 'clerk_a', displayName: 'Alice' },
      { seat: 1, userId: 'u2', providerId: 'clerk_b', displayName: 'Bob' },
      { seat: 2, userId: 'u2', providerId: 'clerk_b', displayName: 'Bob duplicate' },
      { seat: 3, userId: 'u3', providerId: 'clerk_c', displayName: 'Carol' },
    ];
    const state = createInitialState(game, playerDocs);
    expect(state.players).toHaveLength(3);
    const userIds = state.players.map(p => p.userId);
    expect(new Set(userIds).size).toBe(3);
  });

  test('repacks seats to be contiguous 0..N-1', () => {
    const { createInitialState } = require('../state');
    const game = { gameId: 'g1', settings: {} };
    const playerDocs = [
      { seat: 5, userId: 'u1', providerId: 'a', displayName: 'A' },
      { seat: 9, userId: 'u2', providerId: 'b', displayName: 'B' },
    ];
    const state = createInitialState(game, playerDocs);
    expect(state.players.map(p => p.seat)).toEqual([0, 1]);
  });
});
