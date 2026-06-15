const express = require("express");
const router = express.Router();
const userController = require("../../controllers/user.controller");
const { requireAuth } = require("../../middlewares/rbac_middleware");

// Admin authentication required
router.use(requireAuth(["admin", "moderator", "manager"]));

// Get all users
router.get("/", userController.getAllUsers);

// Get user by ID
router.get("/:id", userController.getUser);

// Get user by clerkId
router.get("/clerk/:clerkId", userController.getUserByClerkId);

// Update user
router.patch("/:id", userController.updateUser);

// Update user by clerkId
router.patch("/clerk/:clerkId", userController.updateUserByClerkId);

// Delete user
router.delete("/:id", userController.deleteUser);

// Ban/unban user
router.patch("/:id/ban", userController.toggleUserBan);

// Update user role
router.patch("/:id/role", userController.updateUserRole);

// Update user subscription
router.patch("/:id/subscription", userController.updateUserSubscription);

module.exports = router;
