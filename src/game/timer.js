const { Queue, Worker } = require('bullmq');
const { redis } = require('../services/redis/redisClient');

const connection = { host: process.env.REDIS_HOST || '127.0.0.1', port: parseInt(process.env.REDIS_PORT || '6379') };

const turnTimerQueue = new Queue('turn-timers', { connection });
const reconnectQueue = new Queue('reconnect-windows', { connection });

// BullMQ rejects job IDs containing ":" (Redis reserves it as a separator).
// Use hyphens instead.
const turnJobId = (gameId) => `turn-${gameId}`;
const reconnectJobId = (gameId, userId) => `reconnect-${gameId}-${userId}`;

// Called after every game action to reset the turn timer
async function resetTurnTimer(gameId, seat, durationMs) {
  const existing = await turnTimerQueue.getJob(turnJobId(gameId));
  if (existing) await existing.remove();
  await turnTimerQueue.add(
    'timeout',
    { gameId, seat },
    { jobId: turnJobId(gameId), delay: durationMs }
  );
}

async function cancelTurnTimer(gameId) {
  const job = await turnTimerQueue.getJob(turnJobId(gameId));
  if (job) await job.remove();
}

// Reconnect window: 5 minutes in prod, 60s in dev for faster iteration.
const RECONNECT_WINDOW_MS = process.env.NODE_ENV === 'production'
  ? 5 * 60 * 1000
  : 60 * 1000;

async function startReconnectWindow(gameId, userId) {
  // Idempotent — if there's already a reconnect job for this user, leave it alone
  const existing = await reconnectQueue.getJob(reconnectJobId(gameId, userId));
  if (existing) return;
  await reconnectQueue.add(
    'reconnect-expire',
    { gameId, userId },
    { jobId: reconnectJobId(gameId, userId), delay: RECONNECT_WINDOW_MS }
  );
}

async function cancelReconnectWindow(gameId, userId) {
  const job = await reconnectQueue.getJob(reconnectJobId(gameId, userId));
  if (job) await job.remove();
}

// Processors — call initTimerWorkers(io) from socketServer.js after io is created
function initTimerWorkers(io) {
  new Worker('turn-timers', async (job) => {
    const { gameId, seat } = job.data;
    const { processGameAction } = require('../services/realtime/socketServer');
    await processGameAction(io, gameId, { type: 'TIMEOUT', seat });
  }, { connection });

  new Worker('reconnect-windows', async (job) => {
    const { gameId, userId } = job.data;
    const { markPlayerAsBot } = require('../services/realtime/socketServer');
    await markPlayerAsBot(io, gameId, userId);
  }, { connection });
}

module.exports = { resetTurnTimer, cancelTurnTimer, startReconnectWindow, cancelReconnectWindow, initTimerWorkers };
