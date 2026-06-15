'use client';
import { Lock, CircleDollarSign, KeyRound, Dice5 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

// Auto-shown when it's my roll phase and I'm in jail. Three options:
//   • Pay ₹50 bail (only if balance allows)
//   • Use a Get-out-of-jail-free card (only if I have one)
//   • Roll for doubles (always available — succeeds on a double, otherwise
//     adds a turn to jailTurns and fails out after 3 attempts in the rules)
//
// The user can't dismiss this modal — they must pick one of the three.
export default function JailModal({ open, myPlayer, onAction }) {
  if (!open || !myPlayer) return null;

  const canPay = (myPlayer.balance ?? 0) >= 50;
  const hasCard = (myPlayer.jailFreeCards ?? 0) > 0;

  return (
    <Modal open={open} onClose={() => {}} title={null} size="sm" closeOnBackdrop={false}>
      <div className="-mx-6 -mt-6">
        <div className="bg-saffron-500 text-black px-6 py-3 flex items-center gap-2 rounded-t-2xl">
          <Lock size={18} strokeWidth={2.5} />
          <span className="text-xs uppercase tracking-widest font-extrabold">In jail</span>
        </div>

        <div className="px-6 pt-6 pb-6 flex flex-col gap-3">
          <p className="text-center text-text-muted text-sm">
            What would you like to do?
          </p>

          <Button
            variant="success"
            size="md"
            fullWidth
            icon={<CircleDollarSign size={16} />}
            disabled={!canPay}
            onClick={() => onAction('PAY_BAIL')}
          >
            {canPay ? 'Pay ₹50 bail' : 'Pay bail (need ₹50)'}
          </Button>

          {hasCard && (
            <Button
              variant="primary"
              size="md"
              fullWidth
              icon={<KeyRound size={16} />}
              onClick={() => onAction('USE_JAIL_FREE_CARD')}
            >
              Use free card
            </Button>
          )}

          <Button
            variant="ghost"
            size="md"
            fullWidth
            icon={<Dice5 size={16} />}
            onClick={() => onAction('ROLL_DICE')}
          >
            Roll for doubles
          </Button>

          <p className="text-center text-[11px] text-text-muted mt-1">
            Three failed attempts and you must pay bail to continue.
          </p>
        </div>
      </div>
    </Modal>
  );
}
