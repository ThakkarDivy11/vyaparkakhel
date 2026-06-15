'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const PIP_POSITIONS = {
  1: ['c'],
  2: ['tl', 'br'],
  3: ['tl', 'c', 'br'],
  4: ['tl', 'tr', 'bl', 'br'],
  5: ['tl', 'tr', 'c', 'bl', 'br'],
  6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br'],
};

const POS_TO_GRID = {
  tl: 'col-start-1 row-start-1',
  tr: 'col-start-3 row-start-1',
  ml: 'col-start-1 row-start-2',
  c:  'col-start-2 row-start-2',
  mr: 'col-start-3 row-start-2',
  bl: 'col-start-1 row-start-3',
  br: 'col-start-3 row-start-3',
};

function LoadingDie({ value, rotateClockwise }) {
  const pips = PIP_POSITIONS[value] || [];
  return (
    <motion.div
      animate={{ rotate: rotateClockwise ? 360 : -360 }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
      className="w-12 h-12 rounded-xl bg-surface border border-border shadow-md p-2 grid grid-cols-3 grid-rows-3 gap-0.5 select-none"
    >
      {pips.map((pos) => (
        <span
          key={pos}
          className={clsx(
            'w-1.5 h-1.5 rounded-full bg-alabaster-800 self-center justify-self-center',
            POS_TO_GRID[pos]
          )}
        />
      ))}
    </motion.div>
  );
}

/**
 * Premium loading screen with custom animated spinning dice + pulsing rings.
 * Use inside <PageBackground> for a full-screen centered loader.
 *
 * @param {string} [message] — optional text under the spinner
 */
export default function LoadingScreen({ message = 'Loading…' }) {
  const [val1, setVal1] = useState(1);
  const [val2, setVal2] = useState(6);

  useEffect(() => {
    const interval = setInterval(() => {
      setVal1(Math.floor(Math.random() * 6) + 1);
      setVal2(Math.floor(Math.random() * 6) + 1);
    }, 180);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      {/* Outer container for the rings + dice icon */}
      <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
        {/* Pulsing ring 1 — outermost, slowest */}
        <span className="loading-ring loading-ring--outer" />
        {/* Pulsing ring 2 — middle */}
        <span className="loading-ring loading-ring--mid" />
        {/* Pulsing ring 3 — innermost, fastest */}
        <span className="loading-ring loading-ring--inner" />

        {/* Floating container holding the two spinning dice */}
        <motion.div
          className="absolute flex gap-2.5 items-center justify-center z-10"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <LoadingDie value={val1} rotateClockwise={true} />
          <LoadingDie value={val2} rotateClockwise={false} />
        </motion.div>
      </div>

      {/* Message text */}
      <motion.p
        className="text-sm font-medium tracking-wide"
        style={{ color: 'rgba(250, 248, 241, 0.75)' }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {message}
      </motion.p>
    </div>
  );
}
