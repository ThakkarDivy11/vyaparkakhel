'use client';
import { TOKEN_COLORS } from '@/lib/boardLayout';

// `myUserId` is the Clerk providerId — match against player.providerId
// (server stores it on each player record), not against game.hostUserId
// which is a Mongo ObjectId.
export default function LobbyRoom({ game, lobbyData, myUserId, onReady, onStart }) {
  if (!game) return null;
  const rawPlayers = lobbyData?.players ?? game.players ?? [];
  const isPassAndPlay = game.settings?.mode === 'pass_and_play';
  const isVsComputer = game.settings?.mode === 'vs_computer';
  const skipDedupe = isPassAndPlay || isVsComputer;

  // Defensive dedupe by providerId — backend has a Redis lock now, but
  // any legacy/duplicate entries shouldn't render twice.
  const seen = new Set();
  const players = rawPlayers.filter(p => {
    const key = skipDedupe ? p.seat : (p.providerId || p.userId?.toString() || p.seat);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const myPlayer = players.find(p => p.providerId === myUserId);
  // The host is whoever has seat 0 (set on createGame).
  const isHost = myPlayer?.seat === 0;
  const hostSeat = 0;
  // Allow solo-start (host alone) for development/testing. With friends,
  // the host can still wait for everyone before clicking Start.
  const allReady = players.length >= 1 && players.every(p => p.isReady);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-black text-yellow-400">Waiting Room</h1>
        <p className="text-gray-400 mt-1">Share this code with friends:</p>
        <div className="text-4xl font-mono font-black text-white tracking-widest mt-2">
          {game.roomCode}
        </div>
      </div>

      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-sm text-gray-400 font-semibold mb-3">PLAYERS ({players.length}/{game.settings?.maxPlayers ?? 4})</h2>
        <div className="flex flex-col gap-2">
          {players.map(p => (
            <div key={p.seat} className="flex items-center gap-3 bg-gray-700 rounded-lg px-4 py-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white"
                style={{ backgroundColor: TOKEN_COLORS[p.seat % TOKEN_COLORS.length] }}
              >
                {(p.displayName ?? '?')[0].toUpperCase()}
              </div>
              <span className="flex-1 font-semibold">{p.displayName}</span>
              {p.seat === hostSeat && (
                <span className="text-xs text-yellow-400 font-bold">HOST</span>
              )}
              <span className={`text-xs font-bold ${p.isReady ? 'text-green-400' : 'text-gray-500'}`}>
                {p.isReady ? '✓ READY' : 'NOT READY'}
              </span>
            </div>
          ))}
          {players.length < (game.settings?.maxPlayers ?? 4) && (
            <div className="flex items-center gap-3 bg-gray-700/50 rounded-lg px-4 py-3 border border-dashed border-gray-600">
              <span className="text-gray-500 text-sm">Waiting for players…</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 w-full max-w-md">
        <button
          onClick={onReady}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-500 transition"
        >
          Toggle Ready
        </button>
        {isHost && (
          <button
            onClick={onStart}
            disabled={!allReady}
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl hover:bg-yellow-300 disabled:opacity-40 transition"
          >
            {allReady ? 'Start Game!' : `Waiting for all players to be ready…`}
          </button>
        )}
      </div>
    </div>
  );
}
