import { expect, test, describe, vi, beforeEach } from 'vitest';

// Minimal mock Worker: captures postMessage calls, lets the test drive
// worker->main messages via triggerMessage(), and lets onerror be
// triggered via triggerError(). new Worker(url, opts) is called with a
// URL object (from `new URL('./gazeWorker.js', import.meta.url)`), which
// we don't need to inspect — we only care about the message protocol.
class MockWorker {
  constructor() {
    this.postMessage = vi.fn();
    this.terminate = vi.fn();
    this.onmessage = null;
    this.onerror = null;
  }
  triggerMessage(data) {
    this.onmessage?.({ data });
  }
  triggerError(err) {
    this.onerror?.(err);
  }
}

describe('gazeWorkerClient', () => {
  let lastWorker;
  let createGazeWorkerClient;

  beforeEach(async () => {
    vi.resetModules();
    // A plain function (not an arrow function) — arrow functions have no
    // [[Construct]] internal method, so `new Worker(...)` would throw
    // "is not a constructor" once mockImplementation wraps one.
    global.Worker = vi.fn().mockImplementation(function MockWorkerCtor() {
      lastWorker = new MockWorker();
      return lastWorker;
    });
    ({ createGazeWorkerClient } = await import('../utils/gazeWorkerClient.js'));
  });

  test('init() resolves on INIT_SUCCESS and posts INIT exactly once even if called twice', async () => {
    const client = createGazeWorkerClient();
    const p1 = client.init();
    const p2 = client.init();
    expect(lastWorker.postMessage).toHaveBeenCalledTimes(1);
    expect(lastWorker.postMessage).toHaveBeenCalledWith({ type: 'INIT' });

    lastWorker.triggerMessage({ type: 'INIT_SUCCESS' });
    await expect(p1).resolves.toBeUndefined();
    await expect(p2).resolves.toBeUndefined();
  });

  test('init() rejects on INIT_ERROR with the worker-provided message', async () => {
    const client = createGazeWorkerClient();
    const p = client.init();
    lastWorker.triggerMessage({ type: 'INIT_ERROR', error: 'both delegates failed' });
    await expect(p).rejects.toThrow('both delegates failed');
  });

  test('detect() transfers the bitmap and resolves with the matching DETECT_RESULT payload', async () => {
    const client = createGazeWorkerClient();
    const bitmap = {};
    const p = client.detect(bitmap, 123);

    expect(lastWorker.postMessage).toHaveBeenCalledWith(
      { type: 'DETECT', payload: { id: 0, bitmap, timestamp: 123 } },
      [bitmap]
    );

    lastWorker.triggerMessage({
      type: 'DETECT_RESULT',
      payload: { id: 0, ok: true, faceLandmarks: [{ x: 0.5, y: 0.5 }] },
    });
    const result = await p;
    expect(result.ok).toBe(true);
    expect(result.faceLandmarks).toEqual([{ x: 0.5, y: 0.5 }]);
  });

  test('concurrent detect() calls resolve to their own matching result, not each other\'s', async () => {
    const client = createGazeWorkerClient();
    const p1 = client.detect({}, 1);
    const p2 = client.detect({}, 2);

    // Resolve out of order — id 1 (second call) arrives before id 0.
    lastWorker.triggerMessage({ type: 'DETECT_RESULT', payload: { id: 1, ok: true, faceLandmarks: 'second' } });
    lastWorker.triggerMessage({ type: 'DETECT_RESULT', payload: { id: 0, ok: true, faceLandmarks: 'first' } });

    await expect(p1).resolves.toMatchObject({ faceLandmarks: 'first' });
    await expect(p2).resolves.toMatchObject({ faceLandmarks: 'second' });
  });

  test('a worker-level error rejects every pending call and the in-flight init', async () => {
    const client = createGazeWorkerClient();
    const initP = client.init();
    const detectP = client.detect({}, 1);

    lastWorker.triggerError(new Error('module script failed to load'));

    await expect(initP).rejects.toThrow(/module script failed to load/);
    await expect(detectP).rejects.toThrow(/module script failed to load/);
  });

  test('terminate() rejects pending calls, stops accepting new detect() calls, and calls worker.terminate()', async () => {
    const client = createGazeWorkerClient();
    const pendingBeforeTerminate = client.detect({}, 1);

    client.terminate();

    await expect(pendingBeforeTerminate).rejects.toThrow(/terminated/);
    expect(lastWorker.terminate).toHaveBeenCalledTimes(1);
    await expect(client.detect({}, 2)).rejects.toThrow(/terminated/);
  });
});
