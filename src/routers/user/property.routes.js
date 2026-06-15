const express = require('express');
const { requireAuth } = require('@clerk/express');
const { buyProperty } = require('../../controllers/property.controller');

const router = express.Router();

const authMiddleware = process.env.NODE_ENV === 'test' ? (req, res, next) => next() : requireAuth();

router.use(authMiddleware);

router.post('/buy', buyProperty);

module.exports = router;
