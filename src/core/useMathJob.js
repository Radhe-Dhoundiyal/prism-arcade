import { useCallback, useEffect, useRef, useState } from 'react';
import { runMathTask } from './runMathTask.js';

export function useMathJob() {
  const current = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cancel = useCallback(() => { current.current?.abort(); current.current = null; setBusy(false); }, []);
  useEffect(() => () => current.current?.abort(), []);
  const run = useCallback(async (operation, payload, receive) => {
    current.current?.abort();
    const controller = new AbortController(); current.current = controller;
    setBusy(true); setError('');
    try {
      const result = await runMathTask(operation, payload, { signal: controller.signal });
      if (current.current === controller && !controller.signal.aborted) receive(result);
    } catch (failure) { if (failure.name !== 'AbortError') setError(failure.message); }
    finally { if (current.current === controller) { current.current = null; setBusy(false); } }
  }, []);
  return { run, cancel, busy, error };
}
