'use client';
import { ArrowLeftRight, Check, X } from 'lucide-react';
import { SPACES } from '@/lib/boardData';
import { COLOR_CLASSES } from '@/lib/boardLayout';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

// Shown automatically when a pendingTrade exists with `targetSeat === me`.
// Shows the full offer (their cards + cash on the left, my cards + cash
// on the right) and lets me Accept or Decline. The offerer sees a
// different button via ActionBar (Cancel offer).
export default function TradeResponseModal({
  pendingTrade,
  myPlayer,
  players,
  onAction,
}) {
  if (!pendingTrade || !myPlayer) return null;
  if (pendingTrade.targetSeat !== myPlayer.seat) return null;

  const offerer = players?.find(p => p.seat === pendingTrade.offerSeat);

  const offerSpaces = pendingTrade.offerProperties
    .map(id => SPACES.find(s => s.id === id))
    .filter(Boolean);
  const requestSpaces = pendingTrade.requestProperties
    .map(id => SPACES.find(s => s.id === id))
    .filter(Boolean);

  return (
    <Modal open onClose={() => {}} title={null} size="lg" closeOnBackdrop={false}>
      <div className="-mx-6 -mt-6">
        <div className="bg-saffron-500 text-black px-6 py-3 flex items-center gap-2 rounded-t-2xl">
          <ArrowLeftRight size={18} strokeWidth={2.5} />
          <span className="text-xs uppercase tracking-widest font-extrabold">Trade offer</span>
        </div>

        <div className="px-6 pt-5 pb-6 flex flex-col gap-5">
          <p className="text-sm text-text-muted text-center">
            <span className="font-bold text-text">{offerer?.displayName ?? 'Someone'}</span>{' '}
            wants to make a trade with you.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Side
              heading="They give"
              spaces={offerSpaces}
              cash={pendingTrade.offerCash}
              tone="incoming"
            />
            <Side
              heading="They want"
              spaces={requestSpaces}
              cash={pendingTrade.requestCash}
              tone="outgoing"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="success"
              size="md"
              fullWidth
              icon={<Check size={16} />}
              onClick={() => onAction('ACCEPT_TRADE')}
            >
              Accept
            </Button>
            <Button
              variant="destructive"
              size="md"
              fullWidth
              icon={<X size={16} />}
              onClick={() => onAction('REJECT_TRADE')}
            >
              Decline
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Side({ heading, spaces, cash, tone }) {
  const empty = spaces.length === 0 && (!cash || cash === 0);
  return (
    <div className="rounded-2xl bg-surface-2 border border-border p-4 flex flex-col gap-2">
      <p
        className={
          'text-xs uppercase tracking-widest font-bold ' +
          (tone === 'incoming' ? 'text-emerald-700' : 'text-red-700')
        }
      >
        {heading}
      </p>

      {empty ? (
        <p className="text-xs text-text-muted">Nothing.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {spaces.map(s => {
            const colorBg = s.color ? COLOR_CLASSES[s.color] : null;
            return (
              <div
                key={s.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface border border-border"
              >
                {colorBg && <span className={`w-1 h-4 rounded ${colorBg}`} />}
                <span className="flex-1 text-sm text-text truncate">{s.name}</span>
              </div>
            );
          })}
          {cash > 0 && (
            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-surface border border-border">
              <span className="text-sm text-text">Cash</span>
              <span className="text-sm font-mono font-bold tabular-nums text-text">
                ₹{cash}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
