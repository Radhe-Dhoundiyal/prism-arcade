import { executeMathTask } from './mathTasks.js';

self.onmessage = ({ data }) => {
  try { self.postMessage({ ok: true, result: executeMathTask(data.operation, data.payload) }); }
  catch (error) { self.postMessage({ ok: false, error: error.message }); }
};
