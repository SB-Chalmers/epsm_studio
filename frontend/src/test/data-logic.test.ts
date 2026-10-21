// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { aggregateResults, getReadiness, paretoFront, robustRanking } from '../domain/logic';
import { seedProjects } from '../data/fixtures';
import type { CaseResult } from '../domain/types';
const result = (patch: Partial<CaseResult> = {}): CaseResult => ({ id: 'a', buildingId: 'b1', buildingName: 'Building', scenarioId: 's', scenarioName: 'Scenario', packageId: 'baseline', weatherId: 'tmy', engine: 'rc', status: 'completed', area: 100, annualEnergy: 1000, embodiedCarbon: 20, operationalCarbon: 80, monthly: [], hourly: [], ...patch });

describe('readiness and transparent comparisons', () => {
  it('keeps missing building evidence and RC shading limitations explicit', () => {
    const [project] = seedProjects('demo-alex', Date.now());
    expect(getReadiness(project, 'rc', false)).toContain('RC omits context and self-shading. Acknowledge this limitation or select EnergyPlus.');
    expect(getReadiness(project, 'rc', true)).toEqual([]);
    project.buildings[0].fields.year.value = null;
    expect(getReadiness(project, 'energyplus', false)).toContain('Landala 01: resolve year.');
  });
  it('rejects invalid outlines and boundaries before a job can enter the queue', () => {
    const [project] = seedProjects('demo-alex', Date.now());
    project.buildings[0].footprint = [[11.965, 57.698], [11.966, 57.699], [11.965, 57.699], [11.966, 57.698]];
    project.contextBoundary = [[0, 0], [1, 1], [0, 1], [1, 0]];
    project.targetBoundary = [[0, 0], [1, 0], [2, 0]];
    const issues = getReadiness(project, 'energyplus', false);
    expect(issues.some(issue => issue.startsWith('Landala 01: The outline crosses'))).toBe(true);
    expect(issues.some(issue => issue.startsWith('Context boundary: The outline crosses'))).toBe(true);
    expect(issues.some(issue => issue.startsWith('Simulation-target boundary:'))).toBe(true);
  });
  it('rejects fractional storeys, impossible years, nonfinite component heights and invalid site containment', () => {
    const [project] = seedProjects('demo-alex', Date.now());
    project.buildings[0].fields.storeys.value = 2.5; project.buildings[0].fields.year.value = 100000;
    project.buildings[0].components[0].height = Infinity;
    project.contextBoundary = [[0, 0], [1, 0], [1, 1], [0, 1]];
    const issues = getReadiness(project, 'rc', true);
    expect(issues).toContain('Landala 01: storeys must be a positive whole number.');
    expect(issues).toContain('Landala 01: construction year must be a whole year between 1 and 2100.');
    expect(issues).toContain('Landala 01 / Main volume: provide a finite positive component height.');
    expect(issues).toContain('The context boundary must contain the entire simulation-target boundary.');
    expect(issues).toContain('Landala 01: expand context to contain the full building footprint.');
  });
  it('does not turn failed or missing carbon results into zero or a Pareto point', () => {
    const complete = result(); const unknown = result({ id: 'unknown', embodiedCarbon: null }); const failed = result({ id: 'failed', status: 'failed', annualEnergy: null, embodiedCarbon: null, operationalCarbon: null });
    const totals = aggregateResults([complete, unknown, failed]);
    expect(aggregateResults([result({ operationalCarbon: NaN })])).toMatchObject({ operationalCarbon: null, incomplete: true });
    expect(totals).toMatchObject({ completed: 2, failed: 1, incomplete: true, annualEnergy: null, embodiedCarbon: null, operationalCarbon: null });
    const dominated = result({ id: 'dominated', embodiedCarbon: 40, operationalCarbon: 90 });
    expect(paretoFront([complete, unknown, failed, dominated]).map(point => point.id)).toEqual(['a']);
  });
  it('ranks total-carbon portfolio weather totals, excluding incomplete packages', () => {
    const results = ['cold', 'warm'].flatMap(weatherId => ['b1', 'b2'].flatMap(buildingId => [
      result({ id: `a-${weatherId}-${buildingId}`, packageId: 'A', weatherId, buildingId, embodiedCarbon: 10, operationalCarbon: weatherId === 'cold' ? 40 : 30 }),
      result({ id: `b-${weatherId}-${buildingId}`, packageId: 'B', weatherId, buildingId, embodiedCarbon: 65, operationalCarbon: 5 }),
      result({ id: `c-${weatherId}-${buildingId}`, packageId: 'C', weatherId, buildingId, embodiedCarbon: null }),
    ]));
    const ranking = robustRanking(results);
    expect(ranking[0]).toMatchObject({ packageId: 'A', worst: 100, best: 80, mean: 90, count: 2, incomplete: false, rank: 1 });
    expect(ranking[1]).toMatchObject({ packageId: 'B', worst: 140, rank: 2 });
    expect(ranking[2]).toMatchObject({ packageId: 'C', incomplete: true, rank: 0 });
  });
  it('does not rank a portfolio package that is missing weather or building cases', () => {
    const results = ['cold', 'warm'].flatMap(weatherId => ['b1', 'b2'].map(buildingId => result({ id: `a-${weatherId}-${buildingId}`, packageId: 'A', weatherId, buildingId })));
    results.push(result({ id: 'b-cold-b1', packageId: 'B', weatherId: 'cold', buildingId: 'b1', embodiedCarbon: 0, operationalCarbon: 1 }));
    const ranking = robustRanking(results);
    expect(ranking.find(item => item.packageId === 'A')).toMatchObject({ incomplete: false, rank: 1, count: 2 });
    expect(ranking.find(item => item.packageId === 'B')).toMatchObject({ incomplete: true, rank: 0, count: 0 });
  });
});
