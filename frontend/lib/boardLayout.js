// Maps board position 0–39 to CSS grid row/col (1-indexed, 11×11 grid)
// Position 0 = GO (bottom-right corner), player moves counter-clockwise
// Bottom row:  pos 0–10  → row 11, col 11 down to col 1
// Left side:   pos 11–20 → col 1,  row 10 down to row 1
// Top row:     pos 21–30 → row 1,  col 1  up to col 11
// Right side:  pos 31–39 + 0 → col 11, row 2 up to row 10

const POSITIONS = [];

// Bottom row: pos 0 (GO) at col 11, pos 10 (Jail) at col 1
for (let i = 0; i <= 10; i++) {
  POSITIONS[i] = { row: 11, col: 11 - i };
}

// Left side: pos 11 at row 10, pos 20 (Free Parking) at row 1
for (let i = 0; i <= 9; i++) {
  POSITIONS[11 + i] = { row: 10 - i, col: 1 };
}

// Top row: pos 21 at col 2, pos 30 (Go to Jail) at col 11
for (let i = 0; i <= 9; i++) {
  POSITIONS[21 + i] = { row: 1, col: 2 + i };
}

// Right side: pos 31 at row 2, pos 39 at row 10
for (let i = 0; i <= 8; i++) {
  POSITIONS[31 + i] = { row: 2 + i, col: 11 };
}

export function getGridPosition(boardPos) {
  return POSITIONS[boardPos] ?? { row: 1, col: 1 };
}

// Color group → Tailwind bg class
export const COLOR_CLASSES = {
  brown:      'bg-amber-900',
  light_blue: 'bg-sky-300',
  pink:       'bg-pink-400',
  orange:     'bg-orange-400',
  red:        'bg-red-500',
  yellow:     'bg-yellow-400',
  green:      'bg-green-500',
  dark_blue:  'bg-blue-800',
};

// Seat → player token colour
export const TOKEN_COLORS = ['#ef4444','#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ec4899'];
