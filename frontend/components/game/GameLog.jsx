'use client';
import { useEffect, useRef } from 'react';

export default function GameLog({ log }) {
  const bottomRef = useRef(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  const entries = log ?? [];

  if (entries.length === 0) {
    return (
      <p className="text-text-muted text-sm text-center py-8">
        Nothing has happened yet. Roll the dice to get started.
      </p>
    );
  }

  return (
    <div className="max-h-[60vh] overflow-y-auto rounded-xl bg-surface-2 border border-border p-3 text-sm text-text flex flex-col gap-1">
      {entries.map((entry, i) => (
        <div key={i} className="leading-relaxed py-0.5 border-b border-border last:border-0">
          {entry}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
