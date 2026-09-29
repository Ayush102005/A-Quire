import { expect, test, describe, vi, beforeEach } from 'vitest';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const defaultLandmarker = () => ({
  detectForVideo: vi.fn((bitmap) => {
    if (bitmap.fail) throw new Error('Simulated failure');
    if (bitmap.noFace) return { faceLandmarks: [] };
    return { faceLandmarks: [[{ x: 0.5, y: 0.5, z: 0 }]] };
  })
});

// We mock the mediapipe tasks vision
vi.mock('@mediapipe/tasks-vision', () => {
  return {
    FilesetResolver: {
      forVisionTasks: vi.fn().mockResolvedValue({})
    },
    FaceLandmarker: {
      createFromOptions: vi.fn()
    }
  };
});

describe('gazeWorker', () => {
  let workerScope;
  let closeSpy;

  beforeEach(async () => {
    vi.resetModules();
    // The mocked @mediapipe/tasks-vision module's vi.fn()s are the same
    // objects across resetModules() + reimport (resetModules() only forces
    // gazeWorker.js's own top-level state, like the module-scope
    // faceLandmarker/initPromise variables, to re-evaluate — it doesn't
    // recreate its mocked dependencies) — without an explicit reset here,
    // call-count assertions in the retry tests below would double-count
    // calls left over from whichever test ran before them.
    FaceLandmarker.createFromOptions.mockReset().mockResolvedValue(defaultLandmarker());
    FilesetResolver.forVisionTasks.mockClear();
    closeSpy = vi.fn();

    // Mock the web worker self
    workerScope = {
      postMessage: vi.fn(),
      onmessage: null
    };
    global.self = workerScope;

    // Import the worker to bind self.onmessage
    await import('../utils/gazeWorker.js');
  });

  test('calls bitmap.close() exactly once on successful detection', async () => {
    // 1. Initialize
    await workerScope.onmessage({ data: { type: 'INIT' } });
    expect(workerScope.postMessage).toHaveBeenCalledWith({ type: 'INIT_SUCCESS' });

    // 2. Detect
    const bitmap = { close: closeSpy };
    await workerScope.onmessage({
      data: {
        type: 'DETECT',
        payload: { id: 1, bitmap, timestamp: 100, quality: true }
      }
    });

    expect(closeSpy).toHaveBeenCalledTimes(1);
    const lastMsg = workerScope.postMessage.mock.calls.at(-1)[0];
    expect(lastMsg.type).toBe('DETECT_RESULT');
    expect(lastMsg.payload.ok).toBe(true);
    expect(lastMsg.payload.qualityScore).toBe(1.0);
    expect(lastMsg.payload.faceLandmarks).toBeDefined();
  });

  test('calls bitmap.close() exactly once on detection failure', async () => {
    await workerScope.onmessage({ data: { type: 'INIT' } });

    const bitmap = { fail: true, close: closeSpy }; // triggers throw in mock
    await workerScope.onmessage({
      data: {
        type: 'DETECT',
        payload: { id: 2, bitmap, timestamp: 200 }
      }
    });

    expect(closeSpy).toHaveBeenCalledTimes(1);
    const lastMsg = workerScope.postMessage.mock.calls.at(-1)[0];
    expect(lastMsg.payload.ok).toBe(false);
    expect(lastMsg.payload.error).toBe('Simulated failure');
  });

  test('calls bitmap.close() exactly once when uninitialized', async () => {
    // Do NOT call INIT
    const bitmap = { close: closeSpy };

    await workerScope.onmessage({
      data: {
        type: 'DETECT',
        payload: { id: 3, bitmap, timestamp: 300 }
      }
    });

    expect(closeSpy).toHaveBeenCalledTimes(1);
    const lastMsg = workerScope.postMessage.mock.calls.at(-1)[0];
    expect(lastMsg.payload.ok).toBe(false);
    expect(lastMsg.payload.error).toBe('FaceLandmarker not initialized');
  });

  // Regression coverage for the actual "FaceLandmarker init failed on both
  // GPU and CPU delegates" failure seen in practice: doInit() originally
  // had no retry at all — one transient failure on both delegates (e.g. a
  // dropped connection fetching the WASM fileset) meant instant, permanent
  // INIT_ERROR, unlike gazeEngine.js's main-thread init (which this worker
  // replaced), which already retried the whole sequence for exactly this
  // reason.
  test('retries the whole init sequence once after a total first-attempt failure, and succeeds on the second attempt', async () => {
    FaceLandmarker.createFromOptions
      .mockRejectedValueOnce(new Error('GPU failed (attempt 1)'))
      .mockRejectedValueOnce(new Error('CPU failed (attempt 1)'))
      .mockResolvedValueOnce(defaultLandmarker()); // attempt 2, GPU succeeds

    await workerScope.onmessage({ data: { type: 'INIT' } });

    expect(workerScope.postMessage).toHaveBeenCalledWith({ type: 'INIT_SUCCESS' });
    expect(FaceLandmarker.createFromOptions).toHaveBeenCalledTimes(3);
  });

  test('gives up and posts INIT_ERROR after every attempt fails, naming both delegates and the attempt count', async () => {
    FaceLandmarker.createFromOptions.mockReset().mockRejectedValue(new Error('always fails'));

    await workerScope.onmessage({ data: { type: 'INIT' } });

    const lastMsg = workerScope.postMessage.mock.calls.at(-1)[0];
    expect(lastMsg.type).toBe('INIT_ERROR');
    expect(lastMsg.error).toMatch(/failed on both GPU and CPU delegates after 2 attempts/);
    // 2 attempts x 2 delegates
    expect(FaceLandmarker.createFromOptions).toHaveBeenCalledTimes(4);
  });
});
