# Architecture

React and Vite provide a frontend-only application. `src/App.jsx` owns hash navigation and lazy portal views. `src/pages/lobbyData.js` remains the canonical registry and managed-save-key catalog.

Each portal separates its mathematical logic, challenges, persistence and view where practical. `src/core/mathTasks.js` dispatches selected heavy computations through a cancellable worker. Worker failure produces an error or unknown result, not a silently substituted heuristic.

The save manager uses versioned localStorage exports, validation, rollback attempts and recovery data. Neither cross-tab atomicity nor crash-safe multi-key updates are promised. Existing profile and achievement records remain compatible.

The research panel shows original notebook pages, six Research Journey stages, correction notes and source references. Public links point to edited, separately hashed editions, never to the private originals. The external package contains 72 page slots and seven notebook PDFs/TeX solutions; the build checks its file list and hashes. Without that package, the viewer shows an availability notice. Notebook zoom styles are kept separate. See [research packaging](research-availability.md).

Independent mathematical oracles test the engines. Save and worker regressions, browser smoke tests, and publication checks cover the application and its research integration. See [verification](verification.md).
