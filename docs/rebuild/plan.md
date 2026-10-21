# Studio rebuild plan

**Status: agreed production delivery plan with an implemented frontend prototype,
20 October 2026.** The [prototype](frontend-prototype.md) now covers demo login,
browser-persisted projects and studies, map/grid editing, the pinned Viewer,
illustrative evaluations, comparison and exports. It does not establish real
authentication, scientific package integration, server persistence or production
job execution. The application lives in `frontend/`; `backend/` contains service
guidance only. Legacy
application source, deployment files and the old documentation site have been
removed from this checkout. Their pre-cleanup source remains in Git history at
`f089d03`. This document plans subsequent, separately checked increments; a listed
milestone is not a completed feature. The remote legacy service is separate.

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

## Scope and starting point

- Continue the existing `codex/studio-rebuild` scaffold, originally based on
  Studio `main` at `9c72a53`. It now lives directly in `frontend/`, with `backend/`
  reserved for the future Django service. The temporary `apps/studio/` separation
  is no longer needed after legacy source removal. The main-only source instruction
  was specific to the original scaffold; this cleanup does not change branches,
  promote a release or deploy an application.
- Deliver a fresh application without importing legacy users, sessions, material
  catalogues, simulations or results. Build replacement deployment assets in
  Studio. Legacy source and local artifacts are removed from the rebuild checkout;
  retire the remote legacy runtime after replacement release checks and cutover.
  Server cleanup is a separate execution step.
- Establish the complete frontend journey with labelled demonstration data and
  review its interactions before scientific integration. The prototype now does
  this, with unit/component and browser checks. Continue with a minimal backend and
  account database, the login page and SAML, and verified private workspaces.
  Add a small material catalogue before exposing real queued simulations.
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
migration, database ingestion and height calculation remain outside Studio's
rebuild scope. Engine-generated input files may be retained as execution artifacts;
this does not create a direct-IDF authoring route. Deployment and feature work are
planned below, not implemented by editing this document.

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

## Accounts, ownership and storage

A first validated Chalmers SSO login creates one normal Studio account. Subsequent
logins resolve the same identity rather than creating duplicates. Use an internal
user ID and a unique association with the IdP issuer and its confirmed stable,
scoped subject identifier. Do not strip identity scopes or use mutable email as
the sole account key. Account creation must tolerate concurrent first logins.
Studio receives validated SAML assertions, never the user's Chalmers password.
Choose the application's user model before its first database migration.

Keep `https://epsm.chalmers.se` and the registered `/saml/metadata/`, `/saml/acs/`
and `/saml/sls/` endpoints for the first cutover. The new login page starts the
backend SAML flow and returns to an allowed Studio route. A redirect does not
transfer an authenticated session to an unrelated backend: the new backend must
own account provisioning, sessions and permission checks. Users sign in afresh;
legacy sessions are not migrated. Coordinate endpoint or signing-certificate
changes with Chalmers IT, including any required key rollover.

Every project, draft, run, attempt and private artifact belongs to an account or
an explicitly authorised project. The server derives ownership from the session
and validates all referenced records. Apply the same checks to lists, direct
URLs, edits, submission, cancellation, retries, progress, logs, downloads and
exports. Browser-supplied owner IDs, hidden buttons and unguessable UUIDs do not
grant access. Clear private browser state on logout and account switching. Sharing
between ordinary users is outside the initial release; administrator access is an
explicit application policy, not an automatic Chalmers affiliation mapping.

Use one PostgreSQL server initially, with logically separated application and
catalogue storage and appropriate database roles:

| Storage | Responsibility |
| --- | --- |
| Studio application records | Accounts, external identities, sessions, owned projects/drafts, durable jobs, attempts, artifact references and result summaries |
| Shared versioned material catalogue | Materials, constructions and factors consumed through `epsm_data` public operations; record source/release and effective selections in each run; runtime catalogue access is read-only |
| Private persistent files | Weather, frozen inputs, detailed outputs and exports linked to authorised database records; verify checksums and protect every download |
| Optional building-evidence source | A separate read-only connection through `epsm_db`, introduced at the building-selection gate; not Studio's application database |

The initial design provides private results per user in shared tables, not a
physical database per account. Keep large outputs in private artifact storage,
not in ordinary database rows or publicly served static directories. Back up and
restore database records and referenced files together. Start computation caches
within user/project scopes as specified in the [cache policy](cache-policy.md).

## Central simulation execution

Use a small Django backend, PostgreSQL application state, and a Celery/Redis
dispatch queue as the initial implementation direction. Introduce the queue only
at the first simulation milestone. Start with one worker and bounded concurrency;
multiple users share the scheduling service, not their private inputs or results.
Keep application scheduling and web adapters in `epsm_studio`.

Submission validates ownership, readiness and quotas, freezes inputs and records
a durable job before acknowledging acceptance. Use a transactional outbox or an
equivalent tested publication/reconciliation mechanism so a broker failure cannot
lose an accepted job. PostgreSQL is the source of job status; Redis is dispatch
transport, not the sole record of work or results.

An approved case runs through documented EPSM and Workflows operations, using
installed packages and a fixed runtime. EPSM coordinates Core, Data, RC or
EnergyPlus, and LCA; Workflows supplies supported prepared cases, attempts and
resume. Studies and Viewer are introduced when their user journeys need them.
Do not copy scientific algorithms into Studio, move account permissions into the
libraries, expose arbitrary user-selected Python handlers, or multiply concurrency
through unrestricted nested worker pools.

Each execution has an attempt identity and a private working directory. Publish
complete checksummed outputs before marking success. Duplicate submission and
queue redelivery must not publish conflicting results. Use atomic claims and a
lease/heartbeat or equivalent ownership check so an abandoned or superseded
attempt cannot overwrite a newer outcome. Reconcile stale attempts after restart;
retain failures and make retries explicit. Test the actual engine termination
path before advertising cancellation of running work.

Measure CPU, memory, runtime and artifact size before increasing concurrency.
Enforce both global limits and per-user active/pending/storage limits, with fair
selection between users so a large study cannot monopolise every worker. Split
large experiments into bounded dispatch units while retaining exact design rows.
Additional hosts need the same tested runtime plus secure access to shared inputs
and artifacts; adding worker replicas alone does not provide distributed storage.

## Development and release workflow

Use the same container definitions and PostgreSQL behaviour in development,
staging and production, with separate databases, secrets, queues and storage.
Begin with the existing front-page scaffold; do not wait for scientific features
to establish a repeatable deployment. CI uses a test IdP for automated protocol
checks. A real Chalmers staging login requires approved metadata/callbacks; a test
login bypass must never be enabled in production.

After the existing scaffold, follow the handbook's ordinary feature-to-`dev`,
reviewed release-to-`main` path unless the user specifies another baseline. A
successful release push to `main` can trigger production deployment after its
required checks. Build images once in CI, tag by commit and record immutable
digests and the tested package/engine manifest. A dedicated deployment runner on
the server pulls those artifacts; routine releases do not require manual SSH
edits, rebuilding on the server or installing moving package branches at runtime.
Only trusted deployment jobs may use that runner and production secrets.

Serialize deployments. Run migrations once as a deliberate release step, verify
readiness and then switch routing. Keep the previous release manifest and images;
test database recovery separately because reverting an image does not reverse a
schema migration. Preserve active job/runtime compatibility during a release by
draining workers or routing pinned jobs to matching workers.

Generate fresh application secrets. Keep runtime credentials and SAML/TLS private
keys outside Git and container images, mount them with restricted access, and
never print them in logs or CI summaries. Use build-secret mounts for private
package access, not persistent image layers. Restrict simulation execution
privileges to the worker that needs them rather than giving the web process the
host Docker socket. Apply explicit storage/image retention; do not indiscriminately
prune volumes or delete recovery images during deployment.

Before each production cutover, rehearse its migrations, readiness checks,
rollback/recovery and restoration of database plus files. Once authentication is
introduced, include a real SSO check and the two-user privacy checks. Front-page
delivery does not depend on finishing all later research milestones. Legacy
containers, volumes, images, checkout and obsolete runner/workflows can be removed
after the replacement release is accepted and their ownership is checked; do not
delete shared TLS/SAML assets or infrastructure still used by Studio.

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
| M0 — clean rebuild baseline | New frontend shell, backend guidance, package ownership, journeys, current design kit and checks | Only rebuild source/docs remain; frontend builds and design checks pass; inherited deployment workflows are removed; no remote runtime change; placeholders identify missing features |
| M1 — front page and release pipeline | Build the existing frontend scaffold and deploy it to an isolated environment through CI | Exact built artifact is served; smoke check and previous-release rollback work; legacy production is not rerouted by a staging deployment |
| M2 — minimal backend and database | Django service, initial user/identity model, PostgreSQL, sessions, migrations and health endpoint | Clean installation and restart work; database permissions and persistent storage are checked; no authentication or simulation capability is implied by health alone |
| M3 — login page and SAML | New login UI, validated SAML integration, automatic normal-account provisioning and logout | First login creates one account; repeated/concurrent login reuses it; invalid assertions fail; no affiliation grants admin; automated test-IdP checks and a separate real Chalmers check pass before SSO cutover |
| M4 — private workspaces and drafts | Owned projects, revisioned drafts, protected artifact access and recovery | Alice cannot list/read/edit/delete/download Bob's existing work by direct request; unauthenticated access fails; account switching clears private browser state; stale writes conflict; DB/files restore together; repeat this matrix as job/progress/cancellation/retry/export routes are introduced |
| M5 — small material catalogue | Versioned shared materials/constructions through Data and saved private project selections | Source/release and effective values survive reload; ordinary users cannot mutate the shared catalogue or another user's selections; incomplete factors remain explicit |
| M6 — one queued RC case | Tested installed-package handoff, explicit teaching inputs, frozen snapshot, durable job/outbox and one worker | A real annual RC case returns private results; package/settings/weather identities are retained; duplicate submission, broker interruption, worker restart and failure retain consistent job/attempt evidence |
| M7 — EnergyPlus execution | One prepared EnergyPlus case with pinned executable/schema and bounded isolated execution | Real EnergyPlus output is retained; unsupported inputs fail clearly; timeout, cancellation and restart recovery are checked separately from RC; the web process needs no engine-launch privileges |
| M8 — multiple users and workers | Fair central dispatch, global/per-user limits, safe retries, claims and storage quotas | Two users progress within configured limits; redelivery and overlapping/stale attempts cannot overwrite results; worker loss and broker/server restart reconcile; measured resource limits bound nested execution |
| M9 — one physical building | Core-backed editor, read-only DB selection alternative, provenance review, Viewer integration and engine/weather selection | Manual and fixed-record routes create equivalent inspectable physical inputs where appropriate; missing heights remain visible; no ingestion/DTCC calls; installed Viewer scene contract and engine readiness checks pass |
| M10 — bounded parametric study | Finite grid and optional independent-uniform space-filling design, case count and compute estimate | Exact row membership, parameter units and baseline comparisons retained; limits checked before submission; fair case dispatch, progress, explicit retry and unchanged-plan resume demonstrated |
| M11 — sensitivity study | Supported paired design, Jansen analysis, failure-aware presentation and diagnostics | A known small response checks design/analysis handoff; paired row order survives execution/resume; failed, infeasible or missing rows cannot silently produce indices; assumptions and sample budget shown |
| M12 — urban studies | Target/context selection, building-specific provenance, bounded multi-building execution and aggregate reporting | Every target has an identity and readiness outcome; absent buildings/failed cases remain visible; both per-building and aggregate area/energy bases can be reconciled |
| M13 — learning and evidence export | Comparison charts, sensitivity explanation, reproducibility bundle and portable protocol | An authorised reader can inspect question, inputs, design, attempts, metrics and omissions without a live evidence DB or browser session; exports exclude secrets and respect source permissions |

Package contract checks can proceed independently of M2–M5, but real execution must
not be exposed before M4 ownership/storage and the relevant M5–M7 input/runtime
checks pass. M6 starts with a deliberately selected, labelled teaching baseline;
the editor and building-evidence browser are later work, not prerequisites for
proving the first queue path. M6/M7 execution is a restricted pilot; open shared
multi-user simulation submission only after M8's limits, fairness and recovery
checks pass. Urban comparisons depend on trustworthy single-case
results; sensitivity analysis depends on the exact execution design, not merely
on a table of successful results. Apply the release gate above at each cutover,
not only after M13.

## Questions to resolve at the relevant gate

| Decision | Proposed starting point | Resolve by |
| --- | --- | --- |
| Backend layout and identity contract | Minimal Django service; choose the initial user model and confirm Chalmers stable scoped subject mapping before migrations/SSO | M2/M3 |
| Dispatch and recovery | Celery/Redis with PostgreSQL jobs, tested outbox publication, attempt claims, reconciliation and bounded workers; verify delivery settings rather than assuming exactly-once execution | M6/M8 |
| Catalogue release | Small sourced Data release, read-only shared catalogue and retained private selections; no legacy catalogue import | M5 |
| Building-evidence availability | Read-only account and an identified evidence release with usable, already computed component heights; national ingestion alone does not establish height coverage | M9 |
| Urban model meaning | Independent target evaluations with declared context by default; coupled thermal/district simulation requires its own supported method | M12 |
| Study limits | Explicit cases, runtime, artifact size and concurrent-user budgets based on measured resource use; fair scheduling before larger studies | M8/M10 |
| Cache and data retention | Validate quotas, expiry and source permissions; retained study evidence is not an evictable cache | M6/M13 |
| Viewer delivery | Separate TypeScript renderer plus optional Python display package; install a tested version rather than copying source | M9 |

Do not fill these gaps with invented methods, fabricated results or silent fallback
engines. A missing public package capability becomes a concrete owner task and
keeps its dependent gate open.

## Acceptance examples to keep small

Maintain an ordered set of examples alongside implementation: a deployed front
page and rollback; first/repeated SSO login; two users with private drafts and
files; a versioned material selection; one valid queued RC case; one real
EnergyPlus case; broker/worker restart and duplicate delivery; a manually authored
building; a portable record with a missing height; a small finite grid; a small
paired sensitivity design with a retained failed case; and a tiny urban selection
with one excluded target.
Each states its source, units, assumptions, installed dependencies, output location
and expected result. Start offline where the package permits it. Required SAML,
database, viewer and engine checks are separate checks with their real resources;
a skipped check does not satisfy its release gate.

The current baseline contains the frontend scaffold, local CI checks, service
guidance, rebuild plans and design assets. It does not execute these future
acceptance examples or establish a deployable replacement.
