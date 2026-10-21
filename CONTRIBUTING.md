# Contributing to EPSM Studio

This checkout is the fresh Studio rebuild. Read the [delivery plan](docs/rebuild/plan.md)
and [architecture](docs/rebuild/architecture.md) before extending the application.
Keep planned capabilities distinct from implemented behaviour.

The existing `codex/studio-rebuild` scaffold started from `main`. For subsequent
ordinary work, follow the [EPSM branch and release policy](https://github.com/SB-Chalmers/epsm_development/blob/main/docs/branches-and-releases.md):
use a focused feature or `codex/` branch from `dev`, review into `dev`, then promote
a checked release to `main`. Preserve unrelated local changes.

## Scope and ownership

- `frontend/` contains the implemented React/Vite prototype. `backend/` describes
  the future service; it has no runnable server yet.
- Studio owns web routes, sessions, user permissions, drafts, scheduling and
  application persistence. Call installed EPSM packages through their public APIs
  for physical models, scientific calculations and prepared workflows.
- Keep credentials and private keys outside source and images. Do not restore
  legacy application code, example passwords or deployment scripts to satisfy a
  missing feature. Build the relevant milestone and its checks explicitly.
- Retain the current design kit, manuals, author attribution and third-party
  licences. Regenerate derived assets from their sources rather than editing them.

## Checks

```sh
cd frontend
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

From the repository root:

```sh
python3 design/pocket-cad/scripts/check_assets.py
python3 design/pocket-cad/scripts/sync_readme_assets.py --repos epsm_studio --check
```

Use Node.js 22 LTS (22.12+) and Python 3.10 or newer for these checks. CI runs unit,
component and browser journeys, the build and design checks without private
services or sibling checkouts. Add
behavioural tests with each implemented account, ownership, persistence or worker
feature; follow the milestone's acceptance gate. There is no production deployment
workflow in this baseline.
