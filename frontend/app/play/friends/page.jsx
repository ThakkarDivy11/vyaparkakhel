'use client';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, LogIn, Users, Share2, Crown, Shield, ShieldCheck, Clock } from 'lucide-react';
import { PageBackground } from '@/components/ui';

/* ── SVG Corner Ornament ── */
function GoldCorner({ position }) {
  const posClasses = {
    'top-left': 'top-0 left-0',
    'top-right': 'top-0 right-0',
    'bottom-left': 'bottom-0 left-0',
    'bottom-right': 'bottom-0 right-0',
  };
  const transforms = {
    'top-left': '',
    'top-right': 'scaleX(-1)',
    'bottom-left': 'scaleY(-1)',
    'bottom-right': 'scale(-1)',
  };
  return (
    <div
      className={`absolute ${posClasses[position]} w-6 h-6 pointer-events-none z-10`}
      style={{ transform: transforms[position] }}
    >
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <linearGradient id={`cg_${position}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffd54f" />
            <stop offset="40%" stopColor="#a87c24" />
            <stop offset="100%" stopColor="#ffd54f" />
          </linearGradient>
        </defs>
        <path d="M0 0 L9 0 L9 2 L2 2 L2 9 L0 9 Z" fill={`url(#cg_${position})`} />
        <rect x="3.5" y="3.5" width="2.5" height="2.5" rx="0.4" transform="rotate(45 4.75 4.75)" fill="#ffd54f" opacity="0.6" />
      </svg>
    </div>
  );
}

/* ── Premium Card with Gold Ornamental Frame ── */
function RoyalCard({ children, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      {/* Outer gold gradient border */}
      <div className="absolute -inset-[1.5px] rounded-xl bg-gradient-to-b from-[#d4a84b] via-[#8a6420] to-[#d4a84b] opacity-50" />
      {/* Inner card body */}
      <div className="relative rounded-xl bg-gradient-to-b from-[#0a1a35]/95 to-[#040b18]/98 border border-[#d4a84b]/20 shadow-[0_8px_32px_rgba(0,0,0,0.6),_inset_0_1px_0_rgba(212,168,75,0.08)]">
        {/* Inner thin gold border */}
        <div className="absolute inset-[4px] rounded-[9px] border border-[#d4a84b]/12 pointer-events-none" />
        <div className="relative p-4 sm:p-5">{children}</div>
      </div>
      <GoldCorner position="top-left" />
      <GoldCorner position="top-right" />
      <GoldCorner position="bottom-left" />
      <GoldCorner position="bottom-right" />
    </div>
  );
}

/* ── Glowing Step Circle ── */
function StepCircle({ icon: Icon, label, desc }) {
  return (
    <div className="flex flex-col items-center text-center flex-1 min-w-0">
      <div className="relative mb-2">
        <div className="absolute -inset-1 rounded-full bg-gradient-to-b from-[#ffd54f]/15 to-[#a87c24]/10 blur-[3px]" />
        <div className="relative w-11 h-11 rounded-full bg-gradient-to-b from-[#0e2140] to-[#050c18] border-2 border-[#d4a84b]/50 flex items-center justify-center text-[#ffd54f] shadow-[0_0_10px_rgba(255,213,79,0.12)]">
          <Icon size={18} className="stroke-[2.5px] drop-shadow-[0_0_4px_rgba(255,213,79,0.3)]" />
        </div>
      </div>
      <span className="text-[#ffd54f] font-cinzel text-[9px] sm:text-[10px] font-black tracking-wider leading-tight">
        {label}
      </span>
      <span className="text-white/50 text-[7.5px] sm:text-[8px] mt-0.5 leading-normal max-w-[110px] font-medium">
        {desc}
      </span>
    </div>
  );
}

/* ── Feature Block ── */
function FeatureBlock({ icon: Icon, color, label, desc, emoji }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="relative shrink-0">
        <div className="absolute -inset-1 rounded-full blur-[5px] opacity-25" style={{ backgroundColor: color }} />
        <div className="relative w-9 h-9 rounded-full bg-gradient-to-b from-[#0e2140] to-[#050c18] border border-white/10 flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
          {emoji ? (
            <div className="relative">
              <Icon size={20} style={{ color }} className="stroke-[2px]" />
              <span className="absolute inset-0 flex items-center justify-center text-[8px]" style={{ color, transform: 'translateY(0.5px)' }}>
                {emoji}
              </span>
            </div>
          ) : (
            <Icon size={20} style={{ color }} className="stroke-[2px]" />
          )}
        </div>
      </div>
      <div className="flex flex-col min-w-0 pt-0.5">
        <span className="text-white font-extrabold text-[10.5px] sm:text-[11px] leading-tight">{label}</span>
        <span className="text-white/45 text-[8px] sm:text-[8.5px] leading-normal mt-0.5 font-medium">{desc}</span>
      </div>
    </div>
  );
}

export default function PlayWithFriendsPage() {
  const router = useRouter();

  return (
    <PageBackground bgImage="/backgrounds/friends_bg.jpg">
      {/* ── Back Button ── */}
      {/* Hexagon Back Button (Desktop/Tablet) */}
      <button
        onClick={() => router.push('/')}
        aria-label="Back"
        className="hidden sm:block absolute top-6 left-6 w-[108px] h-[36px] transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.97] active:translate-y-[1px] cursor-pointer z-30 group"
      >
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
          <path d="M 12 1 L 96 1 L 107 18 L 96 35 L 12 35 L 1 18 Z" fill="url(#backBgGrad)" stroke="url(#backGoldGrad)" strokeWidth="2" className="group-hover:stroke-[#fff5c0] transition-colors duration-150" />
          <path d="M 14 3.5 L 94 3.5 L 103.5 18 L 94 32.5 L 14 32.5 L 4.5 18 Z" stroke="#d4a84b" strokeWidth="0.75" opacity="0.6" className="group-hover:opacity-85 transition-opacity duration-150" />
        </svg>
        <div className="relative z-10 flex items-center justify-center w-full h-full gap-2 px-3">
          <ArrowLeft size={16} className="text-[#ffd54f] stroke-[3px] shrink-0 group-hover:text-[#fff5c0] transition-colors" />
          <div className="h-4 w-[1px] bg-[#d4a84b]/30 shrink-0" />
          <span className="text-[#eae1cd] font-cinzel text-[11px] font-black tracking-widest leading-none select-none group-hover:text-white transition-colors">
            BACK
          </span>
        </div>
      </button>

      {/* Circular Back Button (Mobile) */}
      <button
        onClick={() => router.push('/')}
        aria-label="Back"
        className="block sm:hidden absolute top-4 left-4 w-9 h-9 rounded-full bg-gradient-to-b from-[#0e2140] to-[#050c18] border-2 border-[#d4a84b] flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.5)] active:scale-95 transition-all cursor-pointer z-30 group"
      >
        <ArrowLeft size={18} className="text-[#ffd54f] stroke-[3px] group-hover:text-white transition-colors" />
      </button>

      {/* ── Centered Top Banner ── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center w-full max-w-[200px] sm:max-w-[360px] pointer-events-none">
        <img
          src="/play_with_friends_banner.png"
          alt="Play with Friends"
          className="w-full h-auto object-contain"
        />
      </div>

      {/* ── Dark gradient overlay (same as Create Room) ── */}
      <div className="absolute inset-y-0 left-0 w-full max-w-xl lg:max-w-2xl bg-gradient-to-r from-black via-black via-black/85 via-black/40 to-transparent pointer-events-none z-10" />

      {/* ── Main Layout ── */}
      <main className="relative h-screen max-h-screen w-full pt-16 sm:pt-20 pb-3 pl-24 sm:pl-36 lg:pl-44 pr-4 flex flex-col z-20 overflow-hidden">

        {/* ─── LEFT COLUMN CONTENT ─── */}
        <div className="flex-1 flex flex-col items-start justify-center max-w-sm w-full min-h-0">

          {/* Hero Title */}
          <div className="mb-3 shrink-0 w-full flex flex-col items-center">
            <div className="flex items-center gap-3 mb-1.5 justify-center">
              <Users size={30} className="text-[#ffd54f] fill-[#ffd54f]/15 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" strokeWidth={2.25} />
              <h2 className="text-2xl sm:text-3xl font-black text-[#ffd54f] tracking-wider font-cinzel leading-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] uppercase">
                PRIVATE ROOM
              </h2>
            </div>
            <p className="text-white/75 text-xs sm:text-sm leading-relaxed font-medium text-center">
              Create a room and share the code,<br />or join one your friend has created.
            </p>
          </div>

          {/* ── CREATE A ROOM Button (Full Width Gold) ── */}
          <button
            onClick={() => router.push('/play/friends/create')}
            className="w-full py-3 px-6 inline-flex items-center justify-center gap-2.5 rounded-xl text-sm font-black text-[#2a1702] uppercase tracking-wider font-cinzel bg-gradient-to-b from-[#ffd54f] via-[#ffb300] to-[#ff8f00] border-2 border-[#fff5c0] shadow-[0_0_14px_rgba(255,179,0,0.5),_inset_0_0_0_1.2px_#b56c00,_inset_0_1.5px_0_rgba(255,255,255,0.4)] hover:brightness-110 active:brightness-95 hover:scale-[1.01] active:scale-[0.99] active:translate-y-[1px] transition-all duration-150 ease-out cursor-pointer mb-2.5 shrink-0"
          >
            <Plus size={18} className="stroke-[3px]" />
            CREATE A ROOM
          </button>

          {/* ── JOIN A ROOM Button (Full Width Dark) ── */}
          <button
            onClick={() => router.push('/play/friends/join')}
            className="w-full py-3 px-6 inline-flex items-center justify-center gap-2.5 rounded-xl text-sm font-black text-[#eae1cd] uppercase tracking-wider font-cinzel bg-gradient-to-b from-[#0e2140] to-[#050c18] border-2 border-[#d4a84b]/70 shadow-[0_4px_12px_rgba(0,0,0,0.5),_inset_0_0_0_1px_rgba(212,168,75,0.15),_inset_0_1.5px_0_rgba(255,255,255,0.05)] hover:brightness-110 active:brightness-95 hover:scale-[1.01] active:scale-[0.99] active:translate-y-[1px] transition-all duration-150 ease-out cursor-pointer mb-4 shrink-0"
          >
            <LogIn size={18} className="text-[#ff3c00] stroke-[3px] drop-shadow-[0_0_3px_rgba(255,60,0,0.5)]" />
            JOIN A ROOM
          </button>

          {/* ── HOW IT WORKS — Royal Card (Below Buttons) ── */}
          <RoyalCard className="w-full shrink-0">
            <div className="flex items-center gap-3 w-full mb-3.5 select-none">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#d4a84b]/40 to-[#d4a84b]/60" />
              <h3 className="text-[#ffd54f] font-cinzel text-[10px] sm:text-xs tracking-[0.18em] font-black uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
                HOW IT WORKS
              </h3>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#d4a84b]/40 to-[#d4a84b]/60" />
            </div>
            <div className="flex items-start justify-center gap-4 sm:gap-6 w-full">
              <StepCircle icon={Users} label="Create or Join" desc="Start or join a room with your friends" />
              <StepCircle icon={Share2} label="Share Code" desc="Share the room code with your friends" />
              <StepCircle icon={Crown} label="Start & Play" desc="Once everyone joins, start the game!" />
            </div>
          </RoyalCard>
        </div>

        {/* ─── BOTTOM — Features Royal Panel (Wider) ─── */}
        <RoyalCard className="w-full max-w-3xl shrink-0 -mt-3 -ml-20 sm:-ml-32 lg:-ml-40">
          <div className="flex items-center gap-3 w-full mb-3 select-none">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#d4a84b]/40 to-[#d4a84b]/60" />
            <span className="text-[#ffd54f] font-cinzel text-[10px] sm:text-xs tracking-[0.15em] font-black uppercase text-center drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
              YOUR FRIENDS NEED A ROOM CODE TO JOIN
            </span>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#d4a84b]/40 to-[#d4a84b]/60" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 w-full">
            <FeatureBlock icon={Shield} color="#42a5f5" label="Private Room" desc="Only invited players can join" emoji="🔒" />
            <FeatureBlock icon={ShieldCheck} color="#66bb6a" label="Secure & Safe" desc="Your room code is private" />
            <FeatureBlock icon={Users} color="#ab47bc" label="Up to 4 Players" desc="Play with up to 4 friends" />
            <FeatureBlock icon={Clock} color="#ffa726" label="No Time Limit" desc="Enjoy the game at your pace" />
          </div>
        </RoyalCard>
      </main>
    </PageBackground>
  );
}
