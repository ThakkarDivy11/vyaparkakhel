'use client';
import { useEffect, useRef, useState } from 'react';
import { LayoutGroup } from 'framer-motion';
import { SPACES } from '@/lib/boardData';
import { getGridPosition } from '@/lib/boardLayout';
import BoardSpace from './FlatBoardSpace';
import PlayerToken from './PlayerToken';
import PropertyDetailsModal from '../game/PropertyDetailsModal';

const CORNER_POSITIONS = new Set([0, 10, 20, 30]);
// Any jump longer than a double-six is a teleport (jail, chance card, etc.)
const MAX_WALK_STEPS = 12;

export default function FlatBoard({ gameState, centerSlot, myPlayerSeat, onHopComplete, bgImage = '/center.jpg' }) {
  const players = gameState?.players ?? [];
  const properties = gameState?.properties ?? {};

  // displayPositions[seat] = the board position the token is *rendered at*.
  // It lags behind gameState.players[*].position while the hop animation runs.
  const [displayPositions, setDisplayPositions] = useState(() => {
    const m = {};
    players.forEach(p => { m[p.seat] = p.position; });
    return m;
  });

  const [selectedSpace, setSelectedSpace] = useState(null);

  const prevActual = useRef({});   // seat → last gameState position we processed
  const animTimers = useRef({});   // seat → [timeoutId, ...]

  const posKey = players.map(p => `${p.seat}:${p.position}`).join(',');

  useEffect(() => {
    players.forEach(player => {
      const { seat, position } = player;
      const prev = prevActual.current[seat];

      if (prev === undefined) {
        prevActual.current[seat] = position;
        setDisplayPositions(d => ({ ...d, [seat]: position }));
        return;
      }
      if (prev === position) return;

      // Cancel any in-flight hop for this seat
      (animTimers.current[seat] || []).forEach(clearTimeout);

      // Build forward-stepping path around the 40-space board
      const steps = [];
      let p = prev;
      while (p !== position && steps.length < 40) {
        p = (p + 1) % 40;
        steps.push(p);
      }

      prevActual.current[seat] = position;

      if (steps.length > MAX_WALK_STEPS) {
        // Teleport directly — jail, chance/community card jumps
        setDisplayPositions(d => ({ ...d, [seat]: position }));
        animTimers.current[seat] = [];
        return;
      }

      // Delay the start of the hop animation to allow the dice roll animation (700ms) to complete
      const startDelay = 700;
      const perStep = Math.min(250, 1500 / steps.length);
      animTimers.current[seat] = steps.map((stepPos, i) =>
        setTimeout(() => {
          setDisplayPositions(d => ({ ...d, [seat]: stepPos }));
        }, startDelay + i * perStep)
      );
    });

    return () => {
      // Cancel all pending timers on unmount / before next effect
      Object.values(animTimers.current).forEach(timers =>
        timers.forEach(clearTimeout)
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posKey]);

  // Pulse the landed-on space only once the pawn has physically arrived.
  const currentTurnSeat = gameState?.currentTurnSeat;
  const currentTurnActualPos = players.find(p => p.seat === currentTurnSeat)?.position;
  const pawnArrived = displayPositions[currentTurnSeat] === currentTurnActualPos;
  const landedOnPos = gameState?.phase === 'post_roll' && pawnArrived
    ? currentTurnActualPos ?? null
    : null;

  // Fire onHopComplete when the current-turn pawn transitions from hopping → arrived
  const prevPawnArrivedRef = useRef(true);
  useEffect(() => {
    if (pawnArrived && !prevPawnArrivedRef.current && onHopComplete) {
      onHopComplete();
    }
    prevPawnArrivedRef.current = pawnArrived;
  }, [pawnArrived, onHopComplete]);

  // Group non-bankrupt players by their *displayed* position (not actual)
  const tokensByPosition = {};
  players.forEach(p => {
    if (!p.isBankrupt) {
      const pos = displayPositions[p.seat] ?? p.position;
      if (!tokensByPosition[pos]) tokensByPosition[pos] = [];
      tokensByPosition[pos].push(p);
    }
  });

  return (
    // LayoutGroup enables layoutId-based shared element transitions for pawns
    <LayoutGroup>
      <div
        className="mx-auto game-board-container"
        style={{
          width: 'var(--board-size)',
          height: 'var(--board-size)',
          aspectRatio: '1/1',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2.2fr) repeat(9, minmax(0, 1fr)) minmax(0, 2.2fr)',
          gridTemplateRows: 'minmax(0, 2.2fr) repeat(9, minmax(0, 1fr)) minmax(0, 2.2fr)',
          gap: '2px',
          background: '#0b1f12',
          padding: '2px',
          border: '5px solid #0b1f12',
          outline: '2px solid #d4af37',
          overflow: 'hidden',
        }}
      >
        {SPACES.map(space => {
          const { row, col } = getGridPosition(space.pos);
          const isCorner = CORNER_POSITIONS.has(space.pos);
          const propState = properties[space.id] ?? null;
          const tokensHere = tokensByPosition[space.pos] ?? [];

          return (
            <div
              key={space.pos}
              style={{ gridRow: row, gridColumn: col, position: 'relative', cursor: 'pointer' }}
              onClick={() => setSelectedSpace(space)}
            >
              <BoardSpace
                space={space}
                propState={propState}
                isCorner={isCorner}
                landedOn={space.pos === landedOnPos}
                myPlayerSeat={myPlayerSeat}
              />
              {tokensHere.map((player, idx) => (
                <PlayerToken
                  key={player.seat}
                  player={player}
                  position={space.pos}
                  index={idx}
                  total={tokensHere.length}
                />
              ))}
            </div>
          );
        })}

        {/* Centre hub — background image + caller-supplied live content */}
        <div
          style={{
            gridRow: '2 / 11',
            gridColumn: '2 / 11',
            backgroundImage: `url(${bgImage})`,
            backgroundSize: bgImage === '/center.jpg' ? '135.56% 135.56%' : (bgImage === '/backgrounds/bg_vintage.jpg' ? '100% 100%' : 'cover'),
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
          className="relative flex items-center justify-center overflow-hidden"
        >
          {/* Subtle dark tint so UI elements stay readable over the image */}
          {bgImage !== '/center.jpg' && bgImage !== '/backgrounds/bg_vintage.jpg' && <div className="absolute inset-0 bg-emerald-950/40" />}
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            {centerSlot ?? (
              bgImage !== '/center.jpg' && bgImage !== '/backgrounds/bg_vintage.jpg' && (
                <div className="text-center select-none pointer-events-none">
                  <div className="text-4xl font-black text-yellow-400 drop-shadow">व्यापार खेल</div>
                  <div className="text-emerald-300 text-sm tracking-widest mt-1">INDIA EDITION</div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <PropertyDetailsModal
        space={selectedSpace}
        onClose={() => setSelectedSpace(null)}
      />
    </LayoutGroup>
  );
}
