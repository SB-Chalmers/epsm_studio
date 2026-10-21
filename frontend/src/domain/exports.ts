// SPDX-License-Identifier: MIT
import type { BaselineRun, CaseResult, Project, Study, Weather } from './types';

export interface ResultExport {
  project: Project;
  run: BaselineRun | Study;
  results: CaseResult[];
  weather: Weather[];
}

export const resultUnits = {
  area: 'm²', annualEnergy: 'kWh/year', embodiedCarbon: 'kg CO₂e',
  operationalCarbon: 'kg CO₂e over assessment period', monthly: 'kWh/month', hourly: 'kWh/hour',
};

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

export function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  // Preserve ordinary numbers; prevent names and other text from becoming formulas.
  if (typeof value !== 'number' && /^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function exportDocument(input: ResultExport) {
  return {
    schema: 'epsm-studio.illustrative-results/1',
    dataStatus: 'illustrative',
    disclaimer: 'Frontend demonstration fixtures. No energy engine or scientific assessment was executed.',
    project: { id: input.project.id, name: input.project.name },
    run: { ...input.run, results: undefined, assessmentPeriodYears: input.run.assessmentPeriod },
    projectDraft: { ...input.project, baselines: undefined, studies: undefined, note: 'Current editable draft; may be newer than the frozen run. Frozen inputs are in run.snapshot and run.contextSnapshot.' },
    assumptions: {
      modelling: 'Illustrative geometry, catalogue factors and deterministic playback; no scientific engine executed.',
      carbonBoundary: 'Illustrative material impacts plus delivered-energy impacts over the stated assessment period.',
      energyCoverage: 'Illustrative delivered energy only; EPC observations remain separate evidence.',
      shading: ('contextOmission' in input.run ? input.run.contextOmission : input.run.contextSnapshot?.contextOmission) ? 'Context and self-shading omitted by RC.' : 'Illustrative EnergyPlus selection; no actual shading calculation.',
    },
    units: resultUnits,
    weather: input.weather.filter(weather => input.results.some(result => result.weatherId === weather.id)),
    hourlyCoverage: input.results.map(result => ({ caseId: result.id, samples: result.hourly.length, description: `${result.hourly.length} illustrative hourly samples; not a complete annual series` })),
    attempts: input.run.attempts,
    results: input.results,
  };
}

export function resultsJson(input: ResultExport): string {
  return JSON.stringify(exportDocument(input), null, 2);
}

export function resultsCsv(input: ResultExport): string {
  const headings = ['data_status', 'project_id', 'project_name', 'run_id', 'run_name', 'revision', 'assessment_period_years', 'case_id', 'building_id', 'building_name', 'scenario_id', 'scenario_name', 'package_id', 'weather_id', 'engine', 'status', 'area_m2', 'annual_energy_kwh', 'embodied_kgco2e', 'operational_kgco2e', 'hourly_sample_count', 'error', 'carbon_boundary', 'modelling_assumption'];
  return [headings, ...input.results.map(result => ['illustrative', input.project.id, input.project.name, input.run.id, input.run.name, input.run.revision, input.run.assessmentPeriod, result.id, result.buildingId, result.buildingName, result.scenarioId, result.scenarioName, result.packageId, result.weatherId, result.engine, result.status, result.area, result.annualEnergy, result.embodiedCarbon, result.operationalCarbon, result.hourly.length, result.error, 'Illustrative material plus delivered-energy carbon over assessment period', result.engine === 'rc' ? 'Illustrative playback; context and self-shading omitted' : 'Illustrative playback; no engine executed'])]
    .map(row => row.map(csvCell).join(',')).join('\r\n');
}

export function hourlyCsv(input: ResultExport): string {
  const rows: unknown[][] = [['data_status', 'project_id', 'run_id', 'revision', 'case_id', 'building_id', 'scenario_id', 'weather_id', 'engine', 'sample_hour', 'energy_kwh', 'series_samples', 'series_assumption']];
  for (const result of input.results) for (const hour of result.hourly) rows.push(['illustrative', input.project.id, input.run.id, input.run.revision, result.id, result.buildingId, result.scenarioId, result.weatherId, result.engine, hour.hour, hour.energy, result.hourly.length, 'Illustrative samples; not a full annual series or scientific calculation']);
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}

export function resultsHtml(input: ResultExport): string {
  const rows = input.results.map(result => `<tr>${[result.buildingName, result.scenarioName, result.engine, result.status, result.area, result.annualEnergy ?? 'Incomplete', result.embodiedCarbon ?? 'Incomplete', result.operationalCarbon ?? 'Incomplete', result.hourly.length].map(value => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.run.name)} — EPSM Studio</title><style>body{font:15px/1.6 system-ui,sans-serif;color:#272b2b;background:#fbfbf9;max-width:1200px;margin:40px auto;padding:24px}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:10px;border-bottom:1px solid #dfe2dc}th{font-size:12px;color:#616a63}.notice{border-left:3px solid #7a5600;padding:12px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}</style><h1>${escapeHtml(input.run.name)}</h1><p class="notice">Illustrative frontend demonstration. No energy engine or scientific assessment was executed.</p><p>Project: ${escapeHtml(input.project.name)} · Run: ${escapeHtml(input.run.id)} · Frozen revision: ${input.run.revision} · Assessment: ${input.run.assessmentPeriod} years</p><table><thead><tr><th>Building</th><th>Scenario</th><th>Engine</th><th>Status</th><th>Area m²</th><th>Annual kWh</th><th>Embodied kg CO₂e</th><th>Operational kg CO₂e</th><th>Hourly samples</th></tr></thead><tbody>${rows}</tbody></table><p>Hourly series contain their stated sample count, not a complete annual series. Incomplete carbon values are not zero.</p><h2>Identity, units and provenance</h2><pre>${escapeHtml(JSON.stringify(exportDocument(input), null, 2))}</pre></html>`;
}

export function downloadResults(input: ResultExport, format: 'csv' | 'json' | 'html' | 'hourly'): void {
  const types = { csv: 'text/csv;charset=utf-8', json: 'application/json', html: 'text/html;charset=utf-8', hourly: 'text/csv;charset=utf-8' };
  const contents = format === 'csv' ? resultsCsv(input) : format === 'json' ? resultsJson(input) : format === 'html' ? resultsHtml(input) : hourlyCsv(input);
  const url = URL.createObjectURL(new Blob([contents], { type: types[format] }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `epsm-${input.run.id.replace(/[^a-zA-Z0-9_-]/g, '-')}-${format === 'hourly' ? 'hourly-sample.csv' : `results.${format}`}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
