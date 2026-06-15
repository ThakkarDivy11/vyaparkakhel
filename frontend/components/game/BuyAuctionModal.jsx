'use client';
import { Home, Building2, Ticket } from 'lucide-react';
import Modal from '@/components/ui/Modal';

const COLOR_MAPS = {
  brown:      { bg: 'bg-amber-900', border: 'border-amber-950', text: 'text-white' },
  light_blue: { bg: 'bg-sky-300', border: 'border-sky-400', text: 'text-slate-800' },
  pink:       { bg: 'bg-pink-500', border: 'border-pink-600', text: 'text-white' },
  orange:     { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-white' },
  red:        { bg: 'bg-red-500', border: 'border-red-600', text: 'text-white' },
  yellow:     { bg: 'bg-yellow-400', border: 'border-yellow-500', text: 'text-slate-800' },
  green:      { bg: 'bg-green-500', border: 'border-green-600', text: 'text-white' },
  dark_blue:  { bg: 'bg-blue-800', border: 'border-blue-950', text: 'text-white' },
};

function Card({ space }) {
  const isProperty = space.type === 'property';
  const isRailway = space.type === 'railway';
  const isUtility = space.type === 'utility';

  const map = COLOR_MAPS[space.color] || { bg: 'bg-slate-700', border: 'border-slate-800', text: 'text-white' };
  
  let borderColor = map.border;
  let headerBg = map.bg;
  let headerText = map.text;

  if (isRailway) {
    borderColor = 'border-slate-700';
    headerBg = 'bg-slate-800';
    headerText = 'text-white';
  } else if (isUtility) {
    borderColor = 'border-stone-600';
    headerBg = 'bg-stone-200';
    headerText = 'text-slate-800';
  }

  return (
    <div className={`w-full max-w-[280px] bg-[#FFFDF6] border-[4px] ${borderColor} rounded-xl overflow-hidden shadow-md p-1 shrink-0`}>
      <div className={`border-2 ${borderColor} rounded-lg overflow-hidden h-full flex flex-col`}>
        {/* Title Header */}
        <div className={`${headerBg} ${headerText} text-center py-3 px-2 border-b-2 ${borderColor}`}>
          <h4 className="text-lg font-black tracking-widest uppercase truncate">{space.name}</h4>
        </div>

        {/* Content Section */}
        <div className="flex-1 p-3 flex flex-col items-center justify-between text-center min-h-[220px]">
          {isProperty && (
            <>
              <div>
                <div className="text-xl font-extrabold text-slate-700 tracking-wide">
                  RENT ₹ {space.rent?.[0] ?? 0}
                </div>
                <p className="text-[8px] font-bold text-slate-500 px-2 mt-1 leading-tight uppercase">
                  Rent is doubled on owning all unimproved sites in the group.
                </p>
              </div>

              <div className="w-full flex flex-col gap-1.5 my-3 text-[11px] font-bold text-slate-600 px-2">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-0.5"><Home size={14} className="text-emerald-500 fill-emerald-500" /></span>
                  <span className="font-mono text-[12px]">₹ {space.rent?.[1] ?? 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-0.5"><Home size={14} className="text-emerald-500 fill-emerald-500" /><Home size={14} className="text-emerald-500 fill-emerald-500" /></span>
                  <span className="font-mono text-[12px]">₹ {space.rent?.[2] ?? 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-0.5"><Home size={14} className="text-emerald-500 fill-emerald-500" /><Home size={14} className="text-emerald-500 fill-emerald-500" /><Home size={14} className="text-emerald-500 fill-emerald-500" /></span>
                  <span className="font-mono text-[12px]">₹ {space.rent?.[3] ?? 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-0.5"><Home size={14} className="text-emerald-500 fill-emerald-500" /><Home size={14} className="text-emerald-500 fill-emerald-500" /><Home size={14} className="text-emerald-500 fill-emerald-500" /><Home size={14} className="text-emerald-500 fill-emerald-500" /></span>
                  <span className="font-mono text-[12px]">₹ {space.rent?.[4] ?? 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-0.5"><Building2 size={16} className="text-red-500 fill-red-500" /></span>
                  <span className="font-mono text-[12px]">₹ {space.rent?.[5] ?? 0}</span>
                </div>
              </div>

              <div className="w-full border-t border-slate-200 pt-2">
                <div className="text-[9px] font-bold text-slate-500 uppercase">
                  Construction ₹ {space.houseCost} each
                </div>
                <div className="text-[14px] font-extrabold text-slate-700 mt-0.5">
                  Mortgage ₹ {space.mortgage}
                </div>
              </div>
            </>
          )}

          {isRailway && (
            <>
              <div className="mb-2">
                <Ticket size={28} className="text-slate-600 mx-auto" />
              </div>
              <div className="w-full flex flex-col gap-1 text-[11px] font-bold text-slate-600">
                <div className="flex justify-between">
                  <span>Rent</span>
                  <span>₹ 25</span>
                </div>
                <div className="flex justify-between">
                  <span>If 2 stations owned</span>
                  <span>₹ 50</span>
                </div>
                <div className="flex justify-between">
                  <span>If 3 stations owned</span>
                  <span>₹ 100</span>
                </div>
                <div className="flex justify-between">
                  <span>If 4 stations owned</span>
                  <span>₹ 200</span>
                </div>
              </div>
              <div className="w-full border-t border-slate-200 pt-2 mt-4 text-[14px] font-extrabold text-slate-700">
                Mortgage ₹ {space.mortgage}
              </div>
            </>
          )}

          {isUtility && (
            <>
              <div className="text-[10px] text-slate-600 font-semibold space-y-2 py-2 text-left leading-normal">
                <p>If one Utility is owned, rent is <strong className="text-slate-900 font-extrabold">4 times</strong> amount shown on dice.</p>
                <p>If both Utilities are owned, rent is <strong className="text-slate-900 font-extrabold">10 times</strong> amount shown on dice.</p>
              </div>
              <div className="w-full border-t border-slate-200 pt-2 mt-4 text-[14px] font-extrabold text-slate-700">
                Mortgage ₹ {space.mortgage}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BuyAuctionModal({ open, space, myPlayer, onBuy, onDecline }) {
  if (!open || !space) return null;

  const price = space.price ?? 0;
  const canAfford = myPlayer && myPlayer.balance >= price;

  return (
    <Modal open={open} onClose={onDecline} title={null} size="lg" closeOnBackdrop={false}>
      <div className="-mx-6 -my-6 bg-gradient-to-b from-[#FFA726] to-[#FB8C00] border-[6px] border-[#D35400] rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-b from-[#F26E22] to-[#D35400] text-center py-4 border-b-[4px] border-[#D35400] shrink-0">
          <h2 className="text-3xl font-black text-white uppercase tracking-widest drop-shadow-md" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            FOR SALE
          </h2>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col md:flex-row items-center justify-center gap-8">
          {/* Left: Card */}
          <Card space={space} />

          {/* Right: Actions */}
          <div className="flex flex-col items-center justify-between py-2 gap-6 flex-1 min-w-[200px]">
            {/* Price Tag */}
            <div className="text-center">
              <span className="text-2xl font-black text-slate-800 uppercase tracking-wide" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.6)' }}>
                FOR
              </span>
              <h3 className="text-5xl font-black text-[#00C853] mt-1 drop-shadow-sm font-sans tracking-wide">
                ₹{price}
              </h3>
            </div>

            {/* Buttons */}
            <div className="w-full flex flex-col gap-4">
              {/* BUY Button */}
              <button
                disabled={!canAfford}
                onClick={onBuy}
                className={`w-full text-white font-black text-2xl tracking-widest py-3 px-6 rounded-2xl transition-all flex items-center justify-center shadow-lg
                  ${canAfford
                    ? 'bg-gradient-to-b from-[#00E676] to-[#00C853] hover:from-[#00F076] hover:to-[#00D853] border-b-[6px] border-[#009624] active:border-b-0 active:translate-y-[6px] active:mb-[6px]'
                    : 'bg-gray-400 border-b-[6px] border-gray-600 opacity-60 cursor-not-allowed'
                  }`}
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}
              >
                BUY
              </button>

              {/* AUCTION Button */}
              <button
                onClick={onDecline}
                className="w-full bg-gradient-to-b from-[#FF1744] to-[#D50000] hover:from-[#FF3044] hover:to-[#E50000] text-white font-black text-2xl tracking-widest py-3 px-6 rounded-2xl border-b-[6px] border-[#9B0000] active:border-b-0 active:translate-y-[6px] active:mb-[6px] transition-all flex items-center justify-center shadow-lg"
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}
              >
                AUCTION
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
