import React from 'react';
import { AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const typeConfig = {
  checkpoint: { color: 'bg-emerald-500', label: 'Checkpoint', icon: CheckCircle2 },
  'key-concept': { color: 'bg-teal-500', label: 'Key Concept', icon: Lightbulb },
  struggle: { color: 'bg-amber-400', label: 'Struggle Detected', icon: AlertTriangle },
};

export default function ConceptTimeline({ markers, currentTime, duration, onSeek }) {
  return (
    <div className="px-4 py-3">
      <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
        Concept Timeline
      </h2>

      {/* Track */}
      <div className="relative">
        {/* Base track */}
        <div className="h-1 bg-stone-100 rounded-full relative">
          {/* Progress fill */}
          <div
            className="h-full bg-teal-200 rounded-full transition-all duration-300"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />

          {/* Markers */}
          {markers.map((m) => {
            const cfg = typeConfig[m.type] ?? typeConfig.checkpoint;
            const pct = ((m.time ?? m.start ?? 0) / duration) * 100;
            const isPast = currentTime >= (m.time ?? m.start ?? 0);
            return (
              <button
                key={m.id}
                onClick={() => onSeek(m.time ?? m.start ?? 0)}
                title={`${m.label} · ${formatTime(m.time ?? m.start ?? 0)}`}
                aria-label={`Jump to ${m.label} at ${formatTime(m.time ?? m.start ?? 0)}`}
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm transition-all hover:scale-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${cfg.color} ${isPast ? 'opacity-100' : 'opacity-50'}`}
                style={{ left: `${pct}%` }}
              />
            );
          })}
        </div>

        {/* Legend labels below (only show non-overlapping) */}
        <div className="relative h-8 mt-1">
          {markers.map((m) => {
            const cfg = typeConfig[m.type] ?? typeConfig.checkpoint;
            const pct = ((m.time ?? m.start ?? 0) / duration) * 100;
            return (
              <button
                key={m.id}
                onClick={() => onSeek(m.time ?? m.start ?? 0)}
                className="absolute -translate-x-1/2 text-[10px] font-medium text-stone-400 hover:text-stone-700 transition-colors truncate max-w-[80px] text-center leading-tight focus-visible:outline-none"
                style={{ left: `${pct}%`, top: 0 }}
                tabIndex={-1}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 flex-wrap">
        {Object.entries(typeConfig).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1.5 text-[10px] font-medium text-stone-400">
            <span className={`w-2 h-2 rounded-full ${cfg.color}`} />
            {cfg.label}
          </span>
        ))}
      </div>
    </div>
  );
}
