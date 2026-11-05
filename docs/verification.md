# Reproduction and Verification

With Node 22.12 or newer, run `npm ci`, `npm test`, `npm run verify:content` and `npm run build`. Use `npm run test:math` and `npm run test:save` to run the independent math and save subsets separately.

Start `npm run preview -- --host 127.0.0.1 --port 4175 --strictPort`, then run `npm run smoke` in another terminal. Set `PRISM_BASE_URL` if using a different port. The harness uses Edge when installed, otherwise Playwright Chromium. Do not rebuild while smoke reads the production assets.

`PRISM_QA_DIR` selects the local report and screenshot directory; the default `.qa` is ignored. Browser reports include assertion failures and automated accessibility findings.

If headless Edge stalls on screenshot capture or initial rendering on Windows, set `PRISM_SOFTWARE_RENDERING=1`. This disables GPU acceleration without changing the checks or time limits.

With the source-only preview running, `npm run smoke:research` verifies all eight research integrations and explicit missing-package notices. For an edition build, attach the separately authenticated package as described in [research packaging](research-availability.md), then set `PRISM_RESEARCH_TEST_MODE=public-editions` for the same harness. For a remote build, also set `VITE_RESEARCH_ASSET_BASE_URL` to the verified CDN origin when building and running the harness. It opens first, middle and last page slots across all seven notebooks, checks zoom, PDF/TeX links, correction links, held-original access, MIME types, hashes and mobile/desktop layouts. Page slots labeled as editorial replacements are not claimed to be authentic handwriting.

`verify:content` checks local documentation links, historical reference inventories and the approved screenshots. It rejects unapproved binary assets and source symlinks. Public-edition files are verified separately against their versioned manifest.

[GitHub Actions](https://github.com/Radhe-Dhoundiyal/prism-arcade/actions) runs the source-only checks and validates the two JSON browser reports before uploading them. CI does not verify the deployed site or its hosted editions; run the public-edition browser checks against the live URL to verify delivery.
