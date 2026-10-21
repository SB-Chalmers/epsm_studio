# EPSM Studio rebuild

Read `README.md`, `CONTRIBUTING.md`, `docs/rebuild/plan.md` and
`docs/rebuild/architecture.md` for the actual implementation status and boundaries.

The implemented app is the React/Vite frontend prototype in `frontend/`, with
account-scoped browser storage, authoring and illustrative studies/results.
`backend/` contains a plan only. Authentication, evidence, weather, execution and
server telemetry are demonstrations; there is no live SSO or scientific backend.
Read `docs/rebuild/frontend-prototype.md` before extending these boundaries. Use
installed EPSM public APIs for future scientific integrations. Studio owns accounts
and permissions.

Preserve current Pocket CAD assets under `design/`, the design manual under
`docs/design/`, and the rebuild documentation under `docs/rebuild/`. Never restore
legacy code or credentials to bypass a planned milestone. Keep source attribution
and third-party licences.

Run the frontend build and local asset checks documented in `CONTRIBUTING.md`.
