'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, useUser, SignInButton } from '@clerk/nextjs';
import useGameStore from '@/lib/gameStore';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { SPACES } from '@/lib/boardData';
import { COLOR_CLASSES, TOKEN_COLORS } from '@/lib/boardLayout';
import { Settings, Volume2, VolumeX, MessageSquare, Send, Star } from 'lucide-react';
import clsx from 'clsx';
import PawnIcon from '@/components/ui/PawnIcon';
import Board from '@/components/board/Board';
import PlayerPanel, { PropertyChip } from '@/components/game/PlayerPanel';
import Dice from '@/components/game/Dice';
import ActionBar from '@/components/game/ActionBar';
import AuctionPanel from '@/components/game/AuctionPanel';
import TradeDialog from '@/components/game/TradeDialog';
import CardPopup from '@/components/game/CardPopup';
import BuyAuctionModal from '@/components/game/BuyAuctionModal';
import TradeResponseModal from '@/components/game/TradeResponseModal';
import JailModal from '@/components/game/JailModal';
import MenuModal from '@/components/game/MenuModal';
import WaitingRoom from '@/components/lobby/WaitingRoom';
import { Avatar, Button, Modal, PageBackground, LoadingScreen } from '@/components/ui';
import { toast } from '@/lib/toast';

export default function GameRoom() {
  const { code } = useParams();
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken, userId: clerkUserId } = useAuth();
  const { user } = useUser();

  const { gameState, lobbyData, cardPopup, setGameState, setLobbyData, showCard, dismissCard, resetGameState } = useGameStore();

  const isPassAndPlay = gameState?.settings?.mode === 'pass_and_play';
  const currentTurnPlayer = gameState?.players?.find(p => p.seat === gameState?.currentTurnSeat);
  const myPlayer = isPassAndPlay
    ? currentTurnPlayer
    : (gameState?.players?.find(p => p.providerId === clerkUserId) ?? null);
  const isMyTurn = myPlayer != null && gameState?.currentTurnSeat === myPlayer.seat;

  const [game, setGame] = useState(null);       // REST game doc (for lobby)
  const [socket, setSocket] = useState(null);
  const [showTrade, setShowTrade] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileLog, setShowMobileLog] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [selectedMobilePlayerSeat, setSelectedMobilePlayerSeat] = useState(null);
  const selectedMobilePlayer = gameState?.players?.find(p => p.seat === selectedMobilePlayerSeat);
  const [error, setError] = useState('');
  const [bgImage, setBgImage] = useState('/backgrounds/bg_vintage.jpg');
  const [turnSeconds, setTurnSeconds] = useState(90);
  const [localChats, setLocalChats] = useState([]);
  const [chatText, setChatText] = useState('');
  // Pawn-hop gating: delay the buy/auction modal until the pawn reaches its space
  const [pawnHopDone, setPawnHopDone] = useState(true);
  const prevPhaseRef = useRef(null);
  // Guards init() against React StrictMode double-mount in dev. The init
  // does fetch + join, and we don't want two concurrent join requests.
  const initRanForRef = useRef(null);
  // Card popup: show when server delivers a new cardSeq
  const lastCardSeqRef = useRef(null);

  // Fetch game doc, auto-join if needed, then connect socket.
  // Skip entirely if Clerk hasn't loaded or the user isn't signed in.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    // Only run init once per (code, user) pair. StrictMode double-fires
    // mount/unmount/mount; without this guard both passes would fetch+join.
    // (The ref persists across mounts, so the second pass returns early.)
    const key = `${code}:${clerkUserId}`;
    if (initRanForRef.current === key) return;
    initRanForRef.current = key;
    // Wipe any state from a previous game so the "Game Over" overlay from
    // the last session never leaks onto this route. Safe here because the
    // StrictMode guard above ensures this runs exactly once per (code, user).
    resetGameState();

    (async function init() {
      try {
        const token = await getToken();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const headers = { Authorization: `Bearer ${token}` };

        // 1. Fetch the game by room code
        let res = await fetch(`${apiUrl}/games/code/${code}`, { headers });
        if (!res.ok) {
          setError(`Game not found (${res.status})`);
          return;
        }
        let data = await res.json();
        let fetchedGame = data.data.game;

        // 2. If the current Clerk user isn't in the player list, join.
        let joinFailed = false;
        let joinErrorMessage = null;
        if (clerkUserId && fetchedGame.status === 'waiting') {
          const alreadyJoined = fetchedGame.players.some(
            p => p.providerId === clerkUserId
          );
          if (!alreadyJoined) {
            const joinRes = await fetch(
              `${apiUrl}/games/${fetchedGame.gameId}/join`,
              { method: 'POST', headers }
            );
            if (joinRes.ok) {
              const joinData = await joinRes.json();
              fetchedGame = joinData.data.game;
            } else {
              joinFailed = true;
              try {
                const errBody = await joinRes.json();
                joinErrorMessage = errBody?.message || `Could not join (${joinRes.status})`;
              } catch {
                joinErrorMessage = `Could not join (${joinRes.status})`;
              }
            }
          }
        }
        setGame(fetchedGame);
        if (joinFailed) {
          setError(joinErrorMessage);
          return;
        }

        // Finished/cancelled games have no live state — show the static
        // result screen without opening a socket connection.
        if (['finished', 'cancelled'].includes(fetchedGame.status)) return;

        // 3. Connect the socket. Pass the Clerk getToken function (not the
        // current token) so socket.io can mint a fresh JWT on every
        // reconnect — Clerk JWTs are ~60s and reconnects after expiry
        // would otherwise fail auth with "JWT is expired".
        const sock = getSocket(fetchedGame.gameId, getToken);
        sock.on('connect', () => console.log('[socket] connected', sock.id));
        sock.on('disconnect', (r) => console.log('[socket] disconnected', r));
        sock.on('connect_error', (err) => {
          console.error('[socket] connect_error', err.message);
          setError(`Socket: ${err.message}`);
        });
        sock.on('state_update', setGameState);
        sock.on('lobby_update', (lobby) => {
          console.log('[socket] lobby_update', lobby);
          setLobbyData(lobby);
        });
        sock.connect();
        setSocket(sock);
      } catch (e) {
        setError(e.message);
      }
    })();
    // No cleanup: the ref guard prevents StrictMode double-init, and the
    // socket singleton survives navigation (rebuilds on different gameId).
  }, [code, clerkUserId, isLoaded, isSignedIn]);

  // Reset pawnHopDone when we enter post_roll so the buy modal waits for the pawn
  useEffect(() => {
    const curr = gameState?.phase;
    if (curr === 'post_roll' && prevPhaseRef.current !== 'post_roll') {
      setPawnHopDone(false);
    }
    prevPhaseRef.current = curr;
  }, [gameState?.phase]);

  // Show card popup whenever the server delivers a new card draw
  useEffect(() => {
    if (!gameState?.lastCard) return;
    if (gameState.cardSeq === lastCardSeqRef.current) return;
    lastCardSeqRef.current = gameState.cardSeq;
    showCard({ description: gameState.lastCard.description, deckType: gameState.lastCard.deck });
  }, [gameState?.cardSeq, gameState?.lastCard, showCard]);

  // Sync turn countdown timer with server turnDeadline (with clock-skew fallback)
  useEffect(() => {
    if (!gameState?.turnDeadline || gameState.status !== 'active') return;
    const limit = gameState.settings?.timePerTurnSec || 60;
    let initialRemaining = Math.ceil((gameState.turnDeadline - Date.now()) / 1000);
    if (initialRemaining <= 0 || initialRemaining > limit) {
      initialRemaining = limit;
    }
    setTurnSeconds(initialRemaining);
  }, [gameState?.turnDeadline, gameState?.status, gameState?.settings?.timePerTurnSec, gameState?.currentTurnSeat]);

  // Turn countdown timer ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setTurnSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Client-side fallback: if the local timer runs out and it is my turn,
  // emit a TIMEOUT action. This handles cases where the server background workers are down/delayed.
  useEffect(() => {
    if (turnSeconds === 0 && isMyTurn && socket && myPlayer) {
      socket.emit('game_action', { type: 'TIMEOUT', seat: myPlayer.seat }, (ack) => {
        if (!ack?.ok) console.warn('[timeout fallback] failed:', ack?.error);
      });
    }
  }, [turnSeconds, isMyTurn, socket, myPlayer]);

  const handleSendChat = useCallback(() => {
    if (!chatText.trim()) return;
    const sender = myPlayer ? myPlayer.displayName : 'Spectator';
    setLocalChats((prev) => [...prev, `${sender}: ${chatText}`]);
    setChatText('');
  }, [chatText, myPlayer]);

  const formatTime = (totalSecs) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const emitAction = useCallback((type, extra = {}) => {
    if (!socket) return;
    // Inject seat for pass & play mode
    if (extra.seat === undefined) {
      // Find current seat from game store or just pass it in
      // Actually, since emitAction doesn't have myPlayer, we will pass it from the component body below.
    }
    socket.emit('game_action', { type, ...extra }, (ack) => {
      if (!ack?.ok) setError(ack?.error || 'Action failed');
    });
  }, [socket]);

  // Players are auto-readied on join (server-side). Host clicks Start when
  // satisfied with the player count.
  const [starting, setStarting] = useState(false);
  async function handleStart() {
    setStarting(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/games/${game.gameId}/start`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.message);
        toast.error(data.message || 'Could not start game');
        setStarting(false);
        return;
      }
      // Optimistically transition the local view to "active" — the socket
      // event will follow and seed gameState properly. We keep `starting`
      // true so the host can't double-click Start while we wait.
      if (data.data?.game) setGame(data.data.game);
    } catch (e) {
      setError(e.message);
      toast.error(e.message);
      setStarting(false);
    }
  }

  // Clerk hasn't loaded yet → brief loading state
  if (!isLoaded) return (
    <PageBackground>
      <LoadingScreen message="Loading…" />
    </PageBackground>
  );

  // Not signed in → show sign-in prompt rather than infinite spinner
  if (!isSignedIn) return (
    <PageBackground>
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold mb-2">Join Game</h1>
          <p className="text-text-muted">
            Room code:{' '}
            <span className="font-mono font-bold text-text tracking-widest">{code}</span>
          </p>
          <p className="text-text-muted text-sm mt-2">
            Sign in to play with your friends.
          </p>
        </div>
        <SignInButton mode="modal" forceRedirectUrl={`/game/${code}`}>
          <Button variant="primary" size="lg">Sign in to join</Button>
        </SignInButton>
        <button
          onClick={() => router.push('/')}
          className="text-sm text-text-muted hover:text-text underline transition-colors duration-150 ease-out"
        >
          Back to home
        </button>
      </main>
    </PageBackground>
  );

  // Signed in but the REST fetch / join hasn't returned yet (or it errored)
  if (!game) return (
    <PageBackground>
      {error ? (
        <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
          <div className="text-text-muted">{error}</div>
          <Button variant="primary" size="md" onClick={() => router.push('/')}>
            Back to home
          </Button>
        </main>
      ) : (
        <LoadingScreen message="Loading game…" />
      )}
    </PageBackground>
  );

  // Game fetched but the user could not join (e.g. full, already started)
  // and is not a player — show a clear message instead of the lobby UI.
  const userIsPlayer = !!(clerkUserId && game.players?.some(p => p.providerId === clerkUserId));
  if (!userIsPlayer && game.status === 'waiting') {
    return (
      <PageBackground>
        <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center max-w-md mx-auto">
          <h1 className="text-2xl font-extrabold">Cannot join this game</h1>
          <p className="text-text-muted">
            {error || 'You are not a player in this room. The game may be full or already started.'}
          </p>
          <Button variant="primary" size="md" onClick={() => router.push('/')}>
            Back to home
          </Button>
        </main>
      </PageBackground>
    );
  }

  // Finished or cancelled game — no socket, just show a static result screen.
  if (game.status === 'finished' || game.status === 'cancelled') {
    return (
      <PageBackground>
        <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="text-5xl">{game.status === 'cancelled' ? '🚪' : '🏆'}</div>
          <div>
            <h1 className="text-2xl font-extrabold text-saffron-500">
              {game.status === 'cancelled' ? 'Room Cancelled' : 'Game Over'}
            </h1>
            <p className="text-text-muted mt-2">
              Room <span className="font-mono font-bold tracking-widest">{game.roomCode}</span> has already{' '}
              {game.status === 'cancelled' ? 'been cancelled' : 'finished'}.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={() => router.push('/')}>
            Back to Home
          </Button>
        </main>
      </PageBackground>
    );
  }

  // Waiting room — show until socket-pushed gameState says the game is
  // active. The REST-fetched `game` doc only refreshes for the host (who
  // calls POST /start); non-host clients only learn about the start via
  // the state_update socket event, so we trust gameState over game here.
  if (!gameState || gameState.status === 'waiting') {
    return (
      <WaitingRoom
        game={game}
        lobbyData={lobbyData}
        myUserId={clerkUserId}
        onStart={handleStart}
        starting={starting}
        socket={socket}
      />
    );
  }

  // Active game view — match by Clerk providerId (the only id we have client-side
  // that's also stored on each player record). NULL myPlayer = spectator (don't
  // fall back to seat 0 — that would let any viewer act as the host).
  const currentSpace = myPlayer ? SPACES[myPlayer.position] : null;

  // Auto-show Buy/Auction only after the pawn has physically arrived at the space
  const landedSpace = currentTurnPlayer ? SPACES[currentTurnPlayer.position] : null;
  const showBuyAuction =
    isMyTurn &&
    gameState.phase === 'post_roll' &&
    pawnHopDone &&
    landedSpace &&
    ['property', 'railway', 'utility'].includes(landedSpace.type) &&
    gameState.properties[landedSpace.id]?.owner == null;

  return (
    <PageBackground className="dark-royal-bg p-0 relative overflow-hidden w-screen h-screen">


      {/* Layout: three-column full screen view */}
      <div className="fixed inset-0 flex flex-col lg:flex-row items-stretch pt-2 pb-2 px-4 gap-3 overflow-hidden z-10">
        {error && (
          <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg text-sm z-50 shadow-(--shadow-md)">
            {error}
            <button onClick={() => setError('')} className="ml-3 font-bold">×</button>
          </div>
        )}

        {/* Left Column: Logo + Unified Gold Card Sidebar + Bottom Quick Settings */}
        <div className="hidden lg:flex w-48 shrink-0 flex-col gap-2.5 min-h-0">
          {/* Logo image: 3D Shield Banner style */}
          <div className="flex flex-col items-center justify-center select-none text-center shrink-0 py-1">
            <img 
              src="/logo_banner.png" 
              alt="Vyapar Khel Logo" 
              className="w-40 h-auto object-contain scale-100 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.65)]"
            />
          </div>

          {/* Unified Gold Sidebar Panel containing Profile, Actions, and Bank */}
          <div className="flex-1 gold-card p-3 flex flex-col gap-3 overflow-y-auto scrollbar-none min-h-0 relative">
            {/* Ornate corner decorations inside the main panel */}
            <CardCorners />

            {/* 1. Active Player Profile Row */}
            {myPlayer && (
              <div className="flex items-center gap-2 shrink-0 pb-2.5 border-b border-[#cbb992]/20">
                <Avatar
                  src={myPlayer.avatarUrl || user?.imageUrl}
                  name={myPlayer.displayName}
                  size="md"
                  className="border-2 border-[#ffd54f] ring-1 ring-[#ffe082]/35 shadow-[0_0_8px_rgba(255,213,79,0.3)] rounded-full w-10 h-10 object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs text-white truncate">{myPlayer.displayName}</p>
                  <p className="font-mono font-extrabold text-[#cbb992] text-xs">₹{myPlayer.balance.toLocaleString()}</p>
                </div>
                <div className="shrink-0 w-7 h-7 flex items-center justify-center">
                  <PawnIcon color={TOKEN_COLORS[myPlayer.seat % TOKEN_COLORS.length]} className="w-7 h-7 drop-shadow-sm" />
                </div>
              </div>
            )}

            {/* 2. Actions List */}
            <div className="flex-1 min-h-0">
              <ActionBar
                gameState={gameState}
                myPlayer={myPlayer}
                onAction={(type, extra = {}) => {
                  if (isPassAndPlay && myPlayer) extra.seat = myPlayer.seat;
                  emitAction(type, extra);
                }}
                onOpenMenu={() => setShowMenu(true)}
                onOpenManage={() => setShowManage(true)}
                onOpenTrade={() => setShowTrade(true)}
              />
            </div>

          </div>

          {/* Bottom Settings controls (moved from under the board to the bottom-left sidebar) */}
          <div className="flex items-center justify-around py-1 px-2.5 gold-card shrink-0">
            <button onClick={() => setShowMenu(true)} className="p-1.5 hover:bg-slate-800 rounded-lg text-[#cbb992] transition-colors" title="Settings">
              <Settings size={16} />
            </button>
            <button onClick={() => setSoundOn(!soundOn)} className="p-1.5 hover:bg-slate-800 rounded-lg text-[#cbb992] transition-colors" title={soundOn ? "Mute" : "Unmute"}>
              {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              onClick={() => {
                const chatInput = document.getElementById('chat-message-input');
                if (chatInput) chatInput.focus();
              }}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-[#cbb992] transition-colors"
              title="Chat"
            >
              <MessageSquare size={16} />
            </button>
          </div>
        </div>

        {/* Center Column: Board & Action Controls */}
        <div className="flex-1 h-full flex flex-col items-center justify-between lg:justify-center min-h-0 gap-1.5 py-1 lg:py-0">
          
          {/* Mobile Top Header: Player Avatars & Room Code */}
          <div className="w-full flex flex-col gap-1.5 lg:hidden shrink-0">
            <div className="flex items-center justify-between px-1">
              {/* Settings / Menu Button */}
              <button 
                onClick={() => setShowMenu(true)} 
                className="gold-card p-1.5 text-[#cbb992] flex items-center justify-center rounded-lg cursor-pointer"
              >
                <Settings size={18} />
              </button>
              
              {/* Room Code */}
              <div className="gold-card px-3 py-1 flex items-center gap-2">
                <span className="text-[10px] text-[#cbb992] font-black uppercase">Code:</span>
                <span className="text-white font-mono font-bold text-xs tracking-wider select-all">{code}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(code);
                    toast.success('Room code copied!');
                  }}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[#cbb992] text-[8px] font-bold rounded uppercase tracking-wider transition-colors border border-slate-700 cursor-pointer"
                >
                  Copy
                </button>
              </div>

              {/* Chat / Log Toggle Button */}
              <button 
                onClick={() => setShowMobileLog(true)} 
                className="gold-card p-1.5 text-[#cbb992] flex items-center justify-center rounded-lg cursor-pointer"
              >
                <MessageSquare size={18} />
              </button>
            </div>

            {/* Players list horizontal scrollable row */}
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none justify-start px-1">
              {gameState.players.map(p => {
                const isCurrentTurn = gameState.currentTurnSeat === p.seat;
                return (
                  <div 
                    key={p.seat} 
                    onClick={() => setSelectedMobilePlayerSeat(p.seat)}
                    className={clsx(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-xl shrink-0 border transition-all duration-200 cursor-pointer active:scale-95 hover:bg-slate-900/40 select-none",
                      isCurrentTurn 
                        ? "bg-[#cbb992]/20 border-[#ffd54f] shadow-[0_0_8px_rgba(255,213,79,0.3)]" 
                        : "bg-black/60 border-slate-800"
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar
                        src={p.avatarUrl}
                        name={p.displayName}
                        size="xs"
                        className={clsx(
                          "rounded-full w-6 h-6 object-cover",
                          isCurrentTurn ? "border border-[#ffd54f]" : "border border-slate-700"
                        )}
                      />
                      <div className="absolute -top-1.5 -right-1.5">
                        <PawnIcon color={TOKEN_COLORS[p.seat % TOKEN_COLORS.length]} className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="flex flex-col leading-none">
                      <span className={clsx("text-[9px] font-bold truncate max-w-[60px]", p.isBankrupt ? "text-red-500 line-through" : "text-white")}>
                        {p.displayName}
                      </span>
                      <span className="text-[9px] font-mono font-extrabold text-[#cbb992] mt-0.5">
                        ₹{p.balance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex-1 w-full flex items-center justify-center min-h-0">
            <Board
              gameState={gameState}
              myPlayerSeat={myPlayer?.seat}
              onHopComplete={() => setPawnHopDone(true)}
              bgImage={bgImage}
              centerSlot={
                <CenterHub
                  freeParkingPool={gameState.freeParkingPool}
                />
              }
            />
          </div>

          {/* Mobile Action Buttons Bar */}
          <div className="w-full px-2 block lg:hidden shrink-0">
            <ActionBar
              gameState={gameState}
              myPlayer={myPlayer}
              onAction={(type, extra = {}) => {
                if (isPassAndPlay && myPlayer) extra.seat = myPlayer.seat;
                emitAction(type, extra);
              }}
              onOpenMenu={() => setShowMenu(true)}
              onOpenManage={() => setShowManage(true)}
              onOpenTrade={() => setShowTrade(true)}
            />
          </div>

          {/* Footer Controls under Board */}
          <div className="w-full max-w-2xl flex items-stretch gap-2 shrink-0 px-2 pb-1">

            {/* Current Turn status */}
            {currentTurnPlayer && (
              <div className="gold-card px-2.5 py-1 flex items-center gap-2 shrink-0">
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase tracking-widest text-[#cbb992] font-black">
                    Current Turn
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <PawnIcon color={TOKEN_COLORS[currentTurnPlayer.seat % TOKEN_COLORS.length]} className="w-4 h-4 drop-shadow-sm" />
                    <span className="text-white font-bold text-[11px] truncate max-w-[75px] leading-none">
                      {currentTurnPlayer.displayName}
                    </span>
                  </div>
                </div>
                <div className="text-emerald-400 font-mono font-bold text-[11px] tracking-wide bg-slate-950/50 px-1.5 py-0.5 rounded border border-emerald-950/50">
                  {formatTime(turnSeconds)}
                </div>
              </div>
            )}

            <div className="flex-1" />

            {/* Last Roll status */}
            <div className="gold-card px-2.5 py-1 flex flex-col justify-center items-center shrink-0 min-w-[80px]">
              <span className="text-[8px] uppercase tracking-widest text-[#cbb992] font-black">
                Last Roll
              </span>
              <div className="text-white font-extrabold text-xs tracking-wide mt-0.5 font-mono">
                {gameState.lastDice ? (
                  `${gameState.lastDice[0]} + ${gameState.lastDice[1]} = ${gameState.lastDice[0] + gameState.lastDice[1]}`
                ) : (
                  '0 + 0 = 0'
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Multiplayer info + Players list + Activity log */}
        <div className="hidden lg:flex w-56 shrink-0 flex-col gap-2.5 min-h-0">
          {/* Online Multiplayer info */}
          <div className="gold-card p-2.5 flex flex-col gap-1 w-full shrink-0">
            <div className="flex justify-between items-center text-[9px] font-black uppercase text-[#cbb992] border-b border-slate-800 pb-1 mb-0.5">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
                Multiplayer
              </span>
              <span className="bg-slate-900/80 px-1.5 py-0.5 rounded text-white text-[8px] font-bold border border-slate-800">
                {gameState.players.length} Players
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span>Code: <span className="font-mono font-black text-yellow-400 tracking-wider select-all">{code}</span></span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  toast.success('Room code copied!');
                }}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[#cbb992] text-[9px] font-bold rounded uppercase tracking-wider transition-colors border border-slate-700"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Players list */}
          <div className="flex flex-col gap-1.5 shrink-0">
            {gameState.players.map(p => (
              <PlayerPanel
                key={p.seat}
                player={p}
                isCurrentTurn={gameState.currentTurnSeat === p.seat}
                properties={gameState.properties}
              />
            ))}
          </div>

          {/* Game Activity feed & Chat input */}
          <LogTail
            log={gameState.log}
            players={gameState.players}
            localChats={localChats}
            chatText={chatText}
            setChatText={setChatText}
            onSendChat={handleSendChat}
          />
        </div>
      </div>

      {/* Overlays */}
      {gameState.phase === 'auction' && (
        <AuctionPanel
          auction={gameState.auction}
          players={gameState.players}
          myPlayer={myPlayer}
          onAction={(type, extra = {}) => {
            if (isPassAndPlay && myPlayer) extra.seat = myPlayer.seat;
            emitAction(type, extra);
          }}
        />
      )}

      <BuyAuctionModal
        open={showBuyAuction}
        space={landedSpace}
        myPlayer={myPlayer}
        onBuy={() => {
          const extra = isPassAndPlay && myPlayer ? { seat: myPlayer.seat } : {};
          emitAction('BUY_PROPERTY', extra);
        }}
        onDecline={() => {
          const extra = isPassAndPlay && myPlayer ? { seat: myPlayer.seat } : {};
          emitAction('DECLINE_PROPERTY', extra);
        }}
      />

      <JailModal
        open={isMyTurn && gameState.phase === 'roll' && myPlayer?.inJail}
        myPlayer={myPlayer}
        onAction={(type, extra = {}) => {
          if (isPassAndPlay && myPlayer) extra.seat = myPlayer.seat;
          emitAction(type, extra);
        }}
      />

      <TradeResponseModal
        pendingTrade={gameState.pendingTrade}
        myPlayer={myPlayer}
        players={gameState.players}
        onAction={(type, extra = {}) => {
          if (isPassAndPlay && myPlayer) extra.seat = myPlayer.seat;
          emitAction(type, extra);
        }}
      />

      {showTrade && (
        <TradeDialog
          gameState={gameState}
          myPlayer={myPlayer}
          players={gameState.players}
          onAction={(type, extra = {}) => {
            if (isPassAndPlay && myPlayer) extra.seat = myPlayer.seat;
            emitAction(type, extra);
          }}
          onClose={() => setShowTrade(false)}
        />
      )}

      <ManageModal
        open={showManage}
        onClose={() => setShowManage(false)}
        gameState={gameState}
        myPlayer={myPlayer}
        onAction={(type, extra = {}) => {
          if (isPassAndPlay && myPlayer) extra.seat = myPlayer.seat;
          emitAction(type, extra);
        }}
      />

      <MenuModal
        open={showMenu}
        onClose={() => setShowMenu(false)}
        soundOn={soundOn}
        onToggleSound={() => setSoundOn((s) => !s)}
        onLeaveGame={() => {
          const extra = isPassAndPlay && myPlayer ? { seat: myPlayer.seat } : {};
          emitAction('LEAVE_GAME', extra);
          disconnectSocket();
          resetGameState();
          router.push('/');
        }}
        onDeclareBankruptcy={() => {
          const extra = isPassAndPlay && myPlayer ? { seat: myPlayer.seat } : {};
          emitAction('DECLARE_BANKRUPTCY', extra);
        }}
        canDeclareBankruptcy={!!myPlayer && !myPlayer.isBankrupt}
      />

      <CardPopup card={cardPopup} onDismiss={dismissCard} />

      {/* Mobile Chat & Log Modal */}
      {showMobileLog && (
        <Modal 
          open={showMobileLog} 
          onClose={() => setShowMobileLog(false)} 
          title="Game Activity & Chat"
          size="md"
        >
          <div className="h-[55vh] flex flex-col">
            <LogTail
              log={gameState.log}
              players={gameState.players}
              localChats={localChats}
              chatText={chatText}
              setChatText={setChatText}
              onSendChat={handleSendChat}
            />
          </div>
        </Modal>
      )}

      {/* Mobile Player Info & Properties Modal */}
      {selectedMobilePlayerSeat !== null && selectedMobilePlayer && (
        <Modal
          open={selectedMobilePlayerSeat !== null}
          onClose={() => setSelectedMobilePlayerSeat(null)}
          title={`${selectedMobilePlayer.displayName}'s Assets`}
          size="md"
        >
          <div className="flex flex-col gap-4 p-1">
            {/* Player Profile Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-[#cbb992]/20">
              <Avatar
                src={selectedMobilePlayer.avatarUrl}
                name={selectedMobilePlayer.displayName}
                size="md"
                className="border-2 border-[#ffd54f] ring-1 ring-[#ffe082]/35 shadow-[0_0_8px_rgba(255,213,79,0.3)] rounded-full w-12 h-12 object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-base text-white truncate flex items-center gap-1.5">
                  <span>{selectedMobilePlayer.displayName}</span>
                  {selectedMobilePlayer.inJail && (
                    <span className="text-[9px] bg-red-950/80 text-red-400 border border-red-900 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                      Jail
                    </span>
                  )}
                  {selectedMobilePlayer.isBankrupt && (
                    <span className="text-[9px] bg-red-950/80 text-red-500 border border-red-950 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                      Bankrupt
                    </span>
                  )}
                </div>
                <p className="font-mono font-extrabold text-[#cbb992] text-sm mt-0.5">
                  ₹{selectedMobilePlayer.balance.toLocaleString()}
                </p>
              </div>
              <div className="shrink-0 w-8 h-8 flex items-center justify-center">
                <PawnIcon color={TOKEN_COLORS[selectedMobilePlayer.seat % TOKEN_COLORS.length]} className="w-8 h-8 drop-shadow-sm" />
              </div>
            </div>

            {/* Properties List */}
            <div>
              <h4 className="text-xs font-black uppercase text-[#cbb992] tracking-wider mb-2">
                Owned Properties ({
                  gameState.properties
                    ? Object.values(gameState.properties).filter(ps => ps.owner === selectedMobilePlayer.seat).length
                    : 0
                })
              </h4>
              <div className="max-h-60 overflow-y-auto scrollbar-thin flex flex-col gap-1.5 pr-1">
                {(() => {
                  const owned = gameState.properties
                    ? Object.entries(gameState.properties)
                        .filter(([, ps]) => ps.owner === selectedMobilePlayer.seat)
                        .map(([id, ps]) => {
                          const space = SPACES.find(s => s.id === id);
                          return space ? { id, space, ps } : null;
                        })
                        .filter(Boolean)
                    : [];

                  if (owned.length === 0) {
                    return (
                      <p className="text-xs text-slate-500 text-center py-4">
                        No properties owned yet.
                      </p>
                    );
                  }

                  return owned.map(({ id, space, ps }) => (
                    <PropertyChip key={id} space={space} ps={ps} />
                  ));
                })()}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Guard by gameId so stale state from a prior game never shows here */}
      {gameState.status === 'finished' && game && gameState.gameId === game.gameId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-alabaster-900/70 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl p-8 text-center max-w-sm shadow-2xl">
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="text-2xl font-black text-saffron-500">Game Over!</h2>
            <p className="text-text-muted mt-2">
              {gameState.players.find(p => !p.isBankrupt)?.displayName} wins!
            </p>
            <Button variant="primary" size="md" className="mt-6" onClick={() => {
              resetGameState();
              router.push('/');
            }}>
              Back to Home
            </Button>
          </div>
        </div>
      )}
    </PageBackground>
  );
}

// Tail-of-log preview shown in the sidebar. Last few events only —
// scrollable, with newest at the bottom. Click Log in the ActionBar for
// the full modal.
// Tail-of-log preview shown in the sidebar. Last few events only —
// scrollable, with newest at the bottom.
function LogTail({ log, players, localChats, chatText, setChatText, onSendChat }) {
  const entries = log ?? [];
  // Merge server log and local chats
  const displayLogs = [...entries.map(e => ({ type: 'log', text: e })), ...localChats.map(c => ({ type: 'chat', text: c }))];
  const tail = displayLogs.slice(-40);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayLogs.length]);

  // Find player pawn color to show next to their action line
  const getPawnColorForEntry = (text) => {
    const matchingPlayer = players.find(p => text.includes(p.displayName));
    if (matchingPlayer) {
      return TOKEN_COLORS[matchingPlayer.seat % TOKEN_COLORS.length];
    }
    return null;
  };

  return (
    <div className="flex-1 min-h-0 gold-card p-3 flex flex-col gap-2 overflow-hidden">
      <div className="text-[10px] uppercase tracking-widest font-black text-[#cbb992] shrink-0 border-b border-slate-800 pb-1 mb-0.5">
        Game Activity
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1 scrollbar-thin">
        {tail.length === 0 ? (
          <p className="text-[11px] text-slate-500">Waiting for actions...</p>
        ) : (
          tail.map((entry, i) => {
            const pawnColor = getPawnColorForEntry(entry.text);
            return (
              <div
                key={i}
                className={clsx(
                  "text-[11px] leading-normal flex items-start gap-1.5 py-0.5 px-1.5 rounded-lg",
                  entry.type === 'chat' ? "bg-slate-900/40 text-slate-200 border border-slate-900" : "text-slate-300"
                )}
              >
                {pawnColor ? (
                  <div className="shrink-0 mt-0.5">
                    <PawnIcon color={pawnColor} className="w-3 h-3 drop-shadow-sm" />
                  </div>
                ) : (
                  <div className="shrink-0 w-3 h-3 bg-slate-800 rounded-full flex items-center justify-center text-[7px] font-bold text-slate-500">
                    ℹ️
                  </div>
                )}
                <span className="flex-1 select-text">{entry.text}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Local Chat Message Input */}
      <div className="border-t border-slate-800 pt-2 mt-auto flex items-center gap-1 shrink-0">
        <button
          onClick={() => setChatText(prev => prev + '😊')}
          className="text-xs p-1 hover:bg-slate-800 rounded-lg transition-colors select-none"
        >
          😊
        </button>
        <input
          id="chat-message-input"
          type="text"
          placeholder="Type a message..."
          value={chatText}
          onChange={(e) => setChatText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSendChat();
          }}
          className="flex-1 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#cbb992]/50"
        />
        <button
          onClick={onSendChat}
          className="p-1.5 bg-portage-600 hover:bg-portage-500 rounded-lg text-white transition-colors flex items-center justify-center shrink-0"
          title="Send message"
        >
          <Send size={10} className="shrink-0" />
        </button>
      </div>
    </div>
  );
}

// Ornate corner decorations helper
function GoldenCorners() {
  return (
    <>
      {/* Top-Left */}
      <div className="fixed top-4 left-4 w-16 h-16 pointer-events-none text-[#cbb992] z-30 opacity-60">
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M 10 10 L 90 10 M 10 10 L 10 90 M 20 20 L 70 20 M 20 20 L 20 70 M 10 50 C 15 45, 20 40, 30 30 C 40 20, 45 15, 50 10" />
          <circle cx="15" cy="15" r="3" fill="currentColor" />
          <circle cx="25" cy="25" r="2" fill="currentColor" />
        </svg>
      </div>
      {/* Top-Right */}
      <div className="fixed top-4 right-4 w-16 h-16 pointer-events-none text-[#cbb992] z-30 opacity-60 rotate-90">
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M 10 10 L 90 10 M 10 10 L 10 90 M 20 20 L 70 20 M 20 20 L 20 70 M 10 50 C 15 45, 20 40, 30 30 C 40 20, 45 15, 50 10" />
          <circle cx="15" cy="15" r="3" fill="currentColor" />
          <circle cx="25" cy="25" r="2" fill="currentColor" />
        </svg>
      </div>
      {/* Bottom-Left */}
      <div className="fixed bottom-4 left-4 w-16 h-16 pointer-events-none text-[#cbb992] z-30 opacity-60 -rotate-90">
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M 10 10 L 90 10 M 10 10 L 10 90 M 20 20 L 70 20 M 20 20 L 20 70 M 10 50 C 15 45, 20 40, 30 30 C 40 20, 45 15, 50 10" />
          <circle cx="15" cy="15" r="3" fill="currentColor" />
          <circle cx="25" cy="25" r="2" fill="currentColor" />
        </svg>
      </div>
      {/* Bottom-Right */}
      <div className="fixed bottom-4 right-4 w-16 h-16 pointer-events-none text-[#cbb992] z-30 opacity-60 rotate-180">
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M 10 10 L 90 10 M 10 10 L 10 90 M 20 20 L 70 20 M 20 20 L 20 70 M 10 50 C 15 45, 20 40, 30 30 C 40 20, 45 15, 50 10" />
          <circle cx="15" cy="15" r="3" fill="currentColor" />
          <circle cx="25" cy="25" r="2" fill="currentColor" />
        </svg>
      </div>
    </>
  );
}



// Tiny card corner decorations helper
function CardCorners() {
  return (
    <>
      {/* Top-Left */}
      <div className="absolute top-1.5 left-1.5 w-3.5 h-3.5 pointer-events-none text-[#cbb992] opacity-35">
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6">
          <path d="M 15 95 L 15 15 L 95 15 M 30 85 L 30 30 L 85 30" />
        </svg>
      </div>
      {/* Top-Right */}
      <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 pointer-events-none text-[#cbb992] opacity-35 rotate-90">
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6">
          <path d="M 15 95 L 15 15 L 95 15 M 30 85 L 30 30 L 85 30" />
        </svg>
      </div>
      {/* Bottom-Left */}
      <div className="absolute bottom-1.5 left-1.5 w-3.5 h-3.5 pointer-events-none text-[#cbb992] opacity-35 -rotate-90">
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6">
          <path d="M 15 95 L 15 15 L 95 15 M 30 85 L 30 30 L 85 30" />
        </svg>
      </div>
      {/* Bottom-Right */}
      <div className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 pointer-events-none text-[#cbb992] opacity-35 rotate-180">
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6">
          <path d="M 15 95 L 15 15 L 95 15 M 30 85 L 30 30 L 85 30" />
        </svg>
      </div>
    </>
  );
}

// Center hub: lives inside the Board's middle 9×9. Shows the free-parking pool.
function CenterHub({ freeParkingPool }) {
  if (!freeParkingPool) return null;
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-2 text-center">
      <p className="text-[14px] font-bold text-white font-mono tabular-nums bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
        Free Parking: ₹{freeParkingPool}
      </p>
    </div>
  );
}

// Manage modal — build, sell, mortgage owned properties during your manage phase.
function ManageModal({ open, onClose, gameState, myPlayer, onAction }) {
  if (!myPlayer) return null;
  const myProperties = Object.entries(gameState.properties)
    .filter(([, ps]) => ps.owner === myPlayer.seat)
    .map(([id, ps]) => ({ space: SPACES.find(s => s.id === id), ps, id }))
    .filter(x => x.space);

  return (
    <Modal open={open} onClose={onClose} title="Manage properties" size="lg">
      {myProperties.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-text-muted text-sm">
            You don&apos;t own any properties yet.
          </p>
          <p className="text-text-muted text-xs mt-2">
            Land on an unowned property to buy it.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto pr-1">
          {myProperties.map(({ space, ps, id }) => (
            <ManageRow
              key={id}
              id={id}
              space={space}
              ps={ps}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </Modal>
  );
}

function ManageRow({ id, space, ps, onAction }) {
  const colorBg = COLOR_CLASSES[space.color] ?? null;
  return (
    <div className="flex items-stretch gap-3 rounded-xl bg-surface-2 border border-border overflow-hidden">
      {colorBg ? <div className={`w-1.5 ${colorBg}`} /> : <div className="w-1.5 bg-portage-700" />}
      <div className="flex-1 flex items-center gap-3 py-2.5 pr-3 min-w-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text truncate">{space.name}</p>
          <p className="text-xs text-text-muted font-mono tabular-nums">
            {ps.mortgaged
              ? `Mortgaged · ₹${space.mortgage}`
              : ps.houses === 0
                ? `No houses · ₹${space.houseCost ?? '—'}/house`
                : ps.houses < 5
                  ? `${ps.houses} house${ps.houses > 1 ? 's' : ''}`
                  : 'Hotel'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!ps.mortgaged && ps.houses < 5 && space.houseCost && (
            <Button size="sm" variant="success" onClick={() => onAction('BUILD_HOUSE', { propertyId: id })}>
              Build
            </Button>
          )}
          {ps.houses > 0 && (
            <Button size="sm" variant="destructive" onClick={() => onAction('SELL_HOUSE', { propertyId: id })}>
              Sell
            </Button>
          )}
          {!ps.mortgaged && ps.houses === 0 && (
            <Button size="sm" variant="ghost" onClick={() => onAction('MORTGAGE', { propertyId: id })}>
              Mortgage
            </Button>
          )}
          {ps.mortgaged && (
            <Button size="sm" variant="primary" onClick={() => onAction('UNMORTGAGE', { propertyId: id })}>
              Redeem
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

