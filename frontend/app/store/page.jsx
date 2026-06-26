"use client";

import React, { useState, useEffect } from "react";
import RazorpayCheckout from "@/components/ui/RazorpayCheckout";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function StorePage() {
  const { user } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("bazaar"); // "bazaar" or "cosmetics"
  
  const [products, setProducts] = useState([]);
  const [cosmetics, setCosmetics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [purchaseStatus, setPurchaseStatus] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resProducts, resCosmetics] = await Promise.all([
          fetch("http://localhost:5000/api/v1/store"),
          fetch("http://localhost:5000/api/v1/store/cosmetics")
        ]);

        if (!resProducts.ok || !resCosmetics.ok) throw new Error("Failed to fetch store data");
        
        const jsonProducts = await resProducts.json();
        const jsonCosmetics = await resCosmetics.json();
        
        if (jsonProducts.status === "success") {
          setProducts(jsonProducts.data.items);
        }
        if (jsonCosmetics.status === "success") {
          // Convert cosmetics object to array
          const cosObj = jsonCosmetics.data.items;
          const cosArr = Object.keys(cosObj).map(key => ({
            itemId: key,
            ...cosObj[key]
          }));
          setCosmetics(cosArr);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleBuyCosmetic = async (itemId, itemName) => {
    if (!user) {
      setPurchaseStatus({ status: "error", message: "Please log in first!" });
      return;
    }
    try {
      const res = await fetch("http://localhost:5000/api/v1/store/buy-cosmetic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, userId: user.id })
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setPurchaseStatus({ status: "success", message: data.message });
      } else {
        setPurchaseStatus({ status: "error", message: data.message || "Failed to purchase" });
      }
    } catch (err) {
      setPurchaseStatus({ status: "error", message: "Network error occurred." });
    }
  };

  return (
    <div className="dashboard-root min-h-screen p-8 flex flex-col items-center">
      {/* Back Button */}
      <button 
        onClick={() => router.push('/')}
        className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-black/50 border border-[#d4a84b] rounded-full text-[#ffd54f] hover:bg-[#d4a84b]/20 transition-colors z-50 font-cinzel font-bold"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to Dashboard
      </button>
      <div className="text-center mb-8" data-reveal>
        <div className="dash-logo inline-block mb-4">
          <h1>ROYAL BAZAAR</h1>
        </div>
        <p className="text-text-muted text-lg max-w-2xl mx-auto">
          Welcome to the Royal Bazaar. Purchase exclusive tokens with real money, or spend your Gems on premium cosmetics!
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8">
        <button 
          className={`glossy-btn ${activeTab === 'bazaar' ? 'glossy-btn-gold' : 'bg-gray-800 text-gray-400'}`}
          onClick={() => setActiveTab('bazaar')}
        >
          💰 Buy Gems (INR)
        </button>
        <button 
          className={`glossy-btn ${activeTab === 'cosmetics' ? 'glossy-btn-gold' : 'bg-gray-800 text-gray-400'}`}
          onClick={() => setActiveTab('cosmetics')}
        >
          💎 Spend Gems
        </button>
      </div>

      {purchaseStatus && (
        <div
          className={`mb-8 p-4 rounded-lg border-2 ${
            purchaseStatus.status === "success"
              ? "bg-green-900/40 border-green-500 text-green-200"
              : "bg-red-900/40 border-red-500 text-red-200"
          }`}
        >
          {purchaseStatus.message}
          <button onClick={() => setPurchaseStatus(null)} className="ml-4 underline text-sm">Dismiss</button>
        </div>
      )}

      {loading && <p className="text-[#d4a84b] text-xl font-cinzel">Loading treasures...</p>}
      {error && <p className="text-red-400 text-xl font-cinzel">Error: {error}</p>}

      {!loading && !error && activeTab === "bazaar" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
          {products.map((product, index) => (
            <div key={product.itemId} className="gold-card flex flex-col items-center p-6 relative group transition-transform duration-300 hover:scale-105" style={{ "--reveal-delay": `${index * 150}ms` }} data-reveal>
              {product.tag && (
                <div className="absolute -top-3 right-4 bg-gradient-to-r from-red-600 to-red-800 text-white text-[10px] font-black px-3 py-1 rounded-full border-2 border-[#d4a84b] shadow-[0_0_10px_rgba(255,0,0,0.5)] z-10">
                  {product.tag}
                </div>
              )}
              <div className="w-32 h-32 mb-6 rounded-full gold-ornate-border flex items-center justify-center bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] relative overflow-hidden">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,168,75,0.2)_0%,transparent_70%)] animate-pulse-soft"></div>
                 <span className="text-4xl text-[#d4a84b] font-cinzel font-black z-10 drop-shadow-[0_0_8px_rgba(212,168,75,0.6)]">
                   {product.name.charAt(0)}
                 </span>
              </div>
              <h2 className="text-xl font-black text-center mb-2 font-cinzel tracking-wider text-[#ffd54f] drop-shadow-md">{product.name}</h2>
              <p className="text-sm text-center text-[#cbb992] mb-6 flex-grow">{product.description}</p>
              <div className="text-2xl font-black text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">₹{product.price}</div>
              <div className="w-full">
                <RazorpayCheckout
                  userId={user?.id}
                  itemId={product.itemId}
                  amount={product.price}
                  currency="INR"
                  receipt={`rcpt_${product.itemId}_${Date.now()}`}
                  buttonText={`Buy for ₹${product.price}`}
                  buttonClassName="glossy-btn glossy-btn-gold w-full py-3 text-lg"
                  onSuccess={(data) => setPurchaseStatus({ status: "success", message: `Successfully purchased ${product.name}!` })}
                  onFailure={(err) => setPurchaseStatus({ status: "error", message: `Payment failed for ${product.name}.` })}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && activeTab === "cosmetics" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
          {cosmetics.map((cosmetic, index) => (
            <div key={cosmetic.itemId} className="gold-card flex flex-col items-center p-6 relative group transition-transform duration-300 hover:scale-105" style={{ "--reveal-delay": `${index * 150}ms` }} data-reveal>
              <div className="w-32 h-32 mb-6 rounded-full gold-ornate-border flex items-center justify-center bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] relative overflow-hidden">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,168,75,0.2)_0%,transparent_70%)] animate-pulse-soft"></div>
                 {cosmetic.image ? (
                   <img src={cosmetic.image} alt={cosmetic.name} className="w-full h-full object-cover z-10 relative" style={{ borderRadius: '50%' }} />
                 ) : (
                   <span className="text-6xl z-10 drop-shadow-[0_0_8px_rgba(212,168,75,0.6)]">
                     {cosmetic.icon}
                   </span>
                 )}
              </div>
              <h2 className="text-xl font-black text-center mb-2 font-cinzel tracking-wider text-[#ffd54f] drop-shadow-md">{cosmetic.name}</h2>
              <p className="text-sm text-center text-[#cbb992] mb-6 flex-grow">{cosmetic.description}</p>
              <div className="text-2xl font-black text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center gap-2">
                💎 {cosmetic.price} Gems
              </div>
              <div className="w-full">
                <button
                  onClick={() => handleBuyCosmetic(cosmetic.itemId, cosmetic.name)}
                  className="glossy-btn glossy-btn-gold w-full py-3 text-lg"
                >
                  Unlock with Gems
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
