const express = require("express");
const clerkWebhookController = require("../webhooks/clerk.webhook");
// const stripeWebhookController = require("../webhooks/stripe.webhook");

const router = express.Router();

// Regular Clerk webhook route with JSON parsing
router.route("/clerk").get(clerkWebhookController).post(clerkWebhookController);

// Stripe webhook route with raw body parsing
// router.use(express.raw({ type: "application/json" }));
// router.route("/stripe").post(stripeWebhookController);

module.exports = router;
