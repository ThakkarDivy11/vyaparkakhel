"use client";

import React, { useState } from "react";
import RazorpayCheckout from "@/components/ui/RazorpayCheckout";

// Dummy store products
const STORE_PRODUCTS = [
  {
    id: "prod_tokens_100",
    name: "100 Game Tokens",
    description: "Boost your gameplay with 100 shiny gold tokens.",
    price: 99, // INR
    image: "/images/tokens.png", // Assuming an image might exist, or fallback
    tag: "POPULAR",
  },
  {
    id: "prod_vip_pass",
    name: "VIP Royal Pass",
    description: "Unlock exclusive avatars, dice skins, and ad-free experience for 30 days.",
    price: 499,
    image: "/images/vip.png",
    tag: "BEST VALUE",
  },
  {
    id: "prod_dice_gold",
    name: "Golden Dice Skin",
    description: "Roll in style with the exclusive 24k Golden Dice skin.",
    price: 149,
    image: "/images/dice.png",
    tag: "COSMETIC",
  },
];

export default function StorePage() {
  const [purchaseStatus, setPurchaseStatus] = useState(null); // { status: "success" | "error", message: string }

  return (
    <div className="dashboard-root min-h-screen p-8 flex flex-col items-center">
      {/* Header Section */}
      <div className="text-center mb-12" data-reveal>
        <div className="dash-logo inline-block mb-4">
          <h1>ROYAL BAZAAR</h1>
        </div>
        <p className="text-text-muted text-lg max-w-2xl mx-auto">
          Welcome to the Royal Bazaar. Purchase exclusive tokens, VIP passes, and premium cosmetics to enhance your empire.
        </p>
      </div>

      {/* Status Message */}
      {purchaseStatus && (
        <div
          className={`mb-8 p-4 rounded-lg border-2 ${
            purchaseStatus.status === "success"
              ? "bg-green-900/40 border-green-500 text-green-200"
              : "bg-red-900/40 border-red-500 text-red-200"
          }`}
          data-reveal
        >
          {purchaseStatus.message}
          <button
            onClick={() => setPurchaseStatus(null)}
            className="ml-4 underline text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
        {STORE_PRODUCTS.map((product, index) => (
          <div
            key={product.id}
            className="gold-card flex flex-col items-center p-6 relative group transition-transform duration-300 hover:scale-105"
            style={{ "--reveal-delay": `${index * 150}ms` }}
            data-reveal
          >
            {/* Tag */}
            {product.tag && (
              <div className="absolute -top-3 right-4 bg-gradient-to-r from-red-600 to-red-800 text-white text-[10px] font-black px-3 py-1 rounded-full border-2 border-[#d4a84b] shadow-[0_0_10px_rgba(255,0,0,0.5)] z-10">
                {product.tag}
              </div>
            )}

            {/* Image Placeholder (using a stylized div since we don't have actual images yet) */}
            <div className="w-32 h-32 mb-6 rounded-full gold-ornate-border flex items-center justify-center bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] relative overflow-hidden">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,168,75,0.2)_0%,transparent_70%)] animate-pulse-soft"></div>
               <span className="text-4xl text-[#d4a84b] font-cinzel font-black z-10 drop-shadow-[0_0_8px_rgba(212,168,75,0.6)]">
                 {product.name.charAt(0)}
               </span>
            </div>

            {/* Details */}
            <h2 className="text-xl font-black text-center mb-2 font-cinzel tracking-wider text-[#ffd54f] drop-shadow-md">
              {product.name}
            </h2>
            <p className="text-sm text-center text-[#cbb992] mb-6 flex-grow">
              {product.description}
            </p>

            {/* Price Tag */}
            <div className="text-2xl font-black text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              ₹{product.price}
            </div>

            {/* Razorpay Integration */}
            <div className="w-full">
              <RazorpayCheckout
                amount={product.price}
                currency="INR"
                receipt={`rcpt_${product.id}_${Date.now()}`}
                buttonText={`Buy for ₹${product.price}`}
                buttonClassName="glossy-btn glossy-btn-gold w-full py-3 text-lg"
                onSuccess={(data) => {
                  setPurchaseStatus({
                    status: "success",
                    message: `Successfully purchased ${product.name}! Order ID: ${data.razorpay_order_id}`,
                  });
                }}
                onFailure={(err) => {
                  setPurchaseStatus({
                    status: "error",
                    message: `Payment failed for ${product.name}. Please try again.`,
                  });
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
