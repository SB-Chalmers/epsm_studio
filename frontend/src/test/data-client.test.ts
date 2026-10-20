// SPDX-License-Identifier: MIT
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createStudioClient, createStudioDrafts } from '../data/client';
import type { StudioClient } from '../domain/types';
import { studyCounts } from '../domain/logic';

let client: StudioClient;
let clock: number;
let databaseName: string;
beforeEach(async () => { clock = Date.UTC(2026, 9, 20, 12); databaseName = `test-${crypto.randomUUID()}`; client = createStudioClient({ databaseName, now: () => clock }); await client.signInDemo(); });

describe('private persisted demo workspace', () => {
  it('enforces ownership on direct and nested reads and mutations', async () => {
    const [project] = await client.listProjects(); const study = project.studies[0];
    await client.updateSettings({ density: 'compact' });
    await client.signInDemo('demo-sam');
    expect((await client.listProjects()).every(p => p.ownerId === 'demo-sam')).toBe(true);
    expect((await client.getSettings()).density).toBe('comfortable');
    await expect(client.getProject(project.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(client.updateProject(project.id, { name: 'stolen' }, project.revision)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(client.deleteProject(project.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(client.submitStudy(project.id, study.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(client.runBaseline(project.id, { engine: 'rc', weatherId: 'tmy-gothenburg', assessmentPeriod: 50, contextOmission: true })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await client.signInDemo(); expect((await client.getSettings()).density).toBe('compact');
    await client.signOut(); await expect(client.getProject(project.id)).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
  });
  it('restores session and private saved work across adapter instances', async () => {
    const created = await client.createProject({ name: 'Saved project', route: 'custom', siteType: 'hypothetical' });
    const reloaded = createStudioClient({ databaseName, now: () => clock });
    expect((await reloaded.getSession())?.id).toBe('demo-alex');
    expect((await reloaded.getProject(created.id)).name).toBe('Saved project');
    await reloaded.signOut(); expect(await client.getSession()).toBeNull();
  });
  it('uses revision checks across independent clients and detaches returned objects', async () => {
    const [project] = await client.listProjects(); const second = createStudioClient({ databaseName, now: () => clock });
    project.buildings[0].fields.area.value = 999999;
    expect((await client.getProject(project.id)).buildings[0].fields.area.value).not.toBe(999999);
    await second.updateProject(project.id, { name: 'Changed elsewhere' }, project.revision);
    await expect(client.updateProject(project.id, { name: 'Stale' }, project.revision)).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
  });
  it('serializes competing revisions across independent adapters', async () => {
    const [project] = await client.listProjects(); const second = createStudioClient({ databaseName, now: () => clock });
    const responses = await Promise.allSettled([client.updateProject(project.id, { name: 'First edit' }, project.revision), second.updateProject(project.id, { name: 'Second edit' }, project.revision)]);
    expect(responses.filter(item => item.status === 'fulfilled')).toHaveLength(1);
    expect(responses.find(item => item.status === 'rejected')).toMatchObject({ reason: { code: 'REVISION_CONFLICT' } });
  });
  it('persists recoverable form drafts without committing revisions and scopes them by account', async () => {
    const drafts = createStudioDrafts({ databaseName }); const [project] = await client.listProjects();
    await drafts.set('new-project', { name: 'Uncommitted form', baseRevision: project.revision });
    expect((await client.getProject(project.id)).revision).toBe(project.revision);
    await client.signInDemo('demo-sam'); expect(await drafts.get('new-project')).toBeNull();
    await client.signInDemo(); expect(await createStudioDrafts({ databaseName }).get('new-project')).toEqual({ name: 'Uncommitted form', baseRevision: project.revision });
    await drafts.remove('new-project'); expect(await drafts.get('new-project')).toBeNull();
    await client.signOut(); await expect(drafts.get('new-project')).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
  });
  it('isolates custom packages and blocks incompatible or shared package edits', async () => {
    const pkg = await client.savePackage({ name: 'My package', description: 'Windows', measureIds: ['measure-windows'] });
    await expect(client.savePackage({ name: 'Conflict', description: '', measureIds: ['measure-envelope', 'measure-unknown'] })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(client.savePackage({ name: 'Alter shared', description: '', measureIds: ['measure-windows'] }, 'baseline')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await client.signInDemo('demo-sam'); expect((await client.getPackages()).some(item => item.id === pkg.id)).toBe(false);
    await expect(client.savePackage({ name: 'Stolen', description: '', measureIds: ['measure-windows'] }, pkg.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('frozen jobs and recovery', () => {
  it('requires RC acknowledgement, prevents duplicate pending jobs, freezes inputs, and advances on reads', async () => {
    const [project] = await client.listProjects();
    const input = { engine: 'rc' as const, weatherId: 'tmy-gothenburg', assessmentPeriod: 50, contextOmission: false };
    await expect(client.runBaseline(project.id, input)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    const run = await client.runBaseline(project.id, { ...input, contextOmission: true });
    await expect(client.runBaseline(project.id, { ...input, contextOmission: true })).rejects.toMatchObject({ code: 'BUSY' });
    const originalArea = run.snapshot[0].fields.area.value;
    const changed = structuredClone(project.buildings); changed[0].fields.area.value = 2000;
    await client.updateProject(project.id, { buildings: changed }, project.revision);
    clock += 2000; expect((await client.getProject(project.id)).baselines.slice(-1)[0]?.status).toBe('running');
    clock += 7000; const complete = (await client.getProject(project.id)).baselines.slice(-1)[0]!;
    expect(complete.status).toBe('completed'); expect(complete.snapshot[0].fields.area.value).toBe(originalArea); expect(complete.results[0].area).toBe(Number(originalArea));
  });
  it('reuses only compatible baseline cases, freezes package inputs, and preserves explicit attempts', async () => {
    const [project] = await client.listProjects();
    const pkg = await client.savePackage({ name: 'Windows', description: '', measureIds: ['measure-windows'] });
    const draft = await client.createStudy(project.id, { name: 'Recovery', template: 'custom', packageIds: ['baseline', pkg.id], weatherIds: ['tmy-gothenburg'], demoFailure: true });
    expect(studyCounts(project, draft)).toEqual({ scenarios: 2, cases: 6, reused: 3, executions: 3 });
    await client.submitStudy(project.id, draft.id);
    await client.savePackage({ name: 'Changed after submit', description: '', measureIds: ['measure-envelope'] }, pkg.id);
    clock += 9000; let frozen = (await client.getProject(project.id)).studies.find(item => item.id === draft.id)!;
    expect(frozen.status).toBe('failed'); expect(frozen.results.filter(result => result.status === 'failed')).toHaveLength(1);
    expect(studyCounts(project, frozen)).toEqual({ scenarios: 2, cases: 6, reused: 3, executions: 3 });
    const completed = frozen.results.filter(result => result.status === 'completed');
    expect(completed.find(result => result.packageId === pkg.id)?.embodiedCarbon).toBe(Number(project.buildings[0].fields.area.value) * 24);
    const retry = await client.retryStudy(project.id, draft.id);
    expect(studyCounts(project, retry)).toEqual({ scenarios: 2, cases: 6, reused: 3, executions: 3 });
    clock += 9000;
    frozen = (await client.getProject(project.id)).studies.find(item => item.id === draft.id)!;
    expect(frozen.status).toBe('completed'); expect(frozen.attempts.map(item => item.number)).toEqual([1, 2]);
    expect(studyCounts(project, frozen)).toEqual({ scenarios: 2, cases: 6, reused: 3, executions: 3 });
    expect(frozen.results.filter(result => completed.some(old => old.id === result.id))).toEqual(completed);
    await expect(client.updateStudy(project.id, draft.id, { name: 'Overwrite history' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
  it('freezes committed context and resolved package provenance independently of later draft edits', async () => {
    const [project] = await client.listProjects();
    expect(project.baselines[0].contextSnapshot?.location).toEqual(project.location);
    expect(project.studies[0].packageSnapshot?.find(item => item.id === 'windows')?.measures[0].id).toBe('measure-windows');
    const pkg = await client.savePackage({ name: 'Frozen windows', description: 'Original', measureIds: ['measure-windows'] });
    const run = await client.runBaseline(project.id, { engine: 'rc', weatherId: 'tmy-gothenburg', assessmentPeriod: 50, contextOmission: true });
    const draft = await client.createStudy(project.id, { name: 'Frozen site', template: 'custom', packageIds: [pkg.id], weatherIds: ['tmy-gothenburg'] });
    const queued = await client.submitStudy(project.id, draft.id);
    const originalContext = structuredClone(queued.contextSnapshot);
    const neighbours = structuredClone(project.contextBuildings); neighbours[0].components[0].height = 99;
    await client.updateProject(project.id, { location: [12.1, 58.1], contextPreset: 'rural', contextBuildings: neighbours, contextBoundary: [[0, 0], [1, 0], [1, 1], [0, 1]] }, project.revision);
    await client.savePackage({ name: 'Edited envelope', description: 'Changed', measureIds: ['measure-envelope'] }, pkg.id);
    clock += 9000; const edited = await client.getProject(project.id);
    const finishedRun = edited.baselines.find(item => item.id === run.id)!; const finishedStudy = edited.studies.find(item => item.id === draft.id)!;
    expect(finishedRun.contextSnapshot).toEqual(originalContext); expect(finishedStudy.contextSnapshot).toEqual(originalContext);
    expect(finishedStudy.packageSnapshot?.[0]).toMatchObject({ name: 'Frozen windows', measureIds: ['measure-windows'], measures: [{ id: 'measure-windows', multiplier: .84 }] });
    expect(finishedStudy.results[0].embodiedCarbon).toBe(Number(project.buildings[0].fields.area.value) * 24);
    expect(finishedStudy.contextSnapshot?.contextBuildings[0].components[0].height).not.toBe(99);
  });
  it('retries frozen inputs after the current project draft becomes invalid', async () => {
    const [project] = await client.listProjects();
    const draft = await client.createStudy(project.id, { name: 'Frozen retry', template: 'renovation', demoFailure: true });
    const submitted = await client.submitStudy(project.id, draft.id); clock += 9000;
    const failed = (await client.getProject(project.id)).studies.find(study => study.id === draft.id)!;
    expect(failed.status).toBe('failed');
    const invalidBuildings = structuredClone(project.buildings); invalidBuildings[0].fields.area.value = null;
    const edited = await client.updateProject(project.id, { buildings: invalidBuildings, contextBoundary: null }, project.revision);
    const retry = await client.retryStudy(project.id, draft.id);
    expect(retry.contextSnapshot).toEqual(submitted.contextSnapshot);
    expect(studyCounts(edited, retry)).toEqual({ scenarios: 4, cases: 12, reused: 3, executions: 9 });
    clock += 9000; const final = (await client.getProject(project.id)).studies.find(study => study.id === draft.id)!;
    expect(final.status).toBe('completed'); expect(final.snapshot?.[0].fields.area.value).not.toBeNull();
    expect(final.results.find(result => result.buildingId === project.buildings[0].id)?.area).toBe(Number(project.buildings[0].fields.area.value));
  });
  it('keeps completed study reuse counts frozen when the editable project revision changes', async () => {
    const [project] = await client.listProjects(); const study = project.studies.find(item => item.status === 'completed')!;
    const before = studyCounts(project, study);
    const changed = structuredClone(project.buildings); changed[0].fields.area.value = 9999;
    const edited = await client.updateProject(project.id, { buildings: changed }, project.revision);
    expect(studyCounts(edited, edited.studies.find(item => item.id === study.id)!)).toEqual(before);
    expect(before).toEqual({ scenarios: 4, cases: 12, reused: 3, executions: 9 });
    expect(edited.studies.find(item => item.id === study.id)?.snapshot?.[0].fields.area.value).not.toBe(9999);
  });
  it('cancels, retries and rejects stale baseline reuse', async () => {
    let [project] = await client.listProjects();
    const draft = await client.createStudy(project.id, { name: 'Cancel', template: 'renovation' });
    await client.submitStudy(project.id, draft.id); await client.cancelStudy(project.id, draft.id);
    expect((await client.getProject(project.id)).studies.find(item => item.id === draft.id)?.status).toBe('cancelled');
    await client.retryStudy(project.id, draft.id); clock += 9000;
    expect((await client.getProject(project.id)).studies.find(item => item.id === draft.id)?.status).toBe('completed');
    project = await client.updateProject(project.id, { description: 'New revision' }, project.revision);
    const stale = await client.createStudy(project.id, { name: 'Stale', template: 'weather' });
    expect(studyCounts(project, stale).reused).toBe(0);
    await expect(client.submitStudy(project.id, stale.id)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});
