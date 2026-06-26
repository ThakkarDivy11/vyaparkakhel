const StoreItem = require("../models/store.model");
const catchAsync = require("../utils/catch_async");
const AppError = require("../utils/app_error");

// Get all active store items
exports.getStoreItems = catchAsync(async (req, res, next) => {
  const items = await StoreItem.find({ isActive: true }).sort({ price: 1 });

  res.status(200).json({
    status: "success",
    results: items.length,
    data: {
      items,
    },
  });
});

// Seed store items (Utility endpoint to populate initial dummy data)
exports.seedStoreItems = catchAsync(async (req, res, next) => {
  const STORE_PRODUCTS = [
    {
      itemId: "prod_tokens_100",
      name: "100 Game Tokens",
      description: "Boost your gameplay with 100 shiny gold tokens.",
      price: 99,
      image: "/images/tokens.png",
      tag: "POPULAR",
    },
    {
      itemId: "prod_vip_pass",
      name: "VIP Royal Pass",
      description: "Unlock exclusive avatars, dice skins, and ad-free experience for 30 days.",
      price: 499,
      image: "/images/vip.png",
      tag: "BEST VALUE",
    },
    {
      itemId: "prod_dice_gold",
      name: "Golden Dice Skin",
      description: "Roll in style with the exclusive 24k Golden Dice skin.",
      price: 149,
      image: "/images/dice.png",
      tag: "COSMETIC",
    },
  ];

  // Upsert each product so it creates or updates them without duplicating
  const operations = STORE_PRODUCTS.map((product) => ({
    updateOne: {
      filter: { itemId: product.itemId },
      update: { $set: product },
      upsert: true,
    },
  }));

  await StoreItem.bulkWrite(operations);

  res.status(200).json({
    status: "success",
    message: "Store items seeded successfully!",
  });
});

const User = require("../models/user.model");

const GEMS_COSMETICS = {
  "golden_dice": { name: "Golden Dice Theme", price: 50, description: "Roll with a pure 24k gold dice.", image: "/images/cosmetics/golden_dice.png" },
  "diamond_pawn": { name: "Diamond Pawn Piece", price: 100, description: "Show off with a diamond pawn on the board.", image: "/images/cosmetics/diamond_pawn.png" },
  "vip_border": { name: "VIP Avatar Border", price: 200, description: "Get a glowing VIP border around your avatar.", image: "/images/cosmetics/vip_border.png" }
};

exports.getCosmeticsCatalog = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: "success",
    data: { items: GEMS_COSMETICS }
  });
});

exports.buyCosmetic = catchAsync(async (req, res, next) => {
  const { itemId, userId } = req.body;
  if (!itemId || !GEMS_COSMETICS[itemId]) {
    return next(new AppError("Invalid cosmetic item ID", 400));
  }
  
  if (!userId) {
    return next(new AppError("User ID is required", 400));
  }

  const user = await User.findOne({ providerId: userId });
  if (!user) return next(new AppError("User not found", 404));

  const item = GEMS_COSMETICS[itemId];

  if (user.wallet.cosmetics.includes(itemId)) {
    return next(new AppError("You already own this item!", 400));
  }

  if (user.wallet.tokens < item.price) {
    return next(new AppError("Not enough Gems!", 400));
  }

  // Deduct tokens and add cosmetic
  user.wallet.tokens -= item.price;
  user.wallet.cosmetics.push(itemId);
  await user.save();

  res.status(200).json({
    status: "success",
    message: `Successfully purchased ${item.name}!`,
    data: {
      wallet: user.wallet
    }
  });
});
