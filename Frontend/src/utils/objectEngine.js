import { ObjectDetector, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm';
const MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite';

let _initPromise = null;
const INIT_ATTEMPTS = 2;
const RETRY_DELAY_MS = 500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function initObjectDetector() {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    let lastError = null;

    for (let attempt = 1; attempt <= INIT_ATTEMPTS; attempt++) {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

        // Try GPU first, then CPU
        for (const delegate of ['GPU', 'CPU']) {
          try {
            const objectDetector = await ObjectDetector.createFromOptions(vision, {
              baseOptions: { 
                modelAssetPath: MODEL_PATH, 
                delegate 
              },
              scoreThreshold: 0.3,
              runningMode: 'VIDEO',
            });
            console.log(`[objectEngine] Initialized with ${delegate} delegate (attempt ${attempt}/${INIT_ATTEMPTS})`);
            return objectDetector;
          } catch (err) {
            console.warn(`[objectEngine] ${delegate} delegate failed (attempt ${attempt}/${INIT_ATTEMPTS}):`, err.message);
            lastError = err;
          }
        }
      } catch (err) {
        console.warn(`[objectEngine] WASM fileset load failed (attempt ${attempt}/${INIT_ATTEMPTS}):`, err.message);
        lastError = err;
      }

      if (attempt < INIT_ATTEMPTS) await sleep(RETRY_DELAY_MS);
    }

    throw new Error(
      `ObjectDetector init failed after ${INIT_ATTEMPTS} attempts: ${lastError?.message || 'unknown error'}`
    );
  })();

  try {
    return await _initPromise;
  } finally {
    _initPromise = null;
  }
}
