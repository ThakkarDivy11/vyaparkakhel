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
