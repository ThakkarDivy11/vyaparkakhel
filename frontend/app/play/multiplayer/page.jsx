'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, SignInButton } from '@clerk/nextjs';
import { ArrowLeft, Globe, AlertCircle, XCircle, Swords } from 'lucide-react';
import { Button, PageBackground, LoadingScreen } from '@/components/ui';
import MatchmakingLoader from '@/components/lobby/MatchmakingLoader';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { toast } from '@/lib/toast';

export default function MultiplayerMatchmakingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  
  const [status, setStatus] = useState('idle'); // 'idle' | 'searching' | 'matched'
  const [searchTime, setSearchTime] = useState(0);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState('');
  const [matchedPlayers, setMatchedPlayers] = useState([]);
  const [roomCode, setRoomCode] = useState('');
  const [countdown, setCountdown] = useState(10);

  const timerRef = useRef(null);

  // Initialize socket on mount if signed in
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    try {
      // Connect to the virtual "matchmaking" workspace game room
      const sock = getSocket('matchmaking', getToken);
      
      sock.on('connect', () => {
        console.log('[matchmaking socket] connected', sock.id);
        setError('');
      });

      sock.on('connect_error', (err) => {
        console.error('[matchmaking socket] connection error:', err.message);
        setError('Connection failed. Please try again.');
      });

      sock.on('disconnect', (reason) => {
        console.log('[matchmaking socket] disconnected:', reason);
        setStatus((currentStatus) => {
          if (currentStatus === 'searching') {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            setSearchTime(0);
            toast.error('Connection lost. Matchmaking search stopped.');
            return 'idle';
          }
          return currentStatus;
        });
      });

      sock.on('match_found', ({ roomCode, players }) => {
        console.log('[matchmaking socket] match found! roomCode:', roomCode, players);
        setStatus('matched');
        setMatchedPlayers(players || []);
        setRoomCode(roomCode);
        setCountdown(10);
        
        // Stop timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        toast.success('Opponent Found! Starting game...');
      });

      sock.connect();
      setSocket(sock);
    } catch (err) {
      setError(err.message);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      disconnectSocket();
    };
  }, [isLoaded, isSignedIn, getToken, router]);

  // Handle 10-second countdown
  useEffect(() => {
    if (status !== 'matched' || !roomCode) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, roomCode]);

  // Handle redirect when countdown reaches 0
  useEffect(() => {
    if (status === 'matched' && countdown === 0 && roomCode) {
      disconnectSocket();
      router.push(`/game/${roomCode}`);
    }
  }, [status, countdown, roomCode, router]);

  const handleStartSearch = () => {
    if (!socket || !socket.connected) {
      toast.error('Socket is not connected. Reconnecting...');
      return;
    }

    setStatus('searching');
    setSearchTime(0);

    socket.emit('find_match', {}, (ack) => {
      if (ack?.ok) {
        // Start counting elapsed search time
        timerRef.current = setInterval(() => {
          setSearchTime((t) => t + 1);
        }, 1000);
      } else {
        setStatus('idle');
        toast.error(ack?.error || 'Failed to start matchmaking search');
      }
    });
  };

  const handleCancelSearch = () => {
    if (!socket) return;

    socket.emit('cancel_match', {}, (ack) => {
      if (ack?.ok) {
        setStatus('idle');
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setSearchTime(0);
        toast.info('Matchmaking search cancelled');
      } else {
        toast.error(ack?.error || 'Failed to cancel matchmaking');
      }
    });
  };

  // Clerk auth checks
  if (!isLoaded) {
    return (
      <PageBackground>
        <LoadingScreen message="Loading…" />
      </PageBackground>
    );
  }

  if (!isSignedIn) {
    return (
      <PageBackground>
        <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold mb-2 text-white">Online Matchmaking</h1>
            <p className="text-white/60 text-sm">Sign in to match with random players globally.</p>
          </div>
          <SignInButton mode="modal" forceRedirectUrl="/play/multiplayer">
            <Button variant="primary" size="lg">Sign in to search</Button>
          </SignInButton>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-white/50 hover:text-white underline transition-colors"
          >
            Back to home
          </button>
        </main>
      </PageBackground>
    );
  }

  return (
    <PageBackground>
      {/* Hexagon Back Button */}
      <button
        onClick={() => {
          if (status === 'searching') handleCancelSearch();
          router.push('/');
        }}
        aria-label="Back"
        className="absolute top-4 left-4 sm:top-6 sm:left-6 w-[108px] h-[36px] transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.97] active:translate-y-[1px] cursor-pointer z-10 group"
      >
        {/* Hexagon Background SVG */}
        <svg width="108" height="36" viewBox="0 0 108 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]">
          <defs>
            <linearGradient id="backBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0e2140" />
              <stop offset="100%" stopColor="#050c18" />
            </linearGradient>
            <linearGradient id="backGoldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a87c24" />
              <stop offset="50%" stopColor="#ffd54f" />
              <stop offset="100%" stopColor="#a87c24" />
            </linearGradient>
          </defs>
          
          {/* Outer Hexagon with Gold stroke */}
          <path 
            d="M 12 1 L 96 1 L 107 18 L 96 35 L 12 35 L 1 18 Z" 
            fill="url(#backBgGrad)" 
            stroke="url(#backGoldGrad)" 
            strokeWidth="2"
            className="group-hover:stroke-[#fff5c0] transition-colors duration-150"
          />
          
          {/* Inner Hexagon with thin gold stroke */}
          <path 
            d="M 14 3.5 L 94 3.5 L 103.5 18 L 94 32.5 L 14 32.5 L 4.5 18 Z" 
            stroke="#d4a84b" 
            strokeWidth="0.75" 
            opacity="0.6"
            className="group-hover:opacity-85 transition-opacity duration-150"
          />
        </svg>

        {/* Button Content */}
        <div className="relative z-10 flex items-center justify-center w-full h-full gap-2 px-3">
          <ArrowLeft size={16} className="text-[#ffd54f] stroke-[3px] shrink-0 group-hover:text-[#fff5c0] transition-colors" />
          <div className="h-4 w-[1px] bg-[#d4a84b]/30 shrink-0" />
          <span className="text-[#eae1cd] font-cinzel text-[11px] font-black tracking-widest leading-none select-none group-hover:text-white transition-colors">
            BACK
          </span>
        </div>
      </button>

      {/* Centered Top Header */}
      <div className="absolute top-0 pt-4 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center text-center select-none pointer-events-none w-full">
        <h1 className="text-xl sm:text-2xl font-black text-[#ffd54f] tracking-wider font-cinzel leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] uppercase">
          MATCHMAKER ARENA
        </h1>
      </div>

      <main className="h-screen max-h-screen w-full max-w-xl lg:max-w-2xl mx-auto pt-24 sm:pt-28 pb-3 px-4 sm:px-6 flex flex-col justify-between z-10 overflow-hidden">

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center py-6 max-w-md w-full mx-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 w-full">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
              <p className="text-red-200 text-xs leading-relaxed">{error}</p>
            </div>
          )}

          {status === 'idle' && (
            <div className="text-center w-full flex flex-col items-center">
              {/* Globe Icon Box */}
              <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-6 animate-pulse">
                <Globe size={40} />
              </div>
              <h2 className="text-2xl font-extrabold text-white mb-2">Ready to Match?</h2>
              <p className="text-white/70 text-xs mb-6 max-w-sm leading-relaxed text-center mx-auto">
                Click find match to connect with a random opponent. The board setup will initiate automatically.
              </p>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleStartSearch}
                disabled={!!error}
              >
                Find a Match
              </Button>
            </div>
          )}

          {status === 'searching' && (
            <div className="w-full flex flex-col items-center gap-6">
              <div className="w-full flex justify-center">
                <MatchmakingLoader searchTime={searchTime} />
              </div>
              
              <div className="flex flex-wrap gap-4 w-full justify-center">
                <Button
                  variant="destructive"
                  size="md"
                  onClick={handleCancelSearch}
                  icon={<XCircle size={16} />}
                >
                  Cancel Search
                </Button>
                
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    socket.emit('simulate_match', {}, (ack) => {
                      if (!ack?.ok) {
                        toast.error(ack?.error || 'Failed to simulate opponent');
                      }
                    });
                  }}
                >
                  Simulate Opponent
                </Button>
              </div>
            </div>
          )}

          {status === 'matched' && (
            <div className="relative rounded-2xl bg-gradient-to-b from-[#0a1a35]/95 to-[#040b18]/98 border border-[#d4a84b]/30 p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.8),_inset_0_1px_0_rgba(212,168,75,0.1)] max-w-lg w-full flex flex-col items-center select-none">
              
              {/* Corner Ornaments */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#d4a84b]/50 rounded-tl" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#d4a84b]/50 rounded-tr" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#d4a84b]/50 rounded-bl" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#d4a84b]/50 rounded-br" />

              <h2 className="text-xl sm:text-2xl font-black text-[#ffd54f] font-cinzel tracking-widest text-center mb-6 uppercase">
                Match Found
              </h2>

              <div className="flex items-center justify-between w-full gap-4 relative mb-6">
                {/* Player 1 Left */}
                <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
                  <div className="relative w-20 h-20 rounded-full border-2 border-[#ffd54f] overflow-hidden bg-[#0e2140] flex items-center justify-center shadow-[0_0_20px_rgba(255,213,79,0.2)]">
                    {(matchedPlayers[0] && matchedPlayers[0].avatarUrl) ? (
                      <img src={matchedPlayers[0].avatarUrl} alt="Player 1" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black text-[#ffd54f] font-cinzel">
                        {(matchedPlayers[0]?.displayName?.[0] || '1').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-white font-extrabold text-xs sm:text-sm tracking-wide truncate max-w-full text-center">
                    {matchedPlayers[0]?.displayName || 'Player 1'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                    Seat 1
                  </span>
                </div>

                {/* VS Center */}
                <div className="flex flex-col items-center justify-center px-4 shrink-0 z-10">
                  <div className="w-12 h-12 rounded-full bg-[#ff3c00]/10 border border-[#ff3c00]/30 flex items-center justify-center text-[#ff3c00] animate-pulse shadow-[0_0_15px_rgba(255,60,0,0.25)] mb-2">
                    <Swords size={22} className="stroke-[2.5px]" />
                  </div>
                  
                  {/* Glowing Pulse Countdown */}
                  <div className="flex flex-col items-center">
                    <span className="text-white/40 text-[7px] sm:text-[8px] font-black tracking-widest uppercase text-center leading-none">
                      STARTING IN
                    </span>
                    <span className="text-4xl sm:text-5xl font-black text-[#ff8f00] font-cinzel leading-none mt-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] animate-bounce select-none">
                      {countdown}
                    </span>
                  </div>
                </div>

                {/* Player 2 Right */}
                <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
                  <div className="relative w-20 h-20 rounded-full border-2 border-[#ffd54f] overflow-hidden bg-[#0e2140] flex items-center justify-center shadow-[0_0_20px_rgba(255,213,79,0.2)]">
                    {(matchedPlayers[1] && matchedPlayers[1].avatarUrl) ? (
                      <img src={matchedPlayers[1].avatarUrl} alt="Player 2" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black text-[#ffd54f] font-cinzel">
                        {(matchedPlayers[1]?.displayName?.[0] || '2').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-white font-extrabold text-xs sm:text-sm tracking-wide truncate max-w-full text-center">
                    {matchedPlayers[1]?.displayName || 'Player 2'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                    Seat 2
                  </span>
                </div>
              </div>

              {/* Subtext */}
              <p className="text-white/60 text-[10px] leading-relaxed text-center max-w-xs font-medium">
                Get ready! May the best business tycoon win!
              </p>
            </div>
          )}
        </div>

        {/* Footer info text */}
        <p className="pt-4 text-center text-xs text-white/40 shrink-0 max-w-md w-full mx-auto">
          Matchmaking pairs available players in 1v1 lobbies automatically.
        </p>
      </main>
    </PageBackground>
  );
}
