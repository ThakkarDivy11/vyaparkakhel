const express = require("express");
const clerkWebhookController = require("../webhooks/clerk.webhook");
// const stripeWebhookController = require("../webhooks/stripe.webhook");

const razorpayWebhookController = require("../webhooks/razorpay.webhook");

const router = express.Router();

// Regular Clerk webhook route with JSON parsing
router.route("/clerk").get(clerkWebhookController).post(clerkWebhookController);

// Razorpay webhook route
router.post("/razorpay", razorpayWebhookController);

module.exports = router;
