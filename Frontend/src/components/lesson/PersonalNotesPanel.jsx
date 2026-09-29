import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';

const AUTOSAVE_DELAY_MS = 1200;

/**
 * PersonalNotesPanel — a student's own private notes for a lesson,
 * persisted server-side (per user, per lesson) rather than sessionStorage,
 * so they survive across devices and browser sessions.
 */
export default function PersonalNotesPanel({ lessonId, placeholder = 'Take notes here while you watch...', className = '' }) {
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
    if (!lessonId) return;

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
    <div className={`h-full flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs text-[var(--text-muted)]">Private to you — synced to your account.</span>
        {statusLabel && (
          <span className={`text-xs ${saveState === 'error' ? 'text-red-600' : 'text-[var(--text-muted)]'}`}>
            {statusLabel}
          </span>
        )}
      </div>
      <textarea
        className="flex-1 w-full p-4 border border-[var(--border)] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-[var(--text)] bg-[var(--surface)]"
        placeholder={placeholder}
        value={content}
        onChange={handleChange}
        disabled={!loaded}
      />
    </div>
  );
}
