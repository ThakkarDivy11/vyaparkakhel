const express = require('express');
const { requireAuth } = require('@clerk/express');
const {
  createAiGame,
  rollDice,
  movePlayer,
  endTurn,
  getGame
} = require('../../controllers/expressGame.controller');

const router = express.Router();

const authMiddleware = process.env.NODE_ENV === 'test' ? (req, res, next) => next() : requireAuth();

router.use(authMiddleware);

router.post('/create-ai', createAiGame);
router.post('/roll-dice', rollDice);
router.post('/move', movePlayer);
router.post('/end-turn', endTurn);
router.get('/:gameId', getGame);

module.exports = router;
