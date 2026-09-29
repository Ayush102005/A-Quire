/**
 * gazeConfig.ts
 * =============
 * Single source of truth for gaze-pipeline feature flags and thresholds.
 *
 * Every other gaze module (`gazeEngine.js`, `gazeCalibration.js`, `gazeFixation.js`,
 * `gazeAOI.js`, `gazeMetrics.js`, `useGazeTracker.js`, `GazeTracker.jsx`,
 * `GazeProvider.tsx`) reads its tunables from here instead of hardcoding them or
 * reading `import.meta.env` directly. See `Frontend/GAZE_PIPELINE.md` for the
 * full reference and rationale behind each default.
 */

export interface GazeConfig {
  // Core pipeline
  calibrationEnabled: boolean;
  advancedFixationEnabled: boolean;
  advancedStruggleEnabled: boolean;

  // Auto-intervention behavior
  autoHintsEnabled: boolean;
  maxAutoHintsPerLesson: number;
  autoHintCooldownMs: number;

  // Calibration quality thresholds (pixels)
  calibrationGoodThresholdPx: number;
  calibrationPoorThresholdPx: number;

  // Fixation thresholds
  minFixationDurationMs: number;
  dispersionThresholdPx: number;

  // Struggle thresholds
  offTargetDwellThresholdMs: number;
  offTargetFixationCountThreshold: number;
  offTargetWindowMs: number;

  // Eval mode
  evalModeEnabled: boolean;

  // Debug
  debugLogsEnabled: boolean;
}

export const DEFAULT_GAZE_CONFIG: GazeConfig = {
  calibrationEnabled: true,
  advancedFixationEnabled: true,
  advancedStruggleEnabled: true,

  autoHintsEnabled: true,
  maxAutoHintsPerLesson: 3,
  autoHintCooldownMs: 60_000,

  calibrationGoodThresholdPx: 80,
  calibrationPoorThresholdPx: 160,

  // Scaled 2x alongside useGazeTracker.js's FRAME_INTERVAL_MS drop from
  // 100ms to 200ms (10fps -> 5fps, for main-thread inference cost) — keeps
  // the same ~2-3 underlying samples required to confirm a fixation, not
  // just a looser wall-clock window at the same sample count.
  minFixationDurationMs: 240,
  dispersionThresholdPx: 40,

  offTargetDwellThresholdMs: 4000,
  offTargetFixationCountThreshold: 2,
  offTargetWindowMs: 15_000,

  evalModeEnabled: false,
  debugLogsEnabled: false,
};

/** localStorage key for the one-time gaze consent choice ('granted' | 'denied'). */
export const CONSENT_KEY = 'aquire_gaze_consent';

function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true';
}

let _cached: GazeConfig | null = null;

/**
 * Resolve the effective gaze config: `DEFAULT_GAZE_CONFIG` overridden by any
 * `VITE_GAZE_*` env vars present at build time. Only feature-flag booleans are
 * env-overridable (thresholds are tuned in code — see GAZE_PIPELINE.md); this
 * keeps deploy-time control limited to on/off switches while numeric tuning
 * stays reviewable in source.
 */
export function getGazeConfig(): GazeConfig {
  if (_cached) return _cached;

  const env = import.meta.env;
  _cached = {
    ...DEFAULT_GAZE_CONFIG,
    calibrationEnabled: envFlag(env.VITE_GAZE_CALIBRATION_ENABLED, DEFAULT_GAZE_CONFIG.calibrationEnabled),
    advancedFixationEnabled: envFlag(env.VITE_GAZE_ADVANCED_FIXATION_ENABLED, DEFAULT_GAZE_CONFIG.advancedFixationEnabled),
    advancedStruggleEnabled: envFlag(env.VITE_GAZE_ADVANCED_STRUGGLE_ENABLED, DEFAULT_GAZE_CONFIG.advancedStruggleEnabled),
    autoHintsEnabled: envFlag(env.VITE_GAZE_AUTO_HINTS_ENABLED, DEFAULT_GAZE_CONFIG.autoHintsEnabled),
    evalModeEnabled: envFlag(env.VITE_GAZE_EVAL_MODE_ENABLED, DEFAULT_GAZE_CONFIG.evalModeEnabled),
    debugLogsEnabled: envFlag(env.VITE_GAZE_DEBUG_LOGS, DEFAULT_GAZE_CONFIG.debugLogsEnabled),
  };
  return _cached;
}

/** Test-only: clear the memoized config so env-var changes take effect between tests. */
export function _resetGazeConfigCache(): void {
  _cached = null;
}

export type CalibrationBand = 'good' | 'fair' | 'poor';

/**
 * Bucket an average calibration error (px) into a quality band per
 * `calibrationGoodThresholdPx` / `calibrationPoorThresholdPx`.
 */
export function getCalibrationBand(avgErrorPx: number, config: GazeConfig = getGazeConfig()): CalibrationBand {
  if (avgErrorPx <= config.calibrationGoodThresholdPx) return 'good';
  if (avgErrorPx <= config.calibrationPoorThresholdPx) return 'fair';
  return 'poor';
}

/**
 * Console-only debug logger gated by `debugLogsEnabled` (VITE_GAZE_DEBUG_LOGS).
 * Never sent to the server — for local development only.
 */
export function gazeLog(...args: unknown[]): void {
  if (getGazeConfig().debugLogsEnabled) {
    // eslint-disable-next-line no-console
    console.debug('[gaze]', ...args);
  }
}
