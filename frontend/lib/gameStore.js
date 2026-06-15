import { create } from 'zustand';

// Defensive dedupe at the store boundary: every consumer of gameState.players
// or lobbyData.players gets a list with at most one entry per user, regardless
// of what the server sends (legacy data, race conditions, etc.).
function dedupePlayers(players, mode) {
  if (!Array.isArray(players)) return players;
  const isPassAndPlay = mode === 'pass_and_play';
  const seen = new Set();
  return players.filter(p => {
    const key = isPassAndPlay
      ? p?.seat
      : (p?.providerId || p?.userId?.toString?.() || p?.userId || p?.seat);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeGameState(state) {
  if (!state) return state;
  return { ...state, players: dedupePlayers(state.players, state.settings?.mode) };
}

function normalizeLobbyData(lobby) {
  if (!lobby) return lobby;
  return { ...lobby, players: dedupePlayers(lobby.players, lobby.settings?.mode) };
}

const useGameStore = create((set) => ({
  // Game state from server
  gameState: null,
  lobbyData: null,       // { players } from lobby_update events
  cardPopup: null,       // { description } — shown then auto-dismissed
  error: null,

  setGameState: (gameState) => set({ gameState: normalizeGameState(gameState) }),
  setLobbyData: (lobbyData) => set({ lobbyData: normalizeLobbyData(lobbyData) }),
  showCard: (card) => set({ cardPopup: card }),
  dismissCard: () => set({ cardPopup: null }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  resetGameState: () => set({ gameState: null, lobbyData: null, cardPopup: null, error: null }),
}));

export default useGameStore;
