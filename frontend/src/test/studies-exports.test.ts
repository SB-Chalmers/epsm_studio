// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { csvCell, exportDocument, hourlyCsv, resultsCsv, resultsHtml, resultsJson } from '../domain/exports';
import type { BaselineRun, CaseResult, Project } from '../domain/types';

const result: CaseResult = {
  id: 'case-1', buildingId: 'building-1', buildingName: '=HYPERLINK("https://example.invalid")',
  scenarioId: 'scenario-1', scenarioName: '<script>alert(1)</script>', packageId: 'baseline', weatherId: 'weather-1', engine: 'rc', status: 'completed',
  area: 1200, annualEnergy: 96000, embodiedCarbon: null, operationalCarbon: 25000,
  monthly: Array(12).fill(8000), hourly: Array.from({ length: 168 }, (_, hour) => ({ hour, energy: 10 })),
};
const run: BaselineRun = {
  id: 'run-1', name: '<img src=x onerror=alert(1)>', revision: 4, engine: 'rc', weatherId: 'weather-1', assessmentPeriod: 30,
  contextOmission: true, status: 'completed', startedAt: '2026-10-20T10:00:00Z', durationMs: 8000, progress: 100, snapshot: [], results: [result], attempts: [], demoFailure: false,
};
const project: Project = {
  id: 'project-1', ownerId: 'account-1', name: '+Malicious name', description: '', revision: 5, createdAt: run.startedAt, updatedAt: run.startedAt,
  route: 'custom', siteType: 'hypothetical', location: [0, 0], contextPreset: 'none', targetBoundary: null, contextBoundary: null,
  buildings: [], contextBuildings: [], baselines: [run], studies: [],
};
const input = { project, run, results: [result], weather: [] };

describe('study result exports', () => {
  it('retains illustrative status, frozen identity, units, missing carbon and exact hourly coverage', () => {
    const document = exportDocument(input);
    expect(document.dataStatus).toBe('illustrative');
    expect(document.run.revision).toBe(4);
    expect(document.projectDraft.revision).toBe(5);
    expect(document.run.snapshot).toEqual(run.snapshot);
    expect(document.assumptions.shading).toContain('omitted');
    expect(hourlyCsv(input)).toContain('\"revision\"');
    expect(document.units.operationalCarbon).toContain('assessment period');
    expect(document.hourlyCoverage[0].samples).toBe(168);
    expect(document.hourlyCoverage[0].description).toContain('not a complete annual series');
    expect(JSON.parse(resultsJson(input)).results[0].embodiedCarbon).toBeNull();
    expect(hourlyCsv(input).split('\r\n')).toHaveLength(169);
  });

  it('prevents formula execution in user-controlled CSV text without corrupting numeric values', () => {
    expect(csvCell('  =SUM(A1:A2)')).toBe('"\'  =SUM(A1:A2)"');
    expect(csvCell('@test')).toBe('"\'@test"');
    expect(csvCell(-10)).toBe('"-10"');
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(resultsCsv(input)).toContain('"\'+Malicious name"');
    expect(resultsCsv(input)).toContain('"\'=HYPERLINK(');
  });

  it('escapes injected HTML in titles, tables and provenance', () => {
    const html = resultsHtml(input);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Incomplete');
    expect(html).toContain('168');
    expect(html).toContain('Illustrative frontend demonstration');
  });
});
