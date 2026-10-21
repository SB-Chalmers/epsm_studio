// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { StudiesPage } from '../pages/StudiesPage';
import type { Project, Study } from '../domain/types';

const api = vi.hoisted(() => ({ getWeather: vi.fn(), getPackages: vi.fn(), getCatalogue: vi.fn(), getSettings: vi.fn(), createStudy: vi.fn(), updateStudy: vi.fn(), submitStudy: vi.fn() }));
const drafts = vi.hoisted(() => new Map<string, unknown>());
vi.mock('../data/client', () => ({ studioClient: api, studioDrafts: { get: async (key: string) => drafts.get(key) ?? null, set: async (key: string, value: unknown) => { drafts.set(key, value); }, remove: async (key: string) => { drafts.delete(key); } } }));

const draft: Study = { id: 'study-1', name: 'Weather resilience', template: 'robust', baselineId: null, assessmentPeriod: 30, packageIds: ['baseline'], weatherIds: ['tmy'], status: 'draft', scenarios: [], results: [], attempts: [], durationMs: 8000, progress: 0, revision: 1, demoFailure: false, updatedAt: '2026-10-20T10:00:00Z' };
const project: Project = { id: 'project-1', ownerId: 'demo', name: 'Private portfolio', description: '', createdAt: draft.updatedAt, updatedAt: draft.updatedAt, revision: 1, route: 'custom', siteType: 'hypothetical', location: [0, 0], contextPreset: 'none', targetBoundary: null, contextBoundary: null, buildings: [], contextBuildings: [], baselines: [], studies: [draft] };

beforeEach(() => {
  vi.clearAllMocks();
  drafts.clear();
  api.getSettings.mockResolvedValue({ assessmentPeriod: 50 });
  api.getWeather.mockResolvedValue([{ id: 'tmy', name: 'Typical year', kind: 'tmy', year: 2023, station: 'Demo station', distanceKm: 10, source: 'Demo', description: 'Typical weather', multiplier: 1 }]);
  api.getPackages.mockResolvedValue([{ id: 'baseline', name: 'Unchanged baseline', measureIds: [], description: 'Reference' }]);
  api.getCatalogue.mockResolvedValue([]);
  api.createStudy.mockResolvedValue(draft);
  api.updateStudy.mockResolvedValue(draft);
});
afterEach(cleanup);

describe('study drafting before execution is ready', () => {
  it('opens the builder from a project quick action and permits a draft without a baseline', async () => {
    api.getSettings.mockResolvedValue({ assessmentPeriod: 35 });
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/projects/project-1/studies?new=1']}><StudiesPage project={project} onRefresh={async () => undefined} /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'What would you like to study?' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Weather impact/ }));
    await user.type(screen.getByLabelText('Study name'), 'Climate comparison');
    await waitFor(() => expect((screen.getByRole('button', { name: 'Create draft' }) as HTMLButtonElement).disabled).toBe(false));
    await user.click(screen.getByRole('button', { name: 'Create draft' }));
    await waitFor(() => expect(api.createStudy).toHaveBeenCalledWith('project-1', expect.objectContaining({ name: 'Climate comparison', template: 'weather', baselineId: null, assessmentPeriod: 35, packageIds: ['baseline'] })));
  });

  it('restores editor values and unfinished package composition after navigation', async () => {
    const user = userEvent.setup();
    const first = render(<MemoryRouter initialEntries={['/projects/project-1/studies?study=study-1']}><StudiesPage project={project} onRefresh={async () => undefined} /></MemoryRouter>);
    await waitFor(() => expect(screen.getByLabelText('Study name')).toHaveProperty('value', 'Weather resilience'));
    await user.clear(screen.getByLabelText('Study name'));
    await user.type(screen.getByLabelText('Study name'), 'Uncommitted question');
    await user.clear(screen.getByLabelText('Carbon assessment · years'));
    await user.type(screen.getByLabelText('Carbon assessment · years'), '45');
    await user.click(screen.getByText('Compose a renovation package'));
    await user.type(screen.getByLabelText('Package name'), 'Unfinished package');
    first.unmount();
    render(<MemoryRouter initialEntries={['/projects/project-1/studies?study=study-1']}><StudiesPage project={project} onRefresh={async () => undefined} /></MemoryRouter>);
    await waitFor(() => expect(screen.getByLabelText('Study name')).toHaveProperty('value', 'Uncommitted question'));
    expect(screen.getByLabelText('Carbon assessment · years')).toHaveProperty('value', '45');
    await user.click(screen.getByText('Compose a renovation package'));
    expect(screen.getByLabelText('Package name')).toHaveProperty('value', 'Unfinished package');
    expect(api.updateStudy).not.toHaveBeenCalled();
  });

  it('keeps save available while preventing submission until a compatible baseline exists', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/projects/project-1/studies?study=study-1']}><StudiesPage project={project} onRefresh={async () => undefined} /></MemoryRouter>);
    await screen.findByText('Typical year');
    expect((screen.getByRole('button', { name: 'Save and run study' }) as HTMLButtonElement).disabled).toBe(true);
    const name = screen.getByLabelText('Study name');
    await user.clear(name); await user.type(name, 'New question');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(api.updateStudy).toHaveBeenCalledWith('project-1', 'study-1', expect.objectContaining({ name: 'New question', baselineId: null })));
    expect(api.submitStudy).not.toHaveBeenCalled();
  });
});
