'use client';
import { useEffect, useRef, useState } from 'react';
import { Dice5 } from 'lucide-react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import clsx from 'clsx';
import { Button } from '@/components/ui';
import { playDiceRoll } from '@/lib/sound';

// Map dice face → pip layout positions (3x3 grid)
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

const ROLL_DURATION_MS = 700;
const ROLL_TICK_MS = 70; // how often we cycle random faces during the spin

function DieFace({ value, rotateDeg = 0 }) {
  const pips = value ? PIP_POSITIONS[value] : [];
  return (
    <motion.div
      animate={{ rotate: rotateDeg }}
      transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      className="w-10 h-10 rounded-lg bg-surface border border-border shadow-(--shadow-md) p-1 grid grid-cols-3 grid-rows-3 gap-0.5"
    >
      {value
        ? pips.map((pos) => (
            <span
              key={pos}
              className={clsx(
                'w-1.5 h-1.5 rounded-full bg-alabaster-800 self-center justify-self-center',
                POS_TO_GRID[pos],
              )}
            />
          ))
        : <Dice5 size={20} className="text-text-muted col-start-1 col-span-3 row-start-1 row-span-3 self-center justify-self-center" />}
    </motion.div>
  );
}

export default function Dice({ dice, isMyTurn, phase, onRoll }) {
  const canRoll = isMyTurn && phase === 'roll';
  const [d1, d2] = dice ?? [null, null];

  // When dice value changes, briefly show a "rolling" animation that cycles
  // random faces before settling on the real values. Triggers on every
  // change to `dice` (i.e. every server-broadcast roll).
  const prevKey = useRef(null);
  const [rolling, setRolling] = useState(false);
  const [tick, setTick] = useState([1, 1]);
  const [rotation, setRotation] = useState(0);
  const shakeControls = useAnimation();

  useEffect(() => {
    if (d1 == null || d2 == null) {
      prevKey.current = null;
      return;
    }
    const key = `${d1}-${d2}-${Date.now()}`;
    if (prevKey.current === key) return;
    prevKey.current = key;

    setRolling(true);
    setRotation((r) => r + 360);
    playDiceRoll();
    const interval = setInterval(() => {

      setTick([
        Math.ceil(Math.random() * 6),
        Math.ceil(Math.random() * 6),
      ]);
    }, ROLL_TICK_MS);
    const t = setTimeout(() => {
      clearInterval(interval);
      setRolling(false);
      shakeControls.start({
        x: [0, -3, 3, -2, 2, 0],
        transition: { duration: 0.15, ease: 'easeOut' },
      });
    }, ROLL_DURATION_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(t);
    };
  }, [d1, d2]);

  const showD1 = rolling ? tick[0] : d1;
  const showD2 = rolling ? tick[1] : d2;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.div animate={shakeControls} className="flex gap-2.5 items-center">
        <DieFace value={showD1} rotateDeg={rotation} />
        <DieFace value={showD2} rotateDeg={-rotation} />
      </motion.div>
    </div>
  );
}
