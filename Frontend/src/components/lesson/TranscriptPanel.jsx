import React, { useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TranscriptPanel({ segments, currentTime, onSeek }) {
  const activeRef = useRef(null);

  // Find active segment
  const activeId = segments.find(
    (seg) => currentTime >= seg.start && currentTime <= seg.end
  )?.id ?? null;

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeId]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 shrink-0">
        <h2 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-stone-400" />
          Transcript
        </h2>
        <span className="text-xs text-stone-400 font-medium">
          {segments.length} segments
        </span>
      </div>

      <div
        className="overflow-y-auto flex-1 py-3 px-1 space-y-0.5 scroll-smooth"
        aria-label="Lesson transcript"
      >
        {segments.map((seg) => {
          const isActive = seg.id === activeId;
          return (
            <button
              key={seg.id}
              ref={isActive ? activeRef : null}
              onClick={() => onSeek(seg.start)}
              className={`w-full text-left flex gap-3 px-3 py-2.5 rounded-lg transition-all group focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none ${
                isActive
                  ? 'bg-teal-50 border border-teal-100'
                  : 'hover:bg-stone-50 border border-transparent'
              }`}
              aria-current={isActive ? 'true' : undefined}
              aria-label={`Jump to ${formatTime(seg.start)}: ${seg.text}`}
            >
              {/* Timestamp */}
              <span
                className={`text-xs font-mono tabular-nums pt-0.5 shrink-0 transition-colors ${
                  isActive ? 'text-teal-600 font-semibold' : 'text-stone-400 group-hover:text-stone-500'
                }`}
              >
                {formatTime(seg.start)}
              </span>

              {/* Text */}
              <p
                className={`text-sm leading-relaxed transition-colors ${
                  isActive ? 'text-stone-900 font-medium' : 'text-stone-500 group-hover:text-stone-700'
                }`}
              >
                {seg.text}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
