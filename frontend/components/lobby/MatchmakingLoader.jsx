'use client';
import { motion } from 'framer-motion';

export default function MatchmakingLoader({ searchTime }) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-surface/90 border border-border/80 rounded-2xl shadow-2xl backdrop-blur-md max-w-sm w-full mx-auto">
      {/* Intricate Spinning Mandala */}
      <div className="relative w-36 h-36 flex items-center justify-center mb-6">
        {/* Outer pulsing ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-saffron-500/20"
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        />
        
        {/* Middle decorative spinning wheel */}
        <motion.div
          className="absolute w-28 h-28 rounded-full border-4 border-dashed border-saffron-500/40"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
        />

        {/* Inner fast spinning loader */}
        <motion.div
          className="absolute w-20 h-20 rounded-full border-t-4 border-r-4 border-saffron-600"
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
        />

        {/* Center glowing gem */}
        <div className="w-8 h-8 rounded-full bg-saffron-500 shadow-[0_0_15px_rgba(245,158,11,0.6)] flex items-center justify-center">
          <span className="text-[10px] text-white">🏆</span>
        </div>
      </div>

      <motion.h3
        className="text-xl font-bold text-saffron-500 text-center tracking-wide"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      >
        Finding Competitors
      </motion.h3>
      
      <p className="text-text-muted text-xs mt-1 text-center font-mono">
        Time Elapsed: <span className="text-text font-bold">{formatTime(searchTime)}</span>
      </p>

      {/* Indian/Monopoly theme matching tip box */}
      <div className="mt-6 p-3 bg-saffron-500/5 border border-saffron-500/10 rounded-xl w-full">
        <p className="text-[10px] text-saffron-600/90 text-center leading-relaxed">
          <strong>Tip:</strong> Control transportation hubs like Ludhiana Station to charge double fare when owning multiples!
        </p>
      </div>
    </div>
  );
}
