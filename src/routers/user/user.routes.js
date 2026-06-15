const express = require("express");
const router = express.Router();
const userController = require("../../controllers/user.controller");
const leaderboardController = require("../../controllers/leaderboard.controller");
const { requireAuth } = require("@clerk/express");

// All routes require authentication. Use Clerk's native requireAuth — it just
// verifies the JWT. User-doc creation is handled by getOrCreateUser inside
// each controller, so this middleware should NOT 404 on first-time users.
router.use(requireAuth());

// Get current user profile
router.get("/me", userController.getMyProfile);

// Update current user profile
router.patch("/me", userController.updateMyProfile);

// Get leaderboard
router.get("/leaderboard", leaderboardController.getLeaderboard);

module.exports = router;
