'use client';
import { useState, useEffect } from 'react';
import { Gavel, X } from 'lucide-react';
import { SPACES } from '@/lib/boardData';
import { COLOR_CLASSES } from '@/lib/boardLayout';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

// Live bidding modal — opens automatically when phase === 'auction'.
// Auction blocks the game, so we take over the screen with a modal until
// it resolves rather than showing it inline.
export default function AuctionPanel({ auction, players, myPlayer, onAction }) {
  const [bid, setBid] = useState('');

  // Reset local input when a new auction starts
  useEffect(() => { setBid(''); }, [auction?.propertyId]);

  if (!auction) return null;
  const space = SPACES.find(s => s.id === auction.propertyId);
  const colorBg = space?.color ? COLOR_CLASSES[space.color] : null;

  const folded = (auction.passedSeats ?? []).includes(myPlayer?.seat);
  const minBid = (auction.highBid ?? 0) + 1;
  const myBalance = myPlayer?.balance ?? 0;
  const bidAmount = parseInt(bid, 10);
  const canBid =
    !folded &&
    Number.isFinite(bidAmount) &&
    bidAmount >= minBid &&
    bidAmount <= myBalance;

  const highBidder = auction.highBidder != null
    ? players?.find(p => p.seat === auction.highBidder)
    : null;

  return (
    <Modal
      open
      onClose={() => {}}
      title={null}
      size="md"
      closeOnBackdrop={false}
    >
      <div className="-mx-6 -mt-6">
        {/* Saffron strip header */}
        <div className="bg-saffron-500 text-black px-6 py-3 flex items-center gap-2 rounded-t-2xl">
          <Gavel size={18} strokeWidth={2.5} />
          <span className="text-xs uppercase tracking-widest font-extrabold">Auction</span>
        </div>

        {/* Property card preview */}
        <div className="px-6 pt-6">
          <div className="border border-border rounded-2xl overflow-hidden bg-surface shadow-(--shadow-sm)">
            {colorBg && <div className={`h-6 ${colorBg}`} />}
            <div className="p-4 text-center">
              <h3 className="text-xl font-extrabold text-text">{space?.name}</h3>
              <p className="text-sm text-text-muted mt-1 capitalize">
                {space?.type === 'property'
                  ? `${space.color?.replace('_', ' ')} group`
                  : space?.type}
              </p>
              {space?.price && (
                <p className="text-xs font-semibold text-text-muted mt-2">
                  Board Price: <span className="text-text font-bold">₹{space.price}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Current high bid */}
        <div className="px-6 pt-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-text-muted text-sm">Current high bid</span>
            <span className="font-mono font-bold tabular-nums text-2xl text-text">
              ₹{auction.highBid ?? 0}
            </span>
          </div>
          {highBidder && (
            <p className="text-xs text-text-muted mt-1 text-right">
              by <span className="font-semibold text-text">{highBidder.displayName}</span>
            </p>
          )}
        </div>

        {/* Bidders Status */}
        <div className="px-6 pt-4">
          <div className="text-xs uppercase tracking-widest font-semibold text-text-muted mb-2">
            Bidders
          </div>
          <div className="flex flex-wrap gap-2">
            {players?.map(p => {
              const hasPassed = (auction.passedSeats ?? []).includes(p.seat);
              return (
                <div 
                  key={p.seat} 
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    hasPassed 
                      ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                      : 'bg-green-500/10 text-green-500 border border-green-500/20'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${hasPassed ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`} />
                  <span>{p.displayName}</span>
                  <span className="text-[10px] opacity-80">
                    ({hasPassed ? 'Folded' : 'Active'})
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bid input */}
        {!folded ? (
          <div className="px-6 pt-5 space-y-3">
            <label className="text-xs uppercase tracking-widest font-semibold text-text-muted">
              Your bid
            </label>
            <input
              type="number"
              value={bid}
              onChange={(e) => setBid(e.target.value)}
              min={minBid}
              max={myBalance}
              placeholder={`Min ₹${minBid}`}
              className="w-full h-12 bg-surface-2 border border-border rounded-xl px-4 font-mono font-bold text-lg tabular-nums text-text placeholder:text-text-muted focus:outline-none focus:border-portage-500 focus:ring-4 focus:ring-portage-400/30 transition-[border-color,box-shadow] duration-150 ease-out"
            />
            <p className="text-xs text-text-muted">
              Your balance: <span className="font-mono font-bold tabular-nums text-text">₹{myBalance}</span>
            </p>
          </div>
        ) : (
          <div className="px-6 pt-5 text-center">
            <p className="text-text-muted text-sm">
              You folded. Waiting for the auction to finish…
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-6 pt-5 pb-6 flex gap-2">
          <Button
            variant="primary"
            size="md"
            fullWidth
            disabled={!canBid}
            onClick={() => {
              onAction('AUCTION_BID', { amount: bidAmount });
              setBid('');
            }}
          >
            {canBid ? `Bid ₹${bidAmount}` : 'Enter a bid'}
          </Button>
          <Button
            variant="ghost"
            size="md"
            icon={<X size={16} />}
            disabled={folded}
            onClick={() => onAction('AUCTION_PASS', {})}
          >
            Fold
          </Button>
        </div>
      </div>
    </Modal>
  );
}
