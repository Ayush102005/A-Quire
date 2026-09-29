import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, FileText, Upload, X, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';

// This panel is new code (not a copy of pre-existing styling), so it uses
// the theme's real CSS custom properties directly via Tailwind's
// arbitrary-value syntax (`bg-[var(--surface)]` etc.) rather than
// `bg-surface`/`text-muted`/`border-border`-style utility names — those
// aren't registered anywhere in this Tailwind v4 setup (no @theme block,
// no matching literal classes in index.css) despite appearing elsewhere in
// LessonPlayer.jsx, so they compile to no-ops there. --primary-* below are
// real, defined in tailwind.config.js.
const btnBase = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const btnMuted = `${btnBase} bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)]`;
const btnPrimary = `${btnBase} bg-primary-700 text-white hover:bg-primary-800`;

/**
 * StudyMaterialPanel — the lesson's "Resources" tab content.
 *
 * Shows the instructor-authored reading notes (if any) and an embedded PDF
 * viewer (if a PDF has been uploaded). When `isOwner` (the lesson's own
 * instructor, or an admin), also exposes upload/replace/remove for the PDF
 * and a small inline editor for the notes.
 */
export default function StudyMaterialPanel({ lessonId, pdfFilename, notesContent, isOwner, onLessonUpdate }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [notesDraft, setNotesDraft] = useState(notesContent || '');
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const fileInputRef = useRef(null);
  const blobUrlRef = useRef(null);

  // Fetch the PDF as an authenticated blob whenever the lesson (or its PDF)
  // changes. The <iframe> can't carry an Authorization header itself, so
  // the blob URL is the only way to show it without exposing the raw file
  // over an unauthenticated route.
  useEffect(() => {
    let cancelled = false;

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setPdfUrl(null);
    setPdfError('');

    if (!lessonId || !pdfFilename) return;

    setPdfLoading(true);
    api.lessons.getPdfBlobUrl(lessonId)
      .then((url) => {
        if (cancelled) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        blobUrlRef.current = url;
        setPdfUrl(url);
      })
      .catch((err) => {
        if (!cancelled) setPdfError(err.message || 'Could not load the PDF.');
      })
      .finally(() => {
        if (!cancelled) setPdfLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lessonId, pdfFilename]);

  // Revoke the blob URL on unmount too (not just on change).
  useEffect(() => () => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
  }, []);

  useEffect(() => {
    setNotesDraft(notesContent || '');
  }, [notesContent]);

  const handleFilePicked = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again later
    if (!file) return;
    setUploading(true);
    setPdfError('');
    try {
      const updated = await api.instructor.uploadLessonPdf(lessonId, file);
      onLessonUpdate?.(updated);
    } catch (err) {
      setPdfError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePdf = async () => {
    setUploading(true);
    setPdfError('');
    try {
      const updated = await api.instructor.deleteLessonPdf(lessonId);
      onLessonUpdate?.(updated);
    } catch (err) {
      setPdfError(err.message || 'Could not remove the PDF.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const updated = await api.instructor.updateLesson(lessonId, { notes_content: notesDraft });
      onLessonUpdate?.(updated);
      setEditingNotes(false);
    } catch (err) {
      setPdfError(err.message || 'Could not save notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const hasNotes = !!(notesContent && notesContent.trim());
  const hasPdf = !!pdfFilename;

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto p-1">
      {pdfError && (
        <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{pdfError}</span>
        </div>
      )}

      {/* Instructor-authored reading notes */}
      {(hasNotes || isOwner) && (
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-[var(--text)] flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" /> Lesson notes
            </h4>
            {isOwner && !editingNotes && (
              <button
                className="text-xs font-medium text-primary-700 hover:underline"
                onClick={() => setEditingNotes(true)}
              >
                {hasNotes ? 'Edit' : 'Add notes'}
              </button>
            )}
          </div>

          {editingNotes ? (
            <div className="flex flex-col gap-2">
              <textarea
                className="w-full min-h-[140px] p-3 border border-[var(--border)] rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-[var(--text)] bg-[var(--surface)]"
                placeholder="Write reading material for students to see alongside this lesson..."
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  className={btnMuted}
                  onClick={() => { setNotesDraft(notesContent || ''); setEditingNotes(false); }}
                  disabled={savingNotes}
                >
                  Cancel
                </button>
                <button className={btnPrimary} onClick={handleSaveNotes} disabled={savingNotes}>
                  {savingNotes ? 'Saving...' : 'Save notes'}
                </button>
              </div>
            </div>
          ) : hasNotes ? (
            <p className="text-sm text-[var(--text)] whitespace-pre-wrap leading-relaxed">{notesContent}</p>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">No reading notes yet — students will only see this once you add some.</p>
          )}
        </div>
      )}

      {/* PDF material */}
      <div className="flex-1 min-h-[280px] flex flex-col">
        {isOwner && (
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-[var(--text)] flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> PDF material
            </h4>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFilePicked}
              />
              <button className={btnMuted} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload className="w-3.5 h-3.5" />
                {uploading ? 'Uploading...' : hasPdf ? 'Replace PDF' : 'Upload PDF'}
              </button>
              {hasPdf && (
                <button className={btnMuted} onClick={handleRemovePdf} disabled={uploading}>
                  <X className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </div>
          </div>
        )}

        {hasPdf ? (
          pdfLoading ? (
            <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading PDF...
            </div>
          ) : pdfUrl ? (
            <iframe
              title={pdfFilename || 'Lesson PDF'}
              src={pdfUrl}
              className="flex-1 w-full min-h-[280px] rounded-xl border border-[var(--border)] bg-white"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-[var(--text-muted)]">
              Couldn't display the PDF.
            </div>
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-[var(--surface-2)] rounded-xl border border-dashed border-[var(--border)]">
            <BookOpen className="w-10 h-10 text-[var(--text-muted)] mb-3 opacity-50" />
            <h3 className="text-sm font-semibold text-[var(--text)] mb-1">No PDF yet</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-xs">
              {isOwner
                ? 'Upload a PDF above to give students something to read alongside this lesson.'
                : 'Lesson resources will appear here when they are added by your instructor.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
