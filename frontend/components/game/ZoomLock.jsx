'use client';
import { useEffect } from 'react';

export default function ZoomLock() {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.ctrlKey &&
        (e.key === '=' ||
          e.key === '-' ||
          e.key === '+' ||
          e.key === '0' ||
          e.keyCode === 61 ||
          e.keyCode === 107 ||
          e.keyCode === 173 ||
          e.keyCode === 109 ||
          e.keyCode === 187 ||
          e.keyCode === 189)
      ) {
        e.preventDefault();
      }
    };

    const handleWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    const handleGestureStart = (e) => {
      e.preventDefault();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('gesturestart', handleGestureStart);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('gesturestart', handleGestureStart);
    };
  }, []);

  return null;
}
