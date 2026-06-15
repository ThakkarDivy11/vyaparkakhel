'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { ArrowLeft, Smartphone } from 'lucide-react';
import { Button, PageBackground } from '@/components/ui';
import { toast } from '@/lib/toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;

export default function PassAndPlaySetup() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [playerCount, setPlayerCount] = useState(2);
  const [boardTheme, setBoardTheme] = useState('flat');
  const [playerNames, setPlayerNames] = useState([user?.firstName || 'Player 1', 'Player 2', 'Player 3', 'Player 4']);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    setCreating(true);
    try {
      const token = await getToken();
      
      // 1. Create the game
      const res = await fetch(`${API_URL}/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          settings: { maxPlayers: playerCount, mode: 'pass_and_play', boardTheme },
          playerNames: playerNames.slice(0, playerCount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not create game');
      
      const gameId = data.data.game.gameId;
      const roomCode = data.data.game.roomCode;
      
      // 2. Start the game immediately since it's local
      const startRes = await fetch(`${API_URL}/games/${gameId}/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.message || 'Could not start game');
      
      router.push(`/game/${roomCode}`);
    } catch (e) {
      toast.error(e.message);
      setCreating(false);
    }
  }

  const handleNameChange = (index, name) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const pct = ((playerCount - MIN_PLAYERS) / (MAX_PLAYERS - MIN_PLAYERS)) * 100;

  return (
    <PageBackground>
      {/* Hexagon Back Button */}
      <button
        onClick={() => router.back()}
        aria-label="Back"
        disabled={creating}
        className="absolute top-4 left-4 sm:top-6 sm:left-6 w-[108px] h-[36px] transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.97] active:translate-y-[1px] cursor-pointer z-10 group disabled:opacity-40 disabled:pointer-events-none"
      >
        {/* Hexagon Background SVG */}
        <svg width="108" height="36" viewBox="0 0 108 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]">
          <defs>
            <linearGradient id="backBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0e2140" />
              <stop offset="100%" stopColor="#050c18" />
            </linearGradient>
            <linearGradient id="backGoldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a87c24" />
              <stop offset="50%" stopColor="#ffd54f" />
              <stop offset="100%" stopColor="#a87c24" />
            </linearGradient>
          </defs>
          
          {/* Outer Hexagon with Gold stroke */}
          <path 
            d="M 12 1 L 96 1 L 107 18 L 96 35 L 12 35 L 1 18 Z" 
            fill="url(#backBgGrad)" 
            stroke="url(#backGoldGrad)" 
            strokeWidth="2"
            className="group-hover:stroke-[#fff5c0] transition-colors duration-150"
          />
          
          {/* Inner Hexagon with thin gold stroke */}
          <path 
            d="M 14 3.5 L 94 3.5 L 103.5 18 L 94 32.5 L 14 32.5 L 4.5 18 Z" 
            stroke="#d4a84b" 
            strokeWidth="0.75" 
            opacity="0.6"
            className="group-hover:opacity-85 transition-opacity duration-150"
          />
        </svg>

        {/* Button Content */}
        <div className="relative z-10 flex items-center justify-center w-full h-full gap-2 px-3">
          <ArrowLeft size={16} className="text-[#ffd54f] stroke-[3px] shrink-0 group-hover:text-[#fff5c0] transition-colors" />
          <div className="h-4 w-[1px] bg-[#d4a84b]/30 shrink-0" />
          <span className="text-[#eae1cd] font-cinzel text-[11px] font-black tracking-widest leading-none select-none group-hover:text-white transition-colors">
            BACK
          </span>
        </div>
      </button>

      {/* Centered Top Header */}
      <div className="absolute top-0 pt-4 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center text-center select-none pointer-events-none w-full">
        <h1 className="text-xl sm:text-2xl font-black text-[#ffd54f] tracking-wider font-cinzel leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] uppercase">
          PASS & PLAY
        </h1>
      </div>

      <main className="h-screen max-h-screen w-full max-w-xl lg:max-w-2xl mx-auto pt-24 sm:pt-28 pb-3 px-4 sm:px-6 flex flex-col justify-between z-10 overflow-hidden">

        <div className="w-full flex flex-col items-center text-center max-w-md mx-auto mb-4 shrink-0">
          <div className="flex items-center gap-3 mb-2 justify-center">
            <Smartphone size={28} className="text-[#ffd54f] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" strokeWidth={2.25} />
            <h2 className="text-xl sm:text-2xl font-black text-[#ffd54f] tracking-wider font-cinzel leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] uppercase">
              LOCAL MULTIPLAYER
            </h2>
          </div>
          <p className="text-white/85 text-xs text-center leading-relaxed font-medium">
            Play with friends on the same device.
          </p>
        </div>

        {/* Slider for player count */}
        <div className="px-2 mb-4 shrink-0 max-w-md w-full mx-auto">
          <div className="relative h-12 mb-2">
            <div
              className="absolute -translate-x-1/2 transition-[left] duration-150 ease-out"
              style={{ left: `${pct}%` }}
            >
              <div className="w-10 h-10 rounded-full bg-saffron-500 text-white flex items-center justify-center font-extrabold text-lg shadow-[0_2px_4px_rgba(0,0,0,0.4)] tabular-nums">
                {playerCount}
              </div>
            </div>
          </div>

          <input
            type="range"
            min={MIN_PLAYERS}
            max={MAX_PLAYERS}
            step={1}
            value={playerCount}
            onChange={(e) => setPlayerCount(parseInt(e.target.value, 10))}
            disabled={creating}
            className="w-full h-2 bg-surface-2 border border-border rounded-full appearance-none cursor-pointer outline-none
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-6
              [&::-webkit-slider-thumb]:h-6
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-saffron-500
              [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-white
              [&::-webkit-slider-thumb]:shadow-(--shadow-sm)
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:w-6
              [&::-moz-range-thumb]:h-6
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-saffron-500
              [&::-moz-range-thumb]:border-2
              [&::-moz-range-thumb]:border-white
              [&::-moz-range-thumb]:cursor-pointer"
          />
          <div className="flex justify-between mt-3 px-0.5 text-xs text-white/50 tabular-nums">
            {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }).map((_, i) => {
              const n = MIN_PLAYERS + i;
              return <span key={n} className={n === playerCount ? 'text-white font-bold' : ''}>{n}</span>;
            })}
          </div>
        </div>

        {/* Player Name Inputs */}
        <div className="flex flex-col gap-2 mb-4 min-h-0 flex-1 overflow-hidden max-w-md w-full mx-auto">
          <h3 className="text-xs font-bold text-white/70 mb-1 px-1 shrink-0">Player Names</h3>
          
          <div className="overflow-y-auto pr-1 flex flex-col gap-2 scrollbar-none flex-1 max-h-[160px] min-h-0">
            {Array.from({ length: playerCount }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 bg-surface-2 border border-border rounded-xl p-2.5 shrink-0">
                <div className="w-8 h-8 rounded-full bg-saffron-100 text-saffron-700 flex items-center justify-center font-bold text-sm shrink-0">
                  P{i + 1}
                </div>
                <input
                  type="text"
                  value={playerNames[i]}
                  onChange={(e) => handleNameChange(i, e.target.value)}
                  maxLength={20}
                  placeholder={`Player ${i + 1}`}
                  className="flex-1 bg-transparent border-none outline-none text-text text-sm placeholder:text-text-muted"
                  disabled={creating}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Board Style Selector */}
        <div className="bg-surface/10 border border-white/10 rounded-2xl p-3 mb-4 shrink-0 max-w-md w-full mx-auto">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-white/50 mb-2">
            Board Style
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setBoardTheme('flat')}
              className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                boardTheme === 'flat'
                  ? 'bg-portage-50/10 border-portage-500 shadow-sm ring-1 ring-portage-500'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="font-bold text-xs text-white">Classic Flat</div>
              <div className="text-[9px] text-white/60 mt-1 leading-tight">
                Original clean 2D layout
              </div>
            </button>
            <button
              onClick={() => setBoardTheme('3d')}
              className={`p-3 rounded-xl border text-left transition-all duration-200 relative overflow-hidden cursor-pointer ${
                boardTheme === '3d'
                  ? 'bg-saffron-500/20 border-saffron-500 shadow-sm ring-1 ring-saffron-500'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="absolute top-0 right-0 bg-saffron-600 text-white font-bold text-[8px] px-1.5 py-0.5 rounded-bl">
                ROYAL
              </div>
              <div className="font-bold text-xs text-white">Royal 3D</div>
              <div className="text-[9px] text-white/60 mt-1 leading-tight">
                Ornate wood & gold frames
              </div>
            </button>
          </div>
        </div>

        <div className="shrink-0 max-w-md w-full mx-auto">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={creating}
            onClick={handleCreate}
          >
            {creating ? 'Starting Game…' : 'Start Game'}
          </Button>
        </div>
      </main>
    </PageBackground>
  );
}
