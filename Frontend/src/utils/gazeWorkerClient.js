/**
 * gazeWorkerClient.js
 * ===================
 * Main-thread wrapper around gazeWorker.js — the Web Worker that runs
 * MediaPipe FaceLandmarker detection off the main thread.
 *
 * gazeWorker.js itself was already fully built and tested (see
 * gazeWorker.test.js) but nothing ever actually created a real Worker or
 * talked to it — useGazeTracker.js called detectForVideo() directly and
 * synchronously on the main thread instead, every single tick. That blocks
 * React rendering and any other UI interaction for however long inference
 * takes, which is the classic cause of a page "feeling" laggy independent
 * of any smoothing/filtering applied to the result afterward. This module
 * is the missing piece that actually connects the two.
 *
 * Protocol (matches gazeWorker.js exactly):
 *   -> { type: 'INIT' }
 *   <- { type: 'INIT_SUCCESS' } | { type: 'INIT_ERROR', error }
 *   -> { type: 'DETECT', payload: { id, bitmap, timestamp } }  (bitmap transferred, not copied)
 *   <- { type: 'DETECT_RESULT', payload: { id, ok, faceLandmarks, error, ... } }
 */

export function createGazeWorkerClient() {
  // NOT { type: 'module' } — this is the actual cause of "FaceLandmarker
  // init failed on both GPU and CPU delegates ... ModuleFactory not set.".
  // Read directly from @mediapipe/tasks-vision's own bundle
  // (vision_bundle.mjs): its WASM loader tries `importScripts(url)` first
  // (classic-worker only — sets the global ModuleFactory as a side effect
  // of the script executing in worker scope) and falls back to
  // `document.createElement('script')` if importScripts isn't a function.
  // A *module* worker has neither: importScripts doesn't exist there (the
  // spec restricts it to classic workers), and no worker of either kind
  // has `document`. So MediaPipe's loader was guaranteed to fail here
  // every single time, deterministically — no retry could ever have fixed
  // it, and it had nothing to do with network conditions.
  // Omitting `type: 'module'` makes this a classic worker, where
  // `importScripts` is real — Vite still bundles the static `import {
  // FaceLandmarker, FilesetResolver }` in gazeWorker.js correctly for a
  // classic-worker target (compiled into a self-contained script at build
  // time), so nothing else about that file needs to change.
  const worker = new Worker(new URL('./gazeWorker.js', import.meta.url));

  let nextId = 0;
  const pending = new Map(); // id -> { resolve, reject }
  let initDeferred = null;
  let terminated = false;

  const rejectAllPending = (err) => {
    for (const { reject } of pending.values()) reject(err);
    pending.clear();
  };

  worker.onmessage = (e) => {
    const { type, payload, error } = e.data || {};
    if (type === 'INIT_SUCCESS') {
      initDeferred?.resolve();
    } else if (type === 'INIT_ERROR') {
      initDeferred?.reject(new Error(error || 'gaze worker init failed'));
    } else if (type === 'DETECT_RESULT') {
      const entry = pending.get(payload?.id);
      if (entry) {
        pending.delete(payload.id);
        entry.resolve(payload);
      }
    }
  };

  // A worker-level error (e.g. the module script itself failed to load —
  // distinct from a caught error inside gazeWorker.js's own try/catch,
  // which always resolves via a normal DETECT_RESULT/INIT_ERROR message)
  // would otherwise leave every pending caller hanging forever.
  worker.onerror = (err) => {
    const wrapped = new Error(`gaze worker error: ${err?.message || err}`);
    initDeferred?.reject(wrapped);
    rejectAllPending(wrapped);
  };

  const init = () => {
    if (!initDeferred) {
      let resolve, reject;
      const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
      initDeferred = { promise, resolve, reject };
      worker.postMessage({ type: 'INIT' });
    }
    return initDeferred.promise;
  };

  // `bitmap` is transferred (zero-copy), not cloned — it must not be used
  // by the caller after this call. gazeWorker.js closes it once detection
  // finishes (success, failure, or uninitialized — see its own finally
  // block), so callers must not call bitmap.close() themselves either.
  const detect = (bitmap, timestamp) => {
    if (terminated) return Promise.reject(new Error('gaze worker terminated'));
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.postMessage({ type: 'DETECT', payload: { id, bitmap, timestamp } }, [bitmap]);
    });
  };

  const terminate = () => {
    if (terminated) return;
    terminated = true;
    rejectAllPending(new Error('gaze worker terminated'));
    worker.terminate();
  };

  return { init, detect, terminate };
}
