import { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { TOKEN_COLORS } from '@/lib/boardLayout';
import PawnIcon from '@/components/ui/PawnIcon';

// Colored pawn token. Uses framer-motion layoutId so when a player moves to a
// new board space the token animates (spring) from the old cell to the new one.
// It also has a vertical hop animation (Y axis & scale) triggered on position change.
export default function PlayerToken({ player, position, index, total }) {
  const color = TOKEN_COLORS[player.seat % TOKEN_COLORS.length];
  const offsetX = (index % 3) * 6;
  const offsetY = Math.floor(index / 3) * 6;
  
  const controls = useAnimation();

  useEffect(() => {
    if (position !== undefined) {
      // Trigger a 3D-like hop animation (upward bounce + slight expansion)
      controls.start({
        y: [0, -18, 0],
        scale: [1, 1.25, 1],
        transition: {
          duration: 0.2,
          ease: 'easeOut',
        }
      });
    }
  }, [position, controls]);

  return (
    <motion.div
      layoutId={`pawn-${player.seat}`}
      layout
      className="absolute w-6 h-6 flex items-center justify-center z-10"
      style={{
        top: `${4 + offsetY}px`,
        left: `${4 + offsetX}px`,
      }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      title={player.displayName}
    >
      <motion.div
        animate={controls}
        className="w-full h-full flex items-center justify-center"
      >
        <PawnIcon color={color} className="w-full h-full drop-shadow-md" />
      </motion.div>
    </motion.div>
  );
}
