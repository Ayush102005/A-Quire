import { GAZE_FEATURE_ORDER } from './rawGazeTracker';

const MIN_SAMPLES_PER_TARGET = 15;
const MIN_CONFIDENCE = 0.6;
const SETTLING_TIME_MS = 800; // Delay before taking samples
const RIDGE_LAMBDA = 0.1;
const TARGET_ERROR_PX = 144;

function ridgeRegression(X, Y, lambda) {
  const n = X.length;
  const p = X[0].length;
  const Xt = Array.from({ length: p }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      Xt[j][i] = X[i][j];
    }
  }

  const XtX = Array.from({ length: p }, () => Array(p).fill(0));
  for (let i = 0; i < p; i++) {
    for (let j = 0; j < p; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += Xt[i][k] * X[k][j];
      }
      XtX[i][j] = sum + (i === j && i !== 0 ? lambda : 0);
    }
  }

  const XtY = Array(p).fill(0);
  for (let i = 0; i < p; i++) {
    let sum = 0;
    for (let k = 0; k < n; k++) {
      sum += Xt[i][k] * Y[k];
    }
    XtY[i] = sum;
  }

  for (let i = 0; i < p; i++) {
    let maxEl = Math.abs(XtX[i][i]);
    let maxRow = i;
    for (let k = i + 1; k < p; k++) {
      if (Math.abs(XtX[k][i]) > maxEl) {
        maxEl = Math.abs(XtX[k][i]);
        maxRow = k;
      }
    }
    if (maxEl < 1e-9) return null; // Degenerate

    const tmp = XtX[maxRow];
    XtX[maxRow] = XtX[i];
    XtX[i] = tmp;
    
    const tmpY = XtY[maxRow];
    XtY[maxRow] = XtY[i];
    XtY[i] = tmpY;

    for (let k = i + 1; k < p; k++) {
      const c = -XtX[k][i] / XtX[i][i];
      for (let j = i; j < p; j++) {
        if (i === j) {
          XtX[k][j] = 0;
        } else {
          XtX[k][j] += c * XtX[i][j];
        }
      }
      XtY[k] += c * XtY[i];
    }
  }

  const w = Array(p).fill(0);
  for (let i = p - 1; i >= 0; i--) {
    w[i] = XtY[i] / XtX[i][i];
    for (let k = i - 1; k >= 0; k--) {
      XtY[k] -= XtX[k][i] * w[i];
    }
  }
  return w;
}

function calcMedian(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Expands the 6 raw features [leftEyeX, leftEyeY, rightEyeX, rightEyeY, yaw,
// pitch] (see GAZE_FEATURE_ORDER) into intercept + 6 linear terms + squared
// terms for the 4 iris ratios + 4 head-pose x iris-ratio cross terms.
// A screen-space gaze mapping is not well-approximated by a pure
// linear/affine function of iris position across a wide field of view —
// this is the standard fix used by webcam gaze calibration approaches
// (e.g. WebGazer.js) to meaningfully cut error vs. a plain linear fit.
//
// The 4 cross terms (f0*f4, f2*f4, f1*f5, f3*f5) were added after repeated
// real calibration attempts kept landing around 300-400px average error
// (target: 144px) even after ruling out camera distance/lighting as the
// cause (delta between left/right target medians in the raw iris ratio —
// see GazeCalibration.diagnostics — stayed narrow, ~0.06-0.09, regardless
// of a closer/better-lit setup). Previously yaw/pitch (f4, f5) only
// entered the model *linearly*, as if head rotation shifts the predicted
// screen point by a constant offset independent of where the eyes are
// looking. In reality head yaw changes the horizontal iris-in-socket ratio
// mapping itself (a given true gaze angle produces a different f0/f2 value
// depending on head yaw at that moment; same relationship between pitch
// and f1/f3 vertically) — a linear-only head-pose term can't capture that,
// so any head movement during calibration/use that a linear term can't
// explain was previously indistinguishable from pure noise. This isn't
// guaranteed to close the gap — the raw ratio's dynamic range itself
// (leftright delta ~0.08) may simply be a hard ceiling for this
// measurement technique on a plain webcam — but it's a real, previously
// untried gap in the model, not another blind tuning pass.
const FEATURE_DIM = 15; // 1 + 6 + 4 + 4
function expandFeatures(f) {
  return [
    1, f[0], f[1], f[2], f[3], f[4], f[5],
    f[0] * f[0], f[1] * f[1], f[2] * f[2], f[3] * f[3],
    f[0] * f[4], f[2] * f[4], // horizontal iris ratio x yaw
    f[1] * f[5], f[3] * f[5], // vertical iris ratio x pitch
  ];
}

// ── Robust fit: ridge regression + one-pass outlier trim ────────────────────
// A plain least-squares fit is highly sensitive to a handful of corrupted
// training rows — a blink the heuristic missed, a momentary landmark
// glitch, a head jerk mid-sample. Those few bad rows can pull the whole fit
// off far more than their share of the data. This fits once, drops rows
// whose residual is far outside the pack (MAD-style: > OUTLIER_ERROR_FACTOR
// times the median residual, with a floor so an already-tight fit doesn't
// start rejecting its own small natural noise), and refits once on the
// cleaned set. Single-pass by design — bounded, not iterative — enough to
// capture most of the benefit without open-ended runtime.
const OUTLIER_ERROR_FACTOR = 2.5;
const OUTLIER_ERROR_FLOOR_PX = 20;
const MIN_INLIER_FRACTION = 0.5; // never trim more than half the rows away

function rowErrors(X, Y_x, Y_y, weightsX, weightsY) {
  const errs = new Array(X.length);
  for (let i = 0; i < X.length; i++) {
    let px = weightsX[0];
    let py = weightsY[0];
    for (let j = 1; j < FEATURE_DIM; j++) {
      px += weightsX[j] * X[i][j];
      py += weightsY[j] * X[i][j];
    }
    errs[i] = Math.hypot(px - Y_x[i], py - Y_y[i]);
  }
  return errs;
}

/**
 * @param {number[][]} X - rows of already-expanded (FEATURE_DIM-wide) features
 * @param {number[]} Y_x
 * @param {number[]} Y_y
 * @returns {{ weightsX, weightsY, errs, X, Y_x, Y_y, trimmedCount } | null}
 */
function fitRobust(X, Y_x, Y_y) {
  const weightsX0 = ridgeRegression(X, Y_x, RIDGE_LAMBDA);
  const weightsY0 = ridgeRegression(X, Y_y, RIDGE_LAMBDA);
  if (!weightsX0 || !weightsY0) return null;

  const errs0 = rowErrors(X, Y_x, Y_y, weightsX0, weightsY0);
  const medianErr = calcMedian(errs0);
  const threshold = Math.max(medianErr * OUTLIER_ERROR_FACTOR, OUTLIER_ERROR_FLOOR_PX);

  const inlierIdx = [];
  for (let i = 0; i < X.length; i++) {
    if (errs0[i] <= threshold) inlierIdx.push(i);
  }

  // Not enough would survive trimming (or nothing was actually an outlier)
  // — keep the untrimmed fit rather than risk destabilizing on too little
  // data.
  if (inlierIdx.length === X.length || inlierIdx.length < X.length * MIN_INLIER_FRACTION) {
    return { weightsX: weightsX0, weightsY: weightsY0, errs: errs0, X, Y_x, Y_y, trimmedCount: 0 };
  }

  const Xc = inlierIdx.map((i) => X[i]);
  const Yxc = inlierIdx.map((i) => Y_x[i]);
  const Yyc = inlierIdx.map((i) => Y_y[i]);

  const weightsX1 = ridgeRegression(Xc, Yxc, RIDGE_LAMBDA);
  const weightsY1 = ridgeRegression(Xc, Yyc, RIDGE_LAMBDA);
  if (!weightsX1 || !weightsY1) {
    // Refit on the trimmed set failed (degenerate) — fall back to the
    // untrimmed result rather than fail calibration outright over it.
    return { weightsX: weightsX0, weightsY: weightsY0, errs: errs0, X, Y_x, Y_y, trimmedCount: 0 };
  }

  const errs1 = rowErrors(Xc, Yxc, Yyc, weightsX1, weightsY1);
  return {
    weightsX: weightsX1,
    weightsY: weightsY1,
    errs: errs1,
    X: Xc,
    Y_x: Yxc,
    Y_y: Yyc,
    trimmedCount: X.length - inlierIdx.length,
  };
}

// ── Implicit (continuous) recalibration ──────────────────────────────────────
// Every real click/keypress the student makes on a known screen location is
// a free, zero-effort ground-truth sample. Folding a rolling window of
// these into a refit — on top of the original explicit 9-point session —
// is the standard technique webcam gaze trackers use to keep improving
// (and adapt to seating drift) well past the one-shot initial calibration.
// Bounded and safety-checked: capped rolling window, refit only every N new
// samples (not every single one), and the refit result is only KEPT if it
// doesn't do meaningfully worse than the current model on the original
// explicit data — implicit samples are inherently less trustworthy (a
// click doesn't guarantee the student was actually looking at it) and must
// never be allowed to silently degrade a good explicit calibration.
const MAX_IMPLICIT_SAMPLES = 200;
const IMPLICIT_REFIT_EVERY = 8;
const IMPLICIT_REGRESSION_TOLERANCE = 1.5; // allow up to 1.5x the explicit-only error before rejecting an implicit refit

export class GazeCalibration {
  constructor() {
    this.controllerId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    this.reset();
  }

  reset() {
    this.state = {
      status: "not_calibrated",
      model: null,
      fitErrorPx: null,
      validationErrorPx: null,
      sampleCount: 0,
      targetCount: 0
    };
    this.targets = [];
    this.currentTargetIndex = -1;
    this.currentTarget = null;
    this.samplesByTarget = new Map();
    
    this.rejectionCounts = {
      invalid_features: 0,
      low_confidence: 0,
      blinking: 0,
      settling: 0,
      target_mismatch: 0,
      duplicate_or_stale: 0,
      outlier: 0
    };
    this.diagnostics = null;

    // Implicit (continuous) recalibration state — see addImplicitSample().
    // Reset alongside everything else: a fresh explicit calibration session
    // means any implicit refinement built on top of the *previous* one is
    // no longer valid.
    this.implicitSamples = [];
    this._sinceLastImplicitRefit = 0;
    this._explicitRows = null; // { X, Y_x, Y_y } from the last successful explicit fit() — the trusted baseline addImplicitSample()'s safety check compares against
  }

  getStatus() {
    return this.state;
  }
  
  getSnapshot() {
    return {
      status: this.state.status,
      currentTargetIndex: this.currentTargetIndex,
      currentTarget: this.currentTarget,
      targetCount: this.state.targetCount,
      completedTargetCount: this.getCompletedTargetCount(),
      sampleCount: this.state.sampleCount,
      diagnostics: this.diagnostics,
      missingTargets: this.state.missingTargets || [],
      controllerId: this.controllerId
    };
  }

  getCurrentTarget() {
    return this.currentTarget;
  }
  
  getTargetAcceptedCount(targetKey) {
    return this.samplesByTarget.get(targetKey)?.length ?? 0;
  }
  
  isTargetComplete(targetKey) {
    return this.getTargetAcceptedCount(targetKey) >= MIN_SAMPLES_PER_TARGET;
  }
  
  getCompletedTargetCount() {
    return this.targets.filter((target) => this.isTargetComplete(target.key)).length;
  }

  startCalibration(targets) {
    this.reset();
    
    if (!Array.isArray(targets) || targets.length !== 9) {
      this.state.status = "invalid";
      this.diagnostics = { error: `Calibration requires 9 targets, received ${targets ? targets.length : 0}` };
      return { ok: false, error: this.diagnostics.error };
    }
    
    const keys = new Set();
    const indices = new Set();
    
    for (const t of targets) {
      if (keys.has(t.key)) {
        this.state.status = "invalid";
        this.diagnostics = { error: `Duplicate target key: ${t.key}` };
        return { ok: false, error: this.diagnostics.error };
      }
      keys.add(t.key);
      
      if (indices.has(t.index)) {
        this.state.status = "invalid";
        this.diagnostics = { error: `Duplicate target index: ${t.index}` };
        return { ok: false, error: this.diagnostics.error };
      }
      indices.add(t.index);
      
      if (!Number.isFinite(t.x) || !Number.isFinite(t.y)) {
        this.state.status = "invalid";
        this.diagnostics = { error: `Invalid coordinates for target ${t.key}` };
        return { ok: false, error: this.diagnostics.error };
      }
      
      this.samplesByTarget.set(t.key, []);
    }
    
    this.targets = targets;
    this.state.targetCount = targets.length;
    this.currentTargetIndex = 0;
    
    const isDebug = import.meta.env.VITE_GAZE_DEBUG_LOGS === "true";
    if (isDebug) {
      console.log({
        event: "calibration_started",
        requiredTargetCount: 9,
        requiredSamplesPerTarget: MIN_SAMPLES_PER_TARGET,
        targetKeys: Array.from(keys)
      });
    }

    this._registerActiveTarget();
    this.state.status = "collecting";
    
    return { ok: true, target: this.currentTarget, snapshot: this.getSnapshot() };
  }

  _registerActiveTarget() {
    const pt = this.targets[this.currentTargetIndex];
    this.currentTarget = {
      key: pt.key,
      index: pt.index,
      x: pt.x,
      y: pt.y,
      registeredAt: performance.now(),
      settlingUntil: performance.now() + SETTLING_TIME_MS
    };
    
    const isDebug = import.meta.env.VITE_GAZE_DEBUG_LOGS === "true";
    if (isDebug) {
      console.log({
        event: "calibration_target_registered",
        targetKey: pt.key,
        pointIndex: pt.index,
        targetX: pt.x,
        targetY: pt.y,
        targetNumber: this.currentTargetIndex + 1,
        totalTargets: 9
      });
    }
  }

  stopCalibration() {
    if (this.state.status === "collecting") {
      this.state.status = "not_calibrated";
    }
  }

  advanceTarget() {
    if (this.state.status !== "collecting" || !this.currentTarget) return null;
    
    if (!this.isTargetComplete(this.currentTarget.key)) {
      return null;
    }
    
    this.currentTargetIndex++;
    if (this.currentTargetIndex < this.targets.length) {
      this._registerActiveTarget();
      return this.currentTarget;
    }
    return null;
  }

  addSample(sample) {
    const isDebug = import.meta.env.VITE_GAZE_DEBUG_LOGS === "true";
    
    if (this.state.status !== "collecting" || !this.currentTarget) {
      return { accepted: false, rejectionReason: "not_collecting" };
    }

    if (sample.targetKey !== this.currentTarget.key) {
      return { accepted: false, rejectionReason: "target_mismatch" };
    }
    
    if (this.isTargetComplete(this.currentTarget.key)) {
      return { accepted: false, rejectionReason: "target_already_complete" };
    }

    if (!sample.isValid || !Array.isArray(sample.features) || sample.features.length !== 6) {
      this.rejectionCounts.invalid_features++;
      return { accepted: false, rejectionReason: "invalid_features" };
    }
    
    for (let i = 0; i < 6; i++) {
       if (!Number.isFinite(sample.features[i])) {
           this.rejectionCounts.invalid_features++;
           return { accepted: false, rejectionReason: "invalid_features" };
       }
    }

    if (sample.isBlinking) {
      this.rejectionCounts.blinking++;
      return { accepted: false, rejectionReason: "blinking" };
    }
    
    if (sample.confidence < MIN_CONFIDENCE) {
      this.rejectionCounts.low_confidence++;
      return { accepted: false, rejectionReason: "low_confidence" };
    }

    if (sample.capturedAt < this.currentTarget.settlingUntil) {
      this.rejectionCounts.settling++;
      return { accepted: false, rejectionReason: "settling" };
    }

    // Accept sample
    const targetArray = this.samplesByTarget.get(this.currentTarget.key);
    targetArray.push({
      targetKey: this.currentTarget.key,
      pointIndex: this.currentTarget.index,
      targetX: this.currentTarget.x,
      targetY: this.currentTarget.y,
      features: [...sample.features],
      capturedAt: sample.capturedAt,
      confidence: sample.confidence
    });
    this.state.sampleCount++;
    
    const acceptedCount = targetArray.length;
    const targetCompleted = acceptedCount >= MIN_SAMPLES_PER_TARGET;
    
    if (isDebug) {
      console.log({
        event: "calibration_sample_decision",
        targetKey: this.currentTarget.key,
        pointIndex: this.currentTarget.index,
        accepted: true,
        acceptedSampleCount: acceptedCount,
        requiredSamples: MIN_SAMPLES_PER_TARGET
      });
    }
    
    let allTargetsCompleted = false;
    let completedTargetCount = this.getCompletedTargetCount();
    
    if (targetCompleted) {
       allTargetsCompleted = completedTargetCount >= 9;
       
       console.log({
         event: "calibration_target_completed",
         targetKey: this.currentTarget.key,
         pointIndex: this.currentTarget.index,
         acceptedSampleCount: acceptedCount,
         completedTargetCount,
         requiredTargetCount: 9
       });
    }

    return {
      accepted: true,
      rejectionReason: null,
      targetKey: this.currentTarget.key,
      acceptedSampleCount: acceptedCount,
      completedTargetCount,
      targetCompleted,
      allTargetsCompleted
    };
  }

  fit() {
    this.state.status = "fitting";

    const missingTargets = this.targets.filter(
      (target) => this.getTargetAcceptedCount(target.key) < MIN_SAMPLES_PER_TARGET
    );

    const completedTargetCount = this.targets.length - missingTargets.length;
    const targetCounts = {};
    for (const t of this.targets) {
        targetCounts[t.key] = this.getTargetAcceptedCount(t.key);
    }
    
    console.log({
      event: "calibration_pre_fit",
      completedTargetCount,
      requiredTargetCount: 9,
      targetCounts,
      missingTargets: missingTargets.map(t => t.key)
    });

    if (missingTargets.length > 0) {
      this.state.status = "invalid";
      this.state.missingTargets = missingTargets.map((target) => ({
        key: target.key,
        index: target.index,
        acceptedSamples: this.getTargetAcceptedCount(target.key),
        requiredSamples: MIN_SAMPLES_PER_TARGET,
      }));
      this.diagnostics = { error: "Not enough valid targets collected (Need at least 9)." };
      return { ok: false, state: this.state, snapshot: this.getSnapshot() };
    }

    // Fit against every accepted raw sample (up to 15/target = ~135 rows),
    // not just the 9 per-target medians. With only 9 calibration points,
    // fitting the (now larger, 11-parameter) expanded feature set on medians
    // alone would mean more parameters than training rows — technically
    // still solvable under ridge regularization, but numerically fragile
    // and prone to overfitting those single 9 points. Using every sample
    // gives the regression real statistical support for the extra
    // quadratic terms, and ridge regularization + repeated near-identical
    // rows per target still keeps it robust to per-sample noise.
    const X = [];
    const Y_x = [];
    const Y_y = [];

    for (const target of this.targets) {
      const samples = this.samplesByTarget.get(target.key);
      for (const s of samples) {
        X.push(expandFeatures(s.features));
        Y_x.push(target.x);
        Y_y.push(target.y);
      }
    }

    // fitRobust() does the ridge regression, then a single-pass outlier
    // trim + refit (see its doc comment) — meaningfully more resistant to
    // the occasional corrupted sample (missed blink, landmark glitch, head
    // jerk) than a plain one-shot least-squares fit.
    const fitResult = fitRobust(X, Y_x, Y_y);

    if (!fitResult) {
      this.state.status = "invalid";
      this.diagnostics = { error: "Regression failed (degenerate matrix)." };
      return { ok: false, state: this.state, snapshot: this.getSnapshot() };
    }

    const { weightsX, weightsY, errs: rowErrs, trimmedCount } = fitResult;
    this.state.model = { weightsX, weightsY };

    // Error is measured per individual training sample (not per-target
    // median) — the more honest measure: predict() gets called on live
    // single-frame features during real use, which are noisier than a
    // median, so validating against the same granularity avoids reporting
    // an overly optimistic fit error relative to what tracking will
    // actually see.
    const errs = [...rowErrs].sort((a, b) => a - b);
    const sumErr = rowErrs.reduce((s, e) => s + e, 0);
    this.state.fitErrorPx = sumErr / rowErrs.length;

    // Diagnostics (including horizontalFeatureVariation / sameDirection —
    // the signal that distinguishes "the feature extraction itself is
    // broken" from "the regression needs work") are now built unconditionally,
    // BEFORE the pass/fail check below. Previously this whole block only
    // ran on the success path — every single real-world fit anyone has hit
    // in testing has landed well above the failure threshold (which is
    // exactly when this diagnostic is most needed), so it silently never
    // ran at all: the "invalid" branch built only a bare {error,
    // averageErrorPx, allowedErrorPx} object, and the UI's "Feature signal
    // diagnostic" section (which reads diagnostics.horizontalFeatureVariation)
    // had nothing to show, every time, without any indication why.
    // this.state.model is already set above (right after fitRobust()
    // succeeds), so predict() works here regardless of whether the fit
    // ultimately passes or fails.
    {
      this.diagnostics = {
        averageErrorPx: this.state.fitErrorPx,
        allowedErrorPx: TARGET_ERROR_PX,
        medianErrorPx: errs[Math.floor(errs.length / 2)],
        maxErrorPx: errs[errs.length - 1],
        validErrorCount: rowErrs.length,
        invalidErrorCount: 0,
        trimmedOutlierCount: trimmedCount,
        sampleCount: this.state.sampleCount,
        ridgeLambda: RIDGE_LAMBDA,
        viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
        viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 1080,
        devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
        featureOrder: GAZE_FEATURE_ORDER,
        fitVerification: {
          weightsX,
          weightsY,
          interceptX: weightsX[0],
          interceptY: weightsY[0],
          featureMatrixDimensions: `${rowErrs.length}x${FEATURE_DIM} (${X.length} before outlier trim)`,
          targetMatrixDimensions: `${X.length}x1`,
          rankOrDegeneracyStatus: "full"
        },
        rejectionCounts: this.rejectionCounts,
        perPoint: []
      };
      
      for (const target of this.targets) {
          const samples = this.samplesByTarget.get(target.key);
          const targetX = samples[0].targetX;
          const targetY = samples[0].targetY;
          
          let fMins = [Infinity, Infinity, Infinity, Infinity, Infinity, Infinity];
          let fMaxs = [-Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity];
          let featureSets = [[], [], [], [], [], []];
          for (const s of samples) {
            for (let i = 0; i < 6; i++) {
              const v = s.features[i];
              featureSets[i].push(v);
              if (v < fMins[i]) fMins[i] = v;
              if (v > fMaxs[i]) fMaxs[i] = v;
            }
          }
          const fMedians = featureSets.map(arr => calcMedian(arr));
          
          const pred = this.predict(fMedians);
          
          const dx = pred ? pred.x - targetX : NaN;
          const dy = pred ? pred.y - targetY : NaN;
          const rawErrorPx = Math.hypot(dx, dy);

          this.diagnostics.perPoint.push({
            pointIndex: samples[0].pointIndex,
            targetKey: target.key,
            targetX,
            targetY,
            validSampleCount: samples.length,
            rejectedSampleCount: 0,
            rejectionReasons: {},
            featureMedian: fMedians,
            featureMin: fMins,
            featureMax: fMaxs,
            predictedRawX: pred?.x,
            predictedRawY: pred?.y,
            predictedDisplayX: pred?.x,
            predictedDisplayY: pred?.y,
            rawErrorPx,
            displayErrorPx: rawErrorPx
          });
      }
      const leftTargets = this.targets.filter(t => t.x < 0.33 * this.diagnostics.viewportWidth);
      const rightTargets = this.targets.filter(t => t.x > 0.66 * this.diagnostics.viewportWidth);
      const centerTargets = this.targets.filter(t => t.x >= 0.33 * this.diagnostics.viewportWidth && t.x <= 0.66 * this.diagnostics.viewportWidth);

      const getMedians = (targetList) => {
        if (!targetList || targetList.length === 0) return { leftEyeX: 0, rightEyeX: 0, combinedHorizontal: 0 };
        const lX = [], rX = [];
        for (const t of targetList) {
           const pointData = this.diagnostics.perPoint.find(p => p.targetKey === t.key);
           if (pointData) {
               lX.push(pointData.featureMedian[0]);
               rX.push(pointData.featureMedian[2]);
           }
        }
        const medianLx = calcMedian(lX);
        const medianRx = calcMedian(rX);
        return {
           leftEyeX: medianLx,
           rightEyeX: medianRx,
           combinedHorizontal: (medianLx + medianRx) / 2
        };
      };

      const leftTargetMedian = getMedians(leftTargets);
      const rightTargetMedian = getMedians(rightTargets);
      const centerTargetMedian = getMedians(centerTargets);

      const leftToRightDelta = {
          leftEyeX: rightTargetMedian.leftEyeX - leftTargetMedian.leftEyeX,
          rightEyeX: rightTargetMedian.rightEyeX - leftTargetMedian.rightEyeX,
          combinedHorizontal: rightTargetMedian.combinedHorizontal - leftTargetMedian.combinedHorizontal
      };
      
      const sameDirection = Math.sign(leftToRightDelta.leftEyeX) === Math.sign(leftToRightDelta.rightEyeX);

      // Previously this was only ever passed to console.log() below, never
      // attached to this.diagnostics — the one object the UI (see
      // CalibrationOverlay.jsx) actually has access to. That made
      // diagnosing a bad fit require pulling console output specifically
      // at the moment fit() ran, which in practice kept getting lost
      // (page reload between calibrating and opening devtools, console
      // cleared, etc.). Attaching it here means the UI can show it
      // directly — this is exactly the signal that distinguishes "the
      // feature signal itself is broken" (sameDirection: false, or near-
      // zero deltas) from "the regression/fit needs work" (deltas look
      // sane, error is still high).
      this.diagnostics.horizontalFeatureVariation = {
        leftTargetMedian,
        centerTargetMedian,
        rightTargetMedian,
        leftToRightDelta,
        sameDirection
      };

      console.log("==================================================");
      console.log("CALIBRATION DIAGNOSTIC SUMMARY");
      console.log(this.diagnostics);
      console.log("RAW FEATURE SUMMARY");
      console.log({
        featureOrder: GAZE_FEATURE_ORDER,
        horizontalFeatureVariation: {
            leftTargetMedian,
            centerTargetMedian,
            rightTargetMedian,
            leftToRightDelta,
            sameDirection
        }
      });
      console.log("==================================================");
    }

    // Pass/fail check moved here, after diagnostics are built — see the
    // comment above where this used to sit (right after fitErrorPx was
    // computed) for why.
    if (this.state.fitErrorPx > TARGET_ERROR_PX * 2) {
      this.state.status = "invalid";
      return { ok: false, state: this.state, snapshot: this.getSnapshot() };
    }

    this.state.status = "calibrated";
    // Remember the trusted explicit training rows (pre-implicit) as the
    // baseline addImplicitSample()'s safety check evaluates against, and
    // reset implicit refinement state for this fresh calibration.
    this._explicitRows = { X, Y_x, Y_y };
    this.implicitSamples = [];
    this._sinceLastImplicitRefit = 0;

    return { ok: true, state: this.state, snapshot: this.getSnapshot() };
  }

  predict(features) {
    if (this.state.status !== "calibrated" || !this.state.model) return null;
    if (!Array.isArray(features) || features.length !== 6) return null;
    for(let i=0; i<6; i++) {
        if (!Number.isFinite(features[i])) return null;
    }

    const { weightsX, weightsY } = this.state.model;
    const expanded = expandFeatures(features);
    let predX = weightsX[0];
    let predY = weightsY[0];

    for (let i = 1; i < FEATURE_DIM; i++) {
      predX += weightsX[i] * expanded[i];
      predY += weightsY[i] * expanded[i];
    }

    if (!Number.isFinite(predX) || !Number.isFinite(predY)) return null;

    return { x: predX, y: predY };
  }

  /**
   * Feed one "free" ground-truth sample from a real click/keypress into an
   * ongoing implicit-calibration refinement — see the module-level doc
   * comment above MAX_IMPLICIT_SAMPLES for the rationale and safety net.
   * Call this from a window click/keydown handler once tracking is
   * `calibrated`, passing the gaze features captured at that moment and
   * the event's known screen coordinates.
   *
   * @returns {boolean} true if the sample was accepted (does not imply a
   *   refit happened yet — that only runs every IMPLICIT_REFIT_EVERY samples).
   */
  addImplicitSample(features, screenX, screenY) {
    if (this.state.status !== "calibrated" || !this._explicitRows) return false;
    if (!Array.isArray(features) || features.length !== 6) return false;
    for (let i = 0; i < 6; i++) {
      if (!Number.isFinite(features[i])) return false;
    }
    if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) return false;

    this.implicitSamples.push({ features: [...features], x: screenX, y: screenY });
    if (this.implicitSamples.length > MAX_IMPLICIT_SAMPLES) {
      // Rolling window, not unbounded growth — also lets the model adapt
      // to recent behavior (e.g. the student shifting seating position)
      // rather than being anchored forever to the very first implicit
      // samples of the session.
      this.implicitSamples.shift();
    }

    this._sinceLastImplicitRefit++;
    if (this._sinceLastImplicitRefit >= IMPLICIT_REFIT_EVERY) {
      this._sinceLastImplicitRefit = 0;
      this._refitWithImplicit();
    }
    return true;
  }

  _refitWithImplicit() {
    const { X: baseX, Y_x: baseYx, Y_y: baseYy } = this._explicitRows;
    const X = [...baseX];
    const Y_x = [...baseYx];
    const Y_y = [...baseYy];

    for (const s of this.implicitSamples) {
      X.push(expandFeatures(s.features));
      Y_x.push(s.x);
      Y_y.push(s.y);
    }

    const fitResult = fitRobust(X, Y_x, Y_y);
    if (!fitResult) return; // degenerate — keep the current model

    // Safety check: evaluate the CANDIDATE model against the ORIGINAL
    // explicit-only rows (the trusted baseline), not the implicit-inflated
    // set — a burst of implicit samples where the student clicked without
    // actually looking at the target must not be allowed to silently pull
    // accuracy backwards on the ground truth we're actually confident in.
    const baselineErrs = rowErrors(baseX, baseYx, baseYy, fitResult.weightsX, fitResult.weightsY);
    const candidateExplicitErrorPx = baselineErrs.reduce((s, e) => s + e, 0) / baselineErrs.length;

    if (candidateExplicitErrorPx > this.state.fitErrorPx * IMPLICIT_REGRESSION_TOLERANCE) {
      const isDebug = import.meta.env.VITE_GAZE_DEBUG_LOGS === "true";
      if (isDebug) {
        console.log({
          event: "implicit_recalibration_rejected",
          reason: "would_regress_explicit_accuracy",
          currentExplicitErrorPx: this.state.fitErrorPx,
          candidateExplicitErrorPx,
        });
      }
      return; // reject — keep the current model
    }

    this.state.model = { weightsX: fitResult.weightsX, weightsY: fitResult.weightsY };
    // Deliberately NOT overwriting this.state.fitErrorPx with the implicit-
    // inflated fit's error, nor this._explicitRows — both stay anchored to
    // the original explicit session so every future implicit refit is
    // still judged against the same trusted baseline, not a
    // gradually-drifting one.

    const isDebug = import.meta.env.VITE_GAZE_DEBUG_LOGS === "true";
    if (isDebug) {
      console.log({
        event: "implicit_recalibration_applied",
        implicitSampleCount: this.implicitSamples.length,
        candidateExplicitErrorPx,
        explicitBaselineErrorPx: this.state.fitErrorPx,
      });
    }
  }
}
