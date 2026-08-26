/**
 * gazeCalibration.js
 * 
 * Handles collecting calibration samples, fitting a Ridge Regression model,
 * and managing calibration metadata and state.
 */

const RIDGE_LAMBDA = 0.1; // Regularization parameter

// Basic Matrix Math for Ridge Regression
function invertMatrix(M) {
  // We need to invert a 7x7 matrix. 
  // For Javascript without a math library, Gauss-Jordan elimination works well.
  const n = M.length;
  let A = M.map(row => [...row]); // copy
  let I = Array(n).fill(0).map((_, i) => {
    let row = Array(n).fill(0);
    row[i] = 1;
    return row;
  });

  for (let i = 0; i < n; i++) {
    // find pivot
    let maxEl = Math.abs(A[i][i]);
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > maxEl) {
        maxEl = Math.abs(A[k][i]);
        maxRow = k;
      }
    }

    // swap
    let tmp = A[i]; A[i] = A[maxRow]; A[maxRow] = tmp;
    tmp = I[i]; I[i] = I[maxRow]; I[maxRow] = tmp;

    // Make principal diagonal 1
    let pivot = A[i][i];
    if (Math.abs(pivot) < 1e-10) return null; // singular
    for (let j = 0; j < n; j++) {
      A[i][j] /= pivot;
      I[i][j] /= pivot;
    }

    // make other rows 0
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        let factor = A[k][i];
        for (let j = 0; j < n; j++) {
          A[k][j] -= factor * A[i][j];
          I[k][j] -= factor * I[i][j];
        }
      }
    }
  }
  return I;
}

function transpose(M) {
  return M[0].map((_, colIndex) => M.map(row => row[colIndex]));
}

function multiply(A, B) {
  return A.map(row => {
    return B[0].map((_, j) => {
      return row.reduce((sum, el, i) => sum + el * B[i][j], 0);
    });
  });
}

function fitRidgeRegression(X, y, lambda) {
  // Add bias column (1s)
  const X_bias = X.map(row => [1, ...row]);
  
  const X_T = transpose(X_bias);
  const X_T_X = multiply(X_T, X_bias);
  
  // Add lambda * I
  for (let i = 0; i < X_T_X.length; i++) {
    X_T_X[i][i] += (i === 0 ? 0 : lambda); // Don't regularize bias
  }
  
  const inv = invertMatrix(X_T_X);
  if (!inv) return null;
  
  // y as a column vector
  const y_col = y.map(val => [val]);
  const X_T_y = multiply(X_T, y_col);
  
  const weights = multiply(inv, X_T_y);
  return weights.map(row => row[0]); // flatten
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export class GazeCalibration {
  constructor() {
    this.reset();
  }

  reset() {
    this.samples = []; // { features: [], x: targetX, y: targetY, targetKey: string }
    this.weightsX = null;
    this.weightsY = null;
    this.metadata = null;
    this.isCalibrated = false;
    this.diagnostics = null;
  }

  addSample(features, targetX, targetY) {
    if (!features || features.length !== 6) return;
    const targetKey = `${targetX.toFixed(1)}_${targetY.toFixed(1)}`;
    this.samples.push({ features, x: targetX, y: targetY, targetKey });
  }

  getSampleCount() {
    return this.samples.length;
  }

  fit(metadata = {}) {
    this.diagnostics = null; // Clear previous diagnostics

    const targets = {};
    for (const s of this.samples) {
      if (!targets[s.targetKey]) targets[s.targetKey] = [];
      targets[s.targetKey].push(s);
    }

    const trainSamples = [];
    const valSamples = [];

    for (const key in targets) {
      const tgSamples = targets[key];
      if (tgSamples.length < 15) {
        this.diagnostics = { error: `Insufficient samples for target ${key}`, target: key };
        this.isCalibrated = false;
        return false;
      }
      trainSamples.push(...tgSamples.slice(0, 12));
      valSamples.push(...tgSamples.slice(12, 15));
    }

    if (trainSamples.length < 9) { // At least a few targets
      this.diagnostics = { error: 'Not enough targets to calibrate' };
      this.isCalibrated = false;
      return false;
    }

    const X = trainSamples.map(s => s.features);
    const yX = trainSamples.map(s => s.x);
    const yY = trainSamples.map(s => s.y);

    this.weightsX = fitRidgeRegression(X, yX, RIDGE_LAMBDA);
    this.weightsY = fitRidgeRegression(X, yY, RIDGE_LAMBDA);

    if (!this.weightsX || !this.weightsY) {
      this.diagnostics = { error: 'Matrix inversion failed' };
      this.isCalibrated = false;
      return false;
    }

    const MAX_CALIBRATION_ERROR_RATIO = 0.08;
    const MIN_CALIBRATION_ERROR_PX = 40;
    const MAX_CALIBRATION_ERROR_PX = 150;

    const vW = metadata.viewportWidth || window.innerWidth;
    const vH = metadata.viewportHeight || window.innerHeight;
    const viewportDiagonal = Math.hypot(vW, vH);
    
    const allowedErrorPx = clamp(
      viewportDiagonal * MAX_CALIBRATION_ERROR_RATIO,
      MIN_CALIBRATION_ERROR_PX,
      MAX_CALIBRATION_ERROR_PX
    );

    const errors = [];
    const perTargetErrorPx = {};
    const targetCounts = {};

    for (const s of valSamples) {
      let predX = this.weightsX[0];
      let predY = this.weightsY[0];
      for (let i = 0; i < 6; i++) {
        predX += this.weightsX[i + 1] * s.features[i];
        predY += this.weightsY[i + 1] * s.features[i];
      }
      
      const err = Math.hypot(predX - s.x, predY - s.y);
      errors.push(err);

      if (!perTargetErrorPx[s.targetKey]) {
        perTargetErrorPx[s.targetKey] = 0;
        targetCounts[s.targetKey] = 0;
      }
      perTargetErrorPx[s.targetKey] += err;
      targetCounts[s.targetKey]++;
    }

    for (const key in perTargetErrorPx) {
      perTargetErrorPx[key] /= targetCounts[key];
    }

    errors.sort((a, b) => a - b);
    const averageErrorPx = errors.reduce((a, b) => a + b, 0) / errors.length;
    const medianErrorPx = errors[Math.floor(errors.length / 2)];
    const maxErrorPx = errors[errors.length - 1];

    this.diagnostics = {
      averageErrorPx,
      medianErrorPx,
      maxErrorPx,
      perTargetErrorPx,
      allowedErrorPx,
      viewportWidth: vW,
      viewportHeight: vH,
      viewportDiagonal
    };

    if (
      averageErrorPx > allowedErrorPx || 
      medianErrorPx > allowedErrorPx || 
      maxErrorPx > 2 * allowedErrorPx
    ) {
      this.isCalibrated = false;
      return false; // Validation failed
    }

    this.metadata = {
      timestamp: Date.now(),
      devicePixelRatio: window.devicePixelRatio || 1,
      averageErrorPx,
      ...metadata,
      viewportWidth: vW,
      viewportHeight: vH
    };

    this.isCalibrated = true;
    return true;
  }

  predict(features) {
    if (!this.isCalibrated || !features || features.length !== 6) return null;

    let predX = this.weightsX[0];
    let predY = this.weightsY[0];
    
    for (let i = 0; i < 6; i++) {
      predX += this.weightsX[i + 1] * features[i];
      predY += this.weightsY[i + 1] * features[i];
    }

    return { x: predX, y: predY };
  }

  checkInvalidation() {
    if (!this.isCalibrated || !this.metadata) return false;
    
    // Check if viewport changed materially (e.g. > 50px change or resize)
    const wDiff = Math.abs(window.innerWidth - this.metadata.viewportWidth);
    const hDiff = Math.abs(window.innerHeight - this.metadata.viewportHeight);
    
    if (wDiff > 50 || hDiff > 50 || window.devicePixelRatio !== this.metadata.devicePixelRatio) {
      this.reset();
      return true; // Invalidated
    }
    return false;
  }
}
