'use client';
import { useMemo, useState } from 'react';
import { ArrowLeftRight, Send, X } from 'lucide-react';
import { SPACES } from '@/lib/boardData';
import { COLOR_CLASSES, TOKEN_COLORS } from '@/lib/boardLayout';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

// Trade builder dialog. Pick a target player, then check off properties
// from each side and (optionally) tack on cash. Submitting fires
// OFFER_TRADE; the recipient sees a TradeResponseModal next.
export default function TradeDialog({ gameState, myPlayer, players, onAction, onClose }) {
  const [targetSeat, setTargetSeat] = useState('');
  const [offerProperties, setOfferProperties] = useState([]);
  const [offerCash, setOfferCash] = useState('');
  const [requestProperties, setRequestProperties] = useState([]);
  const [requestCash, setRequestCash] = useState('');

  const tradeable = (entries, seat) =>
    entries
      .filter(([, ps]) => ps.owner === seat && !ps.mortgaged && ps.houses === 0)
      .map(([id]) => SPACES.find(s => s.id === id))
      .filter(Boolean);

  const propertyEntries = Object.entries(gameState?.properties ?? {});
  const myProperties = useMemo(
    () => tradeable(propertyEntries, myPlayer?.seat),
    [gameState?.properties, myPlayer?.seat]
  );
  const targetSeatNum = targetSeat === '' ? null : parseInt(targetSeat, 10);
  const theirProperties = useMemo(
    () => (targetSeatNum != null ? tradeable(propertyEntries, targetSeatNum) : []),
    [gameState?.properties, targetSeatNum]
  );

  const otherPlayers = (players ?? []).filter(
    p => p.seat !== myPlayer?.seat && !p.isBankrupt
  );

  const offerCashNum = parseInt(offerCash, 10) || 0;
  const requestCashNum = parseInt(requestCash, 10) || 0;
  const offerCashValid = offerCashNum >= 0 && offerCashNum <= (myPlayer?.balance ?? 0);

  const hasSomethingToOffer =
    offerProperties.length > 0 || requestProperties.length > 0 ||
    offerCashNum > 0 || requestCashNum > 0;

  const canSubmit = targetSeatNum != null && offerCashValid && hasSomethingToOffer;

  function toggle(list, setList, id) {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  }

  function submit() {
    if (!canSubmit) return;
    onAction('OFFER_TRADE', {
      offer: {
        targetSeat: targetSeatNum,
        offerProperties,
        offerCash: offerCashNum,
        requestProperties,
        requestCash: requestCashNum,
      },
    });
    onClose();
  }

  return (
    <Modal open onClose={onClose} title="Offer trade" size="lg">
      <div className="flex flex-col gap-5">
        {/* Player picker */}
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest font-semibold text-text-muted">
            Trade with
          </label>
          {otherPlayers.length === 0 ? (
            <p className="text-text-muted text-sm">No players available to trade with.</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {otherPlayers.map(p => {
                const tokenColor = TOKEN_COLORS[p.seat % TOKEN_COLORS.length];
                const active = targetSeatNum === p.seat;
                return (
                  <button
                    key={p.seat}
                    onClick={() => setTargetSeat(String(p.seat))}
                    className={
                      'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-semibold transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.97] ' +
                      (active
                        ? 'bg-portage-600 text-white border-portage-700 shadow-(--shadow-sm)'
                        : 'bg-surface-2 text-text border-border hover:border-border-strong')
                    }
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/60"
                      style={{ backgroundColor: tokenColor }}
                    />
                    {p.displayName}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Two columns: I offer / I want */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TradeColumn
            heading="You offer"
            availableProperties={myProperties}
            selectedIds={offerProperties}
            onToggle={(id) => toggle(offerProperties, setOfferProperties, id)}
            cash={offerCash}
            onCashChange={setOfferCash}
            cashLabel={`Up to ₹${myPlayer?.balance ?? 0}`}
            cashMax={myPlayer?.balance ?? 0}
          />
          <TradeColumn
            heading="You want"
            availableProperties={theirProperties}
            selectedIds={requestProperties}
            onToggle={(id) => toggle(requestProperties, setRequestProperties, id)}
            cash={requestCash}
            onCashChange={setRequestCash}
            cashLabel={
              targetSeatNum != null
                ? `Up to ₹${players?.find(p => p.seat === targetSeatNum)?.balance ?? 0}`
                : 'Pick a player first'
            }
            cashMax={
              targetSeatNum != null
                ? players?.find(p => p.seat === targetSeatNum)?.balance ?? 0
                : 0
            }
            disabled={targetSeatNum == null}
          />
        </div>

        {/* Submit / cancel */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="primary"
            size="md"
            fullWidth
            icon={<Send size={16} />}
            disabled={!canSubmit}
            onClick={submit}
          >
            Send offer
          </Button>
          <Button variant="ghost" size="md" icon={<X size={16} />} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function TradeColumn({
  heading,
  availableProperties,
  selectedIds,
  onToggle,
  cash,
  onCashChange,
  cashLabel,
  cashMax,
  disabled,
}) {
  return (
    <div className="rounded-2xl bg-surface-2 border border-border p-4 flex flex-col gap-3">
      <p className="text-xs uppercase tracking-widest font-semibold text-text-muted">
        {heading}
      </p>

      <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
        {disabled ? (
          <p className="text-xs text-text-muted">Pick a player to see their properties.</p>
        ) : availableProperties.length === 0 ? (
          <p className="text-xs text-text-muted">No tradeable properties.</p>
        ) : (
          availableProperties.map(s => {
            const colorBg = s.color ? COLOR_CLASSES[s.color] : null;
            const checked = selectedIds.includes(s.id);
            return (
              <label
                key={s.id}
                className={
                  'flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer transition-colors duration-150 ease-out ' +
                  (checked
                    ? 'bg-portage-50 border-portage-400'
                    : 'bg-surface border-border hover:border-border-strong')
                }
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(s.id)}
                  className="accent-portage-600"
                />
                {colorBg && <span className={`w-1 h-4 rounded ${colorBg}`} />}
                <span className="flex-1 text-sm text-text truncate">{s.name}</span>
                <span className="text-xs text-text-muted font-mono tabular-nums">
                  ₹{s.price ?? '—'}
                </span>
              </label>
            );
          })
        )}
      </div>

      <div className="flex flex-col gap-1.5 pt-1 border-t border-border">
        <label className="text-xs uppercase tracking-widest font-semibold text-text-muted">
          Cash
        </label>
        <input
          type="number"
          value={cash}
          onChange={(e) => onCashChange(e.target.value)}
          min={0}
          max={cashMax}
          disabled={disabled}
          placeholder="₹0"
          className="w-full h-10 bg-surface border border-border rounded-lg px-3 font-mono tabular-nums text-text placeholder:text-text-muted focus:outline-none focus:border-portage-500 focus:ring-4 focus:ring-portage-400/30 transition-[border-color,box-shadow] duration-150 ease-out disabled:opacity-40"
        />
        <p className="text-[11px] text-text-muted">{cashLabel}</p>
      </div>
    </div>
  );
}
