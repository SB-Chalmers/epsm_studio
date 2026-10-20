# Studio frontend

React, TypeScript and Vite prototype for EPSM Studio. Follow the complete workflow
with clearly labelled demonstration data: demo CID login, custom or map-selected
projects, building preparation, baseline, scenario studies, results and export.
Projects and recoverable drafts are saved in account-scoped IndexedDB in this
browser. This is demonstration isolation, not server authorisation.

## Run and verify

Use Node.js 22 LTS (22.12+) and npm, from this directory:

```sh
npm ci
npm run dev
```

Open the loopback URL printed by Vite. No Python, backend, database credentials or
Docker services are required. OpenFreeMap needs network access; drawing and table
fallbacks remain usable when tiles fail.

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run preview
```

`build` checks TypeScript and writes the production bundle to ignored `dist/`.
Playwright starts a local server on port 4173, or reuses one during development.
CI runs the same checks plus the canonical design-asset validation.

## Boundaries

- `src/domain/` defines frontend contracts, readiness, comparisons and exports.
- `src/data/` implements the asynchronous `StudioClient` with deterministic
  fixtures and versioned browser storage. Components do not import fixtures.
- `src/state/` handles the active demonstration account and preferences.
- `src/components/` contains shared controls, geographic/grid editing, the Viewer
  scene adapter and charts. `src/pages/` owns routes and workflow interactions.
- `vendor/` contains the pinned built Viewer artifact, source revision, digests
  and notices. No sibling checkout is a runtime dependency.

The canonical [Pocket CAD theme](../design/pocket-cad/README.md) is imported from
its source and bundled with supplied fonts and icons. Preserve its source files,
font licences and provenance. EPSM-owned application source uses the repository
[MIT licence](../LICENSE.md).

See the [prototype guide](../docs/rebuild/frontend-prototype.md) for persistence,
revision semantics, illustrative calculation limits and subsequent integrations.
