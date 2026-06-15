'use client';

import { useEffect, useRef, useState } from 'react';
import { SPACES } from '@/lib/boardData';
import { getGridPosition } from '@/lib/boardLayout';
import BoardSpace from './ThreeDBoardSpace';
import PlayerToken from './PlayerToken';
import { playPawnHop, playPawnLand } from '@/lib/sound';

const CORNER_POSITIONS = new Set([0, 10, 20, 30]);
// Any jump longer than a double-six is a teleport (jail, chance card, etc.)
const MAX_WALK_STEPS = 12;

export default function ThreeDBoard({ gameState, centerSlot, myPlayerSeat, onHopComplete }) {
  const players = gameState?.players ?? [];
  const properties = gameState?.properties ?? {};

  // displayPositions[seat] = the board position the token is rendered at.
  // It lags behind gameState.players[*].position while the hop animation runs.
  const [displayPositions, setDisplayPositions] = useState(() => {
    const m = {};
    players.forEach(p => {
      m[p.seat] = p.position;
    });
    return m;
  });

  const prevActual = useRef({}); // seat -> last gameState position we processed
  const animTimers = useRef({}); // seat -> [timeoutId, ...]
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

      const perStep = Math.min(250, 1500 / steps.length);

      // Delay the start of pawn hopping by 1.7 seconds to allow the dice to roll and settle
      const delayTimer = setTimeout(() => {
        animTimers.current[seat] = steps.map((stepPos, i) =>
          setTimeout(() => {
            setDisplayPositions(d => ({ ...d, [seat]: stepPos }));
            playPawnHop(i);
            if (i === steps.length - 1) {
              setTimeout(() => {
                playPawnLand();
              }, perStep * 0.7);
            }
          }, i * perStep)
        );
      }, 1700);

      animTimers.current[seat] = [delayTimer];
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

  // Fire onHopComplete when the current-turn pawn transitions from hopping to arrived
  const prevPawnArrivedRef = useRef(true);
  useEffect(() => {
    if (pawnArrived && !prevPawnArrivedRef.current && onHopComplete) {
      onHopComplete();
    }
    prevPawnArrivedRef.current = pawnArrived;
  }, [pawnArrived, onHopComplete]);

  // Group non-bankrupt players by their displayed position (not actual)
  const tokensByPosition = {};
  players.forEach(p => {
    if (!p.isBankrupt) {
      const pos = displayPositions[p.seat] ?? p.position;
      if (!tokensByPosition[pos]) tokensByPosition[pos] = [];
      tokensByPosition[pos].push(p);
    }
  });

  return (
    <div
      className="mx-auto select-none game-board-container"
      style={{
        width: 'var(--board-size)',
        height: 'var(--board-size)',
        aspectRatio: '1/1',
        position: 'relative',
        borderRadius: '24px',
        padding: '1.6%', // Inset slightly to tuck outer space boundaries under the wood frame overlay
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#040d08', // deep emerald-black fallback matching theme
        boxShadow: '0 12px 48px rgba(0, 0, 0, 0.45)',
      }}
    >
      {/* 1. Highly Detailed SVG Board Border Frame Overlay */}
      <svg
        viewBox="0 0 1000 1000"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 40, // sit above spaces but below UI modals
        }}
      >
        <defs>
          {/* Rich mahogany radial gradient for the frame body */}
          <radialGradient id="frameGrad" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#2a1b12" />
            <stop offset="35%" stopColor="#1a0f0a" />
            <stop offset="75%" stopColor="#100805" />
            <stop offset="100%" stopColor="#080402" />
          </radialGradient>
          {/* Polished metallic gold gradient for outer/inner lines */}
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9a7420" />
            <stop offset="15%" stopColor="#c59b27" />
            <stop offset="30%" stopColor="#f6e3a4" />
            <stop offset="45%" stopColor="#dfb76c" />
            <stop offset="55%" stopColor="#c59b27" />
            <stop offset="75%" stopColor="#f6e3a4" />
            <stop offset="85%" stopColor="#d0a64b" />
            <stop offset="100%" stopColor="#805e15" />
          </linearGradient>
          {/* Contrast metallic gold gradient (reversed light direction) */}
          <linearGradient id="goldGradInner" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#805e15" />
            <stop offset="25%" stopColor="#d0a64b" />
            <stop offset="50%" stopColor="#f6e3a4" />
            <stop offset="75%" stopColor="#c59b27" />
            <stop offset="100%" stopColor="#9a7420" />
          </linearGradient>
          {/* Black shadow blur filter */}
          <filter id="shadowBlur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>
        {/* Outer dark base frame shape (with inner transparent cutout) using evenodd */}
        <path
          d="M 24 0 H 976 A 24 24 0 0 1 1000 24 V 976 A 24 24 0 0 1 976 1000 H 24 A 24 24 0 0 1 0 976 V 24 A 24 24 0 0 1 24 0 Z M 30 24 H 970 A 6 6 0 0 1 976 30 V 970 A 6 6 0 0 1 970 976 H 30 A 6 6 0 0 1 24 970 V 30 A 6 6 0 0 1 30 24 Z"
          fill="url(#frameGrad)"
          fillRule="evenodd"
        />
        {/* Outer Thin Gold Border */}
        <rect
          x="6"
          y="6"
          width="988"
          height="988"
          rx="18"
          ry="18"
          stroke="url(#goldGrad)"
          strokeWidth="1.5"
          fill="none"
        />
        {/* Outer Filigree Ornaments in Corners */}
        {/* Top-Left Corner Ornament */}
        <g transform="scale(0.5)" stroke="url(#goldGrad)" strokeWidth="2.4" fill="none">
          <path d="M 18 36 C 18 26, 26 18, 36 18" strokeWidth="1.5" opacity="0.9" />
          <path d="M 22 40 C 22 30, 30 22, 40 22" strokeWidth="1.0" opacity="0.8" />
          <path d="M 18 36 C 18 33, 15 31, 13 31 C 11 31, 10 33, 10 35 C 10 37, 12 39, 14 39 C 16 39, 17 37, 17 36" strokeWidth="1.0" />
          <path d="M 36 18 C 33 18, 31 15, 31 13 C 31 11, 33 10, 35 10 C 37 10, 39 12, 39 14 C 39 16, 37 17, 36 17" strokeWidth="1.0" />
        </g>
        {/* Top-Right Corner Ornament */}
        <g transform="translate(1000, 0) scale(-0.5, 0.5)" stroke="url(#goldGrad)" strokeWidth="2.4" fill="none">
          <path d="M 18 36 C 18 26, 26 18, 36 18" strokeWidth="1.5" opacity="0.9" />
          <path d="M 22 40 C 22 30, 30 22, 40 22" strokeWidth="1.0" opacity="0.8" />
          <path d="M 18 36 C 18 33, 15 31, 13 31 C 11 31, 10 33, 10 35 C 10 37, 12 39, 14 39 C 16 39, 17 37, 17 36" strokeWidth="1.0" />
          <path d="M 36 18 C 33 18, 31 15, 31 13 C 31 11, 33 10, 35 10 C 37 10, 39 12, 39 14 C 39 16, 37 17, 36 17" strokeWidth="1.0" />
        </g>
        {/* Bottom-Left Corner Ornament */}
        <g transform="translate(0, 1000) scale(0.5, -0.5)" stroke="url(#goldGrad)" strokeWidth="2.4" fill="none">
          <path d="M 18 36 C 18 26, 26 18, 36 18" strokeWidth="1.5" opacity="0.9" />
          <path d="M 22 40 C 22 30, 30 22, 40 22" strokeWidth="1.0" opacity="0.8" />
          <path d="M 18 36 C 18 33, 15 31, 13 31 C 11 31, 10 33, 10 35 C 10 37, 12 39, 14 39 C 16 39, 17 37, 17 36" strokeWidth="1.0" />
          <path d="M 36 18 C 33 18, 31 15, 31 13 C 31 11, 33 10, 35 10 C 37 10, 39 12, 39 14 C 39 16, 37 17, 36 17" strokeWidth="1.0" />
        </g>
        {/* Bottom-Right Corner Ornament */}
        <g transform="translate(1000, 1000) scale(-0.5, -0.5)" stroke="url(#goldGrad)" strokeWidth="2.4" fill="none">
          <path d="M 18 36 C 18 26, 26 18, 36 18" strokeWidth="1.5" opacity="0.9" />
          <path d="M 22 40 C 22 30, 30 22, 40 22" strokeWidth="1.0" opacity="0.8" />
          <path d="M 18 36 C 18 33, 15 31, 13 31 C 11 31, 10 33, 10 35 C 10 37, 12 39, 14 39 C 16 39, 17 37, 17 36" strokeWidth="1.0" />
          <path d="M 36 18 C 33 18, 31 15, 31 13 C 31 11, 33 10, 35 10 C 37 10, 39 12, 39 14 C 39 16, 37 17, 36 17" strokeWidth="1.0" />
        </g>
        {/* Inner Double Gold Border - Outer Thin Line */}
        <rect
          x="21"
          y="21"
          width="958"
          height="958"
          rx="8"
          ry="8"
          stroke="url(#goldGradInner)"
          strokeWidth="1.0"
          fill="none"
        />
        {/* Inner Double Gold Border - Dark Groove */}
        <rect
          x="22"
          y="22"
          width="956"
          height="956"
          rx="7"
          ry="7"
          stroke="#080402"
          strokeWidth="0.5"
          fill="none"
        />
        {/* Inner Double Gold Border - Inner Thicker Line */}
        <rect
          x="23"
          y="23"
          width="954"
          height="954"
          rx="6"
          ry="6"
          stroke="url(#goldGrad)"
          strokeWidth="1.5"
          fill="none"
        />
        {/* Inward 3D Bevel Shadow casting onto the board spaces */}
        <rect
          x="24"
          y="24"
          width="952"
          height="952"
          rx="5"
          ry="5"
          stroke="black"
          strokeWidth="6"
          fill="none"
          opacity="0.8"
          filter="url(#shadowBlur)"
        />
      </svg>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'grid',
          gridTemplateColumns: '1.6fr repeat(9, 1fr) 1.6fr',
          gridTemplateRows: '1.6fr repeat(9, 1fr) 1.6fr',
          gap: '0px',
          background: '#0b1f12',
          padding: '0px',
          borderRadius: '16px',
          overflow: 'visible',
        }}
      >
        {/* Centre hub — background image + caller-supplied live content */}
        <div
          style={{
            gridRow: '2 / 11',
            gridColumn: '2 / 11',
            backgroundColor: '#022c22', // deep bg-emerald-950 fallback
            backgroundImage: 'url(/center.png)',
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            zIndex: 1, // Base layer
          }}
          className="relative flex items-center justify-center rounded-3xl overflow-hidden"
        >
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            {centerSlot ?? (
              <div className="text-center select-none pointer-events-none">
                <div className="text-4xl font-black text-yellow-400 drop-shadow">व्यापार खेल</div>
                <div className="text-emerald-300 text-sm tracking-widest mt-1">INDIA EDITION</div>
              </div>
            )}
          </div>
        </div>

        {/* Board Spaces (Rendered after Center Hub and explicitly layered above it) */}
        {SPACES.map(space => {
          const { row, col } = getGridPosition(space.pos);
          const isCorner = CORNER_POSITIONS.has(space.pos);
          const propState = properties[space.id] ?? null;
          return (
            <div
              key={space.pos}
              style={{ gridRow: row, gridColumn: col, position: 'relative', zIndex: 10 }}
            >
              <BoardSpace
                space={space}
                propState={propState}
                isCorner={isCorner}
                landedOn={space.pos === landedOnPos}
                myPlayerSeat={myPlayerSeat}
              />
            </div>
          );
        })}

        {/* Absolutely positioned player tokens layered on top of the grid */}
        {players.map(p => {
          if (p.isBankrupt) return null;
          const pos = displayPositions[p.seat] ?? p.position;
          const tokensHere = tokensByPosition[pos] ?? [];
          const idx = tokensHere.findIndex(x => x.seat === p.seat);
          return (
            <PlayerToken
              key={p.seat}
              player={p}
              position={pos}
              index={idx !== -1 ? idx : 0}
              total={tokensHere.length || 1}
              isCurrentTurn={currentTurnSeat === p.seat}
            />
          );
        })}
      </div>
    </div>
  );
}