# Studio rebuild plan

**Status: proposal and minimal application scaffold, 20 October 2026.** The new
application has no working authentication, package adapters, persistence, database
browser, modelling editor, job execution, results analysis or caches. The existing
`frontend/`, `backend/`, deployment configuration and production application remain
the legacy system. This document is a plan for subsequent, separately checked
increments; a listed milestone is not a completed feature.

The rebuild should help a student ask a building-energy question, prepare one
building or an urban selection, run a bounded experiment, and explain the results
with their assumptions and evidence. Studio is the web application. It uses the
scientific operations of the EPSM packages rather than maintaining another model
or calculation implementation.

Read the [student journeys](student-journeys.md), [architecture](architecture.md)
and [cache and recovery policy](cache-policy.md) together. The architecture lists
the inspected source baselines and separates current package capabilities from
the proposed application. Its [3JS Web Editor reference inventory](architecture.md#existing-3js-web-editor-reference)
identifies existing camera, selection and editing interactions to assess before
building equivalent controls, with source provenance and licence decisions stated.

## Scope agreed for this branch

- Start a separate application shell under `apps/studio/` on
  `codex/studio-rebuild`, based on Studio `main` at `9c72a53`. The user's
  main-only source instruction overrides the handbook's ordinary rule to start
  feature work from `dev`. There is no promotion to `main` in this task.
- Plan for students studying individual buildings and urban building selections,
  including parametric comparisons and valid global sensitivity experiments.
- Support two future entry routes: author a physical model through a Core-based
  editor, or select existing database records through a read-only connection.
  Use already computed height evidence from the database. Preserve missing and
  conflicting facts; an explicit student assumption is recorded separately.
- Keep every web adapter in Studio. Packages expose documented, ready-to-consume
  operations and portable values. If a needed operation is missing, implement it
  in its owning package before wiring the application to it.
- Use the same physical Building for EnergyPlus and RC. Select and inspect engine
  defaults before submission, then freeze the complete settings for that run.
- Consume the separate `epsm_viewer` renderer once its extraction is ready. Core
  supplies neutral `epsm.scene/1` polygon scene data. Studio owns application
  selection, forms and display adapters.

DTCC integration, direct IDF upload/editing as a modelling route, old-data
migration, deployment, production configuration changes and feature implementation
are outside this scaffold task. Engine-generated input files may later be retained
as execution artifacts; this does not create a direct-IDF authoring route. Database
ingestion and height calculation remain outside Studio.

## What is retained from the existing application

Preserve the user's ability to use Chalmers SSO, keep private study inputs and
results, run work asynchronously, inspect progress and obtain useful exports.
Preserve the registered SAML entity identity and endpoint URLs during the first
future integration unless Chalmers IT approves a change. TLS server certificates
and SAML service-provider certificates have different purposes and lifecycles.

Preserving a capability does not mean copying the old implementation. The new
application needs explicit project ownership, application administrator roles,
protected downloads, durable run records and verified restore procedures.
Institutional affiliation alone must not grant administrator privileges. Existing
legacy accounts, catalogues and runs are not imported as part of this rebuild.

## Delivery principles

One increment should produce one observable behaviour, a small example and a
check that a student or developer can repeat. Keep software checks separate from
scientific claims: a successful run establishes execution for its inputs, not
accuracy against real buildings.

Use installed packages pinned to exact tested versions or source revisions. Do
not make the application depend on sibling source directories or private helpers.
The developer handbook's [engineering style](../../../epsm_development/docs/engineering-style.md),
[I/O guide](../../../epsm_development/docs/io-and-api.md),
[examples guide](../../../epsm_development/docs/examples-and-use-cases.md) and
[plotting guide](../../../epsm_development/docs/plotting-and-previews.md) guide
future work. Local amendments and future APIs must be labelled as such.

## Incremental milestones

All milestones below are **planned**. The current branch supplies documentation
and a minimal frontend scaffold only. Each gate must be checked against the
finished increment before the next dependent feature is advertised.

| Milestone | Deliverable | Checkable exit gate |
| --- | --- | --- |
| M0 — planning baseline | Separate shell, package ownership, journeys, source inventory and cache policy | Shell builds; documents link correctly; legacy runtime/configuration unchanged; placeholders visibly identify missing features |
| M1 — package contracts | One installed-package environment and small recorded handoffs for manual authoring, portable DB records, readiness, weather and execution | One supported Building can pass from its owner through each required operation; missing prerequisites fail clearly; exact package manifest retained; Viewer scene contract checked separately |
| M2 — identity and drafts | SAML integration in a test environment, project ownership, explicit application roles, saved draft revisions and recovery | Two users cannot read each other's drafts/files; refresh recovers saved work; stale edits produce a conflict; logout/account switch clears local private state; no default admin credentials |
| M3 — one physical building | Core-backed editor, read-only DB selection alternative, provenance review, Viewer integration, engine/weather selection | Manual and fixed-record routes create equivalent inspectable physical inputs where appropriate; missing heights remain visible; no ingestion/DTCC calls; engine capability errors block readiness |
| M4 — one local run | Frozen inputs, one application job record and one worker process running one prepared case | Real RC and separately real EnergyPlus checks produce declared outputs; duplicate submission is controlled; failure/cancellation retains evidence; restart recovers the recorded state |
| M5 — bounded parametric study | Finite grid and optional independent-uniform space-filling design, case count and compute estimate | Exact row membership, parameter units and baseline comparisons retained; limits checked before submission; progress, explicit retry and unchanged-plan resume demonstrated |
| M6 — sensitivity study | Supported paired design, Jansen analysis, failure-aware presentation and diagnostics | A known small response checks design/analysis handoff; paired row order survives execution/resume; failed, infeasible or missing rows cannot silently produce indices; assumptions and sample budget shown |
| M7 — urban studies | Target/context selection, building-specific provenance, bounded multi-building execution and aggregate reporting | Every target has an identity and readiness outcome; absent buildings/failed cases remain visible; both per-building and aggregate area/energy bases can be reconciled |
| M8 — learning and evidence export | Comparison charts, sensitivity explanation, reproducibility bundle and portable protocol | A fresh authorised reader can inspect question, inputs, design, attempts, metrics and omissions without a live DB or browser session; exports exclude secrets and respect source permissions |
| M9 — deployment rehearsal | One release manifest and a same-server deployment/restore rehearsal in an isolated environment | Built artifacts match the manifest; one migration step is tested; backup and restore include DB and files; rollback/recovery exercised; real SAML test completed; separate approval needed for any production change |

M2 and the package work in M1 can be developed independently. Real execution must
not be exposed before ownership and storage checks pass. Urban comparisons depend
on trustworthy single-building results; sensitivity analysis depends on the exact
execution design, not merely on a table of successful results.

## Questions to resolve at the relevant gate

| Decision | Proposed starting point | Resolve by |
| --- | --- | --- |
| Python application framework | One application and worker using the existing SAML expertise; choose the smallest supported integration after a protocol test | M2 |
| Worker transport | One local worker and durable application jobs first; reuse a queue only if it serves recovery, scheduling or isolation requirements | M4 |
| Database availability | Read-only account and an identified evidence release with usable, already computed component heights; do not infer that national ingestion means height coverage | M3 |
| Urban model meaning | Independent target evaluations with declared context by default; coupled thermal/district simulation requires its own supported method | M7 |
| Study limits | Explicit cases, runtime, artifact size and concurrent-user budgets based on measurements from the deployment machine | M5 |
| Cache and data retention | Validate the proposed quotas, expiry and source permissions; retained study evidence is not an evictable cache | M4/M8 |
| Viewer delivery | Separate TypeScript renderer plus optional Python display package; install a tested version rather than copying its source into Studio | M3 |

Do not fill these gaps with invented methods, fabricated results or silent fallback
engines. A missing public package capability becomes a concrete owner task and
keeps its dependent gate open.

## Acceptance examples to keep small

Maintain an ordered set of examples alongside later implementation: one manually
authored building; one portable record with a missing height; one valid RC case;
one real EnergyPlus case; a small finite grid; a small paired sensitivity design
with a retained failed case; and a tiny urban selection with one excluded target.
Each states its source, units, assumptions, installed dependencies, output location
and expected result. Start offline where the package permits it. Required SAML,
database, viewer and engine checks are separate checks with their real resources;
a skipped check does not satisfy its release gate.

The current task checks the scaffold and documentation. It does not execute these
future acceptance examples or establish a deployable replacement.
