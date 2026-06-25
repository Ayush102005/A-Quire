import React from 'react';
import { ChevronLeft, ChevronRight, BookOpen, Settings, Keyboard } from 'lucide-react';
import { lessonMeta } from './lessonData';

export default function LessonTopBar({ progress, mentorOpen, onToggleMentor }) {
  return (
    <header className="h-14 bg-white border-b border-stone-200 flex items-center px-4 gap-4 shrink-0 z-30 sticky top-0">
      {/* Breadcrumb */}
      <a
        href="/course"
        className="flex items-center gap-1.5 text-stone-400 hover:text-stone-700 transition-colors text-sm font-medium shrink-0"
        aria-label="Back to course"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Back</span>
      </a>

      <div className="w-px h-5 bg-stone-200 shrink-0" />

      {/* Breadcrumb path */}
      <nav className="flex items-center gap-1.5 text-xs text-stone-400 min-w-0 overflow-hidden">
        <span className="hidden md:block truncate max-w-[140px]">{lessonMeta.course}</span>
        <ChevronRight className="w-3 h-3 shrink-0 hidden md:block" />
        <span className="hidden sm:block truncate max-w-[120px] text-stone-500">{lessonMeta.module}</span>
        <ChevronRight className="w-3 h-3 shrink-0 hidden sm:block" />
        <span className="font-semibold text-stone-800 truncate max-w-[160px]">{lessonMeta.lesson}</span>
      </nav>

      {/* Progress bar - center */}
      <div className="flex-1 flex items-center gap-3 min-w-0 mx-4">
        <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden hidden sm:block">
          <div
            className="h-full bg-teal-600 rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-stone-400 shrink-0 hidden sm:block">
          {progress}%
        </span>
      </div>

      {/* Utility actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          title="Keyboard shortcuts"
          aria-label="Keyboard shortcuts"
        >
          <Keyboard className="w-4 h-4" />
        </button>
        <button
          className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          title="Settings"
          aria-label="Player settings"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleMentor}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ml-1 ${
            mentorOpen
              ? 'bg-teal-700 text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
          aria-label={mentorOpen ? 'Close AI Mentor' : 'Open AI Mentor'}
          aria-pressed={mentorOpen}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Mentor</span>
        </button>
      </div>
    </header>
  );
}
