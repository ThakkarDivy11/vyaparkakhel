const express = require("express");
const router = express.Router();
const websiteController = require("../../controllers/website.controller");
const {
  requireAuth,
  checkOwnership,
} = require("../../middlewares/rbac_middleware");
const Website = require("../../models/website.model");

// All routes require authentication
router.use(requireAuth());

// User routes
router.get("/my-websites", websiteController.getMyWebsites);
router.post("/", websiteController.createWebsite);

// Routes that need resource ownership check
router.get("/:id", checkOwnership(Website), websiteController.getWebsite);
router.patch("/:id", checkOwnership(Website), websiteController.updateWebsite);
router.delete("/:id", checkOwnership(Website), websiteController.deleteWebsite);

module.exports = router;
