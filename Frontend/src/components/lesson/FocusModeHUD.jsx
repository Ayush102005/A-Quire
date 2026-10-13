import React, { useState, useEffect, useRef } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Headphones, 
  MessageSquare, 
  FileText, 
  X, 
  Zap,
  Clock
} from 'lucide-react';
import { ambientAudio } from '../../utils/ambientAudio';

export default function FocusModeHUD({
  lessonTitle,
  attentionState,
  onExitFocusMode,
  onOpenMentor,
  onOpenNotes,
  isTrackingEnabled,
  activeDrawer = null,
  theme = 'dark',
}) {
  // Timer State (Default 25 mins Pomodoro)
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [initialDuration, setInitialDuration] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Ambient Sound State
  const [soundMode, setSoundMode] = useState('none'); // 'none' | 'alpha' | 'rain'
  const [volume, setVolume] = useState(0.35);
  const [showSoundMenu, setShowSoundMenu] = useState(false);

  // Timer Tick
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds]);

  // Handle ambient sound changes
  const handleSoundChange = (newSound) => {
    setSoundMode(newSound);
    if (newSound === 'alpha') {
      ambientAudio.playAlphaBeats();
    } else if (newSound === 'rain') {
      ambientAudio.playRain();
    } else {
      ambientAudio.stop();
    }
  };

  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    ambientAudio.setVolume(newVol);
  };

  // Stop ambient sound when exiting focus mode
  useEffect(() => {
    return () => {
      ambientAudio.stop();
    };
  }, []);

  // Format time mm:ss
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Compute timer progress %
  const timerPercent = Math.round(((initialDuration - timerSeconds) / initialDuration) * 100);

  // Flow State Label
  let flowText = 'Focusing';
  let flowColor = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
  if (isTrackingEnabled) {
    if (attentionState === 'focused') {
      flowText = 'Deep Flow';
      flowColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.3)]';
    } else if (attentionState === 'fixated') {
      flowText = 'Processing';
      flowColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    } else if (attentionState === 'idle') {
      flowText = 'Reflecting';
      flowColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  }

  return (
    <div 
      id="focus-mode-hud"
      data-testid="focus-mode-hud"
      className={`focus-mode-hud fixed top-0 left-0 right-0 z-[120] px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 transition-all duration-300 select-none shadow-lg ${
        theme === 'dark'
          ? 'bg-stone-950/95 border-stone-800 text-stone-100'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      {/* Left: Brand + Lesson title */}
      <div className="flex items-center gap-3">
        <div 
          id="focus-mode-badge"
          data-testid="focus-mode-badge"
          className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold"
        >
          <Zap className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>FOCUS MODE</span>
        </div>
        <span className={`hidden md:inline-block ${theme === 'dark' ? 'text-stone-500' : 'text-slate-400'}`}>|</span>
        <h2 
          id="focus-mode-lesson-title"
          data-testid="focus-mode-lesson-title"
          className={`text-sm font-semibold truncate max-w-[200px] sm:max-w-xs md:max-w-md ${
            theme === 'dark' ? 'text-stone-200' : 'text-slate-700'
          }`}
        >
          {lessonTitle || 'Lesson'}
        </h2>
      </div>

      {/* Center: Pomodoro Timer & Flow Meter */}
      <div className="flex items-center gap-4">
        {/* Pomodoro Timer */}
        <div 
          id="focus-mode-timer"
          data-testid="focus-mode-timer"
          className={`flex items-center gap-2 rounded-xl px-3 py-1.5 shadow-inner ${
            theme === 'dark'
              ? 'bg-stone-900/90 border border-stone-700/60'
              : 'bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4 text-stone-400" />
          <span 
            id="focus-mode-timer-display"
            data-testid="focus-mode-timer-display"
            className={`font-mono text-sm font-bold tracking-wider ${
              theme === 'dark' ? 'text-stone-100' : 'text-slate-800'
            }`}
          >
            {formatTime(timerSeconds)}
          </span>
          
          <button
            id="focus-mode-timer-toggle"
            data-testid="focus-mode-timer-toggle"
            onClick={() => setIsTimerRunning(!isTimerRunning)}
            className={`p-1 transition-colors cursor-pointer ${
              theme === 'dark' ? 'text-stone-400 hover:text-stone-100' : 'text-slate-400 hover:text-slate-700'
            }`}
            title={isTimerRunning ? 'Pause timer' : 'Resume timer'}
            aria-label={isTimerRunning ? 'Pause timer' : 'Resume timer'}
          >
            {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          <button
            id="focus-mode-timer-reset"
            data-testid="focus-mode-timer-reset"
            onClick={() => {
              setTimerSeconds(initialDuration);
              setIsTimerRunning(true);
            }}
            className={`p-1 transition-colors cursor-pointer ${
              theme === 'dark' ? 'text-stone-500 hover:text-stone-300' : 'text-slate-400 hover:text-slate-600'
            }`}
            title="Reset timer"
            aria-label="Reset timer"
          >
            <RotateCcw className="w-3 h-3" />
          </button>

          {/* Quick Preset Selector */}
          <select
            id="focus-mode-timer-presets"
            data-testid="focus-mode-timer-presets"
            value={initialDuration}
            onChange={(e) => {
              const val = Number(e.target.value);
              setInitialDuration(val);
              setTimerSeconds(val);
            }}
            className={`bg-transparent text-xs border-none outline-none cursor-pointer pr-1 ${
              theme === 'dark' ? 'text-stone-400 hover:text-stone-200' : 'text-slate-500 hover:text-slate-700'
            }`}
            aria-label="Select timer preset"
          >
            <option value={15 * 60} className={theme === 'dark' ? 'bg-stone-900 text-stone-200' : 'bg-white text-slate-700'}>15m</option>
            <option value={25 * 60} className={theme === 'dark' ? 'bg-stone-900 text-stone-200' : 'bg-white text-slate-700'}>25m</option>
            <option value={45 * 60} className={theme === 'dark' ? 'bg-stone-900 text-stone-200' : 'bg-white text-slate-700'}>45m</option>
          </select>
        </div>

        {/* Flow State Pill */}
        <div 
          id="focus-mode-flow-state"
          data-testid="focus-mode-flow-state"
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-all ${flowColor}`}
        >
          <span className="w-2 h-2 rounded-full bg-current animate-ping opacity-75" />
          <span>{flowText}</span>
        </div>
      </div>

      {/* Right: Sound, Tools & Exit */}
      <div className="flex items-center gap-2">
        {/* Ambient Sound Dropdown */}
        <div className="relative">
          <button
            id="focus-mode-ambient-toggle"
            data-testid="focus-mode-ambient-toggle"
            onClick={() => setShowSoundMenu(!showSoundMenu)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
              soundMode !== 'none'
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                : theme === 'dark'
                  ? 'bg-stone-900 border-stone-700/60 text-stone-400 hover:text-stone-200'
                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-700'
            }`}
            title="Ambient Study Sound"
            aria-expanded={showSoundMenu}
            aria-haspopup="true"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {soundMode === 'alpha' ? 'Alpha Waves' : soundMode === 'rain' ? 'Soft Rain' : 'Ambient'}
            </span>
          </button>

          {showSoundMenu && (
            <div 
              id="focus-mode-ambient-menu"
              data-testid="focus-mode-ambient-menu"
              className={`absolute right-0 mt-2 w-56 p-3 border rounded-xl shadow-2xl z-50 text-xs ${
                theme === 'dark'
                  ? 'bg-stone-900 border-stone-700'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className={`flex items-center justify-between pb-2 mb-2 border-b font-semibold ${
                theme === 'dark' ? 'border-stone-800 text-stone-300' : 'border-slate-200 text-slate-700'
              }`}>
                <span>Ambient Sound</span>
                <button 
                  id="focus-mode-ambient-menu-close"
                  data-testid="focus-mode-ambient-menu-close"
                  onClick={() => setShowSoundMenu(false)} 
                  className={`cursor-pointer ${
                    theme === 'dark' ? 'text-stone-500 hover:text-stone-300' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  aria-label="Close ambient sound menu"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <button
                  id="focus-sound-mute-btn"
                  data-testid="focus-sound-mute-btn"
                  onClick={() => handleSoundChange('none')}
                  className={`text-left px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    soundMode === 'none'
                      ? theme === 'dark' ? 'bg-stone-800 text-white font-medium' : 'bg-slate-100 text-slate-900 font-medium'
                      : theme === 'dark' ? 'text-stone-400 hover:bg-stone-800/60' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  🔇 Mute (Off)
                </button>
                <button
                  id="focus-sound-alpha-btn"
                  data-testid="focus-sound-alpha-btn"
                  onClick={() => handleSoundChange('alpha')}
                  className={`text-left px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    soundMode === 'alpha'
                      ? 'bg-indigo-600 text-white font-medium'
                      : theme === 'dark' ? 'text-stone-400 hover:bg-stone-800/60' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  🧠 Alpha Waves (432Hz Binaural)
                </button>
                <button
                  id="focus-sound-rain-btn"
                  data-testid="focus-sound-rain-btn"
                  onClick={() => handleSoundChange('rain')}
                  className={`text-left px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    soundMode === 'rain'
                      ? 'bg-indigo-600 text-white font-medium'
                      : theme === 'dark' ? 'text-stone-400 hover:bg-stone-800/60' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  🌧️ Gentle Rain (Pink Noise)
                </button>
              </div>

              {soundMode !== 'none' && (
                <div className={`mt-3 pt-2 border-t flex items-center gap-2 ${
                  theme === 'dark' ? 'border-stone-800' : 'border-slate-200'
                }`}>
                  <Volume2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <input
                    id="focus-sound-volume-slider"
                    data-testid="focus-sound-volume-slider"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className={`w-full h-1 rounded-lg cursor-pointer accent-indigo-500 ${
                      theme === 'dark' ? 'bg-stone-800' : 'bg-slate-200'
                    }`}
                    aria-label="Volume slider"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Mentor Trigger */}
        <button
          id="focus-mode-mentor-btn"
          data-testid="focus-mode-mentor-btn"
          onClick={onOpenMentor}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            activeDrawer === 'mentor'
              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-200 border border-amber-400/50 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
              : theme === 'dark'
                ? 'bg-stone-900 border border-stone-700/60 text-stone-300 hover:text-white hover:bg-stone-800'
                : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'
          }`}
          title="Ask AI Mentor"
          aria-label="Ask AI Mentor"
          aria-expanded={activeDrawer === 'mentor'}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Mentor</span>
        </button>

        {/* Quick Notes Trigger */}
        <button
          id="focus-mode-notes-btn"
          data-testid="focus-mode-notes-btn"
          onClick={onOpenNotes}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            activeDrawer === 'notes'
              ? 'bg-blue-500/20 text-blue-600 dark:text-blue-200 border border-blue-400/50 shadow-[0_0_12px_rgba(96,165,250,0.25)]'
              : theme === 'dark'
                ? 'bg-stone-900 border border-stone-700/60 text-stone-300 hover:text-white hover:bg-stone-800'
                : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'
          }`}
          title="Take Notes"
          aria-label="Take Notes"
          aria-expanded={activeDrawer === 'notes'}
        >
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Notes</span>
        </button>

        {/* Exit Focus Mode Button */}
        <button
          id="focus-mode-exit-btn"
          data-testid="focus-mode-exit-btn"
          onClick={onExitFocusMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/20 border border-red-500/30 text-red-300 hover:bg-red-600 hover:text-white text-xs font-semibold transition-all ml-1 cursor-pointer"
          title="Exit Focus Mode (Esc)"
          aria-label="Exit Focus Mode"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          <span>Exit <span className="hidden sm:inline text-xs opacity-75 font-normal">(Esc)</span></span>
        </button>
      </div>
    </div>
  );
}
