const express = require("express");
const router = express.Router();
const demoWebsiteController = require("../../controllers/demo/demo_websites.controller");

// Public demo routes (no authentication required)
router.get("/", demoWebsiteController.getAllDemoWebsites);
router.get("/stats", demoWebsiteController.getDemoWebsiteStats);
router.get("/:id", demoWebsiteController.getDemoWebsite);
router.get("/user/:clerkId", demoWebsiteController.getDemoWebsitesByClerkId);

// Simulated authenticated routes
router.get("/my/websites", demoWebsiteController.getMyDemoWebsites);
router.post("/", demoWebsiteController.createDemoWebsite);
router.patch("/:id", demoWebsiteController.updateDemoWebsite);
router.delete("/:id", demoWebsiteController.deleteDemoWebsite);

module.exports = router;
