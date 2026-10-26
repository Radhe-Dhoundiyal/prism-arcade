# Architecture

React and Vite provide a frontend-only application. `src/App.jsx` owns hash navigation and lazy portal views. `src/pages/lobbyData.js` remains the canonical registry and managed-save-key catalog.

Each portal separates its mathematical logic, challenges, persistence and view where practical. `src/core/mathTasks.js` dispatches selected heavy computations through a cancellable worker. Worker failure produces an error or unknown result, not a silently substituted heuristic. Existing admission and expansion limits are unchanged.

The save manager uses versioned localStorage exports, validation, rollback attempts and recovery data. Neither cross-tab atomicity nor crash-safe multi-key updates are promised. Existing profile and achievement records remain compatible.

The research panel retains Original Notebook, the six-stage Research Journey, complete correction dossiers and original source identities. Its public viewer resolves historical references only to separately hashed public editions, never to private original bytes. A versioned external asset package supplies 72 page slots and seven notebook PDFs/TeX solutions; build-time exact inventories and hashes reject missing, unexpected or tampered files. Source-only builds use explicit availability notices. Notebook zoom styles remain isolated. See [research packaging](research-availability.md).

Tests retain the predecessor's independent mathematical oracles and save/worker regressions. Two historical asset/presentation suites require withheld material and are preserved unchanged in the private reference edition; successor tests cover the replacement source policy and research navigation. This is a declared verification boundary, not a claim that the public tree is byte-identical to its predecessor.
