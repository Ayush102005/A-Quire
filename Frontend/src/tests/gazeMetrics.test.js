import { describe, it, expect, beforeEach } from 'vitest';
import { createMetrics, updateMetrics } from '../utils/gazeMetrics';

describe('gazeMetrics', () => {
  let metrics;

  beforeEach(() => {
    metrics = createMetrics();
  });

  it('accumulates dwell time for high confidence samples', () => {
    // First sample establishes currentLine
    metrics = updateMetrics({ lineId: 'L1', lineIndex: 1, confidence: 0.9 }, metrics, 100);
    expect(metrics.currentLine).toBe('L1');
    expect(metrics.dwellMs).toBe(0);

    // Second sample adds dwell
    metrics = updateMetrics({ lineId: 'L1', lineIndex: 1, confidence: 0.9 }, metrics, 100);
    expect(metrics.dwellMs).toBe(100);
  });

  it('ignores low confidence samples', () => {
    metrics = updateMetrics({ lineId: 'L1', lineIndex: 1, confidence: 0.9 }, metrics, 100);
    expect(metrics.dwellMs).toBe(0);

    // Low confidence sample should not accumulate dwell
    metrics = updateMetrics({ lineId: 'L1', lineIndex: 1, confidence: 0.2 }, metrics, 100);
    expect(metrics.dwellMs).toBe(0);
  });
});
