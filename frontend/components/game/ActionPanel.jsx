'use client';

// Renders context-sensitive action buttons based on game phase.
// `onAction(type, extra)` fires the socket game_action.
// `currentSpace` is SPACES[myPlayer.position] — passed by parent so we can
// label the Buy button with the actual price and disable it if unaffordable.
export default function ActionPanel({ gameState, myPlayer, currentSpace, onAction }) {
  if (!gameState || !myPlayer) return null;
  const { phase, pendingTrade } = gameState;
  const isMyTurn = gameState.currentTurnSeat === myPlayer.seat;

  const buttons = [];

  // Jail actions
  if (phase === 'roll' && isMyTurn && myPlayer.inJail) {
    if (myPlayer.balance >= 50) {
      buttons.push({ label: 'Pay M50 Bail', type: 'PAY_BAIL', style: 'yellow' });
    }
    if (myPlayer.jailFreeCards > 0) {
      buttons.push({ label: 'Use Jail Free Card', type: 'USE_JAIL_FREE_CARD', style: 'green' });
    }
  }

  // Post-roll (just landed on unowned property)
  if (phase === 'post_roll' && isMyTurn) {
    const price = currentSpace?.price;
    const canAfford = price != null && myPlayer.balance >= price;
    buttons.push({
      label: price != null ? `Buy for M${price}` : 'Buy',
      type: 'BUY_PROPERTY',
      style: 'green',
      disabled: !canAfford,
    });
    buttons.push({ label: 'Decline (Auction)', type: 'DECLINE_PROPERTY', style: 'gray' });
  }

  // Manage phase
  if (phase === 'manage' && isMyTurn) {
    if (!pendingTrade) {
      buttons.push({ label: 'End Turn', type: 'END_TURN', style: 'yellow' });
      buttons.push({ label: 'Declare Bankruptcy', type: 'DECLARE_BANKRUPTCY', style: 'red' });
    }
  }

  // Trade response (not necessarily your turn)
  if (pendingTrade?.targetSeat === myPlayer.seat) {
    buttons.push({ label: 'Accept Trade', type: 'ACCEPT_TRADE', style: 'green' });
    buttons.push({ label: 'Reject Trade', type: 'REJECT_TRADE', style: 'red' });
  }
  if (pendingTrade?.offerSeat === myPlayer.seat) {
    buttons.push({ label: 'Cancel Trade Offer', type: 'CANCEL_TRADE', style: 'gray' });
  }

  if (buttons.length === 0) return null;

  const styleMap = {
    yellow: 'bg-yellow-400 text-black hover:bg-yellow-300',
    green:  'bg-green-600 text-white hover:bg-green-500',
    red:    'bg-red-600 text-white hover:bg-red-500',
    gray:   'bg-gray-600 text-white hover:bg-gray-500',
  };

  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map(btn => (
        <button
          key={btn.type}
          onClick={() => onAction(btn.type)}
          disabled={btn.disabled}
          className={`font-semibold px-4 py-2 rounded-lg transition text-sm disabled:opacity-40 disabled:cursor-not-allowed ${styleMap[btn.style]}`}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
