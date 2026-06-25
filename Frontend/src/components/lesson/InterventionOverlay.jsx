import React from 'react';
import { AlertTriangle, Play, RotateCcw, Lightbulb, BookOpen, Globe } from 'lucide-react';

export default function InterventionOverlay({ onResume, onHint, onExplain, onHinglish, onReplay, onExpand }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intervention-title"
      aria-describedby="intervention-desc"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-[2px]" />

      {/* Card */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200/80 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">

        {/* Top accent */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400" />

        <div className="p-6">
          {/* Icon + heading */}
          <div className="flex items-start gap-4 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2
                id="intervention-title"
                className="text-base font-semibold text-stone-900 mb-1"
              >
                Let's pause here for a moment
              </h2>
              <p
                id="intervention-desc"
                className="text-sm text-stone-500 leading-relaxed"
              >
                It looks like Boltzmann's formula might need a bit more time. 
                That's completely normal — this is one of the trickier ideas in thermodynamics. 
                How would you like to continue?
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-stone-100 mb-5" />

          {/* Primary action */}
          <button
            onClick={onResume}
            className="w-full flex items-center justify-center gap-2 py-3 bg-teal-700 text-white text-sm font-semibold rounded-xl hover:bg-teal-800 active:scale-[0.98] transition-all mb-3 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:outline-none shadow-sm"
            autoFocus
            aria-label="Resume the lesson"
          >
            <Play className="w-4 h-4 fill-current" />
            Resume Lesson
          </button>

          {/* Secondary actions grid */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              onClick={() => { onHint(); onExpand(); }}
              className="flex flex-col items-center gap-1.5 py-3 px-3 border border-stone-200 rounded-xl hover:bg-stone-50 hover:border-stone-300 transition-all group focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none"
              aria-label="Get a hint from the AI mentor"
            >
              <Lightbulb className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-stone-700">Give Hint</span>
            </button>

            <button
              onClick={() => { onExplain(); onExpand(); }}
              className="flex flex-col items-center gap-1.5 py-3 px-3 border border-stone-200 rounded-xl hover:bg-stone-50 hover:border-stone-300 transition-all group focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none"
              aria-label="Get a plain-language explanation"
            >
              <BookOpen className="w-4 h-4 text-teal-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-stone-700">Explain Simply</span>
            </button>

            <button
              onClick={onReplay}
              className="flex flex-col items-center gap-1.5 py-3 px-3 border border-stone-200 rounded-xl hover:bg-stone-50 hover:border-stone-300 transition-all group focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none"
              aria-label="Replay the last 30 seconds"
            >
              <RotateCcw className="w-4 h-4 text-stone-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-stone-700">Replay Section</span>
            </button>

            <button
              onClick={() => { onHinglish(); onExpand(); }}
              className="flex flex-col items-center gap-1.5 py-3 px-3 border border-stone-200 rounded-xl hover:bg-stone-50 hover:border-stone-300 transition-all group focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none"
              aria-label="Ask the mentor in Hinglish"
            >
              <Globe className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-stone-700">Ask in Hinglish</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
