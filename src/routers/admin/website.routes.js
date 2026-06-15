const express = require("express");
const router = express.Router();
const websiteController = require("../../controllers/website.controller");
const { requireAuth } = require("../../middlewares/rbac_middleware");

// All routes require authentication
router.use(requireAuth(["admin", "moderator", "manager"]));

// Admin-only routes
router.get(
  "/",
  requireAuth(["admin", "moderator", "manager"]),
  websiteController.getAllWebsites
);
router.get(
  "/user/:clerkId",
  requireAuth(["admin", "moderator", "manager"]),
  websiteController.getWebsitesByClerkId
);

module.exports = router;
