# Student journeys

**Status: production journey requirements, 20 October 2026.** The
[frontend prototype](frontend-prototype.md) now implements a reviewable subset
with browser storage and illustrative evaluations. Scientific calculations,
server ownership and the broader experiment methods below remain later gates.
Refer to the [milestones](plan.md) and [architecture](architecture.md) for package
support and production requirements.

Studio should help a student understand what they selected, what they assumed,
what was computed and what can be concluded. It should expose uncertainty and
failure in ordinary language. Technical identifiers remain available in evidence
views and exports without becoming the main navigation.

## Shared study stages

| Stage | Student action | What Studio must retain or explain |
| --- | --- | --- |
| Project and question | Name a project and state a comparison or sensitivity question | Question, author, study purpose, draft revision and intended metric; examples are clearly labelled teaching assumptions |
| Building or area | Author one building or select database targets and context | Exact target IDs or authored geometry; CRS, units, orientation and height/storey sources; urban selection membership |
| Review and provenance | Review evidence, gaps and conflicts; supply assumptions deliberately | Source observations, derived values and assumptions remain distinct; changes do not rewrite database facts |
| Baseline, engine and weather | Complete the physical baseline, select EnergyPlus or RC, inspect defaults and choose weather | Physical revision, selected catalogue values, complete engine settings, weather bytes/identity/calendar and output boundary |
| Design and budget | Choose parameters, ranges/distributions and method | Parameter meanings/units, design identity, random seed where relevant, exact case count, constraints, compute estimate and budget |
| Readiness | Review blockers, approximations and coverage | Package-owned readiness/capability results; per-building issues; unresolved required inputs prevent submission |
| Submit | Confirm the particular revision and compute budget | Immutable run snapshot and submission receipt; subsequent draft edits start a different revision |
| Monitor, cancel and resume | Follow cases, inspect failures, cancel future work or explicitly retry | Durable case/attempt IDs and status; partial outputs; cancellation acknowledgement; compatibility checks for resume |
| Compare and explain | Compare valid metrics and inspect sensitivity where supported | Baseline differences, units, area/time bases, all-case coverage, missing results and method limits |
| Export learning evidence | Save the question, method, choices and results for a report | Portable manifest, provenance, design rows, attempts, outputs, plots and limitations; no credentials or session data |

Each stage can be revisited in a draft. A submitted run keeps the values that were
reviewed. The interface must say when the current draft differs from a displayed
run. Saving a draft and submitting a run are separate actions.

## Journey A: learn with one building

Example question: “How do window fraction and insulation choices affect annual
space-heating demand for this building under the same weather?” This is an
illustrative teaching question, not a prescribed experiment.

The student chooses either a manual Core-backed editor or a database record.
The manual route starts with a footprint and explicit floor/height information,
then supports the physical properties that Core can represent. Empty required
inputs stay empty. A named demonstration preset may be selected deliberately and
must remain labelled assumed; it is not evidence about the student's building.

The database route presents an existing building and its components through a
read-only account. It displays already computed height observations, their release
and quality status. Studio neither invokes DTCC nor calculates replacement heights.
A missing value can block the study or be completed by an explicit student
assumption. The source observation remains retained alongside that assumption.

Before studying alternatives, the student reviews the baseline in 3D and in a
text/table view with area, volume, floors, physical assignments and unresolved
inputs. The 3D view is an inspection aid, not proof of thermal completeness.

The student selects an engine and reviews its defaults. Studio explains the
selected RC reduction policies or EnergyPlus settings in the terms they affect.
Changing engines runs a fresh capability check: it must not silently remove an
unsupported system, shading feature, foundation choice or output. An explicit,
supported approximation is a recorded choice. Weather is selected with its source,
period/calendar, time convention and quality information visible.

Start with one baseline run, then a small finite grid whose values the student can
inspect. Show how each parameter changes the physical model. An energy coefficient
change alone does not establish a changed material inventory for LCA. Retain every
sample and compare only metrics with compatible units, coverage and area/time
bases. A failed case appears in the results table with its reason.

Acceptance: the student can explain their question, which inputs were assumed,
which values varied, how many cases ran, why a case failed and which statements the
successful outputs support.

## Journey B: compare an urban selection

Example question: “Which buildings in this selected area are most sensitive to the
chosen envelope assumptions?” The student selects targets and surrounding context
separately. Context-only objects do not become simulated targets by accident.

The selection records stable building/component IDs, the evidence release, spatial
filter and final membership. A map viewport is not the final cohort definition.
Height and geometry provenance are reviewed per component. Already computed
database heights may be consumed; unresolved records must remain visible.

The student sees readiness counts before submission: ready, needs an assumption,
unsupported and excluded. Exclusions have reasons. Catalogue assumptions can be
assigned to a declared group, but the effective values and exceptions are retained
for every building. A shared EPC quantity is not silently allocated to individual
buildings. Context geometry, coordinate frames and any engine limits are inspected
through their owning package checks.

The first supported urban route should evaluate individual target buildings under
declared weather and context assumptions. It must not describe this as a coupled
district model unless a supported coupled method is actually used. A parameter may
vary globally across targets or independently per building; that statistical unit
must be selected and recorded before the design is generated.

Compute planning includes target count, design rows, expected repetitions and
baseline cases. Estimates show their measurement basis and uncertainty. If a pilot
run is needed to estimate runtime, request it as an explicit small run; merely
opening a page must not start a simulation. Large selections need deliberate
budget confirmation and concurrency limits.

For `B` independent target buildings and one common `n`-row, `d`-parameter paired
design, plan `B × n × (d + 2)` building evaluations, plus any separately requested
baselines or repetitions. State where physically identical cases may reuse a
calculation without deleting their design rows. Context-only geometry is not an
extra simulated target; additional engine choices multiply the declared work.

Compare both individual outcomes and declared aggregates. Show target coverage and
failed/excluded building counts beside every aggregate. Explain whether a value is
total kWh, mean per building, area-weighted kWh/m² or another quantity. Preserve the
same denominator in baseline and alternatives; do not hide failed cases by changing
the cohort. Where an aggregate cannot be computed faithfully, show it as incomplete.

Acceptance: the student can recover the exact target set, locate each target's
assumptions and failures, reconcile the aggregate with the individual outputs and
explain why an apparently complete map can still contain incomplete models.

## Parametric comparison and sensitivity are different designs

A finite grid evaluates the Cartesian product of declared values. For parameters
with value counts `k1 ... kd`, there are `k1 × ... × kd` rows before any explicitly
separate baseline/repetition cases. A one-at-a-time comparison answers a narrower
question and is labelled accordingly. Latin hypercube samples are an optional
independent-uniform design for exploration; a scatter plot alone is not a global
sensitivity analysis.

The current Workflows public sensitivity route constructs independent uniform
Monte Carlo matrices A and B with a mixed matrix for each parameter, then applies
Jansen variance estimators. With `d` parameters and `n` base rows, it needs
`n × (d + 2)` evaluations per response set. This is a Sobol-style paired design;
it is **not** a Sobol low-discrepancy sequence generator. See the
[owning package's method description](../../../epsm_workflows/docs/reusable-workflows.md#parametric-designs-and-sensitivity).

The future UI must retain A/B/mixed membership, row order, parameter order, seed,
distributions and response definition through preparation, execution, retry and
analysis. Explain the total cost before submission. Increasing the base sample
size, changing a distribution or choosing another metric is an explicit new plan
or analysis decision with its own identity.

| Situation | Required behaviour |
| --- | --- |
| Valid independent continuous uniform inputs | Offer the supported paired method and disclose its assumptions |
| Correlated inputs, categorical choices or unsupported distributions | Disable this sensitivity method and explain the missing support; permit a clearly labelled comparison design if valid |
| Physical constraint makes a sampled row infeasible | Retain the row and reason; do not reject/resample silently or compute indices from the surviving rows |
| Failed, cancelled, missing or nonfinite response | Preserve its position and attempt history; analysis remains incomplete until the required responses are valid or another explicitly supported method is chosen |
| Constant response | Explain that variance indices are undefined; do not display zero as a successful estimate |
| Negative or greater-than-one finite-sample estimate | Display with the estimator's limits and sampling context; do not clip it into a plausible range |
| Urban aggregate response with failed targets | Preserve the planned target membership; the aggregate and its sensitivity remain incomplete rather than changing denominators |

Constraints must be considered during design selection. The current independent
uniform estimator does not justify arbitrary constrained or dependent sampling.
Students should narrow a valid independent input domain or choose a different,
implemented method; the application must not invent a statistical repair.
Convergence checks and uncertainty estimates are separate supported analysis work,
not claims inferred from one index chart. They must be implemented in the owner
before being offered in Studio.

## Monitor and recover a study

The future job view should distinguish queued, running, completed, failed,
cancellation requested, cancelled and interrupted cases. The precise persisted
state model is an application design task; the current scaffold defines no API.
Display counts reconciled to the frozen design and retained attempts rather than
estimating scientific completion from a websocket connection.

Cancellation stops further scheduling and requests termination of active work;
show when it is only requested. Keep completed outputs and interruption evidence.
Do not label a partial study complete. Reconnection reads the durable server state.
Resuming uses the same frozen plan and verifies package, engine, weather and input
identities. Previously failed cases require an explicit retry choice. Changed
inputs create a new run rather than modifying the earlier experiment.

Draft recovery is separate from run recovery. The [cache policy](cache-policy.md)
describes server autosave, offline recovery, conflicting edits and account changes.

## Compare and export without overstating results

Show source, derived and assumed inputs with labels as well as colour. Use the
handbook's plot conventions, matching axes/limits for comparisons and explicit
missing/failure markers. A chart legend states the metric, units, calendar/period,
area basis and aggregation. Keep thermal demand, delivered carrier energy and
environmental assessment boundaries distinct.

An export should contain the research question, baseline revision, source and
catalogue evidence, explicit settings, weather identity, parameter design, intended
and executed case membership, attempts/failures, metric definitions, results and
limitations. Include package/engine identities and checksums for retained artifacts.
Permit the student to write a short interpretation explaining the method and what
they learned. Exports respect data permissions and exclude connection strings,
credentials, private keys and browser session data.

Acceptance checks should include a refresh, a failed case, an interrupted worker,
an unsupported engine choice, an account switch and a broken paired sensitivity
row. A polished happy-path screenshot does not establish those behaviours.
