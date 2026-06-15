# vyaparkakhel.com — Business/Monopoly Multiplayer Game Backend

Node.js/Express backend for a real-time multiplayer Business (Monopoly-style) game.

## Stack
- **Runtime**: Node.js (CommonJS)
- **Framework**: Express 4
- **Database**: MongoDB via Mongoose
- **Auth**: Clerk (`@clerk/express`)
- **Realtime**: Socket.io (`/games` namespace)
- **Cache / Locks**: Redis via ioredis
- **Queue**: BullMQ
- **Validation**: Joi
- **Dev server**: `npm run dev` (nodemon)

## Project Layout
```
src/
  server.js          — entry point, starts HTTP + DB
  app.js             — Express app, middleware, routers
  config/            — env config
  controllers/       — route handlers (game, user, move, snapshot, audit, leaderboard)
  models/            — Mongoose schemas (Game, Move, Snapshot, Audit, User)
  routers/           — Express routers (admin/, user/, demo/, webhook)
  services/
    redis/           — Redis client + distributed lock helpers
    realtime/        — Socket.io server (socketServer.js)
  validators/        — Joi schemas
  middlewares/       — RBAC, request timing
  utils/             — error handling, response handler, API features
  webhooks/          — Clerk webhook handler
  data/              — static seed data (websites.json)
```

## Key Domain Concepts
- **Game**: created by a host, players join by gameId, status: waiting → active → finished
- **Move**: append-only event log (seq number), persisted to MongoDB
- **Snapshot**: periodic game-state snapshots for fast client rehydration
- **Distributed lock**: Redis-based per-game lock before processing any move

## Skills

# graphify
- **graphify** — any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, invoke the Skill tool with `skill: "graphify"` before doing anything else.

# caveman
- **caveman** — ultra-compressed communication mode, ~75% fewer output tokens. Trigger: `/caveman`
When the user types `/caveman` (or says "caveman mode" / "talk like caveman"), invoke the Skill tool with `skill: "caveman"` before doing anything else.
