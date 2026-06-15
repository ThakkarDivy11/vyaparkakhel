const { SPACES, COLOR_GROUPS, RAILWAYS } = require('./board-data');
const { CHANCE_CARDS, COMMUNITY_CHEST_CARDS } = require('./cards');

function shuffleDeck(length) {
  const deck = Array.from({ length }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function createInitialState(gameDoc, playerDocs) {
  const properties = {};
  SPACES.forEach(space => {
    if (space.type === 'property' || space.type === 'railway' || space.type === 'utility') {
      properties[space.id] = { owner: null, houses: 0, mortgaged: false };
    }
  });

  // Defensive dedupe: drop any duplicate playerDocs by userId so the state
  // never carries multiple records for the same user (unless it's pass & play or vs computer).
  const isPassAndPlay = gameDoc.settings?.mode === 'pass_and_play';
  const isVsComputer = gameDoc.settings?.mode === 'vs_computer';
  const skipDedupe = isPassAndPlay || isVsComputer;
  const seenUserIds = new Set();
  const uniquePlayerDocs = [];
  for (const p of playerDocs) {
    const key = String(p.userId);
    if (!skipDedupe && seenUserIds.has(key)) continue;
    seenUserIds.add(key);
    uniquePlayerDocs.push(p);
  }
  // Re-pack seats into 0..N-1 so seat indexing is contiguous
  uniquePlayerDocs.sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0));

  const players = uniquePlayerDocs.map((p, idx) => ({
    seat: idx, // re-pack to ensure seats are 0..N-1 contiguous
    userId: String(p.userId),
    providerId: p.providerId ? String(p.providerId) : null,
    displayName: p.displayName,
    balance: 1500,
    position: 0,
    inJail: false,
    jailTurns: 0,
    jailFreeCards: 0,
    isBankrupt: false,
    isConnected: true,
    disconnectedAt: null,
    isBot: p.isBot || false,
  }));

  return {
    gameId: gameDoc.gameId,
    status: 'active',
    phase: 'roll',
    currentTurnSeat: players[0].seat,
    turnDeadline: Date.now() + (gameDoc.settings?.timePerTurnSec || 60) * 1000,
    doublesCount: 0,
    lastDice: null,
    auction: null,
    pendingTrade: null,
    freeParkingPool: 0,
    chanceDeck: shuffleDeck(CHANCE_CARDS.length),
    communityDeck: shuffleDeck(COMMUNITY_CHEST_CARDS.length),
    lastCard: null,
    cardSeq: 0,
    log: [],
    players,
    properties,
    settings: gameDoc.settings || {},
  };
}

function getPlayer(state, seat) {
  return state.players.find(p => p.seat === seat);
}

function getActivePlayers(state) {
  return state.players.filter(p => !p.isBankrupt);
}

function ownsFullColorGroup(state, seat, color) {
  const group = COLOR_GROUPS[color];
  if (!group) return false;
  return group.every(id => state.properties[id]?.owner === seat);
}

function countOwnedRailways(state, seat) {
  return RAILWAYS.filter(id => state.properties[id]?.owner === seat).length;
}

function nextActiveSeat(state, fromSeat) {
  const active = getActivePlayers(state);
  if (active.length === 0) return fromSeat;
  const sorted = active.map(p => p.seat).sort((a, b) => a - b);
  const next = sorted.find(s => s > fromSeat);
  return next !== undefined ? next : sorted[0];
}

function addLog(state, message) {
  state.log = [...state.log.slice(-29), message];
}

module.exports = {
  createInitialState,
  getPlayer,
  getActivePlayers,
  ownsFullColorGroup,
  countOwnedRailways,
  nextActiveSeat,
  addLog,
};
