"use client";

import React, { useState } from "react";
import Script from "next/script";

export default function RazorpayCheckout({
  amount,
  currency = "INR",
  receipt,
  onSuccess,
  onFailure,
  buttonText = "Pay Now",
  buttonClassName = "",
  userId,
  itemId,
}) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);

    try {
      // 1. Create order on the backend
      const orderRes = await fetch("http://localhost:5000/api/v1/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency,
          receipt,
          userId,
          itemId
        }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.data?.order) {
        throw new Error(orderData.message || "Failed to create order");
      }

      const { order } = orderData.data;

      // 2. Initialize Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Use public env for key
        amount: order.amount,
        currency: order.currency,
        name: "Vyapar Kakhel",
        description: "Test Transaction",
        // image: "/logo.png", // add logo if available
        order_id: order.id,
        handler: async function (response) {
          // 3. Verify Payment on Backend
          try {
            const verifyRes = await fetch("http://localhost:5000/api/v1/payments/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.status === "success") {
              if (onSuccess) onSuccess(verifyData.data);
            } else {
              throw new Error(verifyData.message || "Payment verification failed");
            }
          } catch (error) {
            console.error(error);
            if (onFailure) onFailure(error);
          }
        },
        prefill: {
          name: "John Doe", // You can pass actual user details here
          email: "john@example.com",
          contact: "9999999999",
        },
        theme: {
          color: "#3399cc",
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", function (response) {
        if (onFailure) onFailure(response.error);
      });

      rzp.open();
    } catch (error) {
      console.error("Payment initialization failed:", error);
      if (onFailure) onFailure(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      <button
        onClick={handlePayment}
        disabled={loading}
        className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50 ${buttonClassName}`}
      >
        {loading ? "Processing..." : buttonText}
      </button>
    </>
  );
}
