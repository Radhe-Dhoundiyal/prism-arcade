export function runMathTask(operation, payload, { signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Cancelled', 'AbortError')); return; }
    if (typeof Worker === 'undefined') { reject(new Error('Background computation requires browser Worker support.')); return; }
    const worker = new Worker(new URL('./math.worker.js', import.meta.url), { type: 'module' });
    const cleanup = () => { worker.terminate(); signal?.removeEventListener('abort', abort); };
    const abort = () => { cleanup(); reject(new DOMException('Cancelled', 'AbortError')); };
    signal?.addEventListener('abort', abort, { once: true });
    worker.onmessage = ({ data }) => {
      cleanup();
      if (data.ok) resolve(data.result); else reject(new Error(data.error));
    };
    worker.onerror = () => { cleanup(); reject(new Error('Background computation failed; no exact result claimed.')); };
    worker.onmessageerror = () => { cleanup(); reject(new Error('Background response could not be decoded.')); };
    try { worker.postMessage({ operation, payload }); }
    catch (error) { cleanup(); reject(error); }
  });
}
