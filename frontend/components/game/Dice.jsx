'use client';
import { useEffect, useRef, useState } from 'react';
import { Dice5 } from 'lucide-react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import clsx from 'clsx';
import { Button } from '@/components/ui';
import { playDiceRoll } from '@/lib/sound';
import GoldenDice3D from './GoldenDice3D';


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
const ROLL_TICK_MS = 70;

// CSS 3D Cube Dice
function CSS3DCube({ value, isGolden, rolling, tickRotation }) {
  // Base rotations to bring a specific face to the front
  const faceRotations = {
    1: { x: 0, y: 0 },
    2: { x: -90, y: 0 },
    3: { x: 0, y: -90 },
    4: { x: 0, y: 90 },
    5: { x: 90, y: 0 },
    6: { x: 180, y: 0 },
  };

  const targetRot = faceRotations[value || 1];
  
  // Add a slight isometric tilt so we can always see the 3D depth
  const tiltX = -20; 
  const tiltY = 20;

  // When rolling, we spin wildly. When stopped, we snap to target + tilt.
  const finalRotateX = rolling ? tickRotation.x : tiltX + targetRot.x;
  const finalRotateY = rolling ? tickRotation.y : tiltY + targetRot.y;

  const renderFace = (faceValue, styleObj) => {
    const pips = PIP_POSITIONS[faceValue];
    return (
      <div className={clsx(
        "absolute w-10 h-10 rounded-[4px] p-1 grid grid-cols-3 grid-rows-3 gap-0.5",
        isGolden ? "bg-gradient-to-br from-[#FFE55C] to-[#B37D00] border border-[#FFF8E1] shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]" 
                 : "bg-surface border border-border"
      )}
      style={{ backfaceVisibility: 'hidden', ...styleObj }}
      >
        {pips.map((pos) => (
          <span
            key={pos}
            className={clsx(
              'w-1.5 h-1.5 rounded-full self-center justify-self-center',
              isGolden ? 'bg-[#3E2723] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.9)]' : 'bg-alabaster-800',
              POS_TO_GRID[pos]
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <div style={{ perspective: '400px' }} className="w-10 h-10">
      <motion.div
        animate={{ rotateX: finalRotateX, rotateY: finalRotateY }}
        transition={rolling ? { duration: 0.1, ease: 'linear' } : { type: 'spring', stiffness: 120, damping: 15 }}
        style={{ transformStyle: 'preserve-3d', width: '100%', height: '100%' }}
        className="relative"
      >
        {renderFace(1, { transform: 'translateZ(20px)' })}
        {renderFace(6, { transform: 'rotateY(180deg) translateZ(20px)' })}
        {renderFace(3, { transform: 'rotateY(90deg) translateZ(20px)' })}
        {renderFace(4, { transform: 'rotateY(-90deg) translateZ(20px)' })}
        {renderFace(2, { transform: 'rotateX(90deg) translateZ(20px)' })}
        {renderFace(5, { transform: 'rotateX(-90deg) translateZ(20px)' })}
      </motion.div>
    </div>
  );
}

function DieFace({ value, theme = 'default', rolling, tickRotation }) {
  const isGolden = theme === 'golden_dice';
  
  // Use the 3D cube if it's golden
  if (isGolden) {
    return <CSS3DCube value={value} isGolden={true} rolling={rolling} tickRotation={tickRotation} />;
  }

  // Fallback to normal 2D flat dice for default
  const pips = value ? PIP_POSITIONS[value] : [];
  return (
    <motion.div
      animate={{ rotate: rolling ? tickRotation.z : 0 }}
      transition={rolling ? { duration: 0.1, ease: 'linear' } : { type: 'spring', stiffness: 220, damping: 18 }}
      className="relative w-10 h-10 rounded-lg p-1 grid grid-cols-3 grid-rows-3 gap-0.5 bg-surface border border-border shadow-md"
    >
      {value
        ? pips.map((pos) => (
            <span
              key={pos}
              className={clsx(
                'w-1.5 h-1.5 rounded-full self-center justify-self-center z-10 bg-alabaster-800',
                POS_TO_GRID[pos]
              )}
            />
          ))
        : <Dice5 size={20} className="col-start-1 col-span-3 row-start-1 row-span-3 self-center justify-self-center z-10 text-text-muted" />}
    </motion.div>
  );
}

export default function Dice({ dice, isMyTurn, phase, onRoll, activePlayer }) {
  const canRoll = isMyTurn && phase === 'roll';
  const [d1, d2] = dice ?? [null, null];

  // When dice value changes, briefly show a "rolling" animation that cycles
  // random faces before settling on the real values. Triggers on every
  // change to `dice` (i.e. every server-broadcast roll).
  const prevKey = useRef(null);
  const [rolling, setRolling] = useState(false);
  const [tick, setTick] = useState([1, 1]);
  const [tickRotation, setTickRotation] = useState({ x: 0, y: 0, z: 0 });
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
    playDiceRoll();
    
    let currentX = 0, currentY = 0, currentZ = 0;
    const interval = setInterval(() => {
      currentX += Math.random() * 180;
      currentY += Math.random() * 180;
      currentZ += 90;
      setTickRotation({ x: currentX, y: currentY, z: currentZ });
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

  const hasGoldenDice = activePlayer?.cosmetics?.includes('golden_dice');
  const theme = hasGoldenDice ? 'golden_dice' : 'default';

  if (theme === 'golden_dice') {
    return (
      <div className="flex flex-col items-center gap-1.5 -my-2">
        <GoldenDice3D d1={d1} d2={d2} rolling={rolling} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.div animate={shakeControls} className="flex gap-2.5 items-center">
        <DieFace value={showD1} theme={theme} rolling={rolling} tickRotation={tickRotation} />
        <DieFace value={showD2} theme={theme} rolling={rolling} tickRotation={tickRotation} />
      </motion.div>
    </div>
  );
}
