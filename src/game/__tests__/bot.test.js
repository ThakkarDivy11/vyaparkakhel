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

test('returns SELL_HOUSE when in debt and has properties with houses', () => {
  const s = makeState({ phase: 'manage' });
  s.players[0].balance = -100;
  s.properties['guwahati'] = { owner: 0, houses: 2, mortgaged: false };
  const action = getBotAction(s, 0);
  expect(action.type).toBe('SELL_HOUSE');
  expect(action.propertyId).toBe('guwahati');
});

test('returns MORTGAGE when in debt, has no houses, but has unmortgaged property', () => {
  const s = makeState({ phase: 'manage' });
  s.players[0].balance = -100;
  s.properties['guwahati'] = { owner: 0, houses: 0, mortgaged: false };
  const action = getBotAction(s, 0);
  expect(action.type).toBe('MORTGAGE');
  expect(action.propertyId).toBe('guwahati');
});

test('returns DECLARE_BANKRUPTCY when in debt and has no houses or mortgagable properties', () => {
  const s = makeState({ phase: 'manage' });
  s.players[0].balance = -100;
  s.properties['guwahati'] = { owner: 0, houses: 0, mortgaged: true };
  const action = getBotAction(s, 0);
  expect(action.type).toBe('DECLARE_BANKRUPTCY');
});

