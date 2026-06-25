import React, { useState } from 'react';
import { FileText } from 'lucide-react';

export default function NotesPanel() {
  const [notes, setNotes] = useState('');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 shrink-0">
        <h2 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-stone-400" />
          Notes
        </h2>
        <span className="text-xs text-stone-400">{notes.length > 0 ? `${notes.length} chars` : 'Empty'}</span>
      </div>
      <div className="flex-1 flex flex-col p-3">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Jot down anything while you watch…&#10;&#10;e.g. S = k·ln(Ω) — entropy is a count of possibilities"
          className="flex-1 w-full resize-none text-sm text-stone-700 placeholder-stone-300 bg-transparent outline-none leading-relaxed font-mono"
          aria-label="Lesson notes"
          spellCheck={false}
        />
        {notes.length > 0 && (
          <div className="pt-2 flex items-center justify-end border-t border-stone-100 mt-2">
            <button
              onClick={() => {
                const blob = new Blob([notes], { type: 'text/plain' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'lesson-notes.txt';
                a.click();
              }}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors"
            >
              Save notes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
