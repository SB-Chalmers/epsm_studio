# Frontend prototype

Implemented 20 October 2026 on the fresh Studio rebuild. This milestone makes
the complete research workflow reviewable before adding production services.

## What works

The Pocket CAD light theme, bundled canonical fonts/icons and responsive shell
cover login, home, aggregate system status, projects, materials, settings and
about. CID login enters a demonstration account without an identity-provider
request. The footer identifies illustrative data and browser storage throughout.

Project setup supports hypothetical metre-grid drawing, actual-site geographic
drawing and selecting a Gothenburg portfolio from a real OpenFreeMap basemap.
Rectangle/simple polygon editing, vertices, undo/redo, orientation, target/context
boundaries, inclusion controls and a synchronized building table/3D preview are
available. Boundary roles are explicit metadata. Candidate selection retains
whole intersecting footprints. Tile failures preserve drawing and table access.
Outside the sample area users can draw custom buildings; factual evidence is
unavailable. Synthetic-context IDs match Core's documented presets, while their
displayed geometry remains illustrative.

Building preparation separates source evidence, catalogue assumptions and user
overrides. It includes missing values, multipart geometry, qualified/shared/
conflicting EPC evidence, individual assignments, fill-missing group edits,
explicit replacement summaries and override reset. Construction layers are
read-only. An EPC observation is comparison evidence, not modelled energy.

Baseline and study jobs deterministically play queued/running/completed/failed/
cancelled states. RC requires explicit acknowledgement that context and self
shading are omitted. EnergyPlus is an alternative demonstration selection.
Weather includes TMY, AMY and labelled illustrative future choices. Defaults come
from the active account, with a 50-year carbon period initially.

Weather, renovation, robust and custom templates expose an inspectable finite
scenario grid. Catalogue measures can form named packages. Scenario combinations,
building cases, compatible baseline reuse, new executions and retry attempts are
reported separately. Robust packages rank by worst total carbon across weather;
their chart shows the corresponding worst-weather point and a Pareto frontier.
Missing carbon remains incomplete. Failed/cancelled rows remain inspectable.

Annual/monthly energy, a **168-hour illustrative sample**, carbon, portfolio and
building filters, scenario tables and case inspectors link to the retained run.
JSON, summary CSV, hourly-sample CSV and HTML report exports carry units,
illustrative labels, assumptions and revision identities. The hourly sample is
not a full annual series.

## Storage and evaluation identities

All demonstration behaviour crosses the asynchronous `StudioClient` boundary;
UI components do not import fixture records. Versioned IndexedDB records include
the active demo session and account-owned projects, preferences, package drafts
and recoverable authoring state. Switching accounts/logout clears transient
selection and checks ownership before returning records. Reset affects only the
current account's workspace. Browser storage can be cleared by the browser and
does not establish a security boundary or a server save.

Authoring recovery is separate from committing an input revision. Saving changed
inputs increments the project revision. Baselines retain building snapshots;
studies retain their baseline revision, complete scenario membership, package
choices and attempts. Later edits mark results as older without rewriting them
or changing their historical reuse ledger. Retries are attempts, not extra
scenario cases.

Studio consumes the built `epsm_viewer` artifact pinned under
[`frontend/vendor/`](../../frontend/vendor/README.md), including source revision,
digests and licences. The adapter emits `epsm.scene/1` massing for visual preview.
Core remains the future authority for physical geometry and model readiness.
Builds also carry the canonical font/icon licences and Viewer provenance under
`dist/licenses/`. The pinned renderer retains its own light display controls; a package-owned theme
API remains future Viewer work.

## Verification and integration boundary

Unit/component checks cover ownership, recovery, revisions, geometry/readiness,
EPC/bulk edits, counting/reuse, Pareto and robust comparisons, exports and study
drafting. Playwright journeys cover custom/map setup, reload, account switching,
preferences, baseline/study submission, retry/cancellation and export. Responsive
screenshots and keyboard/reduced-motion checks supplement these journeys. CI also
builds the frontend and checks the existing canonical design assets.

There are no live Python calculations, building-data requests, SAML handoffs,
weather generation, production queue or server-resource inspection. All evidence,
catalogue entries, job outcomes and resource readings are illustrative. The
OpenFreeMap basemap is the only public data service used by the prototype;
attribution remains visible.

Next milestones in the [production plan](plan.md) replace the client adapter
incrementally: backend persistence and enforced ownership, real SSO, curated Data
catalogue and Database evidence, Core model construction/readiness, smhi2epw
weather and bounded durable scientific jobs. Production deployment and legacy
retirement remain separate milestones.
