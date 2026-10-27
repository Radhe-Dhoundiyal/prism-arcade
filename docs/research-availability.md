# Research Editions and Assets

The source repository and research payload are separate. The `v1` package contains seven labeled public notebook PDFs, 72 page slots and seven public TeX solutions. It excludes every private original, the official problem-set PDF and the Problem 8 statement extract. The missing Problem 8 notebook remains explicit.

`src/research/public-editions.json` pins every public file's length, SHA-256, original source identity and edit summary. `catalog.json`, `notebook-pages.json` and `publicationAssets.js` retain historical identities, not public download permissions. A historical source reference resolves only to its public derivative; unknown or held material opens an availability notice. No private-original mode exists in this public-edition application.

The separately preserved private archive contains complete originals. Public editions are not exact replicas: statement passages are omitted, editorial settings are new, and unnecessary original PDF metadata is removed. Historical mathematics is retained, including mistakes; corrections stay separate. Four source-page slots contain editorial replacements, not reproduced handwriting. See [provenance](provenance.md).

## Local Attachment

Without the separate package, `npm run build` produces a playable source-only application with explicit missing-package notices. To attach an authenticated local package on PowerShell:

```powershell
$env:PRISM_RESEARCH_ASSETS_DIR = 'D:\research-assets-v1'
$env:PRISM_RESEARCH_OUT_DIR = 'D:\prism-site'
npm.cmd run verify:assets
npm.cmd run build
npm.cmd run preview -- --outDir D:\prism-site --host 127.0.0.1 --port 4175 --strictPort
```

Use actual package/output directories on your machine. Output must be outside the source tree. The package root contains `research/v1/manifest.json`; its contents must match the source pin exactly. Missing, extra, symlinked or changed files fail verification. The build copies only that validated edition payload, never a private archive. Clear the two environment variables to return to source-only builds.

The viewer mounts one selected image with lazy loading and keeps original source-page numbering. Fit-width and zoom operate inside a keyboard-scrollable viewport. PDFs are downloaded only on demand. The images are not complete accessible transcriptions; current investigation and correction text remains available alongside them.

## Delivery

The owner-approved editions are published on Vercel Blob at [https://lhxs4gvzybfjtuwr.public.blob.vercel-storage.com](https://lhxs4gvzybfjtuwr.public.blob.vercel-storage.com/research/v1/manifest.json), under immutable `/research/v1/` paths. All 87 hosted files passed independent HTTPS status, length, SHA-256, MIME and CORS checks on 2026-10-27. The public store is connected to `prism-arcade-live`. Research binaries remain outside Git source clones and the application deployment. The uncompressed lossless edition payload is approximately 187 MiB; PDFs account for much of the increase over the originals and are fetched only on request.

Treat a published version directory as immutable. Use a new version for changed bytes, retain its manifest and verify all hosted resources after upload. Long-lived immutable caching is appropriate only for accepted versioned bytes; keep the entry HTML and manifest discovery refreshable. Serve `.webp` as `image/webp`, `.pdf` as `application/pdf` and `.tex` as `application/x-tex` or a suitable text type. Do not serve a private source root.

Set `VITE_RESEARCH_ASSET_BASE_URL` to the verified HTTPS Blob origin to enable remote public editions. Historical references still resolve only through the pinned derivative mapping. Remote builds do not copy the research payload, including when a local package is also attached. Cross-origin TeX links open in a new tab; the browser may display or download them according to its handling of `application/x-tex`. No upload credentials belong in `VITE_` variables.

```powershell
$env:VITE_RESEARCH_ASSET_BASE_URL = 'https://lhxs4gvzybfjtuwr.public.blob.vercel-storage.com'
npm.cmd run build
```

Clear this variable and `PRISM_RESEARCH_ASSETS_DIR` for source-only mode. A locally attached authenticated package without the remote setting continues to be copied into its separate build output.

For the published collection, `node scripts/retrieve-research.mjs https://OWNER-APPROVED-BASE NEW-DIRECTORY` retrieves the pinned package. It requires an explicit HTTPS base, rejects redirects and existing destinations, verifies manifest/length/hash pins and publishes the local directory only after verification. Failed partial downloads remain recognizable `.partial-*` directories. Unit tests use injected transport and do not contact the real host. Browser checks can exercise the CDN by setting `VITE_RESEARCH_ASSET_BASE_URL` alongside `PRISM_RESEARCH_TEST_MODE=public-editions`. Run `verify:assets` again before building.

[PRISM India](https://www.prism-india.org/) is the official external reference, not evidence of permission to redistribute organizer material. Final ownership, edition acceptance, reuse terms and release authority remain owner decisions.
