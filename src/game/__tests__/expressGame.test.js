const { createAiGame, rollDice, movePlayer, endTurn, getGame } = require('../../controllers/expressGame.controller');
const Game = require('../../models/game.model');
const Move = require('../../models/move.model');
const Snapshot = require('../../models/snapshot.model');
const User = require('../../models/user.model');
const AuditLog = require('../../models/audit.model');
const { redis, acquireLock, releaseLock } = require('../../services/redis/redisClient');
const { getOrCreateUser } = require('../../utils/get_or_create_user');

jest.mock('../../models/game.model', () => ({
  create: jest.fn(async (data) => ({ ...data, save: jest.fn() })),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));
jest.mock('../../models/move.model', () => ({
  create: jest.fn(async (data) => data),
  countDocuments: jest.fn(async () => 0),
}));
jest.mock('../../models/snapshot.model', () => ({
  create: jest.fn(async (data) => data),
  findOne: jest.fn(),
}));
jest.mock('../../models/user.model');
jest.mock('../../models/audit.model', () => ({
  create: jest.fn(async (data) => data),
}));
jest.mock('../../services/redis/redisClient', () => {
  const store = {};
  return {
    redis: {
      get: jest.fn(async (key) => store[key] || null),
      set: jest.fn(async (key, val) => {
        store[key] = val;
        return 'OK';
      }),
    },
    acquireLock: jest.fn(async () => 'mock-lock-id'),
    releaseLock: jest.fn(async () => 1),
  };
});
jest.mock('../../utils/get_or_create_user', () => ({
  getOrCreateUser: jest.fn(async () => ({
    _id: 'test_user_mongodb_id',
    providerId: 'test_clerk_id',
    username: 'test_user',
    displayName: 'Test User',
  })),
}));
jest.mock('../../services/realtime/socketServer', () => ({
  emitToGame: jest.fn(),
  triggerBotPlay: jest.fn(),
}));
jest.mock('../../utils/catch_async', () => (fn) => (req, res, next) => fn(req, res, next).catch(next));

describe('expressGame.controller - VS COMPUTER Flow', () => {
  let mockRes;
  let mockNext;
  let mockStateStore = {};

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    mockStateStore = {};

    // Mock Redis get/set implementation with local store
    redis.get.mockImplementation(async (key) => mockStateStore[key] || null);
    redis.set.mockImplementation(async (key, val) => {
      mockStateStore[key] = val;
      return 'OK';
    });
  });

  afterEach(() => {
    if (mockNext.mock.calls.length > 0) {
      console.log('mockNext called with error:', mockNext.mock.calls[0][0]);
    }
  });

  test('createAiGame - creates vs computer session and seeds state', async () => {
    Game.create.mockResolvedValue({
      gameId: 'g123',
      roomCode: 'RMC123',
      hostUserId: 'test_user_mongodb_id',
      players: [
        { seat: 0, userId: 'test_user_mongodb_id', isBot: false },
        { seat: 1, userId: 'ai_bot_id', isBot: true },
      ],
      settings: { mode: 'vs_computer' },
    });

    const req = { body: { difficulty: 'hard' } };
    await createAiGame(req, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalled();
    const data = mockRes.json.mock.calls[0][0].data;
    expect(data.gameId).toBeDefined();
    expect(data.playerId).toBe('test_user_mongodb_id');
    expect(data.aiPlayer.isBot).toBe(true);

    const savedStateRaw = mockStateStore[`game:${data.gameId}:state`];
    expect(savedStateRaw).toBeDefined();
    const savedState = JSON.parse(savedStateRaw);
    expect(savedState.players[0].seat).toBe(0);
    expect(savedState.players[1].isBot).toBe(true);
    expect(savedState.players[1].botDifficulty).toBe('hard');
  });

  test('rollDice - stores rolled values in state.tempDice', async () => {
    const gameId = 'g123';
    const state = {
      gameId,
      status: 'active',
      phase: 'roll',
      currentTurnSeat: 0,
      players: [
        { seat: 0, userId: 'test_user_mongodb_id', providerId: 'test_clerk_id', isBot: false },
        { seat: 1, isBot: true },
      ],
    };
    mockStateStore[`game:${gameId}:state`] = JSON.stringify(state);

    const req = { body: { gameId } };
    await rollDice(req, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const result = mockRes.json.mock.calls[0][0].data;
    expect(result.roll).toHaveLength(2);
    expect(result.roll[0]).toBeGreaterThanOrEqual(1);
    expect(result.roll[0]).toBeLessThanOrEqual(6);

    const savedState = JSON.parse(mockStateStore[`game:${gameId}:state`]);
    expect(savedState.tempDice).toEqual(result.roll);
  });

  test('movePlayer - uses tempDice to move player and processes rules', async () => {
    const gameId = 'g123';
    const state = {
      gameId,
      status: 'active',
      phase: 'roll',
      currentTurnSeat: 0,
      players: [
        { seat: 0, userId: 'test_user_mongodb_id', providerId: 'test_clerk_id', balance: 1500, position: 0, isBot: false },
        { seat: 1, isBot: true },
      ],
      properties: {
        guwahati: { owner: null, houses: 0, mortgaged: false }
      },
      log: [],
    };
    // Pretend player rolled [1, 2] = 3
    state.tempDice = [1, 2];
    mockStateStore[`game:${gameId}:state`] = JSON.stringify(state);

    Move.create.mockResolvedValue({});

    const req = { body: { gameId } };
    await movePlayer(req, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const resultState = mockRes.json.mock.calls[0][0].data.state;
    // position 3 = Bhubaneshwar
    expect(resultState.players[0].position).toBe(3);
    expect(resultState.tempDice).toBeUndefined(); // cleared
    expect(Move.create).toHaveBeenCalled();
  });

  test('endTurn - ends turn and triggers AI loop synchronously', async () => {
    const gameId = 'g123';
    const state = {
      gameId,
      status: 'active',
      phase: 'manage',
      currentTurnSeat: 0, // human turn
      players: [
        { seat: 0, userId: 'test_user_mongodb_id', providerId: 'test_clerk_id', balance: 1500, position: 1, isBot: false },
        // AI medium player at Ludhiana (pos 11) with M1500
        { seat: 1, isBot: true, botDifficulty: 'medium', balance: 1500, position: 11, inJail: false },
      ],
      properties: {
        guwahati: { owner: null, houses: 0, mortgaged: false },
        bhubaneshwar: { owner: null, houses: 0, mortgaged: false },
        ludhiana: { owner: null, houses: 0, mortgaged: false },
        patna: { owner: null, houses: 0, mortgaged: false }
      },
      log: [],
      chanceDeck: [0, 1, 2],
      communityDeck: [0, 1, 2],
    };
    mockStateStore[`game:${gameId}:state`] = JSON.stringify(state);

    Move.create.mockResolvedValue({});

    const req = { body: { gameId } };
    await endTurn(req, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const resultState = mockRes.json.mock.calls[0][0].data.state;

    // Turn should have wrapped back to human (seat 0) because AI took its turn, rolled, moved, acted, and ended turn!
    expect(resultState.currentTurnSeat).toBe(0);
    expect(resultState.phase).toBe('roll');

    // Verify AI player is no longer at position 11
    expect(resultState.players[1].position).not.toBe(11);
    expect(Move.create).toHaveBeenCalled();
  });
});
