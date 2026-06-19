'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TOKEN_COLORS, COLOR_CLASSES } from '@/lib/boardLayout';
import { SPACES } from '@/lib/boardData';
import { Bot, Lock, Star, Home, Building2, Train, Zap, ChevronDown, X } from 'lucide-react';
import clsx from 'clsx';
import PawnIcon from '@/components/ui/PawnIcon';
import Avatar from '@/components/ui/Avatar';

// Compact player card. Active turn = gold card active with border outline and glow; bankrupt =
// dimmed; bot/jail get small badges. When balance changes, a green/red
// floater chip drifts up out of the panel for ~1s and the balance number
// briefly pulses in the same color.
// Click to expand and see owned properties.
export default function PlayerPanel({ player, isCurrentTurn, properties }) {
  const tokenColor = TOKEN_COLORS[player.seat % TOKEN_COLORS.length];

  const [floaters, setFloaters] = useState([]);
  const [pulse, setPulse] = useState(null); // 'gain' | 'loss' | null
  const [expanded, setExpanded] = useState(false);
  const prevBalance = useRef(player.balance);

  useEffect(() => {
    const prev = prevBalance.current;
    const curr = player.balance;
    if (prev === curr) return;
    const delta = curr - prev;
    prevBalance.current = curr;

    const id = `${Date.now()}-${Math.random()}`;
    setFloaters((fs) => [...fs, { id, delta }]);
    setPulse(delta > 0 ? 'gain' : 'loss');

    const removeT = setTimeout(() => {
      setFloaters((fs) => fs.filter((f) => f.id !== id));
    }, 1100);
    const pulseT = setTimeout(() => setPulse(null), 700);

    return () => {
      clearTimeout(removeT);
      clearTimeout(pulseT);
    };
  }, [player.balance]);

  // Gather owned properties for this player
  const ownedProperties = properties
    ? Object.entries(properties)
        .filter(([, ps]) => ps.owner === player.seat)
        .map(([id, ps]) => {
          const space = SPACES.find(s => s.id === id);
          return space ? { id, space, ps } : null;
        })
        .filter(Boolean)
    : [];

  const balanceColor =
    pulse === 'gain' ? 'text-emerald-400 font-extrabold'
    : pulse === 'loss' ? 'text-red-400 font-extrabold'
    : 'text-[#cbb992]';

  const isDisconnected = player.isConnected === false && !player.isBankrupt;
  const isHost = player.seat === 0;

  return (
    <div className="relative">
      <div
        onClick={() => setExpanded((v) => !v)}
        className={clsx(
          'relative rounded-2xl gold-card transition-all duration-200 ease-out p-2.5 cursor-pointer select-none',
          player.isBankrupt
            ? 'opacity-40'
            : isCurrentTurn
              ? 'gold-card-active -translate-y-0.5'
              : isDisconnected
                ? 'opacity-60'
                : '',
        )}
      >
        {/* Floaters render absolutely above the card */}
        <AnimatePresence>
          {floaters.map(({ id, delta }) => (
            <motion.div
              key={id}
              initial={{ y: 0, opacity: 0, scale: 0.8 }}
              animate={{ y: -28, opacity: 1, scale: 1 }}
              exit={{ y: -52, opacity: 0, scale: 0.9 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
              className={clsx(
                'absolute right-3 top-2 z-20 px-2 py-0.5 rounded-md text-xs font-mono font-bold tabular-nums shadow-(--shadow-sm) pointer-events-none',
                delta > 0
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-red-950 text-red-400 border border-red-900',
              )}
            >
              {delta > 0 ? '+' : ''}₹{Math.abs(delta).toLocaleString()}
            </motion.div>
          ))}
        </AnimatePresence>

        <div className="flex items-center gap-3">
          {/* User profile circular photo/avatar */}
          <div className="relative shrink-0 flex items-center justify-center">
            <Avatar 
              src={player.avatarUrl} 
              name={player.displayName} 
              size="md" 
              className="border border-slate-700 shadow-md rounded-full w-8 h-8 object-cover" 
            />
            {player.isBot && (
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-white z-10">
                <Bot size={9} />
              </span>
            )}
            {isDisconnected && !player.isBot && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border border-slate-900 z-10" title="Disconnected" />
            )}
          </div>

          {/* Small pawn token next to avatar */}
          <div className="shrink-0 w-7 h-7 flex items-center justify-center">
            <PawnIcon color={tokenColor} className="w-7 h-7 drop-shadow-sm" />
          </div>

          {/* Name + balance */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-xs text-white truncate flex items-center gap-1.5">
              {player.displayName}
              {player.inJail && (
                <Lock size={11} className="text-red-400 shrink-0" />
              )}
            </p>
            <p
              className={clsx(
                'font-mono font-extrabold text-xs leading-tight transition-colors duration-300 ease-out',
                balanceColor,
              )}
            >
              ₹{player.balance.toLocaleString()}
            </p>
          </div>

          {/* Property count badge + expand chevron */}
          <div className="flex items-center gap-1 shrink-0">
            {ownedProperties.length > 0 && (
              <span className="bg-slate-900/80 text-[#cbb992] text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-slate-700 tabular-nums">
                {ownedProperties.length}
              </span>
            )}
            <ChevronDown
              size={14}
              className={clsx(
                'text-[#cbb992]/60 transition-transform duration-200',
                expanded && 'rotate-180',
              )}
            />
          </div>

          {/* Gold star on the right side if they are host */}
          {isHost && (
            <div className="shrink-0 text-yellow-400 p-1" title="Host">
              <Star size={16} fill="currentColor" className="drop-shadow-sm" />
            </div>
          )}
        </div>
      </div>

      {/* Expanded properties list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-1 rounded-xl bg-slate-950/80 border border-slate-800/60 backdrop-blur-sm p-2 max-h-48 overflow-y-auto scrollbar-thin">
              {ownedProperties.length === 0 ? (
                <p className="text-[10px] text-slate-500 text-center py-2">
                  No properties owned yet
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {ownedProperties.map(({ id, space, ps }) => (
                    <PropertyChip key={id} space={space} ps={ps} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact property row inside the expanded panel
export function PropertyChip({ space, ps }) {
  const colorBg = space.color ? COLOR_CLASSES[space.color] : null;

  const icon =
    space.type === 'railway' ? <Train size={10} className="text-slate-400 shrink-0" /> :
    space.type === 'utility' ? <Zap size={10} className="text-yellow-400 shrink-0" /> :
    ps.houses === 5 ? <Building2 size={10} className="text-red-400 shrink-0" fill="currentColor" /> :
    ps.houses > 0 ? <Home size={10} className="text-emerald-400 shrink-0" fill="currentColor" /> :
    null;

  return (
    <div
      className={clsx(
        'flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors',
        ps.mortgaged
          ? 'bg-slate-900/60 opacity-50'
          : 'bg-slate-900/40 hover:bg-slate-800/60',
      )}
    >
      {/* Color dot */}
      {colorBg ? (
        <div className={clsx('w-2 h-2 rounded-full shrink-0 ring-1 ring-white/10', colorBg)} />
      ) : (
        <div className="w-2 h-2 rounded-full shrink-0 bg-slate-600 ring-1 ring-white/10" />
      )}

      {/* Name */}
      <span className={clsx(
        'flex-1 text-[10px] font-semibold truncate',
        ps.mortgaged ? 'text-slate-500 line-through' : 'text-slate-200',
      )}>
        {space.name}
      </span>

      {/* Houses/Hotel icon */}
      {icon && <span className="shrink-0">{icon}</span>}

      {/* House count */}
      {space.type === 'property' && ps.houses > 0 && ps.houses < 5 && (
        <span className="text-[8px] font-bold text-emerald-400 tabular-nums shrink-0">
          ×{ps.houses}
        </span>
      )}
      {space.type === 'property' && ps.houses === 5 && (
        <span className="text-[8px] font-bold text-red-400 shrink-0">
          H
        </span>
      )}

      {/* Mortgaged badge */}
      {ps.mortgaged && (
        <span className="text-[7px] font-bold text-red-400 bg-red-950/60 px-1 py-0.5 rounded uppercase shrink-0">
          M
        </span>
      )}
    </div>
  );
}
