import React from 'react';
import { AlertTriangle, Play, RotateCcw, Lightbulb, BookOpen, Globe } from 'lucide-react';

// Maps StruggleEvent.event_type (set server-side by
// struggle_monitor.py's determine_event_type() — see its own rule-based
// logic) to a human-readable reason. Neither InterventionOverlay nor
// MentorPanel showed this anywhere before — every auto-detected struggle
// rendered the exact same generic copy ("might need a bit more time" /
// "noticed pauses or inactivity") regardless of which of the five very
// different underlying signals (sustained fixation, looking away,
// rewinding repeatedly, pausing repeatedly, or being idle) actually fired.
// That made it look, from the student's side, like the system flagged them
// for no visible reason.
const EVENT_TYPE_REASONS = {
  gaze_fixation_spike: "you've been looking at the same spot on the screen for a while",
  gaze_off_screen: "you've been looking away from the lesson for a while",
  rewatch_spike: "you've rewound to this same part a couple of times",
  pause_frequent: "you've paused a few times in a row",
  idle_without_progress: "there hasn't been any activity for a while",
  low_quiz_score: "your recent answers on this topic suggest it could use another look",
  repeated_failed_attempts: "a few attempts haven't quite landed yet",
  dsa_stuck: "you seem to be stuck on this problem",
  question_confusion: "this question seems to be giving you some trouble",
};

export function getStruggleReasonText(eventType) {
  return EVENT_TYPE_REASONS[eventType] || null;
}

export function getInterventionSeverity(event) {
  // If backend provides a score, use it (assumes scores >= 50 are High severity)
  if (event?.struggle_score !== undefined && event?.struggle_score !== null) {
    return event.struggle_score >= 50 ? 'high' : 'low';
  }
  
  // Default fallback: all detected backend events without a score are High severity
  if (event?.detected) {
    return 'high'; 
  }
  
  // Frontend-only, non-critical events are Low severity
  return 'low';
}

export default function InterventionOverlay({ onResume, onHint, onExplain, onHinglish, onReplay, onExpand, lessonTitle, severity = 'high', reasonText = null }) {
  if (severity === 'low') {
    return (
      <div className="fixed bottom-6 left-6 z-50 bg-white border border-stone-200 rounded-xl shadow-xl p-4 max-w-sm flex gap-3 items-start animate-in fade-in slide-in-from-bottom-4">
        <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
          <Lightbulb className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-stone-800 mb-1">Need a hand?</h3>
          <p className="text-xs text-stone-500 leading-relaxed mb-3">
            You can always ask your AI mentor for a gentle hint or explanation if things get tricky.
          </p>
          <div className="flex gap-2">
            <button onClick={() => { onHint(); onExpand(); }} className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-primary text-xs font-semibold rounded-lg transition-colors">
              Ask Mentor
            </button>
            <button onClick={onResume} className="px-3 py-1.5 text-stone-500 hover:text-stone-700 text-xs font-medium rounded-lg transition-colors">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                {reasonText ? (
                  // Was always the two generic lines below regardless of
                  // which signal actually fired (sustained fixation, off-
                  // screen, rewinding, pausing, idle) — no way to tell why
                  // this appeared. Now says the real reason when it's
                  // known.
                  <>We noticed {reasonText}
                    {lessonTitle ? <> in <strong className="text-stone-700">&ldquo;{lessonTitle}&rdquo;</strong></> : ''}.{' '}</>
                ) : lessonTitle ? (
                  <>It looks like part of <strong className="text-stone-700">&ldquo;{lessonTitle}&rdquo;</strong> might need a bit more time.{' '}</>
                ) : (
                  <>It looks like you might be finding this section tricky.{' '}</>
                )}
                That&apos;s completely normal — even the best learners pause here.
                How would you like to continue?
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-stone-100 mb-5" />

          {/* Primary action */}
          <button
            id="intervention-resume-btn"
            data-testid="intervention-resume-btn"
            onClick={onResume}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--primary)] text-white text-sm font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all mb-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:outline-none shadow-sm cursor-pointer"
            autoFocus
            aria-label="Resume the lesson"
          >
            <Play className="w-4 h-4 fill-current" />
            Resume Lesson
          </button>

          {/* Secondary actions grid */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              id="intervention-hint-btn"
              data-testid="intervention-hint-btn"
              onClick={() => { onHint(); onExpand(); }}
              className="flex flex-col items-center gap-1.5 py-3 px-3 border border-border rounded-xl hover:bg-surface-soft hover:border-stone-300 transition-all group focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
              aria-label="I need a hint"
            >
              <Lightbulb className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-text">I need a hint</span>
            </button>

            <button
              id="intervention-explain-btn"
              data-testid="intervention-explain-btn"
              onClick={() => { onExplain(); onExpand(); }}
              className="flex flex-col items-center gap-1.5 py-3 px-3 border border-border rounded-xl hover:bg-surface-soft hover:border-stone-300 transition-all group focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
              aria-label="Explain simply"
            >
              <BookOpen className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-text">Explain simply</span>
            </button>

            <button
              id="intervention-replay-btn"
              data-testid="intervention-replay-btn"
              onClick={onReplay}
              className="flex flex-col items-center gap-1.5 py-3 px-3 border border-border rounded-xl hover:bg-surface-soft hover:border-stone-300 transition-all group focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
              aria-label="Replay last 30s"
            >
              <RotateCcw className="w-4 h-4 text-muted group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-text">Replay last 30s</span>
            </button>

            <button
              id="intervention-hinglish-btn"
              data-testid="intervention-hinglish-btn"
              onClick={() => { onHinglish(); onExpand(); }}
              className="flex flex-col items-center gap-1.5 py-3 px-3 border border-border rounded-xl hover:bg-surface-soft hover:border-stone-300 transition-all group focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
              aria-label="Ask in Hinglish"
            >
              <Globe className="w-4 h-4 text-secondary group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-text">Ask in Hinglish</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
