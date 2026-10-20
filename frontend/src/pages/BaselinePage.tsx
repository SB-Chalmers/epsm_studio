// SPDX-License-Identifier: MIT
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { studioClient, studioDrafts } from '../data/client';
import { getReadiness } from '../domain/logic';
import { selectedBuildings } from '../domain/types';
import type { BaselineRun, Engine, ProjectPageProps, Weather } from '../domain/types';
import './studies.css';

const when = (date: string) => new Date(date).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
interface BaselineDraft { baseRevision: number; engine: Engine; weatherId: string; period: number; acknowledged: boolean; demoFailure: boolean; }

export function BaselinePage({ project, onRefresh }: ProjectPageProps) {
  const [search, setSearch] = useSearchParams();
  const [weather, setWeather] = useState<Weather[]>([]);
  const [engine, setEngine] = useState<Engine>('rc');
  const [weatherId, setWeatherId] = useState('');
  const [period, setPeriod] = useState(50);
  const [acknowledged, setAcknowledged] = useState(false);
  const [demoFailure, setDemoFailure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loadedProject, setLoadedProject] = useState('');
  const [acknowledgementRevision, setAcknowledgementRevision] = useState(project.revision);
  const [hasBuildingDraft, setHasBuildingDraft] = useState(false);
  const effectiveAcknowledgement = acknowledged && acknowledgementRevision === project.revision;
  useEffect(() => {
    let active = true;
    setLoadedProject(''); setHasBuildingDraft(false); setError(''); setMessage('');
    Promise.all([studioClient.getWeather(), studioClient.getSettings(), studioDrafts.get<BaselineDraft>(`baseline:${project.id}`), studioDrafts.get(`buildings:${project.id}`)]).then(([choices, settings, draft, buildingDraft]) => {
      if (!active) return;
      setWeather(choices);
      setEngine(draft?.engine ?? settings.defaultEngine);
      setWeatherId(draft?.weatherId ?? choices.find(choice => choice.kind === settings.defaultWeather)?.id ?? choices[0]?.id ?? '');
      setPeriod(draft?.period ?? settings.assessmentPeriod);
      setDemoFailure(draft?.demoFailure ?? false);
      setAcknowledged(draft?.baseRevision === project.revision && draft.acknowledged);
      setAcknowledgementRevision(project.revision);
      setHasBuildingDraft(buildingDraft !== null);
      if (draft && draft.baseRevision !== project.revision) setMessage('Run configuration recovered. Review the changed project inputs and acknowledge RC limitations again.');
      setLoadedProject(project.id);
    }).catch(cause => { if (active) setError(String(cause)); });
    return () => { active = false; };
  }, [project.id]);
  useEffect(() => {
    if (loadedProject !== project.id) return;
    void studioDrafts.set<BaselineDraft>(`baseline:${project.id}`, { baseRevision: project.revision, engine, weatherId, period, acknowledged: effectiveAcknowledgement, demoFailure }).catch(cause => setError(`Run configuration could not be saved: ${String(cause)}`));
  }, [loadedProject, project.id, project.revision, engine, weatherId, period, effectiveAcknowledgement, demoFailure]);
  const runs = [...project.baselines].reverse();
  const run = runs.find(item => item.id === search.get('run')) ?? runs[0];
  const readiness = getReadiness(project, engine, effectiveAcknowledgement);
  if (loadedProject !== project.id) readiness.push('Opening the saved run configuration…');
  if (hasBuildingDraft) readiness.push('Save or discard your unsaved building inputs before starting a new baseline.');
  if (!weatherId) readiness.push('Choose a weather file.');
  if (!Number.isFinite(period) || period < 1 || period > 100) readiness.push('Choose an assessment period from 1 to 100 years.');
  const pending = project.baselines.some(item => item.status === 'queued' || item.status === 'running');
  const selectRun = (id: string) => { const next = new URLSearchParams(search); next.set('run', id); setSearch(next); };
  async function start(retry?: BaselineRun) {
    setBusy(true); setError(''); setMessage('');
    try {
      if (await studioDrafts.get(`buildings:${project.id}`) !== null) { setHasBuildingDraft(true); throw new Error('Save or discard your unsaved building inputs before starting a new baseline.'); }
      const created = await studioClient.runBaseline(project.id, retry ? { engine: retry.engine, weatherId: retry.weatherId, assessmentPeriod: retry.assessmentPeriod, contextOmission: retry.contextOmission, demoFailure: false } : { engine, weatherId, assessmentPeriod: period, contextOmission: effectiveAcknowledgement, demoFailure });
      await onRefresh(); selectRun(created.id); setMessage('Baseline queued. You can leave this page; demo progress is retained.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }
  async function cancel() {
    if (!run) return;
    setBusy(true); setError('');
    try { await studioClient.cancelBaseline(project.id, run.id); await onRefresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }
  return <div className="pc-stack">
    <div className="study-heading"><div><p className="eyebrow">01 / Establish a reference</p><h1>Baseline</h1><p className="pc-muted">Review the portfolio, then freeze a reference run for your studies.</p></div><span className="pc-badge">Illustrative simulation</span></div>
    {error && <p role="alert" className="pc-notice pc-status--danger">{error}</p>}
    {message && <p role="status" className="pc-notice pc-status--success">{message}</p>}
    <section className="pc-panel pc-stack" aria-labelledby="baseline-config-title">
      <div><h3 id="baseline-config-title">Run configuration</h3><p className="pc-help">{selectedBuildings(project).length} selected buildings · project revision {project.revision}. Results use fixtures; no engine is launched.</p></div>
      <div className="study-form-grid">
        <div className="pc-field"><label htmlFor="baseline-engine">Simulation engine</label><select id="baseline-engine" className="pc-input" value={engine} onChange={event => { setEngine(event.target.value as Engine); setAcknowledged(false); }}><option value="rc">RC · fast baseline</option><option value="energyplus">EnergyPlus · detailed comparison</option></select></div>
        <div className="pc-field"><label htmlFor="baseline-weather">Reference weather</label><select id="baseline-weather" className="pc-input" value={weatherId} onChange={event => setWeatherId(event.target.value)}>{weather.map(choice => <option value={choice.id} key={choice.id}>{choice.name}{choice.kind === 'future' ? ' · illustrative future' : ''}</option>)}</select></div>
        <div className="pc-field"><label htmlFor="baseline-period">Carbon assessment period · years</label><input id="baseline-period" className="pc-input" type="number" min="1" max="100" value={period} onChange={event => setPeriod(Number(event.target.value))} /></div>
      </div>
      {weather.find(choice => choice.id === weatherId) && <p className="pc-help">{weather.find(choice => choice.id === weatherId)!.description} Source: {weather.find(choice => choice.id === weatherId)!.source}.</p>}
      {engine === 'rc' && <div className="pc-notice pc-status--warning"><label className="study-check"><input type="checkbox" checked={effectiveAcknowledgement} onChange={event => { setAcknowledged(event.target.checked); setAcknowledgementRevision(project.revision); }} /><span>I understand that this RC configuration omits context shading and geometric self-shading. The footprint remains available for editing; it does not establish those effects in RC results.</span></label></div>}
      {readiness.length > 0 && <div className="pc-stack"><p className="study-selection-title">Before running</p><ul className="study-list-reset pc-help">{readiness.map((reason, index) => <li key={`${reason}-${index}`}>{reason}</li>)}</ul><Link to={`/projects/${project.id}/buildings`}>Review building inputs →</Link></div>}
      <details><summary className="pc-help">Demo controls</summary><label className="study-check"><input type="checkbox" checked={demoFailure} onChange={event => setDemoFailure(event.target.checked)} /> Include an illustrative failed case to explore recovery.</label></details>
      <div className="pc-row"><button className="pc-button pc-button--primary" disabled={busy || readiness.length > 0 || pending} onClick={() => void start()}>{busy ? 'Submitting…' : pending ? 'Baseline in progress' : 'Run baseline'}</button><span className="pc-help">Inputs are frozen at submission. Later edits create a new revision.</span></div>
    </section>
    <section className="pc-panel pc-stack" aria-labelledby="baseline-history-title">
      <h3 id="baseline-history-title">Reference runs <span className="pc-badge">{runs.length}</span></h3>
      {!run ? <div className="study-empty"><p className="pc-muted">Your first baseline will appear here.</p></div> : <div className="study-columns">
        <div className="study-run-list" aria-label="Baseline runs">{runs.map(item => <button className="study-run-card" key={item.id} aria-current={run.id === item.id ? 'true' : undefined} onClick={() => selectRun(item.id)}><strong>{item.name}</strong><span className="pc-help">{item.engine.toUpperCase()} · revision {item.revision}</span><span className="pc-badge study-status">{item.status}</span></button>)}</div>
        <div className="pc-stack">
          <div className="study-heading"><div><h3>{run.name}</h3><p className="pc-help">{when(run.startedAt)} · {run.snapshot.filter(building => building.included).length} buildings · {run.assessmentPeriod} years</p></div><span className="pc-badge study-status">{run.status}</span></div>
          {run.revision !== project.revision && <p className="pc-notice pc-status--warning">This run uses frozen revision {run.revision}. Your current project is revision {project.revision}; run a new baseline before submitting a new study.</p>}
          {(run.status === 'queued' || run.status === 'running') && <div className="study-progress" role="status"><span className="pc-help">{run.status === 'queued' ? 'Waiting for the demo worker' : 'Processing illustrative cases'} · {Math.round(run.progress)}%</span><progress value={run.progress} max="100" aria-label="Baseline progress" /><button className="pc-button" disabled={busy} onClick={() => void cancel()}>Cancel baseline</button></div>}
          {run.status === 'failed' && <p className="pc-notice pc-status--danger">Some cases failed. Inspect retained results or start a fresh attempt using this configuration.</p>}
          {run.status === 'cancelled' && <p className="pc-notice pc-status--warning">This baseline was cancelled. Its frozen inputs and attempt remain available.</p>}
          <div className="pc-row">{run.results.length > 0 && <Link className="pc-button" to={`/projects/${project.id}/results?run=${run.id}`}>Inspect baseline results →</Link>}{run.status === 'completed' && run.revision === project.revision && <Link className="pc-button pc-button--primary" to={`/projects/${project.id}/studies?new=1&baseline=${run.id}`}>Create study</Link>}{(run.status === 'failed' || run.status === 'cancelled') && <button className="pc-button" disabled={busy || pending || hasBuildingDraft || loadedProject !== project.id || run.revision !== project.revision} onClick={() => void start(run)}>Run again as a new baseline</button>}</div>
          <div className="pc-table-wrap"><table className="pc-table"><caption>Execution attempts</caption><thead><tr><th>Attempt</th><th>Status</th><th>Record</th></tr></thead><tbody>{run.attempts.map(attempt => <tr key={attempt.id}><td>#{attempt.number}</td><td className="study-status">{attempt.status}</td><td>{attempt.message}</td></tr>)}</tbody></table></div>
          <details><summary className="pc-help">Frozen input identity</summary><dl className="study-definition"><dt>Run</dt><dd className="study-number">{run.id}</dd><dt>Revision</dt><dd>{run.revision}</dd><dt>Weather</dt><dd>{weather.find(choice => choice.id === run.weatherId)?.name ?? run.weatherId}</dd><dt>Engine</dt><dd>{run.engine === 'rc' ? 'RC · context and self-shading omitted' : 'EnergyPlus'}</dd><dt>Assessment</dt><dd>{run.assessmentPeriod} years</dd></dl></details>
        </div>
      </div>}
    </section>
  </div>;
}
