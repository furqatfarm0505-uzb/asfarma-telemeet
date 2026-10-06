import React, { useEffect, useState } from 'react';
import { socket } from '../services/socket';

export function ReactionsOverlay() {
  const [reactions, setReactions] = useState([]);

  useEffect(() => {
    const handleReaction = (reaction) => {
      const id = reaction.id || Math.random().toString();
      const xPercent = 15 + Math.random() * 70; // randomize horizontal placement between 15% and 85%

      const newReaction = {
        ...reaction,
        id,
        xPercent,
      };

      setReactions((prev) => [...prev, newReaction]);

      // Remove after animation completes (2.5 seconds)
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== id));
      }, 2500);
    };

    socket.on('reaction-received', handleReaction);

    return () => {
      socket.off('reaction-received', handleReaction);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-20 flex flex-col items-center animate-float-up pointer-events-none select-none"
          style={{ left: `${r.xPercent}%` }}
        >
          <span className="text-4xl md:text-5xl drop-shadow-lg filter">{r.emoji}</span>
          <span className="px-2 py-0.5 mt-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-white font-medium border border-white/10 whitespace-nowrap shadow-md">
            {r.userName}
          </span>
        </div>
      ))}
    </div>
  );
}
