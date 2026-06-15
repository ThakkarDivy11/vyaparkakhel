'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Volume2, VolumeX, Music, Music2, Info, ChevronRight,
} from 'lucide-react';
import { PageBackground } from '@/components/ui';

// Settings as a dedicated page (Blueprints §5: settings in a modal is an
// anti-pattern). iPhone-style grouped rows with auto-save toggles.
export default function SettingsPage() {
  const router = useRouter();
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSoundOn(localStorage.getItem('vk_sound') !== 'off');
    setMusicOn(localStorage.getItem('vk_music') === 'on');
  }, []);

  const setSound = (v) => {
    setSoundOn(v);
    localStorage.setItem('vk_sound', v ? 'on' : 'off');
  };
  const setMusic = (v) => {
    setMusicOn(v);
    localStorage.setItem('vk_music', v ? 'on' : 'off');
  };

  return (
    <PageBackground>
      <main className="min-h-screen max-w-xl mx-auto p-4 sm:p-6">
        {/* Page header (Blueprints: page title left, back action) */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-surface text-text hover:bg-surface-2 transition-colors duration-150 ease-out"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        </div>

        {/* AUDIO group */}
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

        {/* INFO group */}
        <SectionHeader className="mt-6">About</SectionHeader>
        <Group>
          <Row
            icon={<Info size={18} />}
            label="About व्यापार खेल"
            right={<ChevronRight size={18} className="text-text-muted" />}
            onClick={() => router.push('/settings/about')}
            interactive
          />
        </Group>

        <p className="text-center text-text-muted text-xs mt-10 tabular-nums">
          v0.1 · early access
        </p>
      </main>
    </PageBackground>
  );
}

/* ─── iPhone-style row primitives ──────────────────────────────────────── */

function SectionHeader({ children, className = '' }) {
  return (
    <p className={`text-[11px] uppercase tracking-wider font-semibold text-text-muted px-3 mb-2 ${className}`}>
      {children}
    </p>
  );
}

function Group({ children }) {
  return (
    <div className="bg-surface border border-border shadow-(--shadow-sm) rounded-2xl overflow-hidden">
      {children}
    </div>
  );
}

function Row({ icon, label, right, onClick, interactive }) {
  const Tag = interactive ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`w-full min-h-14 flex items-center gap-3 px-4 py-3 text-left ${
        interactive ? 'hover:bg-surface-2 transition-colors duration-150 ease-out' : ''
      }`}
    >
      <span className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-surface-2 text-text shrink-0">
        {icon}
      </span>
      <span className="flex-1 text-sm text-text font-medium">{label}</span>
      {right}
    </Tag>
  );
}

function RowDivider() {
  return <div className="ml-15 h-px bg-border" />;
}

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-out ${
        on ? 'bg-emerald-600' : 'bg-border-strong'
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-[left] duration-200 ease-out ${
          on ? 'left-5' : 'left-0.5'
        }`}
      />
    </button>
  );
}
