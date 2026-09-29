/**
 * legacyGazeTracker.js  —  A-Quire Proactive Eye Tracking (Fallback)
 *
 * Uses MediaPipe Tasks-Vision FaceLandmarker (modern API) to detect:
 *   - fixation: sustained gaze on a small region (student is stuck)
 *   - distraction: gaze leaves the screen
 */

const L_IRIS = 468;

const EMA_ALPHA = 0.2;
const FIXATION_RADIUS = 0.06;
const FIXATION_MS = 12000;
const DISTRACTION_MS = 5000;
const RETURN_GRACE_MS = 2000;
const OOB_MARGIN = 0.12;

export const DEFAULT_LEGACY_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export class GazeTracker {
    constructor() {
        this._onStateChange = null;
        this._onFrame = null;
        this._state = "unknown";
        this._running = false;
        this._rafId = null;

        this._gaze = { x: 0.5, y: 0.5 };

        this._fixCenter = null;
        this._fixStartTime = null;

        this._oobStartTime = null;
        this._returnStartTime = null;

        this._landmarker = null;
        this._videoEl = null;
        this._lastVideoTime = -1;
    }

    get state() { return this._state; }

    resetFixation() {
        this._fixCenter = null;
        this._fixStartTime = null;
    }

    async initialize({ videoElement, stream, modelUrl, onFrame, onStateChange }) {
        this._videoEl = videoElement;
        this._onFrame = onFrame;
        this._onStateChange = onStateChange;
        
        const finalModelUrl = modelUrl || import.meta.env.VITE_LEGACY_FACE_LANDMARKER_MODEL_URL || DEFAULT_LEGACY_MODEL_URL;

        try {
            const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision").catch(() => {
                throw new Error("legacy_wasm_load_failed");
            });

            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
            ).catch(() => {
                throw new Error("legacy_wasm_load_failed");
            });

            this._landmarker = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: finalModelUrl,
                    delegate: "GPU",
                },
                outputFaceBlendshapes: false,
                runningMode: "VIDEO",
                numFaces: 1,
            }).catch(() => {
                throw new Error("legacy_model_load_failed");
            });
            
        } catch (err) {
            if (err.message && err.message.startsWith("legacy_")) {
                throw err;
            }
            throw new Error("legacy_landmarker_init_failed");
        }
    }

    start() {
        if (!this._landmarker) {
            throw new Error("legacy_processing_failed");
        }
        if (!this._videoEl) {
            throw new Error("legacy_video_not_ready");
        }
        
        if (this._running) return;
        this._running = true;
        this._loop();
    }

    stop() {
        this._running = false;
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
    }
    
    destroy() {
        this.stop();
        this._onStateChange = null;
        this._onFrame = null;
        this._videoEl = null;
        try { 
            if (this._landmarker) {
                this._landmarker.close();
            }
        } catch (_) { }
        this._landmarker = null;
    }

    _loop() {
        if (!this._running) return;
        this._rafId = requestAnimationFrame(() => {
            const video = this._videoEl;
            
            if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
                this._loop();
                return;
            }
            
            if (
                this._landmarker &&
                video.currentTime !== this._lastVideoTime
            ) {
                this._lastVideoTime = video.currentTime;
                try {
                    const result = this._landmarker.detectForVideo(video, performance.now());
                    this._process(result);
                } catch (e) {
                    this._emitFrame(false, performance.now(), false);
                }
            }

            this._loop();
        });
    }

    _emitFrame(isValid, timestamp, hasLandmarks) {
        if (this._onFrame) {
            this._onFrame({
                isValid,
                timestamp,
                attentionState: this._state,
                hasLandmarks
            });
        }
    }

    _process(result) {
        const timestamp = performance.now();
        
        if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
            this._oobStartTime ??= timestamp;
            this._fixCenter = null;
            this._fixStartTime = null;
            this._checkDistraction();
            this._emitFrame(false, timestamp, false);
            return;
        }

        const lm = result.faceLandmarks[0];
        const iris = lm[L_IRIS];
        if (!iris) {
            this._emitFrame(false, timestamp, true);
            return;
        }

        const rawX = 1 - iris.x;
        const rawY = iris.y;

        this._gaze.x = EMA_ALPHA * rawX + (1 - EMA_ALPHA) * this._gaze.x;
        this._gaze.y = EMA_ALPHA * rawY + (1 - EMA_ALPHA) * this._gaze.y;

        const { x, y } = this._gaze;
        const oob = x < OOB_MARGIN || x > 1 - OOB_MARGIN || y < OOB_MARGIN || y > 1 - OOB_MARGIN;

        if (oob) {
            this._oobStartTime ??= timestamp;
            this._fixCenter = null;
            this._fixStartTime = null;
            this._checkDistraction();
            this._emitFrame(true, timestamp, true);
            return;
        }

        this._oobStartTime = null;

        if (!this._fixCenter) {
            this._fixCenter = { x, y };
            this._fixStartTime = timestamp;
        } else {
            const dx = x - this._fixCenter.x;
            const dy = y - this._fixCenter.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= FIXATION_RADIUS) {
                const fixationDuration = timestamp - this._fixStartTime;
                if (fixationDuration >= FIXATION_MS) {
                    this._emit("confused");
                    this._fixCenter = null;
                    this._fixStartTime = null;
                }
            } else {
                this._fixCenter = { x, y };
                this._fixStartTime = timestamp;
            }
        }

        if (this._state !== "focused" && this._state !== "confused_pending") {
            if (!this._returnStartTime) {
                this._returnStartTime = timestamp;
            } else if (timestamp - this._returnStartTime >= RETURN_GRACE_MS) {
                this._returnStartTime = null;
                this._emit("focused");
            }
        } else {
            this._returnStartTime = null;
        }
        
        this._emitFrame(true, timestamp, true);
    }

    _checkDistraction() {
        if (this._oobStartTime && performance.now() - this._oobStartTime >= DISTRACTION_MS) {
            this._emit("distracted");
            this._oobStartTime = null;
        }
    }

    _emit(newState) {
        if (newState !== this._state) {
            this._state = newState;
            if (this._onStateChange) {
                this._onStateChange(newState);
            }
        }
    }
}
