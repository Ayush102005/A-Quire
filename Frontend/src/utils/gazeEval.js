/**
 * gazeEval.js
 * ===========
 * Dev-only evaluation mode for gaze tracking.
 * Used to measure system accuracy and export summary statistics.
 */

import { hasValidCalibration, applyCalibration, getCalibrationQuality } from './gazeCalibration';

let isEvaluating = false;
let currentEvalIdx = -1;
let evalPoints = [];
let evalSamples = [];
let evalResults = null;

export function startEvaluation(points) {
  if (!hasValidCalibration()) {
    console.warn("Gaze Eval: Cannot start without valid calibration.");
    return false;
  }
  isEvaluating = true;
  evalPoints = points;
  evalSamples = points.map(() => []);
  evalResults = null;
  currentEvalIdx = 0;
  return true;
}

export function setEvalActivePoint(idx) {
  if (idx >= 0 && idx < evalPoints.length) {
    currentEvalIdx = idx;
  }
}

export function addEvalSample(pointIdx, rawGaze) {
  if (!isEvaluating || !rawGaze) return;
  if (pointIdx >= 0 && pointIdx < evalPoints.length) {
    evalSamples[pointIdx].push(rawGaze);
  }
}

export function finishEvaluation() {
  isEvaluating = false;
  
  const perPoint = [];
  let totalError = 0;
  let validPoints = 0;

  for (let i = 0; i < evalPoints.length; i++) {
    const target = evalPoints[i];
    const samples = evalSamples[i];
    if (samples.length === 0) continue;

    // Apply calibration to all raw samples and find centroid
    let sumX = 0, sumY = 0;
    for (const raw of samples) {
      const mapped = applyCalibration(raw);
      if (mapped) {
        sumX += mapped.x;
        sumY += mapped.y;
      }
    }
    const centroidX = sumX / samples.length;
    const centroidY = sumY / samples.length;

    const dx = centroidX - target.x;
    const dy = centroidY - target.y;
    const errorPx = Math.sqrt(dx*dx + dy*dy);

    perPoint.push({ target, predicted: { x: centroidX, y: centroidY }, errorPx });
    totalError += errorPx;
    validPoints++;
  }

  const avgErrorPx = validPoints > 0 ? totalError / validPoints : null;

  evalResults = {
    avgErrorPx,
    perPoint,
    calibrationQuality: getCalibrationQuality() // Store context of how good the calib was
  };

  return evalResults;
}

export function getEvalResults() {
  return evalResults;
}

export function isEvaluationActive() {
  return isEvaluating;
}
