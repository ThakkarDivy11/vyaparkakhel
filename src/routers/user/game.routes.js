const express = require('express');
const { requireAuth } = require('@clerk/express');
const {
  createGame,
  joinGame,
  startGame,
  getGame,
  getGameByCode,
  getHistory,
  finalizeGame,
  getMyGames,
} = require('../../controllers/game.controller');

const router = express.Router();

router.use(requireAuth());

router.post('/',                  createGame);
router.get('/my-games',           getMyGames);
router.get('/code/:code',         getGameByCode);
router.get('/:gameId',            getGame);
router.post('/:gameId/join',      joinGame);
router.post('/:gameId/start',     startGame);
router.get('/:gameId/history',    getHistory);
router.post('/:gameId/finalize',  finalizeGame);

module.exports = router;
