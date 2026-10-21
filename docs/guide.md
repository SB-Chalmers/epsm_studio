# epsm_studio guide

Run commands from the repository root unless stated otherwise.

This branch contains the fresh Studio rebuild: an interactive frontend prototype
from demo login through project authoring, baseline evaluation, scenario studies,
results and export. It applies the Pocket CAD light theme, supports geographic
drawing and the EPSM Viewer, and saves account-scoped work in this browser.
Authentication, evidence, weather and calculations are clearly labelled
illustrations. There is no backend, real SSO or scientific execution yet.

See the [prototype guide](../docs/rebuild/frontend-prototype.md) for implemented
behaviour, verification and the boundary to subsequent production milestones.

## Run the frontend

Use Node.js 22 LTS (22.12 or newer) and npm.

```sh
cd frontend
npm ci
npm run dev
```

Open the loopback URL printed by Vite. No database, Python environment, Docker
service or credentials are needed. OpenFreeMap tiles require network access;
drawings, tables and project recovery remain available when tiles fail.

```sh
npm run check
npm run build
npm run preview
```

## Repository layout

| Path | Purpose |
| --- | --- |
| [frontend/](../frontend/README.md) | React prototype, typed asynchronous client, IndexedDB storage and tests |
| [backend/](../backend/README.md) | Scope for the future Django API, SAML and worker integration; no server code yet |
| [docs/rebuild/](../docs/rebuild/plan.md) | Delivery plan, architecture, student journeys and cache/recovery policy |
| [docs/design/](../docs/design/README.md) | Current Pocket CAD visual design manual and reference screens |
| [design/pocket-cad/](../design/pocket-cad/README.md) | Versioned tokens, fonts, icons, offline specimen and asset checks |
| [.github/workflows/ci.yml](../.github/workflows/ci.yml) | Unit/component tests, Playwright journeys, build and design-asset validation |

## Delivery order

Follow the [rebuild plan](../docs/rebuild/plan.md). The frontend prototype establishes
the interactions first. Subsequent milestones introduce a minimal backend and
database, Chalmers SSO, enforced private user workspaces, a versioned material
catalogue and bounded queued simulations through installed EPSM packages.
See the [architecture](../docs/rebuild/architecture.md),
[student journeys](../docs/rebuild/student-journeys.md) and
[cache policy](../docs/rebuild/cache-policy.md) for the planned contracts.

The legacy application, database dumps, keys, environment files, deployment
scripts and documentation site have been removed from this branch. Their tracked
source remains in Git history; the pre-cleanup scaffold is commit `f089d03`.
`apps/studio/` was a temporary separation from the old app; the new frontend now
lives directly in `frontend/`. Cleaning this checkout does not retire the remote
legacy service. Production cutover and server cleanup are later delivery steps.

## Checks

From `frontend/`, run `npm ci`, `npm test` and `npm run build`. Browser checks use
`npx playwright install chromium` followed by `npm run test:e2e`.
From the repository root, run:

```sh
python3 design/pocket-cad/scripts/check_assets.py
python3 design/pocket-cad/scripts/sync_readme_assets.py --repos epsm_studio --check
```

The design checks use Python 3.10 or newer and its standard library. They do not
require sibling repositories. The frontend imports the canonical Pocket CAD
tokens/theme and bundles the supplied fonts and icons; their sources and licences
remain in the design kit. The pinned Viewer artifact includes its own provenance
and notices under `frontend/vendor/`.

## Contributing and attribution

Read [CONTRIBUTING.md](../CONTRIBUTING.md). EPSM-owned source is available under the
[MIT licence](../LICENSE.md); bundled fonts retain their own licences and provenance.

Developed at Chalmers University of Technology. Lead developer: Sanjay Somanath;
principal investigator: Alexander Hollberg; contributor: Yinan Yu. Funding:
Swedish Energy Agency, project P2024-04053. Project partners: Lindholmen Science
Park AB, Sinom AB and Stiftelsen Chalmers Industriteknik.
