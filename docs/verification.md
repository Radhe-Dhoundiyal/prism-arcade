# Reproduction and Verification

Install with `npm ci`, then run `npm test`, `npm run test:math`, `npm run test:save`, `npm run verify:content` and `npm run build`. Use Node 22.12 or newer. A clean installation is required to test lockfile reproducibility; a cached development server is not a production-build check.

Start `npm run preview -- --host 127.0.0.1 --port 4175 --strictPort`, then run `npm run smoke` in another terminal. Set `PRISM_BASE_URL` if using a different port. The harness uses Edge when installed, otherwise Playwright Chromium. Do not rebuild while smoke reads the production assets.

`PRISM_QA_DIR` selects a private QA output directory; the default `.qa` is ignored. Captures are test evidence, not automatically approved public media. Browser output records process failures and accessibility findings. Do not present a failed or incomplete run as passed.

If headless Edge stalls on screenshot capture or initial rendering on Windows, set `PRISM_SOFTWARE_RENDERING=1` for the smoke commands. This opts into `--disable-gpu`; the same screenshots, assertions, accessibility scans and time limits still run. Reports record the rendering option. A successful software-rendering run does not erase a failed default-rendering run.

With the source-only preview running, `npm run smoke:research` verifies all eight research integrations and explicit missing-package notices. For an edition build, attach the separately authenticated package as described in [research packaging](research-availability.md), then set `PRISM_RESEARCH_TEST_MODE=public-editions` for the same harness. It opens first, middle and last page slots across all seven notebooks, checks zoom, PDF/TeX links, correction links, held-original access, MIME types, hashes and mobile/desktop layouts. Page slots labeled as editorial replacements are not claimed to be authentic handwriting.

All copied mathematical engines, save modules and retained predecessor tests are hash-checked against the predecessor. The successor does not require withheld PDFs to pass its public tests. Two historical asset/presentation test files are preserved unchanged and run in the private reference edition; the public source-policy tests explicitly replace their now-inapplicable local-asset requirements. Independent mathematical and save tests remain unchanged.

The four README screenshots are pinned by path, size, PNG dimensions and SHA-256 in a small test fixture. `verify:content` rejects other binary assets and source symlinks. Capture-state and rights-review records remain outside the public repository; a hash pin verifies identity, not publication permission.

Fresh results belong to the separately delivered engineering report. This document describes commands and coverage without treating predecessor results as a fresh successor run. Remote CI and public deployment remain unperformed unless separately authorized.
