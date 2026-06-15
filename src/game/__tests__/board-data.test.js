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
