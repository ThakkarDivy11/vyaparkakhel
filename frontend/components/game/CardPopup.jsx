'use client';
import { useEffect, useState } from 'react';
import { Sparkles, Gift, HelpCircle } from 'lucide-react';

// Chance / Community Chest reveal. The store passes either a bare
// description string or `{ description, deckType }`. When deckType is
// present we color-code the card. Auto-dismisses after ~4s.
export default function CardPopup({ card, onDismiss }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (!card) {
      setFlipped(false);
      return;
    }
    // Flip in next tick so the from-state renders first
    const flipT = setTimeout(() => setFlipped(true), 30);
    const dismissT = setTimeout(onDismiss, 4500);
    return () => {
      clearTimeout(flipT);
      clearTimeout(dismissT);
    };
  }, [card, onDismiss]);

  if (!card) return null;

  const description = typeof card === 'string' ? card : card.description;
  const deckType = typeof card === 'object' ? card.deckType : null;
  const isChance = deckType === 'chance';
  const isChest = deckType === 'community_chest';

  // Default to Chance theming when deckType is unknown so we never look
  // generic — matches the orange-saffron tone the rest of the UI uses
  // for active-turn signalling.
  const accent = isChest
    ? { bg: 'bg-portage-600', text: 'text-white', label: 'Community Chest', Icon: Gift }
    : isChance
      ? { bg: 'bg-saffron-500', text: 'text-black', label: 'Chance', Icon: HelpCircle }
      : { bg: 'bg-saffron-500', text: 'text-black', label: 'Card', Icon: Sparkles };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-alabaster-900/60 backdrop-blur-sm p-4"
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-sm"
        style={{ perspective: '1000px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative w-full aspect-3/4 transition-transform duration-700 ease-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Card back */}
          <div
            className={
              'absolute inset-0 rounded-3xl border-2 border-border-strong shadow-2xl flex flex-col items-center justify-center gap-3 ' +
              accent.bg +
              ' ' +
              accent.text
            }
            style={{ backfaceVisibility: 'hidden' }}
          >
            <accent.Icon size={64} strokeWidth={2.25} />
            <span className="text-sm uppercase tracking-[0.3em] font-extrabold">
              {accent.label}
            </span>
          </div>

          {/* Card front (revealed after flip) */}
          <div
            className="absolute inset-0 rounded-3xl bg-surface border-2 border-border-strong shadow-2xl flex flex-col p-6"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className={`px-3 py-1.5 rounded-full ${accent.bg} ${accent.text} self-center inline-flex items-center gap-1.5 mb-4`}>
              <accent.Icon size={14} strokeWidth={2.5} />
              <span className="text-[10px] uppercase tracking-widest font-extrabold">
                {accent.label}
              </span>
            </div>
            <p className="flex-1 flex items-center justify-center text-center text-text font-semibold text-lg leading-snug">
              {description}
            </p>
            <p className="text-xs text-text-muted text-center mt-4">
              Tap anywhere to dismiss
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
