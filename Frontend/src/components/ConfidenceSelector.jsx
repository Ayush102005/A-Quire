import React from 'react';
import { HelpCircle, Frown, Meh, Smile } from 'lucide-react';

export default function ConfidenceSelector({ value, onChange, disabled }) {
  const options = [
    { value: 1, label: 'Guessing', icon: <HelpCircle className="w-5 h-5" /> },
    { value: 2, label: 'Unsure', icon: <Frown className="w-5 h-5" /> },
    { value: 3, label: 'Fairly Sure', icon: <Meh className="w-5 h-5" /> },
    { value: 4, label: 'Very Confident', icon: <Smile className="w-5 h-5" /> },
  ];

  return (
    <div className="flex flex-col gap-2 mt-4 mb-4">
      <span className="text-sm font-medium text-[var(--text-primary)]">
        How confident are you in this answer?
      </span>
      <div className="flex gap-2 sm:gap-4 flex-wrap">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
                ${isSelected 
                  ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' 
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {opt.icon}
              <span className="text-sm font-medium">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
