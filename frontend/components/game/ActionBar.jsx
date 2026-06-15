'use client';
import {
  Landmark, Dice5, Coins, Lock, Unlock, ArrowRightLeft,
  Check, RefreshCw
} from 'lucide-react';
import clsx from 'clsx';

// Persistent action bar.
//
// Always shows the same 6 anchor buttons (MENU / BUILD / SELL / MORTGAGE /
// REDEEM / TRADE) so muscle-memory builds up and the bar's shape never
// jumps between phases. Each button is enabled only when its action is
// actually possible — disabled buttons stay visible but greyed out.
//
// Stacks vertically in the left column matching the target design.
export default function ActionBar({
  gameState,
  myPlayer,
  onAction,
  onOpenMenu,
  onOpenManage,
  onOpenTrade,
}) {
  if (!gameState || !myPlayer) {
    return (
      <div className="w-full">
        <BarButton label="Menu" onClick={onOpenMenu} variant="blue" icon={Landmark} />
      </div>
    );
  }

  const { phase, pendingTrade, settings, properties } = gameState;
  const isMyTurn = gameState.currentTurnSeat === myPlayer.seat;
  const inManage = phase === 'manage' && isMyTurn && !pendingTrade;
  // Build/sell/mortgage are allowed both before rolling and during manage phase
  const canActOnProps = isMyTurn && !pendingTrade && ['roll', 'manage'].includes(phase);

  // Capability flags drive enable/disable
  const myProps = Object.entries(properties ?? {})
    .filter(([, ps]) => ps.owner === myPlayer.seat);
  const canBuild = canActOnProps && myProps.some(([, ps]) => !ps.mortgaged && ps.houses < 5);
  const canSell = canActOnProps && myProps.some(([, ps]) => ps.houses > 0);
  const canMortgage = canActOnProps && myProps.some(([, ps]) => !ps.mortgaged && ps.houses === 0);
  const canRedeem = canActOnProps && myProps.some(([, ps]) => ps.mortgaged);
  const canTrade =
    inManage && (settings?.allowTrading !== false) && !pendingTrade;

  const tradeFromMe = pendingTrade?.offerSeat === myPlayer.seat;

  return (
    <div className="flex flex-col gap-2 w-full items-stretch">
      {tradeFromMe && (
        <div className="w-full bg-saffron-100 border border-saffron-400 rounded-xl px-3 py-2 flex items-center gap-2">
          <RefreshCw size={14} className="text-saffron-700 shrink-0" />
          <p className="text-xs text-saffron-900 flex-1 font-semibold">
            Your trade offer is pending.
          </p>
          <button
            onClick={() => onAction('CANCEL_TRADE')}
            className="text-xs font-bold uppercase tracking-wider text-saffron-900 hover:text-black transition-colors duration-150 ease-out"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="flex flex-row lg:flex-col gap-1.5 w-full overflow-x-auto lg:overflow-visible py-1 lg:py-0 scrollbar-none">
        <BarButton label="Menu" onClick={onOpenMenu} variant="blue" icon={Landmark} />
        <BarButton label="Build" onClick={onOpenManage} disabled={!canBuild} variant="green" icon={Dice5} />
        <BarButton label="Sell" onClick={onOpenManage} disabled={!canSell} variant="teal" icon={Coins} />
        <BarButton label="Mortgage" onClick={onOpenManage} disabled={!canMortgage} variant="purple" icon={Lock} />
        <BarButton label="Redeem" onClick={onOpenManage} disabled={!canRedeem} variant="gold" icon={Unlock} />
        <BarButton label="Trade" onClick={onOpenTrade} disabled={!canTrade} variant="red" icon={ArrowRightLeft} />
      </div>

      {inManage && (
        <button
          onClick={() => onAction('END_TURN')}
          className="w-full inline-flex items-center justify-center gap-1.5 font-black text-xs uppercase tracking-wider
            bg-portage-600 hover:bg-portage-500 text-white
            shadow-[0_3px_0_0_var(--color-portage-800)] hover:shadow-[0_2px_0_0_var(--color-portage-800)]
            active:shadow-[0_1px_0_0_var(--color-portage-800)] active:translate-y-0.75
            px-3 py-1.5 rounded-lg transition-[background-color,box-shadow,transform] duration-150 ease-out shrink-0"
        >
          <Check size={14} strokeWidth={2.5} />
          End Turn
        </button>
      )}
    </div>
  );
}

function BarButton({ label, onClick, variant = 'green', disabled, icon: Icon }) {
  const colorClasses = {
    blue: 'glossy-btn-blue',
    green: 'glossy-btn-green',
    teal: 'glossy-btn-teal',
    purple: 'glossy-btn-purple',
    gold: 'glossy-btn-gold',
    red: 'glossy-btn-red',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'glossy-btn shrink-0 w-24 lg:w-full select-none inline-flex items-center gap-1.5 justify-center lg:justify-start',
        'py-1.5 px-2 text-[10.5px] lg:text-xs rounded-lg transition-all duration-150 active:scale-[0.97]',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
        colorClasses[variant] || colorClasses.green
      )}
    >
      {Icon && <Icon size={12} strokeWidth={2.25} className="shrink-0" />}
      <span className="font-extrabold">{label}</span>
    </button>
  );
}

