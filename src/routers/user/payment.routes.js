const express = require("express");
const paymentController = require("../../controllers/payment.controller");
const { clerkMiddleware, requireAuth } = require("@clerk/express");

const router = express.Router();

// Optional: You can apply Clerk requireAuth middleware here if payments require authentication
// router.use(requireAuth({ signInUrl: "/sign-in" }));

router.post("/create-order", paymentController.createOrder);
router.post("/verify-payment", paymentController.verifyPayment);

module.exports = router;
