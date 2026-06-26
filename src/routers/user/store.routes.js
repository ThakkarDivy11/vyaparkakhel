const express = require("express");
const storeController = require("../../controllers/store.controller");

const router = express.Router();

// GET all active store items
router.get("/", storeController.getStoreItems);

// POST seed store items (Can be restricted to admin in the future)
router.post("/seed", storeController.seedStoreItems);

// GET cosmetics catalog
router.get("/cosmetics", storeController.getCosmeticsCatalog);

// POST buy cosmetic with gems
router.post("/buy-cosmetic", storeController.buyCosmetic);

module.exports = router;
