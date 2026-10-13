import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, describe, vi } from 'vitest';
import FocusModeHUD from '../components/lesson/FocusModeHUD';
import MentorPanel from '../components/lesson/MentorPanel';
import PersonalNotesPanel from '../components/lesson/PersonalNotesPanel';

describe('Focus Mode Components & UI IDs', () => {
  describe('FocusModeHUD', () => {
    test('renders all Focus Mode HUD UI IDs and data-testids', () => {
      const handleExit = vi.fn();
      const handleOpenMentor = vi.fn();
      const handleOpenNotes = vi.fn();

      render(
        <FocusModeHUD
          lessonTitle="Graph Theory Masterclass"
          attentionState="focused"
          isTrackingEnabled={true}
          activeDrawer={null}
          onExitFocusMode={handleExit}
          onOpenMentor={handleOpenMentor}
          onOpenNotes={handleOpenNotes}
        />
      );

      // Core container & badges
      expect(document.getElementById('focus-mode-hud')).toBeInTheDocument();
      expect(document.getElementById('focus-mode-badge')).toBeInTheDocument();
      expect(document.getElementById('focus-mode-lesson-title')).toHaveTextContent('Graph Theory Masterclass');

      // Timer & Controls
      expect(document.getElementById('focus-mode-timer')).toBeInTheDocument();
      expect(document.getElementById('focus-mode-timer-display')).toBeInTheDocument();
      expect(document.getElementById('focus-mode-timer-toggle')).toBeInTheDocument();
      expect(document.getElementById('focus-mode-timer-reset')).toBeInTheDocument();
      expect(document.getElementById('focus-mode-timer-presets')).toBeInTheDocument();

      // Flow State
      expect(document.getElementById('focus-mode-flow-state')).toBeInTheDocument();

      // Ambient Sound & Action Buttons
      expect(document.getElementById('focus-mode-ambient-toggle')).toBeInTheDocument();
      expect(document.getElementById('focus-mode-mentor-btn')).toBeInTheDocument();
      expect(document.getElementById('focus-mode-notes-btn')).toBeInTheDocument();
      expect(document.getElementById('focus-mode-exit-btn')).toBeInTheDocument();

      // Clicking action triggers
      fireEvent.click(document.getElementById('focus-mode-mentor-btn'));
      expect(handleOpenMentor).toHaveBeenCalledTimes(1);

      fireEvent.click(document.getElementById('focus-mode-notes-btn'));
      expect(handleOpenNotes).toHaveBeenCalledTimes(1);

      fireEvent.click(document.getElementById('focus-mode-exit-btn'));
      expect(handleExit).toHaveBeenCalledTimes(1);
    });

    test('activeDrawer highlights corresponding button', () => {
      const { rerender } = render(
        <FocusModeHUD
          lessonTitle="Test"
          activeDrawer="mentor"
          onExitFocusMode={vi.fn()}
          onOpenMentor={vi.fn()}
          onOpenNotes={vi.fn()}
        />
      );

      const mentorBtn = document.getElementById('focus-mode-mentor-btn');
      expect(mentorBtn).toHaveAttribute('aria-expanded', 'true');

      rerender(
        <FocusModeHUD
          lessonTitle="Test"
          activeDrawer="notes"
          onExitFocusMode={vi.fn()}
          onOpenMentor={vi.fn()}
          onOpenNotes={vi.fn()}
        />
      );

      const notesBtn = document.getElementById('focus-mode-notes-btn');
      expect(notesBtn).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('MentorPanel (Drawer Mode)', () => {
    test('renders drawer variant with full height and all UI IDs', () => {
      render(
        <MentorPanel
          isOpen={true}
          isDrawer={true}
          id="focus-mentor-panel"
          hints={[]}
          onGetHint={vi.fn()}
          onClose={vi.fn()}
        />
      );

      expect(document.getElementById('focus-mentor-panel')).toBeInTheDocument();
      expect(document.getElementById('focus-mentor-panel-audio-toggle')).toBeInTheDocument();
      expect(document.getElementById('focus-mentor-panel-messages')).toBeInTheDocument();
      expect(document.getElementById('focus-mentor-panel-empty-card')).toBeInTheDocument();
      expect(document.getElementById('focus-mentor-panel-quick-actions')).toBeInTheDocument();
      expect(document.getElementById('focus-mentor-panel-confused-btn')).toBeInTheDocument();
      expect(document.getElementById('focus-mentor-panel-input-container')).toBeInTheDocument();
      expect(document.getElementById('mentor-response')).toBeInTheDocument();
      expect(document.getElementById('focus-mentor-panel-mic-btn')).toBeInTheDocument();
      expect(document.getElementById('focus-mentor-panel-send-btn')).toBeInTheDocument();
    });
  });

  describe('PersonalNotesPanel (Drawer Mode)', () => {
    test('renders with focus notes IDs and textareaId', () => {
      render(
        <PersonalNotesPanel
          lessonId={1}
          id="focus-notes-panel"
          textareaId="focus-notes-textarea"
        />
      );

      expect(document.getElementById('focus-notes-panel')).toBeInTheDocument();
      expect(document.getElementById('focus-notes-textarea')).toBeInTheDocument();
    });
  });
});
