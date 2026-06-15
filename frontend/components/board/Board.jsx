'use client';
import FlatBoard from './FlatBoard';
import ThreeDBoard from './ThreeDBoard';

export default function Board({ gameState, centerSlot, myPlayerSeat, onHopComplete, bgImage = '/center.jpg' }) {
  const theme = gameState?.settings?.boardTheme || 'flat';

  if (theme === '3d') {
    return (
      <ThreeDBoard
        gameState={gameState}
        centerSlot={centerSlot}
        myPlayerSeat={myPlayerSeat}
        onHopComplete={onHopComplete}
      />
    );
  }

  return (
    <FlatBoard
      gameState={gameState}
      centerSlot={centerSlot}
      myPlayerSeat={myPlayerSeat}
      onHopComplete={onHopComplete}
      bgImage={bgImage}
    />
  );
}
