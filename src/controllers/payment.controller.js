const Razorpay = require("razorpay");
const crypto = require("crypto");
const AppError = require("../utils/app_error");

// Initialize Razorpay instance (using env variables)
const getRazorpayInstance = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new AppError("Razorpay keys are not configured", 500);
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

/**
 * Creates an order in Razorpay
 * Expects amount and currency in req.body
 */
exports.createOrder = async (req, res, next) => {
  try {
    const { amount, currency = "INR", receipt } = req.body;

    if (!amount) {
      return next(new AppError("Amount is required", 400));
    }

    const instance = getRazorpayInstance();

    const options = {
      amount: amount * 100, // amount in the smallest currency unit (e.g., paise for INR)
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
    };

    const order = await instance.orders.create(options);

    if (!order) {
      return next(new AppError("Failed to create Razorpay order", 500));
    }

    res.status(200).json({
      status: "success",
      data: {
        order,
      },
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return next(new AppError("Error creating order", 500));
  }
};

/**
 * Verifies the payment signature returned by Razorpay
 */
exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return next(new AppError("Missing Razorpay payment details", 400));
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;

    // Create expected signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Payment is successful
      // You can save the transaction to the database here
      
      res.status(200).json({
        status: "success",
        message: "Payment verified successfully",
        data: {
          razorpay_payment_id,
          razorpay_order_id,
        },
      });
    } else {
      return next(new AppError("Invalid payment signature", 400));
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    return next(new AppError("Error verifying payment", 500));
  }
};
