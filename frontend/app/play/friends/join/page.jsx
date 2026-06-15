'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogIn, Info } from 'lucide-react';
import { PageBackground } from '@/components/ui';

const CODE_LENGTH = 6;

// Sanitize each char: allow alnum only, uppercase. Room codes are
// generated from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no I/O/0/1) but
// accept any alnum and let the backend reject invalid ones.
function cleanChar(s) {
  return (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 1);
}

export default function JoinRoomPage() {
  const router = useRouter();
  const [chars, setChars] = useState(Array(CODE_LENGTH).fill(''));
  const inputs = useRef([]);
  const [submitting, setSubmitting] = useState(false);

  // Autofocus first input on mount
  useEffect(() => { inputs.current[0]?.focus(); }, []);

  const code = chars.join('');
  const complete = code.length === CODE_LENGTH;

  function setCharAt(idx, value) {
    const c = cleanChar(value);
    const next = [...chars];
    next[idx] = c;
    setChars(next);
    if (c && idx < CODE_LENGTH - 1) inputs.current[idx + 1]?.focus();
  }

  function handleKeyDown(idx, e) {
    if (e.key === 'Backspace' && !chars[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
      const next = [...chars];
      next[idx - 1] = '';
      setChars(next);
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      inputs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < CODE_LENGTH - 1) {
      inputs.current[idx + 1]?.focus();
    } else if (e.key === 'Enter' && complete) {
      handleJoin();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = (e.clipboardData?.getData('text') || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, CODE_LENGTH);
    const next = pasted.split('');
    while (next.length < CODE_LENGTH) next.push('');
    setChars(next);
    const lastFilled = pasted.length >= CODE_LENGTH ? CODE_LENGTH - 1 : pasted.length;
    inputs.current[lastFilled]?.focus();
  }

  function handleJoin() {
    if (!complete) return;
    setSubmitting(true);
    router.push(`/game/${code}`);
  }

  return (
    <PageBackground bgImage="/backgrounds/friends_bg.jpg">
      {/* Hexagon Back Button (Desktop/Tablet) */}
      <button
        onClick={() => router.back()}
        aria-label="Back"
        className="hidden sm:block absolute top-6 left-6 w-[108px] h-[36px] transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.97] active:translate-y-[1px] cursor-pointer z-30 group"
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

      {/* Circular Back Button (Mobile) */}
      <button
        onClick={() => router.back()}
        aria-label="Back"
        className="block sm:hidden absolute top-4 left-4 w-9 h-9 rounded-full bg-gradient-to-b from-[#0e2140] to-[#050c18] border-2 border-[#d4a84b] flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.5)] active:scale-95 transition-all cursor-pointer z-30 group"
      >
        <ArrowLeft size={18} className="text-[#ffd54f] stroke-[3px] group-hover:text-white transition-colors" />
      </button>

      {/* Centered Top Header Plaque */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center w-full max-w-[200px] sm:max-w-[360px] pointer-events-none select-none">
        <img
          src="/join_room_header_transparent.png"
          alt="Join a Room"
          className="w-full h-auto object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]"
        />
      </div>

      {/* Left-side dark gradient shadow overlay to enhance text readability */}
      <div className="absolute inset-y-0 left-0 w-full max-w-xl lg:max-w-2xl bg-gradient-to-r from-black via-black via-black/85 via-black/40 to-transparent pointer-events-none z-10" />

      <main className="relative min-h-screen w-full max-w-xl lg:max-w-2xl mx-auto lg:mx-0 pt-28 sm:pt-32 pb-6 pl-16 sm:pl-28 lg:pl-36 pr-4 flex flex-col justify-between z-20 overflow-y-auto">
        {/* Header Title Section */}
        <div className="w-full flex flex-col items-center max-w-md mb-4 shrink-0">
          <div className="flex items-center justify-center gap-3 mb-1.5 w-full">
            <LogIn size={28} className="text-[#ffd54f] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" strokeWidth={2.25} />
            <h2 className="text-2xl sm:text-3xl font-bold text-[#ffd54f] tracking-wider font-cinzel leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] uppercase">
              JOIN PRIVATE ROOM
            </h2>
          </div>
          <p className="text-white/90 text-xs sm:text-sm leading-relaxed font-medium text-center">
            Enter the 6-character room code.<br />Your friend can find this in their waiting room.
          </p>
        </div>

        {/* OTP-style 6 boxes */}
        <div className="flex justify-start gap-2 mb-4 max-w-md w-full shrink-0" onPaste={handlePaste}>
          {chars.map((ch, idx) => (
            <input
              key={idx}
              ref={(el) => { inputs.current[idx] = el; }}
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={1}
              value={ch}
              onChange={(e) => setCharAt(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              disabled={submitting}
              className="w-12 h-14 sm:w-13 sm:h-16 text-center text-2xl font-mono font-bold uppercase select-all bg-[#050c18]/90 border border-[#d4a84b]/40 rounded-xl text-white caret-[#ffd54f] focus:outline-none focus:border-[#ffd54f] focus:ring-4 focus:ring-[#ffd54f]/20 transition-all duration-150 ease-out shadow-[0_4px_6px_rgba(0,0,0,0.3)]"
            />
          ))}
        </div>

        {/* Action Button */}
        <div className="w-full max-w-md shrink-0">
          <button
            onClick={handleJoin}
            disabled={!complete || submitting}
            className="w-full py-3.5 px-6 inline-flex items-center justify-center gap-2.5 rounded-xl text-xs sm:text-sm font-black text-[#2a1702] uppercase tracking-wider font-cinzel bg-gradient-to-b from-[#ffd54f] via-[#ffb300] to-[#ff8f00] border-2 border-[#fff5c0] shadow-[0_0_12px_rgba(255,179,0,0.55),_inset_0_0_0_1.2px_#b56c00,_inset_0_1.5px_0_rgba(255,255,255,0.4)] hover:brightness-110 active:brightness-95 hover:scale-[1.01] active:scale-[0.99] active:translate-y-[1px] transition-all duration-150 ease-out cursor-pointer disabled:opacity-50"
          >
            <LogIn size={16} className="stroke-[3px]" />
            {submitting ? 'JOINING ROOM...' : 'JOIN ROOM'}
          </button>
        </div>

        {/* Footer Info Box */}
        <div className="w-full max-w-md mt-auto pt-3 shrink-0">
          <div className="bg-[#050c18]/80 border border-[#d4a84b]/40 rounded-xl p-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0e2140] border border-[#d4a84b]/40 flex items-center justify-center text-[#ffd54f] shrink-0">
              <Info size={16} className="stroke-[2.5px]" />
            </div>
            <span className="text-white/80 text-[10px] sm:text-[10.5px] leading-snug font-medium">
              Codes do not include letters I, O or numbers 0, 1 to avoid confusion.
            </span>
          </div>
        </div>
      </main>
    </PageBackground>
  );
}
