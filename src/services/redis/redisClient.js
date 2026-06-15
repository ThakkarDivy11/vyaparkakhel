// src/services/redis/redisClient.js
const Redis = require("ioredis");
const config = require("../../config/config");

const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

// simple lock helper using set NX + TTL
async function acquireLock(key, ttl = 5000) {
  const id = `${process.pid}-${Date.now()}-${Math.random()}`;
  const ok = await redis.set(key, id, "NX", "PX", ttl);
  return ok ? id : null;
}
async function releaseLock(key, id) {
  // safe release via lua script
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  return await redis.eval(script, 1, key, id);
}

module.exports = { redis, acquireLock, releaseLock };
