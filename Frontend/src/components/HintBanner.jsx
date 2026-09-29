import React from 'react';
import { X, Lightbulb } from 'lucide-react';
import { useSession } from '../contexts/SessionContext';

const HintBanner = () => {
  const { state, setHint } = useSession();
  const { currentHint } = state;

  if (!currentHint) return null;

  return (
    <div className="bg-teal-900/40 border border-teal-500/50 rounded-lg p-4 my-4 flex items-start gap-3 relative animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex-shrink-0 mt-0.5">
        <Lightbulb className="w-5 h-5 text-teal-400" />
      </div>
      
      <div className="flex-1 pr-6">
        <h4 className="text-sm font-semibold text-teal-300 mb-1 flex items-center gap-2">
          Diagnostic Hint
        </h4>
        <p className="text-stone-300 text-sm leading-relaxed">
          {currentHint.message}
        </p>
      </div>

      <button
        onClick={() => setHint(null)}
        className="absolute top-3 right-3 text-stone-400 hover:text-white transition-colors"
        aria-label="Close hint"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default HintBanner;
