// src/services/redis/matchmaking.js
const { v4: uuidv4 } = require("uuid");
const { redis } = require("./redisClient");
const Game = require("../../models/game.model");
const User = require("../../models/user.model");
const { createInitialState } = require("../../game/state");

const QUEUE_KEY = "matchmaking:queue";
const SOCKETS_KEY = "matchmaking:sockets";
const STATUS_PREFIX = "player:status:";

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Add a player to the matchmaking queue
 */
async function addToQueue(userId, socketId) {
  // Check if player is already in a game
  const status = await redis.get(`${STATUS_PREFIX}${userId}`);
  if (status && status.startsWith("in_game:")) {
    const gameId = status.split("in_game:")[1];
    const game = await Game.findOne({ gameId }, { status: 1 }).lean();
    if (!game || ['finished', 'cancelled'].includes(game.status) || process.env.NODE_ENV !== 'production') {
      // Game has ended or we are in local development testing, clear Redis status
      await redis.del(`${STATUS_PREFIX}${userId}`);
    } else {
      throw new Error("Already in an active game");
    }
  }

  // Add to Sorted Set with current timestamp as score
  await redis.zadd(QUEUE_KEY, Date.now(), userId);
  // Map userId to socketId
  await redis.hset(SOCKETS_KEY, userId, socketId);
  // Set player status to searching
  await redis.set(`${STATUS_PREFIX}${userId}`, "searching", "EX", 300); // 5 min timeout
}

/**
 * Remove a player from the matchmaking queue
 */
async function removeFromQueue(userId) {
  await redis.zrem(QUEUE_KEY, userId);
  await redis.hdel(SOCKETS_KEY, userId);
  
  const status = await redis.get(`${STATUS_PREFIX}${userId}`);
  if (status === "searching") {
    await redis.del(`${STATUS_PREFIX}${userId}`);
  }
}

/**
 * Process the queue and match players in pairs/groups
 */
async function checkAndMatch(io) {
  // Get all players in the queue sorted by waiting time
  const userIds = await redis.zrange(QUEUE_KEY, 0, -1);
  if (userIds.length < 2) return;

  // Take the oldest 2 players for a match
  const matchedUserIds = userIds.slice(0, 2);

  // Remove them from queue transactionally
  const multi = redis.multi();
  multi.zrem(QUEUE_KEY, ...matchedUserIds);
  // Get their sockets
  multi.hmget(SOCKETS_KEY, ...matchedUserIds);
  multi.hdel(SOCKETS_KEY, ...matchedUserIds);

  const results = await multi.exec();
  const socketIds = results[1][1]; // result of hmget

  try {
    // 1. Fetch user documents from MDB
    const users = await User.find({ providerId: { $in: matchedUserIds } });
    if (users.length < 2) {
      throw new Error("Could not find matching user profiles in database");
    }

    const gameId = uuidv4();
    let roomCode;
    let attempts = 0;
    while (attempts < 5) {
      roomCode = generateRoomCode();
      const existing = await Game.findOne({ roomCode });
      if (!existing) break;
      attempts++;
    }

    // 2. Create players array (automatically set seats and ready status)
    const players = matchedUserIds.map((providerId, idx) => {
      const u = users.find(user => user.providerId === providerId) || users[idx];
      return {
        userId: u._id,
        providerId: u.providerId,
        seat: idx,
        displayName: u.displayName || u.username || `Player ${idx + 1}`,
        avatarUrl: u.avatarUrl || null,
        balance: 1500,
        isReady: true,
      };
    });

    // 3. Create active game in MongoDB
    const game = await Game.create({
      gameId,
      roomCode,
      hostUserId: players[0].userId,
      players,
      status: "active",
      settings: {
        maxPlayers: 4,
        timePerTurnSec: 60,
        mode: "classic",
        allowTrading: true,
      },
      startedAt: new Date(),
    });

    // 4. Seed Redis game state
    const initialState = createInitialState(game, players);
    await redis.set(`game:${gameId}:state`, JSON.stringify(initialState));

    // 5. Update player statuses to in_game
    for (const providerId of matchedUserIds) {
      await redis.set(`${STATUS_PREFIX}${providerId}`, `in_game:${gameId}`, "EX", 86400); // 1 day
    }

    // 6. Notify both clients via socket
    socketIds.forEach((sid, idx) => {
      if (sid) {
        io.of('/games').to(sid).emit("match_found", {
          gameId,
          roomCode,
          seat: idx,
          players: players.map(p => ({
            displayName: p.displayName,
            avatarUrl: p.avatarUrl,
            seat: p.seat,
          })),
        });
      }
    });

    console.log(`[Matchmaker] Match created! GameId: ${gameId}, RoomCode: ${roomCode} for players: ${matchedUserIds.join(", ")}`);
  } catch (err) {
    console.error("[Matchmaker] Error creating match:", err.message);
    // Put players back in queue on failure
    for (let i = 0; i < matchedUserIds.length; i++) {
      if (socketIds[i]) {
        await redis.zadd(QUEUE_KEY, Date.now(), matchedUserIds[i]);
        await redis.hset(SOCKETS_KEY, matchedUserIds[i], socketIds[i]);
      }
    }
  }
}

module.exports = {
  addToQueue,
  removeFromQueue,
  checkAndMatch,
};
