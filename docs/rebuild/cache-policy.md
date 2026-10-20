# Proposed cache, persistence and recovery policy

**Status: production design policy, 20 October 2026.** The
[frontend prototype](frontend-prototype.md) implements account-scoped IndexedDB
recovery and illustrative baseline reuse. Server persistence, authenticated caches,
scientific cache identities and production recovery remain future work. Existing
library caches are described separately from the application policy below.
Proposed limits need measurement and a check at their implementation milestone.

A cache is a disposable copy that can be rebuilt. A saved draft, frozen study,
source evidence snapshot or retained result is durable evidence and must not be
deleted by cache eviction. Each layer has an owner, a defined identity, access
scope and invalidation rule. A cache hit never substitutes for authorisation.

## Sources of truth

| Data | Source of truth | Recovery/retention requirement |
| --- | --- | --- |
| Users, project access and application roles | Application database and authenticated server session | Recheck after reconnect/account change; browser role flags are never authority |
| Draft model/question/selections | Versioned server project record | Autosave acknowledged revisions; maintain recovery history; no cache TTL |
| Selected source facts and assumptions | Retained portable record, evidence/catalogue identities and effective values in the draft/run | Keep source and assumption distinct; later upstream changes do not alter a run |
| Submitted study/design/engine settings | Immutable server run manifest and prepared cases | Preserve intended membership, settings, inputs and plan identity |
| Input/weather/result files | Retained checksummed artifact store | Backup with metadata; explicit retention/deletion, not automatic cache eviction |
| Cases, attempts and cancellation/retry choices | Durable application and Workflows execution records | Reconcile after restart; keep previous attempts and failures |
| Browser form edits not yet acknowledged | Temporary recovery copy only | Show unsaved state; never claim server persistence; ask the user to reconcile conflicts |

## Browser cache matrix

Times and limits below are proposed initial defaults, not configured behaviour.
Private scope means authenticated principal plus permission/session generation,
project and relevant revision. A different account cannot reuse the previous
account's data even on the same computer.

| Copy and owner | Key and scope | Freshness and invalidation | Eviction and clear behaviour |
| --- | --- | --- | --- |
| Static JavaScript/CSS/fonts; release build | Content-hashed URL and build identity; public assets only | Immutable asset may have a long HTTP lifetime; changed bytes use a new URL; entry HTML revalidates | Browser-managed eviction; logout need not clear public assets; no user data embedded in assets |
| Current project/query state; Studio UI | Principal/permission generation + project + draft revision + query arguments | Revalidate on navigation, reconnect, access change and server mutation; proposed 30-second freshness for mutable lists | Memory only initially, bounded to open/recent views; clear on logout/account switch/access loss |
| Unsaved form state; Studio editor | Principal + project + base server revision + local edit sequence + draft format | Never treated as a fresh server record; changes wait for autosave acknowledgement | Keep in memory initially; clear only after save/discard/recovery decision; account change removes private local state |
| Optional offline recovery copy; Studio editor | Principal + project + base revision + draft format + timestamp | Opt-in later feature; visibly offline/unsynchronised; reconcile against server revision on reconnect | Proposed seven-day maximum and per-account quota; explicit clear control; purge on logout/account switch; disallow for source data whose permissions prohibit local persistence |
| Catalogue/evidence selection view; Studio UI | Authorised scope + evidence release/catalogue content identity + filters + page | Immutable version can be reused; refresh mutable discovery lists; release/access change invalidates selection views | Bound pages/bytes in memory; clear private entries at logout/account switch; persistent storage requires a separately approved data policy |
| Downloaded/parsed scene; Studio UI | Authorised project + physical and metadata revision + scene schema + Core/adapter identity | Model, evidence labels or schema changes invalidate corresponding scene data; viewport/camera changes do not change physical identity | Keep current scene and a small recent set within a measured memory budget; release renderer/GPU resources on replacement and logout |
| Job progress view; Studio UI | Principal + project + run/case IDs + server event/revision | Push events are hints; re-read durable status on reconnect, focus and completion; proposed five-second polling while active if needed | Small memory state only; clear at logout/account change; disconnect is labelled unknown/reconnecting |
| Result tables/charts; Studio UI | Authorised run/analysis ID + metric, units, aggregation, target membership and view filters | Immutable result revisions can be reused; attempt selection/new analysis invalidates; plotting changes invalidate the display only | Bound loaded pages/series; release on project close/logout; large hourly arrays loaded deliberately |
| Authentication/permissions; browser | Server-managed secure session cookie; no reusable local credentials | Server validates session/access; expiry, revocation and account change invalidate private state | No access tokens, session IDs or credentials in localStorage, IndexedDB, cache entries or exports; logout requests server invalidation and purges private client state |

The initial implementation should avoid a service worker for private application
data. If one is added later, exclude authenticated APIs and private downloads by
default and give it explicit account-scoped invalidation tests. Ordinary browser
HTTP caches for private responses must not create a shared-user data path.

## Server and artifact cache matrix

| Copy and owner | Key and scope | Freshness and invalidation | Eviction and clear behaviour |
| --- | --- | --- | --- |
| Read-only database query cache; Studio DB adapter | Access/permission scope + database identity + immutable evidence release + query/filter/page/CRS + adapter version | Proposed five-minute discovery TTL; selected records are pinned separately; source release, query semantics or access changes invalidate | Bounded entries/bytes with least-recently-used eviction; access checked before every hit; no shared principal cache for restricted records |
| Catalogue lookup cache; owning package plus Studio scope | Catalogue release/content identity + selection + effective configuration semantics | Immutable contents may live until capacity eviction; mutable release discovery revalidates; a changed assignment produces a different physical model | Shared only for public/licensed definitions; private catalogue scope included; clearing this cache never removes saved effective values |
| Prepared scene data; Studio scene adapter | Access scope + model geometry + metadata/provenance revision + `epsm.scene/1` + Core and adapter identities | Content identities, not filenames/timestamps, govern reuse; schema/producer/metadata changes invalidate | Bounded bytes and entry count; references in drafts/runs remain recoverable from their physical inputs; no public URL based only on a digest |
| Weather acquisition/inspection copy; weather owner with Studio storage policy | Provider/source identity + request semantics + content/receipt digests + calendar/time interpretation + producer version | Provider freshness belongs to explicit acquisition; frozen run weather never changes when provider data updates | Temporary acquisition files can expire; selected weather becomes retained input; restricted assets stay scoped and protected |
| Result query/aggregate cache; Studio result adapter | Authorised run + selected attempt/result revision + metric definition + cohort + units/area/time bases + aggregation implementation | New selected attempt, changed response definition or permission invalidates; do not combine incompatible denominators | Bound memory/disk use; private by default; deleting query cache leaves results/artifacts intact |
| Download/export staging; Studio export adapter | Authorised run/analysis revisions + export schema + selected content + export implementation | Rebuild when any retained input selection or export definition changes; proposed staging expiry of 24 hours | Per-user quota; delete temporary bundles after expiry; completed requested exports follow declared retention; every download authorises access |
| Content-addressed retained artifact store; Studio persistence | Digest plus artifact format/producer and authorised owner/reference records | Verify bytes at publication/read as appropriate; immutable files receive new identities when changed | This is evidence storage, not a TTL cache; only unreferenced staging files are automatically collectible; retention/deletion must handle all references and backups |
| Worker dependency/runtime installation | Release/image digest + installed wheel and engine identities | Never mutate a live worker environment to satisfy a cache hit; release change starts a new runtime identity | Managed by release retention; preserve previous manifest for recovery; no runtime pip install or sibling-checkout fallback |

Caching cannot make unavailable source evidence available. In particular, a
cached national query must not imply complete height coverage. Cache errors,
permission changes and missing releases need visible, actionable outcomes.

## EPSM computation reuse

EPSM main already exposes `EvaluationCache` with separate energy and LCA entries,
checksummed persisted artifacts and explicit failure on malformed/changed cache
records. Its [source](../../../epsm/src/epsm/cache.py) and
[evaluation identity](../../../epsm/src/epsm/provenance.py) define the current
behaviour. Studio does not implement a replacement scientific key function.

Core main also documents a bounded caller-owned
[`GeometryCache`](../../../epsm_core/docs/geometry-cache.md), detached working
geometry, and call-scoped schedule reuse. Its cache belongs to one sequential
caller and is not shared between workers. These library capabilities do not yet
provide application quotas, cross-user authorisation or a cache-clear UI.

| Reuse and owner | Scientific identity required | Scope, invalidation and eviction |
| --- | --- | --- |
| EPSM energy calculation | Actual physical inputs, resolved schedules/services, weather bytes/quality/calendar/time meaning, engine choice and complete settings, executable/schema or RC identity, relevant package/numerical implementation identities | Start with per-user/project namespaces; changed scientific inputs or implementation force a different key; bounded completed-entry retention; do not reuse an old engine result solely because the filename or user-visible values match |
| EPSM LCA calculation | Retained quantities/material/intervention history, factors and sources, assessment boundary/period, relevant energy identity/coverage and LCA implementation | Factor/assessment changes can reuse valid unchanged energy but create a new assessment; missing factors remain incomplete; quotas/eviction separate from retained report evidence |
| Core prepared geometry | Geometry, facade/opening/shading/panelisation policies and implementation identity defined by Core | Bounded worker-local lifetime; materials and operation rebound as required by Core; no shared mutable graph or assumption that a geometric hit proves thermal readiness |
| RC/prepared schedule/weather internals | Owning package's content/calendar/settings and implementation identities | Reuse only through supported owner operations; read-only/detached values where promised; worker restart after implementation change; no duplicate application-side memoisation of private helpers |
| Workflows successful case/resume | Frozen plan/case identity, exact input/assets and worker environment/handler/engine identities | Successful case remains evidence, not a disposable calculation cache; unchanged-plan resume can skip it only after owner checks; failed attempts are retained and retried explicitly |

Run identity and cache identity differ. Two authorised student studies may reuse
an equal completed calculation only within the agreed privacy scope, yet retain
separate submissions, attempts, copied/referenced permitted artifacts and citations.
Do not deduplicate failed attempts out of the study or turn a cache hit into a new
scientific validation claim.

Initial shared computation caches should remain disabled across users. A later
shared cache would need a reviewed data classification, key completeness, artifact
access checks and protection against using hit/miss timing to expose another
person's work. A hash is an identifier, not an access token. Logs, UI styling,
camera position and project title do not change physical calculations, but access
scope is still checked before returning any cached value.

## Save, recover and resolve conflicting drafts

Server autosave is proposed application persistence. The editor should submit
bounded changes after a short idle interval and on meaningful stage transitions,
then display the last acknowledged server revision and time. “Saved” means the
server accepted that revision. While saving or offline, say so; a local copy must
not receive a server-saved label. Submitted runs always use an acknowledged,
validated revision.

Each write names the revision it edited. The server accepts it only if that base
still matches the current draft, then returns a new revision. A stale edit gets a
conflict response and preserves both versions. Never silently overwrite another
tab's edits or combine physical fields in a way that creates a new unreviewed
model. Offer compare, recover as a separate draft, or explicit replacement after
review. Exact request/response types are future Studio adapter work.

After refresh, load the authorised server draft first. If a newer local recovery
copy exists for the same principal/project/base revision, show what differs and
offer to recover it. If the server changed meanwhile, require reconciliation. An
offline session can edit a permitted local recovery copy later; it cannot submit
jobs, query the database or claim successful saves while disconnected. Editing a
draft does not modify a frozen submitted run.

Logout/account switch should first attempt to save authorised pending edits when
online and surface unsaved changes before discarding them. A different account
must never see those edits. When the session becomes invalid, clear the private
view immediately, stop further network/cache work under that identity, cancel
pending responses, close progress subscriptions and release Viewer resources.
Any recovery offer requires re-authentication as the owning principal and valid
project access; do not expose a previous account's project names in the offer.

## Eviction, cache controls and failures

The later application should distinguish “clear display cache”, “clear reusable
calculations” and “delete project/evidence”. A cache-clear operation never deletes
saved drafts, input assets, submitted plans, attempts or results. Active workers
must be protected from eviction of files they are using. Cache capacity limits
must be explicit, observed in metrics and checked on the real storage volume.

Publish complete entries atomically, check their identity and content before use,
and coordinate concurrent writers. Follow the owning package's failure semantics:
EPSM currently raises for corrupt persisted entries. Studio must report/quarantine
that problem and require a deliberate supported repair/recalculation path; it must
not quietly convert corruption into success. Preserve the original failure cause.
Transient errors may use a very short retry/backoff state, but failures must not
become reusable successful calculations or disappear from the attempt history.

## Required checks before enabling any layer

| Check | Observable result |
| --- | --- |
| Same inputs, different filenames/paths | Content/semantic identity behaves according to the owner's contract |
| Same filename, changed model/weather bytes | No stale scientific result is returned |
| Changed catalogue/evidence/engine/settings/calendar/implementation | Relevant prepared or calculated values invalidate; an unchanged valid energy result can survive a factor-only LCA change |
| Two users or revoked permissions | Neither private entries, artifacts, names nor pending responses cross the access boundary |
| Logout/account switch across tabs | Private memory, recovery storage, subscriptions and renderer resources clear consistently; late responses cannot repopulate them |
| Offline edit, refresh and reconnect | Unsaved copy remains labelled local; authorised recovery preserves edits without silently overwriting a server revision |
| Concurrent tab edits | Conflict is explicit and both edits are recoverable |
| Full disk, eviction, corrupt entry or interrupted publication | Existing evidence survives; no partial entry appears valid; failure is visible |
| Worker restart/resume and explicit retry | Exact plan and runtime identities are checked; failures and paired sensitivity rows retain their positions |
| Clear cache | Performance copies disappear; authoritative project/run evidence remains intact and can rebuild permitted views |

Implement and check each layer only when its owning milestone needs it. Do not
add a generic cache framework, offline database or computed-result store to the
minimal scaffold merely because this policy describes future requirements.
