import React, { useState, useRef, useEffect } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize2, RotateCcw,
  SkipBack, SkipForward, Captions
} from 'lucide-react';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VideoPlayer({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
  onTimeUpdate,
  isStruggle,
  captionsOn,
  onToggleCaptions,
  currentTranscriptText,
}) {
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [hoveringControls, setHoveringControls] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const progressRef = useRef(null);
  const hideTimer = useRef(null);

  // Auto-hide controls
  useEffect(() => {
    if (!isPlaying || hoveringControls) {
      setControlsVisible(true);
      clearTimeout(hideTimer.current);
      return;
    }
    hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
    return () => clearTimeout(hideTimer.current);
  }, [isPlaying, hoveringControls, currentTime]);

  const handleProgressClick = (e) => {
    const rect = progressRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    onSeek(Math.round(pct * duration));
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`relative w-full bg-stone-950 rounded-xl overflow-hidden shadow-2xl group
        ${isStruggle ? 'ring-2 ring-amber-400/60' : ''}`}
      style={{ aspectRatio: '16/9' }}
      onMouseMove={() => setControlsVisible(true)}
    >
      {/* Video placeholder — replace with actual <video> element */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900">
        <div className="text-center select-none pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
            <div className="text-white/20 text-5xl font-thin">∫</div>
          </div>
          <p className="text-white/20 text-sm font-medium">Intro to Entropy · 42 min</p>
        </div>
      </div>

      {/* Struggle overlay — dim when paused for struggle */}
      {isStruggle && (
        <div className="absolute inset-0 bg-stone-950/50 pointer-events-none" />
      )}

      {/* Captions bar */}
      {captionsOn && currentTranscriptText && (
        <div className="absolute bottom-16 left-0 right-0 px-8 flex justify-center pointer-events-none">
          <p className="bg-stone-950/80 text-white text-sm font-medium px-4 py-2 rounded-lg text-center max-w-2xl leading-relaxed">
            {currentTranscriptText}
          </p>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 ${
          controlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
        onMouseEnter={() => setHoveringControls(true)}
        onMouseLeave={() => setHoveringControls(false)}
      >
        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none rounded-b-xl" />

        <div className="relative px-4 pb-4 pt-8">
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="w-full h-1 bg-white/20 rounded-full mb-3 cursor-pointer group/prog relative"
            onClick={handleProgressClick}
            role="slider"
            aria-label="Video progress"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') onSeek(Math.min(currentTime + 5, duration));
              if (e.key === 'ArrowLeft') onSeek(Math.max(currentTime - 5, 0));
            }}
          >
            <div
              className="h-full bg-teal-500 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover/prog:opacity-100 transition-opacity -ml-1.5"
              style={{ left: `${progressPct}%` }}
            />
          </div>

          {/* Control row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Skip back 10s */}
              <button
                onClick={() => onSeek(Math.max(0, currentTime - 10))}
                className="p-1.5 text-white/70 hover:text-white transition-colors rounded focus-visible:ring-2 focus-visible:ring-teal-400"
                aria-label="Rewind 10 seconds"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              {/* Play/Pause */}
              <button
                onClick={onPlayPause}
                className="p-2 bg-white text-stone-900 rounded-full hover:bg-stone-100 transition-colors shadow-lg focus-visible:ring-2 focus-visible:ring-teal-400"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying
                  ? <Pause className="w-4 h-4 fill-current" />
                  : <Play className="w-4 h-4 fill-current" />
                }
              </button>

              {/* Skip forward 10s */}
              <button
                onClick={() => onSeek(Math.min(duration, currentTime + 10))}
                className="p-1.5 text-white/70 hover:text-white transition-colors rounded focus-visible:ring-2 focus-visible:ring-teal-400"
                aria-label="Forward 10 seconds"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Time */}
              <span className="text-white/60 text-xs font-mono tabular-nums ml-1">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* Volume */}
              <div className="relative flex items-center">
                <button
                  onClick={() => setMuted(!muted)}
                  className="p-1.5 text-white/70 hover:text-white transition-colors rounded focus-visible:ring-2 focus-visible:ring-teal-400"
                  aria-label={muted ? 'Unmute' : 'Mute'}
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Captions */}
              <button
                onClick={onToggleCaptions}
                className={`p-1.5 rounded transition-colors focus-visible:ring-2 focus-visible:ring-teal-400 ${
                  captionsOn ? 'text-teal-400' : 'text-white/50 hover:text-white'
                }`}
                aria-label={captionsOn ? 'Hide captions' : 'Show captions'}
                aria-pressed={captionsOn}
              >
                <Captions className="w-4 h-4" />
              </button>

              {/* Fullscreen */}
              <button
                className="p-1.5 text-white/70 hover:text-white transition-colors rounded focus-visible:ring-2 focus-visible:ring-teal-400"
                aria-label="Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Paused big play icon in center */}
      {!isPlaying && !isStruggle && (
        <button
          onClick={onPlayPause}
          className="absolute inset-0 flex items-center justify-center group/play"
          aria-label="Play"
          tabIndex={-1}
        >
          <div className="w-16 h-16 bg-white/10 border border-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all group-hover/play:scale-110 group-hover/play:bg-white/20">
            <Play className="w-7 h-7 text-white fill-current ml-1" />
          </div>
        </button>
      )}
    </div>
  );
}
