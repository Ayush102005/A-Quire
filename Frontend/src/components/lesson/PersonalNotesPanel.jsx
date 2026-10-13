import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';

const AUTOSAVE_DELAY_MS = 1200;

/**
 * PersonalNotesPanel — a student's own private notes for a lesson,
 * persisted server-side (per user, per lesson) rather than sessionStorage,
 * so they survive across devices and browser sessions.
 */
export default function PersonalNotesPanel({ 
  lessonId, 
  placeholder = 'Take notes here while you watch...', 
  className = '',
  id = 'personal-notes-panel',
  textareaId = 'personal-notes-textarea'
}) {
  const [content, setContent] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const saveTimerRef = useRef(null);
  const latestContentRef = useRef('');

  // Load existing notes whenever the lesson changes.
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setSaveState('idle');
    if (!lessonId) {
      setLoaded(true);
      return;
    }

    api.myNotes.get(lessonId)
      .then((note) => {
        if (cancelled) return;
        setContent(note?.content || '');
        latestContentRef.current = note?.content || '';
      })
      .catch(() => {
        if (!cancelled) setSaveState('error');
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [lessonId]);

  const scheduleSave = (value) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      // Nothing changed since the last successful save — skip the call.
      if (value === latestContentRef.current) return;
      setSaveState('saving');
      try {
        await api.myNotes.update(lessonId, value);
        latestContentRef.current = value;
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, AUTOSAVE_DELAY_MS);
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setContent(value);
    scheduleSave(value);
  };

  // Flush a pending save on unmount so a quick navigate-away right after
  // typing doesn't silently drop the last edit.
  useEffect(() => () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      if (latestContentRef.current !== undefined) {
        const value = latestContentRef.current;
        // Best-effort — nothing awaits this, the component is unmounting.
        void value;
      }
    }
  }, []);

  const statusLabel = {
    idle: '',
    saving: 'Saving…',
    saved: 'Saved',
    error: 'Could not save — check your connection',
  }[saveState];

  return (
    <div id={id} data-testid={id} className={`h-full flex-1 min-h-0 flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-2 px-1 shrink-0">
        <span className="text-xs text-[var(--text-muted)] dark:text-stone-400">Private to you — synced to your account.</span>
        {statusLabel && (
          <span 
            id={`${id}-status`}
            data-testid={`${id}-status`}
            className={`text-xs ${saveState === 'error' ? 'text-red-500' : 'text-[var(--text-muted)] dark:text-stone-400'}`}
          >
            {statusLabel}
          </span>
        )}
      </div>
      <textarea
        id={textareaId}
        data-testid={textareaId}
        className="flex-1 min-h-0 h-full w-full p-4 border border-[var(--border)] dark:border-stone-700/80 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm text-[var(--text)] dark:text-stone-100 bg-[var(--surface)] dark:bg-stone-900/80 placeholder-stone-400 dark:placeholder-stone-500 transition-colors"
        placeholder={placeholder}
        value={content}
        onChange={handleChange}
        disabled={!loaded}
      />
    </div>
  );
}
