import { useEffect, useState } from 'react';
import { getStorageWarnings } from '../core/storage.js';

export default function StorageNotice() {
  const [messages, setMessages] = useState(getStorageWarnings);
  useEffect(() => {
    const refresh = () => setMessages(getStorageWarnings());
    window.addEventListener('prism-storage-warning', refresh);
    refresh();
    return () => window.removeEventListener('prism-storage-warning', refresh);
  }, []);
  if (!messages.length) return null;
  return <aside className="storage-notice" role="status" aria-label="Progress storage warning">
    <strong>Progress needs attention</strong>
      <p>Some progress could not be loaded or saved. Existing unreadable records are unchanged. Export recovery data from the lobby settings.</p>
    <details><summary>Storage details</summary><ul>{messages.map((message) => <li key={message}>{message}</li>)}</ul></details>
  </aside>;
}
