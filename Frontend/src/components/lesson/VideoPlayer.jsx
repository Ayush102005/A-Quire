import React from 'react';

// Create a promise that resolves when YouTube API is ready
let apiReadyPromise = null;

const getYouTubeApi = () => {
  if (typeof window === 'undefined') return Promise.reject('No window');
  
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }

  if (!apiReadyPromise) {
    apiReadyPromise = new Promise((resolve) => {
      window.onYouTubeIframeAPIReady = () => {
        resolve(window.YT);
      };

      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    });
  }

  return apiReadyPromise;
};

function extractVideoId(src) {
  if (!src) return null;
  if (!(src.includes('youtube.com') || src.includes('youtu.be'))) return null;

  let url;
  try {
    url = new URL(src);
  } catch (err) {
    return null;
  }

  let videoId = '';
  const params = new URLSearchParams(url.search);

  if (url.hostname.includes('youtu.be')) {
    videoId = url.pathname.slice(1).split('?')[0];
  } else if (url.pathname.startsWith('/watch')) {
    videoId = params.get('v') || '';
  } else if (url.pathname.startsWith('/shorts/')) {
    videoId = url.pathname.split('/')[2] || '';
  } else if (url.pathname.startsWith('/embed/')) {
    videoId = url.pathname.split('/')[2] || '';
  }

  return videoId && videoId.length === 11 ? videoId : null;
}

export default function VideoPlayer({
  containerRef,
  src,
  videoRef,
  iframeId,
  onTimeUpdate,
  onDurationChange,
  onEnded,
  onPlay,
  onPause,
  speed = '1x',
  isStruggle = false,
  webcamStream = null,
  initialTime = 0,
}) {
  const webcamRef = React.useRef(null);
  const playerRef = React.useRef(null);
  const playerIdRef = React.useRef(iframeId || `yt-player-${Date.now()}-${Math.random()}`);
  const playerId = playerIdRef.current;
  const timeIntervalRef = React.useRef(null);
  const [isPlayerReady, setIsPlayerReady] = React.useState(false);

  // Keep callback refs always current — lets us omit callbacks from effect deps
  // to prevent the player from being destroyed/recreated when parent re-renders.
  const onPlayRef = React.useRef(onPlay);
  const onPauseRef = React.useRef(onPause);
  const onEndedRef = React.useRef(onEnded);
  const onTimeUpdateRef = React.useRef(onTimeUpdate);
  const onDurationChangeRef = React.useRef(onDurationChange);
  const videoRefRef = React.useRef(videoRef);
  React.useEffect(() => { onPlayRef.current = onPlay; });
  React.useEffect(() => { onPauseRef.current = onPause; });
  React.useEffect(() => { onEndedRef.current = onEnded; });
  React.useEffect(() => { onTimeUpdateRef.current = onTimeUpdate; });
  React.useEffect(() => { onDurationChangeRef.current = onDurationChange; });
  React.useEffect(() => { videoRefRef.current = videoRef; });
  
  const isYouTube = src && (src.includes('youtube.com') || src.includes('youtu.be'));
  const videoId = isYouTube ? extractVideoId(src) : null;

  // Initialize YouTube IFrame API player.
  // IMPORTANT: Do NOT add callback props (onPlay, onPause, onEnded, videoRef)
  // to this dependency array. They are accessed via refs so that a parent
  // re-render never causes the player to be destroyed and re-created, which
  // would produce two simultaneous audio streams (the "plays twice" bug).
  React.useEffect(() => {
    if (!isYouTube || !videoId || typeof window === 'undefined') return;

    let mounted = true;

    getYouTubeApi()
      .then((YT) => {
        if (!mounted) return;

        const playerElement = document.getElementById(playerId);
        if (!playerElement) return;

        // Abort if the element was already converted to an iframe by YT (prevents
        // double-init when React strict-mode runs the effect twice in dev).
        if (playerElement.tagName === 'IFRAME') return;

        // Clear any existing content
        playerElement.innerHTML = '';

        // Create and initialize player
        const newPlayer = new YT.Player(playerId, {
          videoId: videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
            enablejsapi: 1,
            origin: window.location.origin,
            start: Math.floor(initialTime),
          },
          events: {
            onReady: (event) => {
              if (!mounted) return;
              // Store reference to the YouTube player for API calls
              playerRef.current = event.target;
              // Expose player via the forwarded ref (using current ref value)
              if (videoRefRef.current) {
                videoRefRef.current.current = event.target;
              }
              setIsPlayerReady(true);

              // Apply speed immediately on ready
              try {
                const rate = parseFloat(speed.replace('x', ''));
                if (!isNaN(rate) && event.target.setPlaybackRate) {
                  event.target.setPlaybackRate(rate);
                }
              } catch (e) {
                console.warn('Could not set initial playback rate:', e);
              }
            },
            onStateChange: (event) => {
              if (!mounted) return;
              const YT = window.YT;
              if (!YT) return;
              
              if (event.data === YT.PlayerState.PLAYING) {
                onPlayRef.current?.();
              } else if (event.data === YT.PlayerState.PAUSED) {
                onPauseRef.current?.();
              } else if (event.data === YT.PlayerState.ENDED) {
                onEndedRef.current?.();
              }
            },
            onError: (event) => {
              console.error('YouTube player error:', event.data);
            },
          },
        });
        playerRef.current = newPlayer;
      })
      .catch((err) => {
        console.error('Failed to load YouTube API:', err);
      });

    return () => {
      mounted = false;
      // Clear polling interval before destroying player to avoid a stale
      // interval calling methods on the destroyed player.
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
        timeIntervalRef.current = null;
      }
      setIsPlayerReady(false);
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.warn('Failed to destroy player:', e);
        }
        playerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isYouTube, videoId, playerId]); // callbacks intentionally omitted — accessed via refs

  React.useEffect(() => {
    if (webcamRef.current && webcamStream) {
      try {
        webcamRef.current.srcObject = webcamStream;
      } catch (e) {
        console.warn('Failed to assign webcam stream to element', e);
      }
    }
    return () => {
      if (webcamRef.current) webcamRef.current.srcObject = null;
    };
  }, [webcamStream]);

  // Handle speed changes for YouTube player
  React.useEffect(() => {
    if (!isYouTube || !playerRef.current || !playerRef.current.setPlaybackRate) {
      return;
    }
    
    try {
      // Convert "1x", "1.25x", etc. to number
      const rate = parseFloat(speed.replace('x', ''));
      if (!isNaN(rate)) {
        playerRef.current.setPlaybackRate(rate);
      }
    } catch (e) {
      console.error('Failed to set playback rate:', e);
    }
  }, [speed, isYouTube, isPlayerReady]);

  // Poll for time updates from YouTube player
  React.useEffect(() => {
    if (!isYouTube || !playerRef.current) return;

    // Clear any existing interval
    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current);
    }

    // Start polling for time updates every 500ms
    timeIntervalRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        try {
          const currentTime = playerRef.current.getCurrentTime();
          const duration = playerRef.current.getDuration ? playerRef.current.getDuration() : 0;
          
          // Use refs so this interval never holds stale closures
          if (onTimeUpdateRef.current) {
            onTimeUpdateRef.current({ target: { currentTime, duration } });
          }
          
          if (onDurationChangeRef.current && duration > 0) {
            onDurationChangeRef.current(duration);
          }
        } catch (e) {
          console.warn('Failed to update time:', e);
        }
      }
    }, 500);

    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
        timeIntervalRef.current = null;
      }
    };
  }, [isYouTube, isPlayerReady]);


  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.16),transparent_55%),linear-gradient(135deg,#090b10_0%,#111827_45%,#05070b_100%)] shadow-[0_30px_90px_rgba(0,0,0,0.45)] ${isStruggle ? 'ring-2 ring-amber-400/60' : ''}`}
      style={{ aspectRatio: '16/9' }}
    >
      <div className="absolute inset-0">
        {src ? (
          isYouTube ? (
            <div
              id={playerId}
              className="h-full w-full"
            />
          ) : (
            <video
              ref={videoRef}
              crossOrigin="anonymous"
              preload="metadata"
              src={src}
              className="h-full w-full object-contain bg-black"
              onTimeUpdate={onTimeUpdate}
              onDurationChange={(e) => onDurationChange && onDurationChange(e.target.duration)}
              onLoadedMetadata={(e) => {
                if (initialTime > 0) {
                  e.target.currentTime = initialTime;
                }
              }}
              onEnded={onEnded}
              onPlay={onPlay}
              onPause={onPause}
              playsInline
              controls
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900">
            <div className="pointer-events-none select-none text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <div className="text-5xl font-thin text-white/20">∫</div>
              </div>
              <p className="text-sm font-medium text-white/20">No video source</p>
            </div>
          </div>
        )}
      </div>

      {isStruggle && <div className="pointer-events-none absolute inset-0 bg-stone-950/50" />}
      {/* Webcam thumbnail */}
      {webcamStream && (
        <div className="absolute bottom-6 left-6 z-20">
          <video
            ref={webcamRef}
            muted
            playsInline
            autoPlay
            className="w-28 h-20 rounded-xl border-2 border-white/10 object-cover shadow-lg"
          />
        </div>
      )}
    </div>
  );
}
