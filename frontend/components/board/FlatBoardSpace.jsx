'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { COLOR_CLASSES, TOKEN_COLORS } from '@/lib/boardLayout';
import {
  ArrowLeft, Lock, ParkingCircle, AlertTriangle,
  Train, Lightbulb, Droplets, HelpCircle, Gift, Receipt,
  Megaphone, Percent
} from 'lucide-react';

// Little flag/banner tag pointing towards the center of the board to represent property ownership.
// Replaces the basic corner dot to match the premium board game look.
function OwnerTag({ ownerSeat, direction }) {
  if (ownerSeat === null || ownerSeat === undefined) return null;
  const color = TOKEN_COLORS[ownerSeat % TOKEN_COLORS.length];
  const sizeClass = (direction === 'left' || direction === 'right') ? 'w-6 h-5' : 'w-5 h-6';
  
  let positionStyle = {};
  if (direction === 'bottom') {
    positionStyle = { top: '-4px', left: '50%', transform: 'translateX(-50%)' };
  } else if (direction === 'top') {
    positionStyle = { bottom: '-4px', left: '50%', transform: 'translateX(-50%)' };
  } else if (direction === 'left') {
    positionStyle = { right: '-4px', top: '50%', transform: 'translateY(-50%)' };
  } else if (direction === 'right') {
    positionStyle = { left: '-4px', top: '50%', transform: 'translateY(-50%)' };
  }

  const path = (() => {
    if (direction === 'bottom') {
      return <path d="M 4 2 L 24 2 L 24 18 L 14 26 L 4 18 Z" fill={color} stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>;
    }
    if (direction === 'top') {
      return <path d="M 4 26 L 24 26 L 24 10 L 14 2 L 4 10 Z" fill={color} stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>;
    }
    if (direction === 'left') {
      return <path d="M 26 4 L 26 24 L 10 24 L 2 14 L 10 4 Z" fill={color} stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>;
    }
    if (direction === 'right') {
      return <path d="M 2 4 L 2 24 L 18 24 L 26 14 L 18 4 Z" fill={color} stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>;
    }
    return null;
  })();

  return (
    <motion.div
      key={ownerSeat}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 18 }}
      className={`absolute z-20 ${sizeClass}`}
      style={positionStyle}
    >
      <svg viewBox="0 0 28 28" className="w-full h-full drop-shadow-md">
        {path}
      </svg>
    </motion.div>
  );
}

export default function FlatBoardSpace({ space, propState, landedOn, myPlayerSeat }) {
  const colorBg = COLOR_CLASSES[space.color] ?? 'bg-stone-200';
  const ownerSeat = propState?.owner ?? null;
  const myOwned = ownerSeat !== null && ownerSeat === myPlayerSeat;

  // Houses pop in one-by-one; hotel replaces them
  const houseIcons = propState?.houses > 0 ? (
    <div className="flex gap-px justify-center mt-0.5">
      <AnimatePresence>
        {propState.houses < 5
          ? Array.from({ length: propState.houses }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: i * 0.04 }}
                className="w-1.5 h-1.5 bg-emerald-700 rounded-sm shadow-sm"
              />
            ))
          : (
              <motion.div
                key="hotel"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="w-3 h-2 bg-red-700 rounded-sm shadow-sm"
              />
            )
        }
      </AnimatePresence>
    </div>
  ) : null;

  // Mortgaged overlay flips in on X axis
  const mortgageOverlay = propState?.mortgaged ? (
    <motion.div
      className="absolute inset-0 bg-black/55 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0, rotateX: 90 }}
      animate={{ opacity: 1, rotateX: 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 20 }}
      style={{ transformOrigin: 'center top' }}
    >
      <span className="text-white text-[7px] font-black rotate-45 tracking-wide uppercase">Mortgaged</span>
    </motion.div>
  ) : null;

  // Saffron pulse ring when player just landed here
  const landedPulse = landedOn ? (
    <motion.div
      className="absolute inset-0 pointer-events-none z-30 border-2 border-saffron-400 rounded-[inherit]"
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.88, 1.04, 1.01, 1] }}
      transition={{ duration: 0.9, ease: 'easeOut' }}
    />
  ) : null;

  // Highlight ring: green for my properties, subtle warm for others'
  const highlightRing = ownerSeat !== null && !propState?.mortgaged ? (
    myOwned
      ? 'outline outline-1 outline-emerald-500'
      : 'outline outline-1 outline-amber-400/60'
  ) : '';

  const shellBase = `absolute inset-0 flex flex-col overflow-hidden border border-black/40 ${highlightRing}`;

  // Helper to determine orientation
  const orientation = (() => {
    const pos = space.pos;
    if (pos > 0 && pos < 10) return 'bottom';
    if (pos > 10 && pos < 20) return 'left';
    if (pos > 20 && pos < 30) return 'top';
    if (pos > 30 && pos <= 39) return 'right';
    return 'other';
  })();

  // Property card: colored band on the inner border + white body
  if (space.type === 'property') {
    const bodyBg = myOwned ? 'bg-emerald-50/60' : 'bg-white';
    
    if (orientation === 'bottom') {
      return (
        <div className={`${shellBase} ${bodyBg} flex flex-col`}>
          <div className={`${colorBg} h-6 w-full border-b border-black/30`} />
          <div className="flex-1 w-full relative overflow-hidden">
            {/* Rotated Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center rotate-[-90deg] whitespace-nowrap">
              <span className="font-extrabold text-[7px] text-gray-900 tabular-nums">₹{space.price}</span>
              <span className="font-black text-[6px] text-gray-800 uppercase tracking-tighter mt-0.5">{space.name}</span>
            </div>
            {/* Non-rotated Overlays */}
            <div className="absolute bottom-1 w-full flex justify-center z-10">
              {houseIcons}
            </div>
          </div>
          {mortgageOverlay}
          {landedPulse}
          <AnimatePresence>
            <OwnerTag ownerSeat={ownerSeat} direction="bottom" />
          </AnimatePresence>
        </div>
      );
    }
    
    if (orientation === 'top') {
      return (
        <div className={`${shellBase} ${bodyBg} flex flex-col`}>
          <div className="flex-1 w-full relative overflow-hidden">
            {/* Rotated Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center rotate-[-90deg] whitespace-nowrap">
              <span className="font-extrabold text-[7px] text-gray-900 tabular-nums">₹{space.price}</span>
              <span className="font-black text-[6px] text-gray-800 uppercase tracking-tighter mt-0.5">{space.name}</span>
            </div>
            {/* Non-rotated Overlays */}
            <div className="absolute bottom-4.5 w-full flex justify-center z-10">
              {houseIcons}
            </div>
          </div>
          <div className={`${colorBg} h-6 w-full border-t border-black/30`} />
          {mortgageOverlay}
          {landedPulse}
          <AnimatePresence>
            <OwnerTag ownerSeat={ownerSeat} direction="top" />
          </AnimatePresence>
        </div>
      );
    }
    
    if (orientation === 'left') {
      return (
        <div className={`${shellBase} ${bodyBg} flex flex-row`}>
          <div className="flex-1 h-full relative flex flex-col items-center justify-center p-1">
            <span className="font-extrabold text-[7px] text-gray-900 tabular-nums">₹{space.price}</span>
            <span className="font-black text-[6px] text-gray-800 uppercase tracking-tighter text-center leading-none mt-0.5 w-full px-0.5">
              {space.name}
            </span>
            <div className="absolute bottom-1 w-full flex justify-center pr-3 z-10">
              {houseIcons}
            </div>
          </div>
          <div className={`${colorBg} w-6 h-full border-l border-black/30`} />
          {mortgageOverlay}
          {landedPulse}
          <AnimatePresence>
            <OwnerTag ownerSeat={ownerSeat} direction="left" />
          </AnimatePresence>
        </div>
      );
    }
    
    if (orientation === 'right') {
      return (
        <div className={`${shellBase} ${bodyBg} flex flex-row`}>
          <div className={`${colorBg} w-6 h-full border-r border-black/30`} />
          <div className="flex-1 h-full relative flex flex-col items-center justify-center p-1">
            <span className="font-extrabold text-[7px] text-gray-900 tabular-nums">₹{space.price}</span>
            <span className="font-black text-[6px] text-gray-800 uppercase tracking-tighter text-center leading-none mt-0.5 w-full px-0.5">
              {space.name}
            </span>
            <div className="absolute bottom-1 w-full flex justify-center pl-3 z-10">
              {houseIcons}
            </div>
          </div>
          {mortgageOverlay}
          {landedPulse}
          <AnimatePresence>
            <OwnerTag ownerSeat={ownerSeat} direction="right" />
          </AnimatePresence>
        </div>
      );
    }
  }

  // Railway: white body with pink train icon
  if (space.type === 'railway') {
    let displayName = 'STATION';
    if (space.id === 'howrah_station') displayName = 'HOWRAH';
    if (space.id === 'delhi_station') displayName = 'DELHI';
    if (space.id === 'chennai_station') displayName = 'CHENNAI';
    if (space.id === 'mumbai_station') displayName = 'MUMBAI';

    if (orientation === 'bottom') {
      return (
        <div className={`${shellBase} bg-white text-gray-900 flex flex-col justify-between items-center py-1.5 h-full`}>
          <Train size={20} className="text-stone-800 stroke-[2.25] mt-0.5" />
          <div className="flex-1 w-full relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center rotate-[-90deg] whitespace-nowrap">
              <span className="font-extrabold text-[7px] text-gray-900 tabular-nums">₹{space.price}</span>
              <span className="font-black text-[6px] text-gray-800 uppercase tracking-tighter mt-0.5">{displayName} STN</span>
            </div>
          </div>
          {mortgageOverlay}
          {landedPulse}
          <AnimatePresence>
            <OwnerTag ownerSeat={ownerSeat} direction="bottom" />
          </AnimatePresence>
        </div>
      );
    }

    if (orientation === 'top') {
      return (
        <div className={`${shellBase} bg-white text-gray-900 flex flex-col justify-between items-center py-1.5 h-full`}>
          <div className="flex-1 w-full relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center rotate-[-90deg] whitespace-nowrap">
              <span className="font-extrabold text-[7px] text-gray-900 tabular-nums">₹{space.price}</span>
              <span className="font-black text-[6px] text-gray-800 uppercase tracking-tighter mt-0.5">{displayName} STN</span>
            </div>
          </div>
          <Train size={20} className="text-stone-800 stroke-[2.25] mb-0.5" />
          {mortgageOverlay}
          {landedPulse}
          <AnimatePresence>
            <OwnerTag ownerSeat={ownerSeat} direction="top" />
          </AnimatePresence>
        </div>
      );
    }

    if (orientation === 'left') {
      return (
        <div className={`${shellBase} bg-white text-gray-900 flex flex-row justify-between items-center px-1.5 w-full`}>
          <div className="flex-1 flex flex-col items-center justify-center">
            <span className="font-extrabold text-[7px] text-gray-900 tabular-nums">₹{space.price}</span>
            <span className="font-black text-[6px] text-gray-800 uppercase tracking-tighter mt-0.5 leading-none">{displayName} STN</span>
          </div>
          <Train size={20} className="text-stone-800 stroke-[2.25] mr-0.5" />
          {mortgageOverlay}
          {landedPulse}
          <AnimatePresence>
            <OwnerTag ownerSeat={ownerSeat} direction="left" />
          </AnimatePresence>
        </div>
      );
    }

    if (orientation === 'right') {
      return (
        <div className={`${shellBase} bg-white text-gray-900 flex flex-row justify-between items-center px-1.5 w-full`}>
          <Train size={20} className="text-stone-800 stroke-[2.25] ml-0.5" />
          <div className="flex-1 flex flex-col items-center justify-center">
            <span className="font-extrabold text-[7px] text-gray-900 tabular-nums">₹{space.price}</span>
            <span className="font-black text-[6px] text-gray-800 uppercase tracking-tighter mt-0.5 leading-none">{displayName} STN</span>
          </div>
          {mortgageOverlay}
          {landedPulse}
          <AnimatePresence>
            <OwnerTag ownerSeat={ownerSeat} direction="right" />
          </AnimatePresence>
        </div>
      );
    }
  }

  // Utility: white body with yellow bulb / blue faucet icon
  if (space.type === 'utility') {
    const isWater = space.id === 'water_works';
    const Icon = isWater ? Droplets : Lightbulb;
    const iconColor = isWater ? 'text-sky-500' : 'text-amber-500';
    const displayName = isWater ? 'WATER' : 'ELECTRIC';

    if (orientation === 'bottom') {
      return (
        <div className={`${shellBase} bg-white text-gray-900 flex flex-col justify-between items-center py-1.5 h-full`}>
          <Icon size={20} className={`${iconColor} stroke-[2.25] mt-0.5`} />
          <div className="flex-1 w-full relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center rotate-[-90deg] whitespace-nowrap">
              <span className="font-extrabold text-[7px] text-gray-900 tabular-nums">₹{space.price}</span>
              <span className="font-black text-[6px] text-gray-800 uppercase tracking-tighter mt-0.5">{displayName}</span>
            </div>
          </div>
          {mortgageOverlay}
          {landedPulse}
          <AnimatePresence>
            <OwnerTag ownerSeat={ownerSeat} direction="bottom" />
          </AnimatePresence>
        </div>
      );
    }

    if (orientation === 'top') {
      return (
        <div className={`${shellBase} bg-white text-gray-900 flex flex-col justify-between items-center py-1.5 h-full`}>
          <div className="flex-1 w-full relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center rotate-[-90deg] whitespace-nowrap">
              <span className="font-extrabold text-[7px] text-gray-900 tabular-nums">₹{space.price}</span>
              <span className="font-black text-[6px] text-gray-800 uppercase tracking-tighter mt-0.5">{displayName}</span>
            </div>
          </div>
          <Icon size={20} className={`${iconColor} stroke-[2.25] mb-0.5`} />
          {mortgageOverlay}
          {landedPulse}
          <AnimatePresence>
            <OwnerTag ownerSeat={ownerSeat} direction="top" />
          </AnimatePresence>
        </div>
      );
    }

    if (orientation === 'left') {
      return (
        <div className={`${shellBase} bg-white text-gray-900 flex flex-row justify-between items-center px-1.5 w-full`}>
          <div className="flex-1 flex flex-col items-center justify-center">
            <span className="font-extrabold text-[7px] text-gray-900 tabular-nums">₹{space.price}</span>
            <span className="font-black text-[6px] text-gray-800 uppercase tracking-tighter mt-0.5 leading-none">{displayName}</span>
          </div>
          <Icon size={20} className={`${iconColor} stroke-[2.25] mr-0.5`} />
          {mortgageOverlay}
          {landedPulse}
          <AnimatePresence>
            <OwnerTag ownerSeat={ownerSeat} direction="left" />
          </AnimatePresence>
        </div>
      );
    }

    if (orientation === 'right') {
      return (
        <div className={`${shellBase} bg-white text-gray-900 flex flex-row justify-between items-center px-1.5 w-full`}>
          <Icon size={20} className={`${iconColor} stroke-[2.25] ml-0.5`} />
          <div className="flex-1 flex flex-col items-center justify-center">
            <span className="font-extrabold text-[7px] text-gray-900 tabular-nums">₹{space.price}</span>
            <span className="font-black text-[6px] text-gray-800 uppercase tracking-tighter mt-0.5 leading-none">{displayName}</span>
          </div>
          {mortgageOverlay}
          {landedPulse}
          <AnimatePresence>
            <OwnerTag ownerSeat={ownerSeat} direction="right" />
          </AnimatePresence>
        </div>
      );
    }
  }

  // Tax: white with custom green money bag icon
  if (space.type === 'tax') {
    const moneyBagSvg = (
      <div className="w-7 h-7 text-emerald-600 flex items-center justify-center drop-shadow-sm my-0.5">
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="currentColor">
          <path d="M 50 32 C 44 32, 38 27, 40 15 C 45 18, 50 20, 50 20 C 50 20, 55 18, 60 15 C 62 27, 56 32, 50 32 Z" />
          <ellipse cx="50" cy="31" rx="12" ry="3.5" fill="#065f46" />
          <path d="M 50 32 C 30 32, 18 42, 18 67 C 18 86, 32 93, 50 93 C 68 93, 82 86, 82 67 C 82 42, 70 32, 50 32 Z" />
          <text x="50" y="70" fontSize="32" fontWeight="900" fill="white" textAnchor="middle" fontFamily="Arial, sans-serif">%</text>
        </svg>
      </div>
    );

    if (orientation === 'bottom') {
      return (
        <div className={`${shellBase} bg-white text-gray-900 flex flex-col justify-between items-center py-1.5 h-full`}>
          {moneyBagSvg}
          <div className="flex-1 w-full relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center rotate-[-90deg] whitespace-nowrap">
              <span className="font-black text-[7px] text-gray-800 uppercase tracking-tight">PAY ₹{space.amount}</span>
              <span className="font-black text-[6px] text-gray-600 uppercase tracking-tighter mt-0.5">{space.name}</span>
            </div>
          </div>
          {landedPulse}
        </div>
      );
    }

    if (orientation === 'top') {
      return (
        <div className={`${shellBase} bg-white text-gray-900 flex flex-col justify-between items-center py-1.5 h-full`}>
          <div className="flex-1 w-full relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center rotate-[-90deg] whitespace-nowrap">
              <span className="font-black text-[7px] text-gray-800 uppercase tracking-tight">PAY ₹{space.amount}</span>
              <span className="font-black text-[6px] text-gray-600 uppercase tracking-tighter mt-0.5">{space.name}</span>
            </div>
          </div>
          {moneyBagSvg}
          {landedPulse}
        </div>
      );
    }

    if (orientation === 'left') {
      return (
        <div className={`${shellBase} bg-white text-gray-900 flex flex-row justify-between items-center px-1.5 w-full`}>
          <div className="flex-1 flex flex-col items-center justify-center">
            <span className="font-black text-[7px] text-gray-800 uppercase tracking-tight leading-none">PAY ₹{space.amount}</span>
            <span className="font-black text-[6px] text-gray-600 uppercase tracking-tighter mt-0.5 leading-none">{space.name}</span>
          </div>
          {moneyBagSvg}
          {landedPulse}
        </div>
      );
    }

    if (orientation === 'right') {
      return (
        <div className={`${shellBase} bg-white text-gray-900 flex flex-row justify-between items-center px-1.5 w-full`}>
          {moneyBagSvg}
          <div className="flex-1 flex flex-col items-center justify-center">
            <span className="font-black text-[7px] text-gray-800 uppercase tracking-tight leading-none">PAY ₹{space.amount}</span>
            <span className="font-black text-[6px] text-gray-600 uppercase tracking-tighter mt-0.5 leading-none">{space.name}</span>
          </div>
          {landedPulse}
        </div>
      );
    }
  }

  // Chance: white with red megaphone
  if (space.type === 'chance') {
    if (orientation === 'bottom') {
      return (
        <div className={`${shellBase} bg-white text-gray-900 flex flex-col justify-between items-center py-1.5 h-full`}>
          <Megaphone size={22} className="text-red-500 -rotate-12 stroke-[2.25] mt-0.5" />
          <div className="flex-1 w-full relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center rotate-[-90deg] whitespace-nowrap">
              <span className="font-black text-[7px] text-gray-800 uppercase tracking-wider">CHANCE</span>
            </div>
          </div>
          {landedPulse}
        </div>
      );
    }

    if (orientation === 'top') {
      return (
        <div className={`${shellBase} bg-white text-gray-900 flex flex-col justify-between items-center py-1.5 h-full`}>
          <div className="flex-1 w-full relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center rotate-[-90deg] whitespace-nowrap">
              <span className="font-black text-[7px] text-gray-800 uppercase tracking-wider">CHANCE</span>
            </div>
          </div>
          <Megaphone size={22} className="text-red-500 -rotate-12 stroke-[2.25] mb-0.5" />
          {landedPulse}
        </div>
      );
    }

    if (orientation === 'left') {
      return (
        <div className={`${shellBase} bg-white text-gray-900 flex flex-row justify-between items-center px-1.5 w-full`}>
          <div className="flex-1 flex flex-col items-center justify-center">
            <span className="font-black text-[7px] text-gray-800 uppercase tracking-wider leading-none">CHANCE</span>
          </div>
          <Megaphone size={22} className="text-red-500 -rotate-12 stroke-[2.25] mr-0.5" />
          {landedPulse}
        </div>
      );
    }

    if (orientation === 'right') {
      return (
        <div className={`${shellBase} bg-white text-gray-900 flex flex-row justify-between items-center px-1.5 w-full`}>
          <Megaphone size={22} className="text-red-500 -rotate-12 stroke-[2.25] ml-0.5" />
          <div className="flex-1 flex flex-col items-center justify-center">
            <span className="font-black text-[7px] text-gray-800 uppercase tracking-wider leading-none">CHANCE</span>
          </div>
          {landedPulse}
        </div>
      );
    }
  }

  // Community Chest: white with blue gift/chest
  if (space.type === 'community_chest') {
    if (orientation === 'bottom') {
      return (
        <div className={`${shellBase} bg-white text-blue-600 flex flex-col justify-between items-center py-1.5 h-full`}>
          <Gift size={22} className="text-blue-500 mt-0.5 stroke-[2.25]" />
          <div className="flex-1 w-full relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center rotate-[-90deg] whitespace-nowrap">
              <span className="font-black text-[7px] text-blue-600 uppercase tracking-widest">CHEST</span>
            </div>
          </div>
          {landedPulse}
        </div>
      );
    }

    if (orientation === 'top') {
      return (
        <div className={`${shellBase} bg-white text-blue-600 flex flex-col justify-between items-center py-1.5 h-full`}>
          <div className="flex-1 w-full relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center rotate-[-90deg] whitespace-nowrap">
              <span className="font-black text-[7px] text-blue-600 uppercase tracking-widest">CHEST</span>
            </div>
          </div>
          <Gift size={22} className="text-blue-500 mb-0.5 stroke-[2.25]" />
          {landedPulse}
        </div>
      );
    }

    if (orientation === 'left') {
      return (
        <div className={`${shellBase} bg-white text-blue-600 flex flex-row justify-between items-center px-1.5 w-full`}>
          <div className="flex-1 flex flex-col items-center justify-center">
            <span className="font-black text-[7px] text-blue-600 uppercase tracking-widest leading-none">CHEST</span>
          </div>
          <Gift size={22} className="text-blue-500 mr-0.5 stroke-[2.25]" />
          {landedPulse}
        </div>
      );
    }

    if (orientation === 'right') {
      return (
        <div className={`${shellBase} bg-white text-blue-600 flex flex-row justify-between items-center px-1.5 w-full`}>
          <Gift size={22} className="text-blue-500 ml-0.5 stroke-[2.25]" />
          <div className="flex-1 flex flex-col items-center justify-center">
            <span className="font-black text-[7px] text-blue-600 uppercase tracking-widest leading-none">CHEST</span>
          </div>
          {landedPulse}
        </div>
      );
    }
  }

  // Corners
  if (space.type === 'go') {
    return (
      <div className={`${shellBase} bg-[#fdfbf7] text-gray-900 flex flex-col justify-between p-2`}>
        {/* GO text (top-left corner, rotated diagonally) */}
        <span className="absolute top-2 left-2 rotate-[-45deg] font-black text-[8px] text-gray-800 tracking-wider">
          GO
        </span>
        
        {/* Green diamond with white arrow in the center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 bg-[#16a34a] rotate-45 flex items-center justify-center shadow-md border border-[#15803d] z-10">
          {/* Arrow pointing left inside the diamond (rotated back by -45deg) */}
          <div className="rotate-[-45deg] w-full h-full flex items-center justify-center p-2.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full text-white">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 5 5 12 12 19" />
            </svg>
          </div>
        </div>
        
        {/* +₹200 text (bottom-right corner) */}
        <span className="absolute bottom-1.5 right-1.5 font-black text-[7px] text-red-600/90 tabular-nums flex items-center gap-0.5">
          <ArrowLeft className="w-3 h-3 stroke-[3]" /> +₹200
        </span>
        
        {landedPulse}
      </div>
    );
  }

  if (space.type === 'jail') {
    return (
      <div className={`${shellBase} bg-[#e9eff5] text-gray-900`}>
        {/* Outer L-shaped track: JUST VISITING on the left */}
        <div className="absolute left-0 top-0 w-[24%] h-full flex items-center justify-center">
          <span className="font-black text-[6px] text-gray-800 rotate-[-90deg] uppercase tracking-tight whitespace-nowrap">
            JUST VISITING
          </span>
        </div>
        
        {/* Inner square: JAIL / IN / red diamond with bars / divided diagonally */}
        <div className="absolute left-[24%] top-0 right-0 bottom-[24%] bg-white border-l border-b border-black/30 z-10 overflow-hidden">
          {/* Diagonal line */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <line x1="0" y1="0" x2="100" y2="100" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
          </svg>

          {/* JAIL text (bottom-left triangle) */}
          <span className="absolute bottom-1.5 left-2 rotate-[-45deg] font-black text-[7px] text-gray-800 tracking-wider">
            JAIL
          </span>
          
          {/* Red diamond cage (centered in the middle of the square) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-red-600 rotate-45 flex items-center justify-center shadow-md border border-white z-20">
            {/* Vertical jail bars inside diamond */}
            <div className="rotate-[-45deg] w-full h-full flex items-center justify-center p-1">
              <svg viewBox="0 0 100 100" className="w-full h-full text-white stroke-[10]" fill="none" stroke="currentColor">
                <line x1="20" y1="5" x2="20" y2="95" />
                <line x1="40" y1="5" x2="40" y2="95" />
                <line x1="60" y1="5" x2="60" y2="95" />
                <line x1="80" y1="5" x2="80" y2="95" />
                <line x1="5" y1="20" x2="95" y2="20" strokeWidth="6" />
                <line x1="5" y1="80" x2="95" y2="80" strokeWidth="6" />
              </svg>
            </div>
          </div>
          
          {/* IN text (top-right of cage) */}
          <span className="absolute top-1.5 right-2 rotate-[-45deg] font-black text-[7px] text-gray-800 tracking-wider">
            IN
          </span>
        </div>
        {landedPulse}
      </div>
    );
  }

  if (space.type === 'free_parking') {
    return (
      <div className={`${shellBase} bg-[#e9eff5] text-gray-900 flex flex-col justify-between p-2`}>
        {/* FREE text (top-left corner, rotated diagonally) */}
        <span className="absolute top-2.5 left-2 rotate-[-45deg] font-black text-[7px] text-gray-800 tracking-wider">
          FREE
        </span>
        
        {/* Blue diamond with white car in the center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 bg-[#1e40af] rotate-45 flex items-center justify-center shadow-md border border-[#1e3a8a] z-10">
          {/* Car pointing forward inside the diamond (rotated back by -45deg) */}
          <div className="rotate-[-45deg] w-full h-full flex items-center justify-center p-2.5">
            <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full text-white">
              {/* Windshield / Top of the car */}
              <path d="M 30 50 L 36 34 C 38 30, 62 30, 64 34 L 70 50 Z" />
              {/* Car body */}
              <rect x="22" y="48" width="56" height="22" rx="6" />
              {/* Wheels */}
              <rect x="28" y="68" width="10" height="8" rx="2" />
              <rect x="62" y="68" width="10" height="8" rx="2" />
              {/* Headlights (white circles) */}
              <circle cx="32" cy="59" r="4" fill="white" />
              <circle cx="68" cy="59" r="4" fill="white" />
              {/* Grille */}
              <rect x="42" y="56" width="16" height="4" rx="1" fill="none" stroke="white" strokeWidth="1.5" />
              {/* Bumper line */}
              <line x1="26" y1="65" x2="74" y2="65" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              {/* Light rays shining from headlights */}
              <line x1="20" y1="46" x2="11" y2="38" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="17" y1="53" x2="8" y2="50" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="18" y1="60" x2="8" y2="60" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="80" y1="46" x2="89" y2="38" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="83" y1="53" x2="92" y2="50" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="82" y1="60" x2="92" y2="60" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        
        {/* PARKING text (bottom-right corner, rotated diagonally) */}
        <span className="absolute bottom-2.5 right-1 rotate-[-45deg] font-black text-[7px] text-gray-800 tracking-wider">
          PARKING
        </span>
        
        {landedPulse}
      </div>
    );
  }

  if (space.type === 'go_to_jail') {
    return (
      <div className={`${shellBase} bg-[#e9eff5] text-gray-900 flex flex-col justify-between p-2`}>
        {/* GO TO text (top-right corner, rotated diagonally) */}
        <span className="absolute top-2.5 right-1.5 rotate-[45deg] font-black text-[7px] text-gray-800 tracking-wider">
          GO TO
        </span>
        
        {/* Slate diamond with white handcuffs in the center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 bg-slate-700 rotate-45 flex items-center justify-center shadow-md border border-slate-800 z-10">
          {/* Handcuffs inside the diamond (rotated back by -45deg) */}
          <div className="rotate-[-45deg] w-full h-full flex items-center justify-center p-2">
            <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" className="w-full h-full text-white">
              <circle cx="20" cy="42" r="11" />
              <circle cx="44" cy="42" r="11" />
              <path d="M 20 31 C 20 18, 44 18, 44 31" strokeWidth="4.5" fill="none" />
              <circle cx="26" cy="22" r="3" fill="currentColor" stroke="none" />
              <circle cx="38" cy="22" r="3" fill="currentColor" stroke="none" />
            </svg>
          </div>
        </div>
        
        {/* JAIL text (bottom-left corner, rotated diagonally) */}
        <span className="absolute bottom-2.5 left-2 rotate-[45deg] font-black text-[7px] text-gray-800 tracking-wider">
          JAIL
        </span>
        
        {landedPulse}
      </div>
    );
  }

  // Fallback
  return (
    <div className={`${shellBase} bg-stone-200 text-gray-900 flex items-center justify-center`}>
      <span className="text-[9px]">{space.name}</span>
    </div>
  );
}
