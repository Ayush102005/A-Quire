/**
 * GazeTracker.js  —  A-Quire Proactive Eye Tracking
 *
 * Uses MediaPipe Tasks-Vision FaceLandmarker (modern API) to detect:
 *   - fixation: sustained gaze on a small region (student is stuck)
 *   - distraction: gaze leaves the screen
 *
 * States emitted:
 *   "focused"    — normal, varied gaze
 *   "confused"   — fixation detected (same spot for FIXATION_MS ms)
 *   "distracted" — gaze off-screen for DISTRACTION_MS ms
 */

// Left iris centre = landmark 468, right = 473 (with refineLandmarks)
const L_IRIS = 468;

// ─── Parameters ────────────────────────────────────────────────────────────────
const EMA_ALPHA = 0.2;    // smoothing (lower = smoother but slower)
const FIXATION_RADIUS = 0.06;   // normalised radius — within this = same spot
const FIXATION_MS = 12000;  // ms of staying in radius → confused (12 s: time to think)
const DISTRACTION_MS = 5000;  // ms of out-of-bounds → distracted (5 s grace)
const RETURN_GRACE_MS = 2000;  // ms of screen presence before resetting to focused
const OOB_MARGIN = 0.12;   // how far past edge counts as out-of-bounds
// ───────────────────────────────────────────────────────────────────────────────

export class GazeTracker {
    constructor() {
        this._cb = null;   // onStateChange callback
        this._state = "focused";
        this._running = false;
        this._rafId = null;

        // EMA gaze point (normalised 0-1)
        this._gaze = { x: 0.5, y: 0.5 };

        // Fixation tracking
        this._fixCenter = null;   // { x, y } anchor when fixation started
        this._fixStartTime = null;

        // Distraction tracking
        this._oobStartTime = null;
        this._returnStartTime = null;  // for return-to-focused grace period

        this._landmarker = null;
        this._lastVideoTime = -1;
    }

    onStateChange(cb) { this._cb = cb; }
    get state() { return this._state; }

    /**
     * Call this whenever the user is actively typing.
     * Clears the fixation anchor so the 3-second window restarts from scratch,
     * preventing false "confused" states while coding.
     */
    resetFixation() {
        this._fixCenter = null;
        this._fixStartTime = null;
    }

    // ── Public API ──────────────────────────────────────────────────────────────

    async start(videoEl) {
        if (this._running) return;
        this._running = true;
        this._videoEl = videoEl;

        try {
            // Dynamically import to avoid Vite esbuild issues with WASM
            const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");

            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
            );

            this._landmarker = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath:
                        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                    delegate: "GPU",
                },
                outputFaceBlendshapes: false,
                runningMode: "VIDEO",
                numFaces: 1,
            });

            console.log("[GazeTracker] FaceLandmarker ready ✓");
            this._loop();
        } catch (err) {
            console.warn("[GazeTracker] Failed to init:", err);
            this._running = false;
        }
    }

    stop() {
        this._running = false;
        if (this._rafId) cancelAnimationFrame(this._rafId);
        try { this._landmarker?.close(); } catch (_) { }
        this._landmarker = null;
    }

    // ── Detection loop ──────────────────────────────────────────────────────────

    _loop() {
        if (!this._running) return;
        this._rafId = requestAnimationFrame(() => {

            const video = this._videoEl;
            if (
                this._landmarker &&
                video &&
                video.readyState >= 2 &&
                video.currentTime !== this._lastVideoTime
            ) {
                this._lastVideoTime = video.currentTime;
                const result = this._landmarker.detectForVideo(video, performance.now());
                this._process(result);
            }

            this._loop();
        });
    }

    _process(result) {
        if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
            // No face → distraction
            this._oobStartTime ??= performance.now();
            this._fixCenter = null;
            this._fixStartTime = null;
            this._checkDistraction();
            return;
        }

        const lm = result.faceLandmarks[0];
        const iris = lm[L_IRIS];
        if (!iris) return;

        // Mirror X because video is displayed flipped
        const rawX = 1 - iris.x;
        const rawY = iris.y;

        // EMA smoothing
        this._gaze.x = EMA_ALPHA * rawX + (1 - EMA_ALPHA) * this._gaze.x;
        this._gaze.y = EMA_ALPHA * rawY + (1 - EMA_ALPHA) * this._gaze.y;

        const { x, y } = this._gaze;
        const oob = x < OOB_MARGIN || x > 1 - OOB_MARGIN || y < OOB_MARGIN || y > 1 - OOB_MARGIN;

        if (oob) {
            this._oobStartTime ??= performance.now();
            this._fixCenter = null;
            this._fixStartTime = null;
            this._checkDistraction();
            return;
        }

        // Reset out-of-bounds once gaze is back on screen
        this._oobStartTime = null;

        // ── Fixation detection ──────────────────────────────────────────────────
        if (!this._fixCenter) {
            // Start a new fixation window
            this._fixCenter = { x, y };
            this._fixStartTime = performance.now();
        } else {
            const dx = x - this._fixCenter.x;
            const dy = y - this._fixCenter.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= FIXATION_RADIUS) {
                // Still within fixation circle
                const fixationDuration = performance.now() - this._fixStartTime;
                if (fixationDuration >= FIXATION_MS) {
                    this._emit("confused");
                    // Reset so it doesn't re-fire immediately
                    this._fixCenter = null;
                    this._fixStartTime = null;
                }
            } else {
                // Gaze moved — start fresh
                this._fixCenter = { x, y };
                this._fixStartTime = performance.now();
            }
        }

        // ── Return-to-focused tracking ──────────────────────────────────────────
        // Only reset to "focused" after the gaze has actually MOVED
        // (fixCenter being reset == movement detected)
        // We set _returnStartTime when movement is detected, and only emit
        // "focused" after RETURN_GRACE_MS of sustained screen presence.
        if (this._state !== "focused" && this._state !== "confused_pending") {
            if (!this._returnStartTime) {
                this._returnStartTime = performance.now();
            } else if (performance.now() - this._returnStartTime >= RETURN_GRACE_MS) {
                this._returnStartTime = null;
                this._emit("focused");
            }
        } else {
            this._returnStartTime = null;
        }
    }

    _checkDistraction() {
        if (this._oobStartTime && performance.now() - this._oobStartTime >= DISTRACTION_MS) {
            this._emit("distracted");
            this._oobStartTime = null; // Reset so it doesn't re-fire
        }
    }

    _emit(newState) {
        if (newState !== this._state) {
            this._state = newState;
            if (this._cb) {
                this._cb(newState);
            }
        }
    }
}
