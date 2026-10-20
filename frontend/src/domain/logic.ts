// SPDX-License-Identifier: MIT
import type { BaselineRun, Building, CaseResult, Engine, Project, Scenario, Study } from './types';
import { selectedBuildings } from './types';
import { containsPolygon, polygonError } from './geometry';

const present = (value: unknown) => value !== null && value !== undefined && value !== '';
export function getReadiness(project: Project, engine: Engine, contextOmission: boolean): string[] {
  const messages: string[] = [];
  const buildings = selectedBuildings(project);
  if (!buildings.length) messages.push('Include at least one building.');
  if (project.location.length !== 2 || !project.location.every(Number.isFinite) || Math.abs(project.location[0]) > 180 || Math.abs(project.location[1]) >= 90) messages.push('Choose a valid longitude and latitude away from the poles.');
  for (const [label, boundary] of [['Simulation-target boundary', project.targetBoundary], ['Context boundary', project.contextBoundary]] as const) {
    if (boundary) { const error = polygonError(boundary); if (error) messages.push(`${label}: ${error}`); }
    else if (project.siteType === 'actual') messages.push(`${label}: draw the required boundary for this actual site.`);
  }
  const validContext = project.contextBoundary && !polygonError(project.contextBoundary) ? project.contextBoundary : null;
  if (validContext && project.targetBoundary && !polygonError(project.targetBoundary) && !containsPolygon(validContext, project.targetBoundary)) messages.push('The context boundary must contain the entire simulation-target boundary.');
  function validateGeometry(building: Building, isContext = false) {
    const error = polygonError(building.footprint);
    if (error) messages.push(`${building.name}: ${error}`);
    if (building.coordinateSpace === 'geographic' && building.footprint.some(point => Math.abs(point[0]) > 180 || Math.abs(point[1]) >= 90)) messages.push(`${building.name}: geographic coordinates must be valid longitude and latitude.`);
    if (!isContext && project.siteType === 'actual' && building.coordinateSpace !== 'geographic') messages.push(`${building.name}: place this building in geographic coordinates on the actual site.`);
    if (!isContext && validContext && building.coordinateSpace === 'geographic' && !error && !containsPolygon(validContext, building.footprint)) messages.push(`${building.name}: expand context to contain the full building footprint.`);
    if (!building.components.length) messages.push(`${building.name}: configure at least one physical component.`);
    for (const component of building.components) {
      const componentError = polygonError(component.footprint);
      if (componentError) messages.push(`${building.name} / ${component.name}: ${componentError}`);
      if (component.height === null || !Number.isFinite(component.height) || component.height <= 0) messages.push(`${building.name} / ${component.name}: provide a finite positive component height.`);
    }
  }
  for (const building of buildings) {
    validateGeometry(building);
    for (const key of ['year', 'function', 'height', 'storeys', 'area', 'archetype', 'fabric', 'wall', 'roof', 'floor', 'windows', 'heating', 'ventilation', 'operation'] as const) {
      if (!present(building.fields[key].value)) messages.push(`${building.name}: resolve ${key}.`);
    }
    for (const key of ['year', 'height', 'storeys', 'area'] as const) {
      const value = building.fields[key].value;
      if (present(value) && (!Number.isFinite(Number(value)) || Number(value) <= 0)) messages.push(`${building.name}: ${key} must be finite and positive.`);
    }
    const year = building.fields.year.value, storeys = building.fields.storeys.value;
    if (present(year) && (!Number.isInteger(Number(year)) || Number(year) < 1 || Number(year) > 2100)) messages.push(`${building.name}: construction year must be a whole year between 1 and 2100.`);
    if (present(storeys) && (!Number.isInteger(Number(storeys)) || Number(storeys) < 1)) messages.push(`${building.name}: storeys must be a positive whole number.`);
  }
  project.contextBuildings.forEach(building => validateGeometry(building, true));
  if (engine === 'rc' && !contextOmission && (project.contextPreset !== 'none' || project.contextBuildings.length > 0 || buildings.some(b => b.components.length > 1 || isConcave(b.footprint)))) messages.push('RC omits context and self-shading. Acknowledge this limitation or select EnergyPlus.');
  return messages;
}
function isConcave(points: [number, number][]): boolean {
  let direction = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length], c = points[(i + 2) % points.length];
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(cross) < 1e-15) continue;
    if (direction && Math.sign(cross) !== direction) return true;
    direction = Math.sign(cross);
  }
  return false;
}
export function studyScenarios(study: Pick<Study, 'packageIds' | 'weatherIds'>): Scenario[] {
  return [...new Set(study.packageIds)].flatMap(packageId => [...new Set(study.weatherIds)].map(weatherId => ({ id: `${packageId}__${weatherId}`, name: `${packageId} · ${weatherId}`, packageId, weatherId })));
}
export function compatibleBaseline(project: Project, study: Study): BaselineRun | undefined {
  const baseline = study.baselineId ? project.baselines.find(run => run.id === study.baselineId) : [...project.baselines].reverse().find(run => run.status === 'completed' && run.revision === project.revision);
  return baseline?.status === 'completed' && baseline.revision === project.revision ? baseline : undefined;
}
/** Baseline reuse is an immutable submission ledger, distinct from retry retention. */
export function reusableBaselineCase(project: Project, study: Study, building: Building, scenario: Scenario): CaseResult | undefined {
  const frozen = study.status !== 'draft' && !!study.snapshot;
  const historicalBaseline = frozen ? project.baselines.find(run => run.id === study.baselineId && run.status === 'completed' && run.revision === study.revision) : undefined;
  const baseline = frozen ? historicalBaseline : compatibleBaseline(project, study);
  if (scenario.packageId !== 'baseline' || !baseline || scenario.weatherId !== baseline.weatherId || study.assessmentPeriod !== baseline.assessmentPeriod) return undefined;
  return baseline.results.find(result => result.buildingId === building.id && result.status === 'completed');
}
/** Successful cases can be retained for a retry, without changing baseline counts. */
export function reusableCase(project: Project, study: Study, building: Building, scenario: Scenario): CaseResult | undefined {
  const frozen = study.status !== 'draft' && !!study.snapshot;
  const existing = study.results.find(result => result.buildingId === building.id && result.scenarioId === scenario.id && result.status === 'completed');
  if (existing && ['queued', 'running', 'failed', 'cancelled'].includes(study.status) && (frozen || study.revision === project.revision)) return existing;
  return reusableBaselineCase(project, study, building, scenario);
}
export function studyCounts(project: Project, study: Study): { scenarios: number; cases: number; reused: number; executions: number } {
  const scenarios = study.status === 'draft' ? studyScenarios(study) : study.scenarios;
  const buildings = study.snapshot ?? selectedBuildings(project);
  const cases = buildings.length * scenarios.length;
  const reused = scenarios.reduce((sum, scenario) => sum + buildings.filter(building => !!reusableBaselineCase(project, study, building, scenario)).length, 0);
  return { scenarios: scenarios.length, cases, reused, executions: cases - reused };
}
export function aggregateResults(results: CaseResult[]) {
  const completed = results.filter(result => result.status === 'completed');
  const incomplete = results.some(result => result.status !== 'completed') || completed.some(result => result.annualEnergy === null || !Number.isFinite(result.annualEnergy) || result.embodiedCarbon === null || !Number.isFinite(result.embodiedCarbon) || result.operationalCarbon === null || !Number.isFinite(result.operationalCarbon));
  const sum = (key: 'annualEnergy' | 'embodiedCarbon' | 'operationalCarbon') => completed.length === 0 || results.some(result => result.status !== 'completed') || completed.some(result => result[key] === null || !Number.isFinite(result[key])) ? null : completed.reduce((total, result) => total + (result[key] ?? 0), 0);
  return { area: completed.reduce((sum, result) => sum + result.area, 0), annualEnergy: sum('annualEnergy'), embodiedCarbon: sum('embodiedCarbon'), operationalCarbon: sum('operationalCarbon'), completed: completed.length, failed: results.filter(r => r.status === 'failed').length, cancelled: results.filter(r => r.status === 'cancelled').length, incomplete };
}
export function paretoFront<T extends { id: string; embodiedCarbon: number | null; operationalCarbon: number | null; status?: string }>(points: T[]): T[] {
  const valid = points.filter(p => p.embodiedCarbon !== null && Number.isFinite(p.embodiedCarbon) && p.operationalCarbon !== null && Number.isFinite(p.operationalCarbon) && (!p.status || p.status === 'completed'));
  return valid.filter(point => !valid.some(other => other !== point && other.embodiedCarbon! <= point.embodiedCarbon! && other.operationalCarbon! <= point.operationalCarbon! && (other.embodiedCarbon! < point.embodiedCarbon! || other.operationalCarbon! < point.operationalCarbon!))).sort((a, b) => a.embodiedCarbon! - b.embodiedCarbon!);
}
export function robustRanking(results: CaseResult[]): { packageId: string; mean: number; worst: number; best: number; count: number; incomplete: boolean; rank: number }[] {
  const packages = [...new Set(results.map(result => result.packageId))];
  const expectedWeather = [...new Set(results.map(result => result.weatherId))];
  const expectedBuildings = [...new Set(results.map(result => result.buildingId))];
  return packages.map(packageId => {
    const own = results.filter(result => result.packageId === packageId);
    const weatherResults = expectedWeather.map(weatherId => own.filter(result => result.weatherId === weatherId));
    const complete = weatherResults.filter(rows => rows.length === expectedBuildings.length && expectedBuildings.every(id => rows.filter(result => result.buildingId === id).length === 1)).map(rows => aggregateResults(rows)).filter(total => total.embodiedCarbon !== null && total.operationalCarbon !== null);
    const values = complete.map(total => total.embodiedCarbon! + total.operationalCarbon!);
    return { packageId, mean: values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN, worst: values.length ? Math.max(...values) : NaN, best: values.length ? Math.min(...values) : NaN, count: values.length, incomplete: complete.length !== expectedWeather.length, rank: 0 };
  }).sort((a, b) => Number(a.incomplete) - Number(b.incomplete) || (Number.isFinite(a.worst) ? a.worst : Infinity) - (Number.isFinite(b.worst) ? b.worst : Infinity)).map((entry, index) => ({ ...entry, rank: entry.incomplete ? 0 : index + 1 }));
}
