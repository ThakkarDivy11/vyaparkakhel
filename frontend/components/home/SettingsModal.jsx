'use client';
import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Music, Music2, Info, ChevronRight } from 'lucide-react';
import Modal from '@/components/ui/Modal';

// iPhone-style grouped settings:
// • Section headers in caps, muted
// • Rows with rounded group corners, separators between
// • Toggle switches for booleans, chevrons for navigation
export default function SettingsModal({ open, onClose }) {
  // Persisted toggle state (localStorage)
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSoundOn(localStorage.getItem('vk_sound') !== 'off');
    setMusicOn(localStorage.getItem('vk_music') === 'on');
  }, [open]);

  const setSound = (v) => {
    setSoundOn(v);
    localStorage.setItem('vk_sound', v ? 'on' : 'off');
  };
  const setMusic = (v) => {
    setMusicOn(v);
    localStorage.setItem('vk_music', v ? 'on' : 'off');
  };

  if (showAbout) {
    return (
      <Modal open={open} onClose={() => { setShowAbout(false); onClose?.(); }} title="About व्यापार खेल" size="md">
        <div className="space-y-3 text-sm text-alabaster-800/80 leading-relaxed">
          <p>
            <strong className="text-alabaster-800">व्यापार खेल</strong> is a multiplayer business
            board game inspired by Monopoly India Edition. Built for playing with friends and family.
          </p>
          <p className="text-alabaster-700/60">Version 0.1 · Phase 1 (early access)</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Settings" size="md">
      {/* AUDIO */}
      <SectionHeader>Audio</SectionHeader>
      <Group>
        <Row
          icon={soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          label="Sound effects"
          right={<Toggle on={soundOn} onChange={setSound} />}
        />
        <RowDivider />
        <Row
          icon={musicOn ? <Music size={18} /> : <Music2 size={18} />}
          label="Background music"
          right={<Toggle on={musicOn} onChange={setMusic} />}
        />
      </Group>

      {/* INFO */}
      <SectionHeader className="mt-6">About</SectionHeader>
      <Group>
        <Row
          icon={<Info size={18} />}
          label="About व्यापार खेल"
          right={<ChevronRight size={18} className="text-alabaster-700/40" />}
          onClick={() => setShowAbout(true)}
          interactive
        />
      </Group>
    </Modal>
  );
}

/* ─── iPhone-style row primitives ──────────────────────────────────────── */

function SectionHeader({ children, className = '' }) {
  return (
    <p className={`text-[11px] uppercase tracking-wider font-semibold text-alabaster-700/60 px-3 mb-2 ${className}`}>
      {children}
    </p>
  );
}

function Group({ children }) {
  return (
    <div className="bg-murrey-100 border border-murrey-300 rounded-2xl overflow-hidden">
      {children}
    </div>
  );
}

function Row({ icon, label, right, onClick, interactive }) {
  const Tag = interactive ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left ${
        interactive ? 'hover:bg-murrey-200 active:bg-murrey-300 transition' : ''
      }`}
    >
      <span className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-white text-alabaster-700 shrink-0">
        {icon}
      </span>
      <span className="flex-1 text-sm text-alabaster-800 font-medium">{label}</span>
      {right}
    </Tag>
  );
}

function RowDivider() {
  return <div className="ml-15 h-px bg-murrey-300" />;
}

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      className={`relative w-11 h-6 rounded-full transition ${
        on ? 'bg-emerald-600' : 'bg-murrey-400'
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition ${
          on ? 'left-5' : 'left-0.5'
        }`}
      />
    </button>
  );
}
