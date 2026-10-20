// SPDX-License-Identifier: MIT
import { openDB } from 'idb';
import type { Account, Attempt, BaselineRun, Building, CaseResult, DraftPatch, Engine, PackageSnapshot, Project, RenovationPackage, RunContextSnapshot, RunStatus, Scenario, Settings, StudioClient, Study, StudyInput } from '../domain/types';
import { compatibleBaseline, getReadiness, reusableCase, studyScenarios } from '../domain/logic';
import { accounts, catalogue, defaultSettings, packages, sample, seedProjects, weather } from './fixtures';

export class StudioError extends Error {
  constructor(public code: 'AUTH_REQUIRED' | 'NOT_FOUND' | 'REVISION_CONFLICT' | 'INVALID_INPUT' | 'BUSY', message: string) { super(message); this.name = 'StudioError'; }
}
interface Workspace { version: 1; sessionId: string | null; projects: Project[]; settings: Record<string, Settings>; customPackages: Record<string, RenovationPackage[]>; jobPackages: Record<string, RenovationPackage[]>; drafts: Record<string, Record<string, unknown>>; }
interface ClientOptions { databaseName?: string; now?: () => number; }
const copy = <T,>(value: T): T => structuredClone(value);
const pending = (status: string) => status === 'queued' || status === 'running';
const DURATION = 8000;
function invalid(message: string): never { throw new StudioError('INVALID_INPUT', message); }
const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
function ensurePeriod(value: number) { if (!Number.isInteger(value) || value < 1 || value > 100) invalid('Choose an assessment period between 1 and 100 years.'); }
function validateWeather(id: string) { if (!weather.some(item => item.id === id)) invalid('Choose an available weather scenario.'); }
function scenariosFor(study: Study, availablePackages: RenovationPackage[] = packages): Scenario[] { return studyScenarios(study).map(scenario => ({ ...scenario, name: `${availablePackages.find(p => p.id === scenario.packageId)?.name ?? scenario.packageId} · ${weather.find(w => w.id === scenario.weatherId)?.name ?? scenario.weatherId}` })); }
function calculateResult(building: Building, scenario: Scenario, engine: Engine, period: number, failed = false, availablePackages: RenovationPackage[] = packages): CaseResult {
  const selectedPackage = availablePackages.find(item => item.id === scenario.packageId)!;
  const measures = (selectedPackage as Partial<PackageSnapshot>).measures ?? selectedPackage.measureIds.map(id => catalogue.find(item => item.id === id)!);
  const climate = weather.find(item => item.id === scenario.weatherId)!;
  const area = Number(building.fields.area.value);
  const seed = [...building.id].reduce((value, char) => value + char.charCodeAt(0), 0);
  const annualEnergy = Math.round(area * (100 + seed % 48) * climate.multiplier * measures.reduce((value, item) => value * (item.multiplier ?? 1), 1) * (engine === 'energyplus' ? 1.027 : 1));
  const embodiedCarbon = measures.some(item => item.incompleteCarbon) ? null : Math.round(area * measures.reduce((value, item) => value + (item.embodiedPerM2 ?? 0), 0));
  const weights = [.15, .13, .12, .09, .06, .035, .025, .035, .06, .09, .1, .105];
  return { id: `${building.id}__${scenario.id}`, buildingId: building.id, buildingName: building.name, scenarioId: scenario.id, scenarioName: scenario.name, packageId: scenario.packageId, weatherId: scenario.weatherId, engine, status: failed ? 'failed' : 'completed', area, annualEnergy: failed ? null : annualEnergy, embodiedCarbon: failed ? null : embodiedCarbon, operationalCarbon: failed ? null : Math.round(annualEnergy * .04 * period), monthly: failed ? [] : weights.map(value => Math.round(value * annualEnergy)), hourly: failed ? [] : Array.from({ length: 168 }, (_, hour) => ({ hour, energy: Math.round(annualEnergy / 8760 * (1 + .3 * Math.sin(hour / 24 * Math.PI * 2)) * 100) / 100 })), ...(failed ? { error: 'Demonstration failure: simulated engine interruption. Retry retains completed cases.' } : {}) };
}
function cancelledResult(building: Building, scenario: Scenario, engine: Engine, period: number): CaseResult {
  return { ...calculateResult(building, { ...scenario, packageId: 'baseline' }, engine, period, true), packageId: scenario.packageId, status: 'cancelled', error: 'Cancelled by you before this case completed.' };
}
function snapshotContext(project: Project, contextOmission: boolean): RunContextSnapshot {
  return copy({ location: project.location, route: project.route, siteType: project.siteType, contextPreset: project.contextPreset, targetBoundary: project.targetBoundary, contextBoundary: project.contextBoundary, contextBuildings: project.contextBuildings, contextOmission });
}
function snapshotPackages(ids: string[], availablePackages: RenovationPackage[]): PackageSnapshot[] {
  return [...new Set(ids)].map(id => {
    const definition = availablePackages.find(item => item.id === id)!;
    return copy({ ...definition, measures: definition.measureIds.map(measureId => catalogue.find(item => item.id === measureId)!) });
  });
}
function baselineScenario(run: BaselineRun): Scenario { return { id: `baseline__${run.weatherId}`, packageId: 'baseline', weatherId: run.weatherId, name: 'Unchanged baseline' }; }
function setAttempt(attempts: Attempt[], status: RunStatus, message: string) { const attempt = attempts[attempts.length - 1]; if (attempt) { attempt.status = status; attempt.message = message; } }
function advanceProject(project: Project, now: number, jobPackages: Workspace['jobPackages']) {
  for (const run of project.baselines) {
    if (!pending(run.status)) continue;
    const elapsed = now - new Date(run.startedAt).getTime();
    run.progress = Math.max(0, Math.min(100, Math.round(elapsed / run.durationMs * 100)));
    if (elapsed >= run.durationMs) {
      run.results = run.snapshot.map((building, index) => calculateResult(building, baselineScenario(run), run.engine, run.assessmentPeriod, run.demoFailure && index === run.snapshot.length - 1));
      run.status = run.demoFailure ? 'failed' : 'completed';
      setAttempt(run.attempts, run.status, run.demoFailure ? 'A demonstration case failed.' : 'Demo baseline complete.');
    } else { run.status = elapsed >= 1200 ? 'running' : 'queued'; setAttempt(run.attempts, run.status, run.status === 'queued' ? 'Waiting for a demo worker.' : 'Calculating illustrative results.'); }
  }
  for (const study of project.studies) {
    if (!pending(study.status) || !study.startedAt) continue;
    const elapsed = now - new Date(study.startedAt).getTime();
    study.progress = Math.max(0, Math.min(100, Math.round(elapsed / study.durationMs * 100)));
    if (elapsed >= study.durationMs) {
      const baseline = project.baselines.find(run => run.id === study.baselineId)!;
      const snapshot = study.snapshot ?? [];
      const expected = snapshot.flatMap(building => study.scenarios.map(scenario => ({ building, scenario })));
      study.results = expected.map(({ building, scenario }, index) => {
        const retained = study.results.find(result => result.buildingId === building.id && result.scenarioId === scenario.id && result.status === 'completed');
        return retained ?? calculateResult(building, scenario, baseline.engine, study.assessmentPeriod, study.demoFailure && index === expected.length - 1, study.packageSnapshot ?? jobPackages[study.id] ?? packages);
      });
      study.status = study.results.some(result => result.status === 'failed') ? 'failed' : 'completed';
      setAttempt(study.attempts, study.status, study.status === 'failed' ? 'Demo interruption: retry the failed cases.' : 'Demo study complete.');
    } else { study.status = elapsed >= 1200 ? 'running' : 'queued'; setAttempt(study.attempts, study.status, study.status === 'queued' ? 'Waiting for a demo worker.' : 'Running frozen scenario cases.'); }
  }
}
function initialWorkspace(now: number): Workspace {
  const projects = accounts.flatMap(account => seedProjects(account.id, now));
  for (const project of projects) {
    const startedAt = new Date(now - 86400000 * 2).toISOString();
    const run: BaselineRun = { id: `${project.id}-baseline`, name: 'Initial RC baseline', revision: project.revision, engine: 'rc', weatherId: 'tmy-gothenburg', assessmentPeriod: 50, contextOmission: true, status: 'completed', startedAt, durationMs: DURATION, progress: 100, snapshot: copy(project.buildings), contextSnapshot: snapshotContext(project, true), results: [], attempts: [{ id: `${project.id}-attempt`, number: 1, startedAt, status: 'completed', message: 'Seeded demo baseline. Context shading omitted.' }], demoFailure: false };
    run.results = run.snapshot.map(building => calculateResult(building, baselineScenario(run), run.engine, run.assessmentPeriod)); project.baselines.push(run);
    const study: Study = { id: `${project.id}-study`, name: 'Envelope and windows comparison', template: 'renovation', baselineId: run.id, assessmentPeriod: 50, packageIds: ['baseline', 'envelope', 'windows', 'deep'], weatherIds: ['tmy-gothenburg'], status: 'completed', scenarios: [], results: [], attempts: [{ id: `${project.id}-study-attempt`, number: 1, startedAt, status: 'completed', message: 'Seeded illustrative portfolio study.' }], startedAt, durationMs: DURATION, progress: 100, revision: project.revision, snapshot: copy(project.buildings), contextSnapshot: snapshotContext(project, true), packageSnapshot: snapshotPackages(['baseline', 'envelope', 'windows', 'deep'], packages), demoFailure: false, updatedAt: startedAt };
    study.scenarios = scenariosFor(study); study.results = study.snapshot!.flatMap(building => study.scenarios.map(scenario => calculateResult(building, scenario, run.engine, study.assessmentPeriod))); project.studies.push(study);
    project.studies.push({ ...copy(study), id: `${project.id}-draft`, name: 'Weather resilience · draft', template: 'robust', packageIds: ['baseline', 'envelope', 'deep'], weatherIds: ['tmy-gothenburg', 'amy-2023', 'future-2050'], status: 'draft', scenarios: [], results: [], attempts: [], startedAt: undefined, progress: 0, snapshot: undefined, contextSnapshot: undefined, packageSnapshot: undefined, updatedAt: new Date(now - 3600000).toISOString() });
  }
  return { version: 1, sessionId: null, projects, customPackages: {}, jobPackages: {}, drafts: {}, settings: Object.fromEntries(accounts.map(account => [account.id, copy(defaultSettings)])) };
}

/** Local async adapter. Replace this boundary with authenticated API requests later. */
export function createStudioClient(options: ClientOptions = {}): StudioClient {
  const now = options.now ?? Date.now;
  const database = () => openDB(options.databaseName ?? 'epsm-studio-demo-v1', 1, { upgrade(db) { if (!db.objectStoreNames.contains('workspace')) db.createObjectStore('workspace'); } });
  let queue: Promise<unknown> = Promise.resolve();
  function transact<T>(fn: (state: Workspace) => T): Promise<T> {
    const operation = queue.then(async () => {
      const db = await database();
      try {
        const tx = db.transaction('workspace', 'readwrite');
        const stored = await tx.store.get('state') as Workspace | undefined;
        const state = stored ?? initialWorkspace(now());
        if (state.version !== 1) throw new Error('This demo workspace uses an unsupported version. Clear site data to reset it.');
        state.customPackages ??= {}; state.jobPackages ??= {}; state.drafts ??= {};
        state.projects.forEach(project => advanceProject(project, now(), state.jobPackages));
        const result = fn(state);
        await tx.store.put(state, 'state');
        await tx.done;
        return copy(result);
      } finally { db.close(); }
    });
    queue = operation.catch(() => undefined);
    return operation;
  }
  function owner(state: Workspace): Account { const account = accounts.find(item => item.id === state.sessionId); if (!account) throw new StudioError('AUTH_REQUIRED', 'Sign in to open your workspace.'); return account; }
  function projectFor(state: Workspace, id: string): Project { const account = owner(state); const project = state.projects.find(item => item.id === id && item.ownerId === account.id); if (!project) throw new StudioError('NOT_FOUND', 'Project not found in your workspace.'); return project; }
  function studyFor(project: Project, id: string) { const study = project.studies.find(item => item.id === id); if (!study) throw new StudioError('NOT_FOUND', 'Study not found in this project.'); return study; }
  function touch(project: Project) { project.updatedAt = new Date(now()).toISOString(); }
  function submit(state: Workspace, project: Project, study: Study, retry = false): Study {
    const availablePackages = [...packages, ...(state.customPackages[project.ownerId] ?? [])];
    if (pending(study.status)) throw new StudioError('BUSY', 'This study is already queued or running.');
    if (retry && study.status !== 'failed' && study.status !== 'cancelled') invalid('Only failed or cancelled studies can be retried.');
    if (!retry && study.status !== 'draft') invalid('Duplicate this study to run a new configuration.');
    const baseline = retry ? project.baselines.find(run => run.id === study.baselineId && run.status === 'completed' && run.revision === study.revision) : compatibleBaseline(project, study); if (!baseline) invalid(retry ? 'The original completed baseline is unavailable for this retry.' : 'Run a completed baseline for the current project revision first.');
    ensurePeriod(study.assessmentPeriod);
    if (!study.packageIds.length || !study.weatherIds.length) invalid('Choose at least one renovation package and weather scenario.');
    if (!retry) { study.packageIds.forEach(id => { if (!availablePackages.some(item => item.id === id)) invalid('Choose an available renovation package.'); }); study.weatherIds.forEach(validateWeather); }
    if (retry && !study.snapshot) invalid('This older study has no frozen building inputs. Duplicate it to create a new evaluation.');
    const frozenContext = study.contextSnapshot ?? baseline.contextSnapshot;
    if (retry && !frozenContext) invalid('The original site context is unavailable. Duplicate this older study to create a new evaluation.');
    const readinessProject: Project = retry ? { ...project, ...frozenContext!, buildings: study.snapshot! } : project;
    const issues = getReadiness(readinessProject, baseline.engine, frozenContext?.contextOmission ?? baseline.contextOmission); if (issues.length) invalid(issues.join(' '));
    if (!retry) { study.scenarios = scenariosFor(study, availablePackages); state.jobPackages[study.id] = copy(availablePackages); study.snapshot = copy(project.buildings.filter(building => building.included)); study.contextSnapshot = snapshotContext(project, baseline.contextOmission); study.packageSnapshot = snapshotPackages(study.packageIds, availablePackages); study.revision = project.revision; study.baselineId = baseline.id; study.results = study.snapshot.flatMap(building => study.scenarios.flatMap(scenario => { const result = reusableCase(project, study, building, scenario); return result ? [{ ...copy(result), id: `${building.id}__${scenario.id}`, scenarioId: scenario.id, scenarioName: scenario.name }] : []; })); }
    if (retry) { study.demoFailure = false; study.results = study.results.filter(result => result.status === 'completed'); }
    study.status = 'queued'; study.progress = 0; study.startedAt = new Date(now()).toISOString(); study.updatedAt = study.startedAt; study.durationMs = DURATION;
    study.attempts.push({ id: uid('attempt'), number: study.attempts.length + 1, startedAt: study.startedAt, status: 'queued', message: retry ? 'Retrying unfinished cases with the frozen inputs.' : 'Accepted by the demo queue.' }); touch(project); return study;
  }
  return {
    getSession: () => transact(state => accounts.find(account => account.id === state.sessionId) ?? null),
    drafts: createStudioDrafts(options),
    getAccounts: () => transact(() => accounts),
    signInDemo: (accountId = accounts[0].id) => transact(state => { const account = accounts.find(item => item.id === accountId); if (!account) invalid('Choose an available demo account.'); state.sessionId = account.id; return account; }),
    signOut: () => transact(state => { state.sessionId = null; }),
    getSettings: () => transact(state => state.settings[owner(state).id]),
    updateSettings: patch => transact(state => { const account = owner(state); const next = { ...state.settings[account.id], ...copy(patch) }; ensurePeriod(next.assessmentPeriod); if (!['comfortable', 'compact'].includes(next.density) || !['rc', 'energyplus'].includes(next.defaultEngine) || !['tmy', 'amy'].includes(next.defaultWeather)) invalid('Choose supported account settings.'); state.settings[account.id] = next; return next; }),
    resetWorkspace: () => transact(state => { const account = owner(state); const fresh = initialWorkspace(now()); state.projects = [...state.projects.filter(project => project.ownerId !== account.id), ...fresh.projects.filter(project => project.ownerId === account.id)]; state.settings[account.id] = copy(defaultSettings); state.customPackages[account.id] = []; state.drafts[account.id] = {}; }),
    listProjects: () => transact(state => state.projects.filter(project => project.ownerId === owner(state).id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))),
    getProject: id => transact(state => projectFor(state, id)),
    createProject: input => transact(state => { const account = owner(state); if (!input.name.trim()) invalid('Give your project a name.'); const stamp = new Date(now()).toISOString(); const project: Project = { id: uid('project'), ownerId: account.id, name: input.name.trim(), description: input.description ?? '', route: input.route, siteType: input.siteType, createdAt: stamp, updatedAt: stamp, revision: 1, location: copy(input.location ?? sample.location), contextPreset: input.contextPreset ?? 'none', targetBoundary: copy(input.targetBoundary ?? null), contextBoundary: copy(input.contextBoundary ?? null), buildings: copy(input.buildings ?? []), contextBuildings: copy(input.contextBuildings ?? []), baselines: [], studies: [] }; state.projects.push(project); return project; }),
    updateProject: (id: string, patch: DraftPatch, expectedRevision: number) => transact(state => { const project = projectFor(state, id); if (project.revision !== expectedRevision) throw new StudioError('REVISION_CONFLICT', 'This draft changed in another view. Reload it before saving.'); if (patch.name !== undefined && !patch.name.trim()) invalid('Give your project a name.'); const allowed: DraftPatch = {}; for (const key of ['name', 'description', 'location', 'contextPreset', 'targetBoundary', 'contextBoundary', 'buildings', 'contextBuildings'] as const) if (key in patch) Object.assign(allowed, { [key]: copy(patch[key]) }); Object.assign(project, allowed); project.revision++; touch(project); return project; }),
    deleteProject: id => transact(state => { const project = projectFor(state, id); if (project.baselines.some(run => pending(run.status)) || project.studies.some(study => pending(study.status))) throw new StudioError('BUSY', 'Cancel active jobs before deleting this project.'); state.projects = state.projects.filter(item => item.id !== id); }),
    getCatalogue: () => transact(() => catalogue), getWeather: () => transact(() => weather), getPackages: () => transact(state => [...packages, ...(state.customPackages[owner(state).id] ?? [])]),
    savePackage: (input, id) => transact(state => { const account = owner(state); if (!input.name.trim()) invalid('Give this package a name.'); const ids = [...new Set(input.measureIds)]; if (!ids.length) invalid('Choose at least one renovation measure.'); const measures = ids.map(measureId => { const measure = catalogue.find(item => item.id === measureId && item.kind === 'renovation'); if (!measure) invalid('Choose available renovation measures.'); return measure; }); if (measures.some(measure => measure.incompatibleWith?.some(other => ids.includes(other)))) invalid('This package contains incompatible renovation measures.'); const own = state.customPackages[account.id] ??= []; const existing = id ? own.find(item => item.id === id) : undefined; if (id && !existing) throw new StudioError('NOT_FOUND', 'Editable package not found in your workspace.'); const result: RenovationPackage = { id: id ?? uid('package'), name: input.name.trim(), measureIds: ids, description: input.description.trim() }; if (existing) Object.assign(existing, result); else own.push(result); return result; }), getSampleBuildings: () => transact(() => sample),
    runBaseline: (projectId, input) => transact(state => { const project = projectFor(state, projectId); if (project.baselines.some(run => pending(run.status))) throw new StudioError('BUSY', 'A baseline is already queued or running for this project.'); if (!['rc', 'energyplus'].includes(input.engine)) invalid('Choose a supported simulation engine.'); ensurePeriod(input.assessmentPeriod); validateWeather(input.weatherId); const issues = getReadiness(project, input.engine, input.contextOmission); if (issues.length) invalid(issues.join(' ')); const startedAt = new Date(now()).toISOString(); const run: BaselineRun = { id: uid('baseline'), name: `Baseline ${project.baselines.length + 1}`, revision: project.revision, engine: input.engine, weatherId: input.weatherId, assessmentPeriod: input.assessmentPeriod, contextOmission: input.contextOmission, status: 'queued', startedAt, durationMs: DURATION, progress: 0, snapshot: copy(project.buildings.filter(building => building.included)), contextSnapshot: snapshotContext(project, input.contextOmission), results: [], attempts: [{ id: uid('attempt'), number: 1, startedAt, status: 'queued', message: 'Accepted by the demo queue.' }], demoFailure: input.demoFailure ?? false }; project.baselines.push(run); touch(project); return run; }),
    cancelBaseline: (projectId, runId) => transact(state => { const project = projectFor(state, projectId); const run = project.baselines.find(item => item.id === runId); if (!run) throw new StudioError('NOT_FOUND', 'Baseline not found.'); if (!pending(run.status)) invalid('This baseline is no longer active.'); run.status = 'cancelled'; run.results = run.snapshot.map(building => cancelledResult(building, baselineScenario(run), run.engine, run.assessmentPeriod)); setAttempt(run.attempts, 'cancelled', 'Cancelled by you. Frozen inputs are retained.'); touch(project); }),
    createStudy: (projectId, input: StudyInput) => transact(state => { const project = projectFor(state, projectId); if (!input.name.trim()) invalid('Give your study a name.'); const baseline = input.baselineId ? project.baselines.find(run => run.id === input.baselineId) : [...project.baselines].reverse().find(run => run.status === 'completed' && run.revision === project.revision); const isWeather = input.template === 'weather', isRobust = input.template === 'robust'; const study: Study = { id: uid('study'), name: input.name.trim(), template: input.template, baselineId: input.baselineId ?? baseline?.id ?? null, assessmentPeriod: input.assessmentPeriod ?? baseline?.assessmentPeriod ?? state.settings[owner(state).id].assessmentPeriod, packageIds: copy(input.packageIds ?? (isWeather ? ['baseline'] : ['baseline', 'envelope', 'windows', 'deep'])), weatherIds: copy(input.weatherIds ?? (isWeather || isRobust ? ['tmy-gothenburg', 'amy-2023', 'future-2050'] : [baseline?.weatherId ?? 'tmy-gothenburg'])), status: 'draft', scenarios: [], results: [], attempts: [], durationMs: DURATION, progress: 0, revision: project.revision, demoFailure: input.demoFailure ?? false, updatedAt: new Date(now()).toISOString() }; project.studies.push(study); touch(project); return study; }),
    updateStudy: (projectId, studyId, patch) => transact(state => { const project = projectFor(state, projectId); const study = studyFor(project, studyId); if (study.status !== 'draft') invalid('Duplicate a submitted study to edit its configuration.'); if (patch.name !== undefined && !patch.name.trim()) invalid('Give your study a name.'); for (const key of ['name', 'template', 'baselineId', 'assessmentPeriod', 'packageIds', 'weatherIds', 'demoFailure'] as const) if (key in patch) Object.assign(study, { [key]: copy(patch[key]) }); study.updatedAt = new Date(now()).toISOString(); touch(project); return study; }),
    duplicateStudy: (projectId, studyId) => transact(state => { const project = projectFor(state, projectId); const source = studyFor(project, studyId); const study: Study = { ...copy(source), id: uid('study'), name: `${source.name} · copy`, status: 'draft', revision: project.revision, snapshot: undefined, contextSnapshot: undefined, packageSnapshot: undefined, scenarios: [], results: [], attempts: [], startedAt: undefined, progress: 0, updatedAt: new Date(now()).toISOString() }; project.studies.push(study); touch(project); return study; }),
    submitStudy: (projectId, studyId) => transact(state => submit(state, projectFor(state, projectId), studyFor(projectFor(state, projectId), studyId))),
    cancelStudy: (projectId, studyId) => transact(state => { const project = projectFor(state, projectId); const study = studyFor(project, studyId); if (!pending(study.status)) invalid('This study is no longer active.'); study.status = 'cancelled'; const baseline = project.baselines.find(run => run.id === study.baselineId)!; study.results = (study.snapshot ?? []).flatMap(building => study.scenarios.map(scenario => study.results.find(result => result.buildingId === building.id && result.scenarioId === scenario.id && result.status === 'completed') ?? cancelledResult(building, scenario, baseline.engine, study.assessmentPeriod))); setAttempt(study.attempts, 'cancelled', 'Cancelled by you. Completed cases remain reusable.'); touch(project); }),
    retryStudy: (projectId, studyId) => transact(state => submit(state, projectFor(state, projectId), studyFor(projectFor(state, projectId), studyId), true)),
    getSystemStatus: () => transact(state => { owner(state); const allRuns = state.projects.flatMap(project => [...project.baselines, ...project.studies]); const queued = allRuns.filter(run => run.status === 'queued').length; const running = allRuns.filter(run => run.status === 'running').length; return { cpu: Math.min(92, 14 + running * 19), memoryUsed: Math.round((2.1 + running * .65) * 10) / 10, memoryTotal: 7.5, storageUsed: 12.1, storageTotal: 30, workers: 2, capacity: 4, queued, running, updatedAt: new Date(now()).toISOString() }; }),
  };
}
export const studioClient = createStudioClient();


export interface StudioDrafts {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}
/** Recoverable UI drafts are private and never change the committed model revision. */
export function createStudioDrafts(options: ClientOptions = {}): StudioDrafts {
  let queue: Promise<unknown> = Promise.resolve();
  function transact<T>(operation: (drafts: Record<string, unknown>) => T): Promise<T> {
    const pendingOperation = queue.then(async () => {
      const db = await openDB(options.databaseName ?? 'epsm-studio-demo-v1', 1, { upgrade(database) { if (!database.objectStoreNames.contains('workspace')) database.createObjectStore('workspace'); } });
      try {
        const tx = db.transaction('workspace', 'readwrite');
        const state = await tx.store.get('state') as Workspace | undefined;
        if (!state || !accounts.some(account => account.id === state.sessionId)) throw new StudioError('AUTH_REQUIRED', 'Sign in to recover a private draft.');
        state.drafts ??= {};
        const drafts = state.drafts[state.sessionId!] ??= {};
        const result = operation(drafts);
        await tx.store.put(state, 'state');
        await tx.done;
        return copy(result);
      } finally { db.close(); }
    });
    queue = pendingOperation.catch(() => undefined);
    return pendingOperation;
  }
  return {
    get: <T,>(key: string) => transact(drafts => copy(drafts[key] ?? null) as T | null),
    set: <T,>(key: string, value: T) => transact(drafts => { drafts[key] = copy(value); }),
    remove: (key: string) => transact(drafts => { delete drafts[key]; }),
  };
}
export const studioDrafts = studioClient.drafts;
