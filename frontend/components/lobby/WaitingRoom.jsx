'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Check, Share2, UserPlus, Play, Loader2 } from 'lucide-react';
import { Button, PageBackground } from '@/components/ui';
import Avatar from '@/components/ui/Avatar';
import { toast } from '@/lib/toast';

// Waiting room (game.status === 'waiting').
// • Big shareable room code with Copy + Share
// • Player slots: filled cards + dashed empty cards
// • No "Toggle Ready" — joining means ready
// • Host gets Start button when ≥2 players (or auto-start when full, handled
//   by the game page's effect)
// • Everyone gets Back to Home
export default function WaitingRoom({
  game,
  lobbyData,
  myUserId,
  onStart,
  starting,
  socket,
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!socket) return;
    function onCancelled() {
      toast.error('Host left — room cancelled');
      router.push('/');
    }
    socket.on('room_cancelled', onCancelled);
    return () => socket.off('room_cancelled', onCancelled);
  }, [socket, router]);

  if (!game) return null;

  const isPassAndPlay = game.settings?.mode === 'pass_and_play';
  const isVsComputer = game.settings?.mode === 'vs_computer';
  const skipDedupe = isPassAndPlay || isVsComputer;

  // Dedupe by providerId (defensive)
  const rawPlayers = lobbyData?.players ?? game.players ?? [];
  const seen = new Set();
  const players = rawPlayers.filter((p) => {
    const k = skipDedupe ? p.seat : (p.providerId || p.userId?.toString() || p.seat);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const myPlayer = players.find((p) => p.providerId === myUserId);
  const isHost = myPlayer?.seat === 0;
  const maxPlayers = game.settings?.maxPlayers ?? 4;
  const canStart = players.length >= 2;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(game.roomCode);
      setCopied(true);
      toast.success('Code copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  }

  async function shareCode() {
    const url = `${window.location.origin}/game/${game.roomCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'व्यापार खेल',
          text: `Join my game! Room code: ${game.roomCode}`,
          url,
        });
      } catch {
        // user cancelled — silent
      }
    } else {
      // Fallback: copy share URL
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied');
      } catch {
        toast.error('Could not share');
      }
    }
  }

  const activeTheme = lobbyData?.settings?.boardTheme || game.settings?.boardTheme || 'flat';

  async function handleThemeChange(theme) {
    if (!isHost || !socket) return;
    socket.emit('update_settings', { boardTheme: theme }, (res) => {
      if (!res || !res.ok) {
        toast.error(res?.error || 'Failed to update board theme');
      }
    });
  }

  return (
    <PageBackground>
      <main className="min-h-screen max-w-md mx-auto p-4 sm:p-6 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push('/')}
            aria-label="Back to home"
            className="w-10 h-10 inline-flex items-center justify-center rounded-full parchment-card hover:bg-murrey-300 transition-colors duration-150 ease-out"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold tracking-tight text-white">Waiting Room</h1>
        </div>

        {/* Room code card — the focal point of this page */}
        <div className="parchment-card rounded-2xl p-6 text-center mb-6">
          <p className="text-[11px] uppercase tracking-widest font-semibold text-text-muted mb-3">
            Share this code with friends
          </p>
          <div className="font-mono font-extrabold text-5xl sm:text-6xl tracking-[0.15em] tabular-nums text-text mb-5 select-all">
            {game.roomCode}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              icon={copied ? <Check size={16} /> : <Copy size={16} />}
              onClick={copyCode}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              icon={<Share2 size={16} />}
              onClick={shareCode}
            >
              Share
            </Button>
          </div>
        </div>

        {/* Player slots */}
        <div className="parchment-card rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between px-1 mb-3">
            <p className="text-[11px] uppercase tracking-widest font-semibold text-text-muted">
              Players
            </p>
            <p className="text-sm font-bold tabular-nums text-text">
              {players.length} / {maxPlayers}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {players.map((p) => (
              <PlayerRow
                key={p.seat}
                player={p}
                isHost={p.seat === 0}
                isMe={p.providerId === myUserId}
              />
            ))}
            {Array.from({ length: Math.max(0, maxPlayers - players.length) }).map((_, i) => (
              <EmptySlot key={`empty-${i}`} index={players.length + i} />
            ))}
          </div>
        </div>


        {/* Host CTA / hint for non-host */}
        {isHost ? (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={starting ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />}
            disabled={!canStart || starting}
            onClick={onStart}
          >
            {starting ? 'Starting…' : canStart ? 'Start Game' : `Need ${2 - players.length} more`}
          </Button>
        ) : (
          <div className="text-center parchment-card rounded-2xl py-4 px-6">
            <Loader2 size={20} className="animate-spin text-portage-600 mx-auto mb-2" />
            <p className="text-sm text-text-muted">
              Waiting for the host to start the game…
            </p>
          </div>
        )}

        <p className="mt-auto pt-8 text-center text-xs text-white/50">
          Game starts when host clicks Start.
        </p>
      </main>
    </PageBackground>
  );
}

function PlayerRow({ player, isHost, isMe }) {
  return (
    <div className="flex items-center gap-3 bg-[#ebdcb9]/40 border border-[#dcd0b4] rounded-xl px-3 py-2.5">
      <Avatar name={player.displayName} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-text truncate flex items-center gap-1.5">
          {player.displayName}
          {isMe && (
            <span className="text-[10px] uppercase tracking-wider font-semibold text-white bg-portage-600 px-1.5 py-0.5 rounded">
              You
            </span>
          )}
        </p>
      </div>
      {isHost && (
        <span className="text-[10px] uppercase tracking-widest font-bold text-saffron-600">
          HOST
        </span>
      )}
    </div>
  );
}

function EmptySlot({ index }) {
  return (
    <div className="flex items-center gap-3 border border-dashed border-[#dcd0b4] rounded-xl px-3 py-2.5">
      <span className="w-8 h-8 rounded-full bg-[#ebdcb9]/30 inline-flex items-center justify-center text-text-muted shrink-0">
        <UserPlus size={14} />
      </span>
      <p className="text-sm text-text-muted">Waiting for player {index + 1}…</p>
    </div>
  );
}
