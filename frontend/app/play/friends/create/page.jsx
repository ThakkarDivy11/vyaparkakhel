'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { ArrowLeft, Users, Share2 } from 'lucide-react';
import { PageBackground } from '@/components/ui';
import { toast } from '@/lib/toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

export default function CreateRoomPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [playerCount, setPlayerCount] = useState(4);
  const [boardTheme, setBoardTheme] = useState('flat');
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    setCreating(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          settings: { maxPlayers: playerCount, boardTheme },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not create room');
      router.push(`/game/${data.data.game.roomCode}`);
    } catch (e) {
      toast.error(e.message);
      setCreating(false);
    }
  }

  // Position of the number bubble along the track
  const pct = ((playerCount - MIN_PLAYERS) / (MAX_PLAYERS - MIN_PLAYERS)) * 100;

  return (
    <PageBackground bgImage="/backgrounds/friends_bg.jpg">
      {/* Hexagon Back Button */}
      <button
        onClick={() => router.back()}
        aria-label="Back"
        disabled={creating}
        className="absolute top-4 left-4 sm:top-6 sm:left-6 w-[108px] h-[36px] transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.97] active:translate-y-[1px] cursor-pointer z-30 group disabled:opacity-40 disabled:pointer-events-none"
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

      {/* Centered Top Header Plaque */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center w-full max-w-[280px] sm:max-w-[360px] pointer-events-none select-none">
        <img
          src="/create_room_header.png"
          alt="Create a Room"
          className="w-full h-auto object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]"
        />
      </div>

      {/* Left-side dark gradient shadow overlay to enhance text readability */}
      <div className="absolute inset-y-0 left-0 w-full max-w-xl lg:max-w-2xl bg-gradient-to-r from-black via-black via-black/85 via-black/40 to-transparent pointer-events-none z-10" />

      <main className="relative min-h-screen w-full max-w-xl lg:max-w-2xl mx-auto lg:mx-0 pt-28 sm:pt-32 pb-6 pl-16 sm:pl-28 lg:pl-36 pr-4 flex flex-col justify-between z-20 overflow-y-auto">
        {/* Header Title Section */}
        <div className="w-full flex flex-col items-center max-w-md mb-3 shrink-0">
          <div className="flex items-center justify-center gap-3 mb-1.5 w-full">
            <Users size={28} className="text-[#ffd54f] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" strokeWidth={2.25} />
            <h2 className="text-2xl sm:text-3xl font-bold text-[#ffd54f] tracking-wider font-cinzel leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] uppercase">
              CREATE PRIVATE ROOM
            </h2>
          </div>
          <p className="text-white/90 text-xs sm:text-sm leading-relaxed font-medium text-center">
            Choose 2 to 6 players. You can start the game as<br />soon as enough friends join.
          </p>
        </div>

        {/* Select Players Component */}
        <div className="w-full max-w-md mb-3 shrink-0">
          <div className="flex items-center gap-3 w-full mb-3 select-none">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#d4a84b]/60" />
            <span className="text-[#ffd54f] font-cinzel text-[10px] tracking-widest font-black uppercase">
              SELECT PLAYERS
            </span>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#d4a84b]/60" />
          </div>

          <div className="flex items-center justify-between px-2 max-w-[340px] mx-auto">
            {[2, 3, 4, 5, 6].map((num) => {
              const isSelected = playerCount === num;
              return (
                <button
                  key={num}
                  onClick={() => setPlayerCount(num)}
                  className={`w-11 h-11 rounded-full flex items-center justify-center font-cinzel text-base font-black transition-all duration-200 cursor-pointer ${isSelected
                      ? 'bg-[#050c18]/40 border-2 border-[#ffd54f] text-[#ffd54f] shadow-[0_0_18px_rgba(255,213,79,0.6)] scale-110'
                      : 'bg-[#050c18]/90 border border-[#d4a84b]/60 text-[#d4a84b] hover:border-[#ffd54f] hover:text-[#ffd54f]'
                    }`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>

        {/* Board Style Selector */}
        <div className="w-full max-w-md mb-4 shrink-0">
          <div className="flex items-center gap-3 w-full mb-3 select-none">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#d4a84b]/60" />
            <span className="text-[#ffd54f] font-cinzel text-[10px] tracking-widest font-black uppercase">
              BOARD STYLE
            </span>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#d4a84b]/60" />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {/* Classic Flat Card */}
            <button
              onClick={() => setBoardTheme('flat')}
              className={`flex flex-col rounded-xl p-1.5 border transition-all duration-200 text-center cursor-pointer group ${boardTheme === 'flat'
                  ? 'bg-[#0e2140]/60 border-[#ffd54f] shadow-[0_0_12px_rgba(255,213,79,0.2)]'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                }`}
            >
              <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-white/10 mb-2">
                <img
                  src="/backgrounds/classic_flat_preview.png"
                  alt="Classic Flat Board"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {boardTheme === 'flat' && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#ffd54f] border border-[#a87c24] flex items-center justify-center text-[#2a1702] font-black text-xs shadow-md">
                    ✓
                  </div>
                )}
              </div>
              <div className="px-1 pb-1 w-full text-center">
                <span className="block text-[#ffd54f] font-cinzel font-bold text-[11px] sm:text-xs tracking-wider">
                  CLASSIC FLAT
                </span>
                <span className="block text-white/50 text-[9px] leading-tight mt-0.5 font-medium">
                  Original clean 2D layout
                </span>
              </div>
            </button>

            {/* Royal 3D Card */}
            <button
              onClick={() => setBoardTheme('3d')}
              className={`flex flex-col rounded-xl p-1.5 border transition-all duration-200 text-center cursor-pointer group ${boardTheme === '3d'
                  ? 'bg-[#0e2140]/60 border-[#ffd54f] shadow-[0_0_12px_rgba(255,213,79,0.2)]'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                }`}
            >
              <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-white/10 mb-2">
                <img
                  src="/backgrounds/royal_3d_preview.png"
                  alt="Royal 3D Board"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-1.5 right-1.5 bg-[#ff8f00] text-white font-black text-[8px] tracking-wider px-1.5 py-0.5 rounded border border-[#ffd54f]/50 shadow-md">
                  ROYAL
                </div>
              </div>
              <div className="px-1 pb-1 w-full text-center">
                <span className="block text-[#ffd54f] font-cinzel font-bold text-[11px] sm:text-xs tracking-wider">
                  ROYAL 3D
                </span>
                <span className="block text-white/50 text-[9px] leading-tight mt-0.5 font-medium">
                  Ornate wood & gold frames
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="w-full max-w-md shrink-0">
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full py-3.5 px-6 inline-flex items-center justify-center gap-2.5 rounded-xl text-xs sm:text-sm font-black text-[#2a1702] uppercase tracking-wider font-cinzel bg-gradient-to-b from-[#ffd54f] via-[#ffb300] to-[#ff8f00] border-2 border-[#fff5c0] shadow-[0_0_12px_rgba(255,179,0,0.55),_inset_0_0_0_1.2px_#b56c00,_inset_0_1.5px_0_rgba(255,255,255,0.4)] hover:brightness-110 active:brightness-95 hover:scale-[1.01] active:scale-[0.99] active:translate-y-[1px] transition-all duration-150 ease-out cursor-pointer disabled:opacity-50"
          >
            <Users size={16} className="stroke-[3px]" />
            {creating ? 'Creating Room...' : `CREATE ROOM FOR ${playerCount}`}
          </button>
        </div>

        {/* Footer Info Box */}
        <div className="w-full max-w-md mt-auto pt-3 shrink-0">
          <div className="bg-[#050c18]/80 border border-[#d4a84b]/40 rounded-xl p-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0e2140] border border-[#d4a84b]/40 flex items-center justify-center text-[#ffd54f] shrink-0">
              <Share2 size={16} className="stroke-[2.5px]" />
            </div>
            <span className="text-white/80 text-[10px] sm:text-[10.5px] leading-snug font-medium">
              Share room code with your friends so they can join easily.
            </span>
          </div>
        </div>
      </main>
    </PageBackground>
  );
}
