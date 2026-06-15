import { io } from 'socket.io-client';

// Module-level singleton. Survives React StrictMode unmount/remount.
let socket = null;
let currentGameId = null;

// Get a socket connection for `gameCode`. The caller must provide a
// `getToken` async function (e.g. Clerk's `getToken()`) — it's invoked
// on every (re)connect so the auth payload is always a fresh JWT.
// Clerk JWTs are ~60s; without this the socket fails to upgrade after
// any disconnect with `xhr poll error: JWT is expired`.
export function getSocket(gameCode, getToken) {
  if (typeof getToken !== 'function') {
    throw new Error('getSocket: getToken must be an async () => string');
  }

  // Reuse the existing socket if it's for the same game (connected or not —
  // socket.io will queue emits and flush on connect). This avoids tearing
  // down and rebuilding during StrictMode double-mount in dev.
  if (socket && currentGameId === gameCode) {
    return socket;
  }
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }
  currentGameId = gameCode;
  socket = io(`${process.env.NEXT_PUBLIC_SOCKET_URL}/games`, {
    query: { gameId: gameCode },
    // Function form: socket.io re-invokes this on each (re)connect so
    // we can ship a freshly-minted Clerk JWT each time.
    auth: async (cb) => {
      try {
        const token = await getToken();
        cb({ token });
      } catch (err) {
        cb({ token: null });
      }
    },
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    currentGameId = null;
  }
}
