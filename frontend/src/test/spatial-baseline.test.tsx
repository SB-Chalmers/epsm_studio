// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { BaselinePage } from '../pages/BaselinePage';
import type { Project } from '../domain/types';

const drafts = vi.hoisted(() => new Map<string, unknown>());
const api = vi.hoisted(() => ({ getWeather: vi.fn(), getSettings: vi.fn(), runBaseline: vi.fn() }));
vi.mock('../data/client', () => ({ studioClient: api, studioDrafts: { get: async (key: string) => drafts.get(key) ?? null, set: async (key: string, value: unknown) => { drafts.set(key, structuredClone(value)); }, remove: async (key: string) => { drafts.delete(key); } } }));
const project: Project = { id: 'project-1', ownerId: 'demo', name: 'Portfolio', description: '', createdAt: '2026-10-20T10:00:00Z', updatedAt: '2026-10-20T10:00:00Z', revision: 2, route: 'custom', siteType: 'hypothetical', location: [0, 0], contextPreset: 'rural', targetBoundary: null, contextBoundary: null, buildings: [], contextBuildings: [], baselines: [], studies: [] };
const config = { baseRevision: 2, engine: 'rc', weatherId: 'amy', period: 35, acknowledged: true, demoFailure: true };
const page = (value: Project = project) => <MemoryRouter><BaselinePage project={value} onRefresh={async () => undefined} /></MemoryRouter>;
beforeEach(() => {
  drafts.clear(); vi.clearAllMocks();
  api.getSettings.mockResolvedValue({ defaultEngine: 'energyplus', defaultWeather: 'tmy', assessmentPeriod: 50 });
  api.getWeather.mockResolvedValue([{ id: 'tmy', name: 'Typical year', kind: 'tmy', description: 'Demo', source: 'Demo' }, { id: 'amy', name: 'Actual year', kind: 'amy', description: 'Demo', source: 'Demo' }]);
});
afterEach(cleanup);
describe('recoverable baseline configuration', () => {
  it('keeps configuration controls disabled until asynchronous recovery completes', async () => {
    let finishRecovery!: (settings: { defaultEngine: string; defaultWeather: string; assessmentPeriod: number }) => void;
    api.getSettings.mockReturnValueOnce(new Promise(resolve => { finishRecovery = resolve; }));
    render(page());
    expect(screen.getByLabelText('Simulation engine')).toBeDisabled();
    expect(screen.getByLabelText('Reference weather')).toBeDisabled();
    expect(screen.getByLabelText('Carbon assessment period · years')).toBeDisabled();
    finishRecovery({ defaultEngine: 'energyplus', defaultWeather: 'amy', assessmentPeriod: 42 });
    await waitFor(() => expect(screen.getByLabelText('Simulation engine')).toBeEnabled());
    expect(screen.getByLabelText('Simulation engine')).toHaveValue('energyplus');
    expect(screen.getByLabelText('Reference weather')).toHaveValue('amy');
    expect(screen.getByLabelText('Carbon assessment period · years')).toHaveValue(42);
  });
  it('recovers account draft settings and persists edits without starting a run', async () => {
    drafts.set('baseline:project-1', config);
    const mounted = render(page());
    await waitFor(() => expect(screen.getByLabelText('Reference weather')).toHaveValue('amy'));
    expect(screen.getByLabelText('Simulation engine')).toHaveValue('rc');
    expect(screen.getByLabelText('Carbon assessment period · years')).toHaveValue(35);
    expect(screen.getByLabelText(/I understand that this RC/)).toBeChecked();
    expect(screen.getByLabelText(/Include an illustrative failed case/)).toBeChecked();
    fireEvent.change(screen.getByLabelText('Carbon assessment period · years'), { target: { value: '42' } });
    await waitFor(() => expect(drafts.get('baseline:project-1')).toMatchObject({ period: 42 }));
    mounted.unmount(); render(page());
    await waitFor(() => expect(screen.getByLabelText('Carbon assessment period · years')).toHaveValue(42));
    expect(api.runBaseline).not.toHaveBeenCalled();
  });
  it('retains configuration while invalidating RC acknowledgement after a revision changes', async () => {
    drafts.set('baseline:project-1', { ...config, baseRevision: 1 });
    const mounted = render(page());
    await waitFor(() => expect(screen.getByLabelText('Carbon assessment period · years')).toHaveValue(35));
    expect(screen.getByLabelText(/I understand that this RC/)).not.toBeChecked();
    fireEvent.click(screen.getByLabelText(/I understand that this RC/));
    expect(screen.getByLabelText(/I understand that this RC/)).toBeChecked();
    mounted.rerender(page({ ...project, revision: 3 }));
    expect(screen.getByLabelText(/I understand that this RC/)).not.toBeChecked();
    await waitFor(() => expect(drafts.get('baseline:project-1')).toMatchObject({ baseRevision: 3, acknowledged: false, period: 35 }));
  });
  it('blocks new submissions while keeping frozen history accessible when building drafts exist', async () => {
    drafts.set('buildings:project-1', { baseRevision: 2, buildings: [] });
    const frozen: Project = { ...project, baselines: [{ id: 'run-1', name: 'Baseline 1', revision: 2, engine: 'rc', weatherId: 'tmy', assessmentPeriod: 50, contextOmission: true, status: 'completed', startedAt: project.createdAt, durationMs: 8000, progress: 100, snapshot: [], results: [], attempts: [], demoFailure: false }] };
    render(page(frozen));
    await screen.findByText('Save or discard your unsaved building inputs before starting a new baseline.');
    expect(screen.getByRole('button', { name: 'Run baseline' })).toBeDisabled();
    expect(screen.getByRole('heading', { name: 'Baseline 1' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Create study' })).toBeVisible();
    expect(api.runBaseline).not.toHaveBeenCalled();
  });
});
