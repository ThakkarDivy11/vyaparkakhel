'use client';
import { useState } from 'react';
import { Volume2, VolumeX, Skull, LogOut, Info, BookOpen } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

// In-game menu — sound toggle, declare bankruptcy, leave the room.
export default function MenuModal({
  open,
  onClose,
  soundOn,
  onToggleSound,
  onLeaveGame,
  onDeclareBankruptcy,
  canDeclareBankruptcy,
}) {
  const [showRules, setShowRules] = useState(false);

  // When the modal fully closes, reset to the main menu view
  const handleClose = () => {
    onClose();
    setTimeout(() => setShowRules(false), 200);
  };

  if (showRules) {
    return (
      <Modal open={open} onClose={() => setShowRules(false)} title="Game Rules" size="lg">
        <div className="max-h-[60vh] overflow-y-auto pr-3 flex flex-col gap-5 text-sm text-text">
          <div>
            <h3 className="text-lg font-bold text-emerald-800 mb-2 flex items-center gap-2">
              🎲 Official Rules
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-text-muted">
              <li>Each player starts with starting money.</li>
              <li>All players begin from GO.</li>
              <li>Players roll dice to move around the board.</li>
              <li>If a property is unowned, the player may buy it.</li>
              <li>If the player does not buy the property, it goes to auction.</li>
              <li>Landing on another player’s property requires paying rent.</li>
              <li>Completing a full color set allows double rent collection.</li>
              <li>Players can build houses after owning a full color set.</li>
              <li>After building 4 houses, a hotel can be built.</li>
              <li>Passing GO rewards the player with ₹200.</li>
              <li>Chance and Community Chest cards must be followed as instructed.</li>
              <li>Rolling doubles 3 times in a row sends the player to Jail.</li>
              <li>A player can leave Jail by: rolling doubles, paying ₹50, or using a Get Out of Jail Free card.</li>
              <li>Mortgaged properties cannot collect rent.</li>
              <li>A player becomes bankrupt if they cannot pay debts and have no assets left.</li>
              <li>The last remaining player wins the game.</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-bold text-saffron-600 mb-2 flex items-center gap-2">
              🇮🇳 Optional Indian House Rules
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-text-muted">
              <li>All fines are collected in Free Parking.</li>
              <li>The player landing on Free Parking receives all collected money.</li>
              <li>Players may lend money to each other.</li>
              <li>Landing exactly on GO may give double reward.</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={() => setShowRules(false)}>Back to Menu</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title="Menu" size="sm">
      <div className="flex flex-col gap-2">
        <Row
          icon={BookOpen}
          label="Game Rules"
          onClick={() => setShowRules(true)}
        />
        
        <Row
          icon={soundOn ? Volume2 : VolumeX}
          label={soundOn ? 'Sound on' : 'Sound off'}
          onClick={onToggleSound}
        />

        <Row
          icon={Info}
          label="About व्यापार खेल"
          onClick={() => window.open('/settings/about', '_blank')}
        />

        <div className="h-px bg-border my-1" />

        <Button
          variant="destructive"
          size="md"
          fullWidth
          icon={<Skull size={16} />}
          disabled={!canDeclareBankruptcy}
          onClick={() => {
            if (!confirm('Declare bankruptcy? This ends the game for you.')) return;
            onDeclareBankruptcy();
            handleClose();
          }}
        >
          Declare bankruptcy
        </Button>

        <Button
          variant="ghost"
          size="md"
          fullWidth
          icon={<LogOut size={16} />}
          onClick={() => {
            if (!confirm('Leave the game? You can rejoin with the room code.')) return;
            onLeaveGame();
            handleClose();
          }}
        >
          Leave game
        </Button>
      </div>
    </Modal>
  );
}

function Row({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-2 hover:bg-murrey-200 border border-border transition-colors duration-150 ease-out text-left"
    >
      <Icon size={18} className="text-text shrink-0" />
      <span className="flex-1 text-sm text-text font-medium">{label}</span>
    </button>
  );
}
