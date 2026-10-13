import React, { useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TranscriptPanel({ segments, currentTime, onSeek, lang = 'original', onLangChange, isLoading = false }) {
  const activeRef = useRef(null);

  // Find active segment with fallback for gaps between segments
  const activeId = (() => {
    if (!segments?.length) return null;
    const idx = segments.findIndex(s => currentTime >= s.start && currentTime <= (s.end ?? s.start + 9999));
    if (idx >= 0) return segments[idx].id;
    // Fallback: last segment whose start is before current time
    const fallbackIdx = segments.reduce((best, s, i) => (s.start <= currentTime ? i : best), -1);
    return fallbackIdx >= 0 ? segments[fallbackIdx].id : null;
  })();

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeRef.current) {
      const container = activeRef.current.parentElement;
      if (container) {
        // Calculate position to center the active item in the container
        const top = activeRef.current.offsetTop - (container.clientHeight / 2) + (activeRef.current.clientHeight / 2);
        container.scrollTo({
          top: top,
          behavior: 'smooth'
        });
      }
    }
  }, [activeId]);

  return (
    <div className="flex flex-col h-full relative">
      {isLoading && (
        <div className="absolute inset-0 bg-surface/50 z-10 flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0 bg-surface">
        <h2 className="text-sm font-semibold text-text flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted" />
          Interactive Transcript
        </h2>
        {onLangChange && (
          <select 
            value={lang} 
            onChange={(e) => onLangChange(e.target.value)}
            className="text-xs bg-surface-soft border border-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
            aria-label="Select transcript language"
          >
            <option value="original">Original</option>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        )}
      </div>

      <div
        className="relative overflow-y-auto flex-1 py-3 px-2 space-y-1 scroll-smooth bg-surface"
        aria-label="Lesson transcript"
      >
        {segments.map((seg) => {
          const isActive = seg.id === activeId;
          return (
            <button
              key={seg.id}
              ref={isActive ? activeRef : null}
              onClick={() => onSeek(seg.start)}
              className={`w-full text-left flex gap-3 px-3 py-2.5 rounded-xl transition-all group focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                isActive
                  ? 'bg-indigo-50 border border-indigo-100 shadow-sm'
                  : 'hover:bg-surface-soft border border-transparent'
              }`}
              aria-current={isActive ? 'true' : undefined}
              aria-label={`Jump to ${formatTime(seg.start)}: ${seg.text}`}
            >
              {/* Timestamp */}
              <span
                className={`text-xs font-mono tabular-nums pt-0.5 shrink-0 transition-colors ${
                  isActive ? 'text-primary font-bold' : 'text-muted group-hover:text-text'
                }`}
              >
                {formatTime(seg.start)}
              </span>

              {/* Text */}
              <p
                className={`text-sm leading-relaxed transition-colors ${
                  isActive ? 'text-text font-medium' : 'text-muted group-hover:text-text'
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
