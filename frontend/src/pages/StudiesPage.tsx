// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { studioClient, studioDrafts } from '../data/client';
import { studyCounts } from '../domain/logic';
import type { CatalogueItem, ProjectPageProps, RenovationPackage, Study, StudyInput, StudyTemplate, Weather } from '../domain/types';
import './studies.css';

const templates: { id: StudyTemplate; title: string; detail: string }[] = [
  { id: 'weather', title: 'Weather impact', detail: 'Keep the building unchanged; compare typical, actual and illustrative future climates.' },
  { id: 'renovation', title: 'Compare renovations', detail: 'Compare physical renovation packages under one reference weather.' },
  { id: 'robust', title: 'Robust renovation', detail: 'Test packages across weather conditions; rank by worst total carbon.' },
  { id: 'custom', title: 'Custom scenario grid', detail: 'Choose a finite combination of packages and weather conditions.' },
];

interface StudyEditorDraft {
  baseUpdatedAt: string; name: string; baselineId: string | null; period: number;
  packageIds: string[]; weatherIds: string[]; demoFailure: boolean;
  packageName: string; packageDescription: string; measureIds: string[];
}

export function StudiesPage({ project, onRefresh }: ProjectPageProps) {
  const [search, setSearch] = useSearchParams();
  const [weather, setWeather] = useState<Weather[]>([]);
  const [packages, setPackages] = useState<RenovationPackage[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [createName, setCreateName] = useState('');
  const [createTemplate, setCreateTemplate] = useState<StudyTemplate>('renovation');
  const [name, setName] = useState('');
  const [baselineId, setBaselineId] = useState<string | null>(null);
  const [period, setPeriod] = useState(50);
  const [defaultPeriod, setDefaultPeriod] = useState(50);
  const [packageIds, setPackageIds] = useState<string[]>([]);
  const [weatherIds, setWeatherIds] = useState<string[]>([]);
  const [demoFailure, setDemoFailure] = useState(false);
  const [packageName, setPackageName] = useState('');
  const [packageDescription, setPackageDescription] = useState('');
  const [measureIds, setMeasureIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loadedEditorKey, setLoadedEditorKey] = useState('');
  const [loadedCreateKey, setLoadedCreateKey] = useState('');
  const [storedEditorVersion, setStoredEditorVersion] = useState('');
  const [storedCreateVersion, setStoredCreateVersion] = useState('');
  const baseUpdatedAt = useRef('');
  const creating = search.get('new') === '1';
  const studies = [...project.studies].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const selected = studies.find(study => study.id === search.get('study')) ?? studies[0];
  const editorKey = selected ? `study-editor:${project.id}:${selected.id}` : '';
  const createKey = `study-new:${project.id}`;
  const editorVersion = JSON.stringify({ name, baselineId, period, packageIds, weatherIds, demoFailure, packageName, packageDescription, measureIds });
  const createVersion = JSON.stringify({ name: createName, template: createTemplate });
  const compatible = [...project.baselines].reverse().filter(run => run.status === 'completed' && run.revision === project.revision);
  useEffect(() => {
    let active = true;
    Promise.all([studioClient.getWeather(), studioClient.getPackages(), studioClient.getCatalogue(), studioClient.getSettings()]).then(([w, p, c, settings]) => { if (active) { setWeather(w); setPackages(p); setCatalogue(c); setDefaultPeriod(settings.assessmentPeriod); } }).catch(cause => setError(String(cause)));
    return () => { active = false; };
  }, [project.id]);
  useEffect(() => {
    let active = true;
    setLoadedCreateKey('');
    void studioDrafts.get<{ name: string; template: StudyTemplate }>(createKey).then(draft => {
      if (!active) return;
      setCreateName(draft?.name ?? ''); setCreateTemplate(draft?.template ?? 'renovation'); setLoadedCreateKey(createKey);
    }).catch(cause => { if (active) setError(`Draft could not be restored: ${String(cause)}`); });
    return () => { active = false; };
  }, [createKey]);
  useEffect(() => {
    let active = true;
    setLoadedEditorKey('');
    if (!selected) return;
    const saved = selected;
    void studioDrafts.get<StudyEditorDraft>(editorKey).then(draft => {
      if (!active) return;
      const recovered = saved.status === 'draft' ? draft : null;
      baseUpdatedAt.current = saved.updatedAt;
      setName(recovered?.name ?? saved.name); setBaselineId(recovered ? recovered.baselineId : saved.baselineId); setPeriod(recovered?.period ?? saved.assessmentPeriod); setPackageIds(recovered?.packageIds ?? saved.packageIds); setWeatherIds(recovered?.weatherIds ?? saved.weatherIds); setDemoFailure(recovered?.demoFailure ?? saved.demoFailure);
      setPackageName(recovered?.packageName ?? ''); setPackageDescription(recovered?.packageDescription ?? ''); setMeasureIds(recovered?.measureIds ?? []);
      if (recovered && recovered.baseUpdatedAt !== saved.updatedAt) setMessage('Recovered a browser draft based on an earlier saved study. Review its inputs before saving.');
      setLoadedEditorKey(editorKey);
    }).catch(cause => { if (active) setError(`Draft could not be restored: ${String(cause)}`); });
    return () => { active = false; };
  }, [project.id, selected?.id]);
  useEffect(() => {
    if (loadedCreateKey !== createKey) return;
    void studioDrafts.set(createKey, { name: createName, template: createTemplate }).then(() => setStoredCreateVersion(`${createKey}:${createVersion}`)).catch(cause => setError(`Draft could not be saved: ${String(cause)}`));
  }, [createName, createTemplate, createKey, loadedCreateKey, createVersion]);
  useEffect(() => {
    if (!selected || selected.status !== 'draft' || loadedEditorKey !== editorKey) return;
    void studioDrafts.set<StudyEditorDraft>(editorKey, { baseUpdatedAt: baseUpdatedAt.current, name, baselineId, period, packageIds, weatherIds, demoFailure, packageName, packageDescription, measureIds }).then(() => setStoredEditorVersion(`${editorKey}:${editorVersion}`)).catch(cause => setError(`Draft could not be saved: ${String(cause)}`));
  }, [name, baselineId, period, packageIds, weatherIds, demoFailure, packageName, packageDescription, measureIds, loadedEditorKey, editorKey, selected?.status, editorVersion]);
  const select = (id: string) => { const next = new URLSearchParams(search); next.delete('new'); next.delete('baseline'); next.set('study', id); setSearch(next); setError(''); setMessage(''); };
  const newStudy = () => { const next = new URLSearchParams(search); next.set('new', '1'); setSearch(next); };
  async function act(work: () => Promise<void>) {
    setBusy(true); setError(''); setMessage('');
    try { await work(); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }
  const patch = (): Partial<StudyInput> => ({ name: name.trim(), baselineId, assessmentPeriod: period, packageIds, weatherIds, demoFailure });
  async function create() {
    await act(async () => {
      const baseline = compatible.find(run => run.id === search.get('baseline')) ?? compatible[0];
      const referenceWeather = baseline?.weatherId ?? weather.find(item => item.kind === 'tmy')?.id ?? weather[0]?.id;
      const selectedPackages = createTemplate === 'weather' ? ['baseline'] : packages.filter(item => item.id !== 'incomplete').slice(0, 3).map(item => item.id);
      const selectedWeather = createTemplate === 'renovation' ? (referenceWeather ? [referenceWeather] : []) : weather.filter(item => item.kind !== 'future').map(item => item.id);
      const created = await studioClient.createStudy(project.id, { name: createName.trim() || templates.find(template => template.id === createTemplate)!.title, template: createTemplate, baselineId: baseline?.id ?? null, assessmentPeriod: baseline?.assessmentPeriod ?? defaultPeriod, packageIds: selectedPackages, weatherIds: selectedWeather });
      await studioDrafts.remove(createKey); setCreateName('');
      await onRefresh(); select(created.id); setMessage('Draft created. Configure scenarios now, even before a baseline is ready.');
    });
  }
  async function save(study: Study, submit = false) {
    await act(async () => {
      if (study.status === 'draft') {
        const saved = await studioClient.updateStudy(project.id, study.id, patch());
        baseUpdatedAt.current = saved.updatedAt;
        await studioDrafts.set<StudyEditorDraft>(editorKey, { baseUpdatedAt: saved.updatedAt, name, baselineId, period, packageIds, weatherIds, demoFailure, packageName, packageDescription, measureIds });
      }
      else await studioClient.updateStudy(project.id, study.id, { name: name.trim() });
      if (submit) { await studioClient.submitStudy(project.id, study.id); await studioDrafts.remove(editorKey); }
      await onRefresh(); setMessage(submit ? 'Study queued. Frozen inputs and attempts are retained when you leave this page.' : 'Study saved.');
    });
  }
  const preview = selected ? { ...selected, ...patch(), name, baselineId, assessmentPeriod: period, packageIds, weatherIds } as Study : undefined;
  const counts = preview ? studyCounts(project, preview) : null;
  const editable = selected?.status === 'draft';
  const baseline = project.baselines.find(run => run.id === baselineId);
  const invalidBaseline = !baseline || baseline.status !== 'completed' || baseline.revision !== project.revision;
  const toggle = (values: string[], id: string) => values.includes(id) ? values.filter(value => value !== id) : [...values, id];
  const measures = catalogue.filter(item => item.kind === 'renovation');
  const conflicts = measures.filter(item => measureIds.includes(item.id)).flatMap(item => (item.incompatibleWith ?? []).filter(id => measureIds.includes(id)).map(id => `${item.name} cannot be combined with ${measures.find(measure => measure.id === id)?.name ?? id}.`));
  const unsaved = editable && (name !== selected.name || baselineId !== selected.baselineId || period !== selected.assessmentPeriod || JSON.stringify(packageIds) !== JSON.stringify(selected.packageIds) || JSON.stringify(weatherIds) !== JSON.stringify(selected.weatherIds) || demoFailure !== selected.demoFailure || !!packageName || !!packageDescription || measureIds.length > 0);
  return <div className="pc-stack">
    <div className="study-heading"><div><p className="eyebrow">02 / Explore alternatives</p><h1>Studies</h1><p className="pc-muted">Ask a question, build the scenario grid, and compare it with a frozen baseline.</p></div><button className="pc-button pc-button--primary" onClick={newStudy}>New study</button></div>
    {error && <p role="alert" className="pc-notice pc-status--danger">{error}</p>}{message && <p role="status" className="pc-notice pc-status--success">{message}</p>}
    {(creating || !selected) && <section className="pc-panel pc-stack" aria-labelledby="create-study-title">
      <div><h3 id="create-study-title">What would you like to study?</h3><p className="pc-help">Start a draft at any time. A compatible baseline is needed only when running it.</p></div>
      <div className="study-template-options">{templates.map(template => <button key={template.id} className="study-template" aria-pressed={createTemplate === template.id} onClick={() => setCreateTemplate(template.id)}><strong>{template.title}</strong><span>{template.detail}</span></button>)}</div>
      <div className="pc-row"><div className="pc-field study-inline-field"><label htmlFor="new-study-name">Study name</label><input className="pc-input" id="new-study-name" disabled={loadedCreateKey !== createKey} value={createName} onChange={event => setCreateName(event.target.value)} placeholder={templates.find(template => template.id === createTemplate)?.title} maxLength={120} /></div><button className="pc-button pc-button--primary" disabled={busy || !weather.length || !packages.length || loadedCreateKey !== createKey} onClick={() => void create()}>Create draft</button>{creating && selected && <button className="pc-button" onClick={() => select(selected.id)}>Close</button>}</div>
      {!!createName && <p className="pc-help" role="status">{storedCreateVersion === `${createKey}:${createVersion}` ? 'New study form saved locally.' : 'Saving new study form…'}</p>}
    </section>}
    {selected && !creating && loadedEditorKey !== editorKey && <p role="status" className="pc-help">Restoring your study draft…</p>}
    {selected && !creating && loadedEditorKey === editorKey && <div className="study-columns pc-panel">
      <aside className="study-run-list" aria-label="Your studies">{studies.map(study => <button key={study.id} className="study-run-card" aria-current={selected.id === study.id ? 'true' : undefined} onClick={() => select(study.id)}><strong>{study.name}</strong><span className="pc-help">{templates.find(template => template.id === study.template)?.title}</span><span className="pc-badge study-status">{study.status}</span></button>)}</aside>
      <section className="pc-stack" aria-label="Scenario builder">
        {unsaved && <p className="pc-notice pc-status--warning" role="status">Unsaved study edits are recoverable in this account’s browser draft. Save the draft before submitting it.</p>}
        {unsaved && <p className="pc-help" role="status">{storedEditorVersion === `${editorKey}:${editorVersion}` ? 'Browser draft saved locally.' : 'Saving browser draft…'}</p>}
        <div className="study-heading"><div><p className="study-subtitle">{templates.find(template => template.id === selected.template)?.title}</p><h3>Scenario builder</h3></div><span className="pc-badge study-status">{selected.status}</span></div>
        <div className="pc-row"><div className="pc-field study-inline-field"><label htmlFor="study-name">Study name</label><input id="study-name" className="pc-input" value={name} maxLength={120} onChange={event => setName(event.target.value)} /></div><button className="pc-button" disabled={busy || !name.trim()} onClick={() => void save(selected)}>Save {editable ? 'draft' : 'name'}</button><button className="pc-button" disabled={busy} onClick={() => void act(async () => { const copy = await studioClient.duplicateStudy(project.id, selected.id); await onRefresh(); select(copy.id); })}>Duplicate</button></div>
        {!editable && <p className="pc-notice pc-status--info">Submitted inputs are frozen. Duplicate this study to change the question or its scenarios.</p>}
        <div className="study-form-grid"><div className="pc-field"><label htmlFor="study-baseline">Reference baseline</label><select className="pc-input" id="study-baseline" value={baselineId ?? ''} disabled={!editable} onChange={event => setBaselineId(event.target.value || null)}><option value="">Choose when ready</option>{project.baselines.filter(run => run.status === 'completed').map(run => <option key={run.id} value={run.id}>{run.name} · {run.engine.toUpperCase()} · revision {run.revision}{run.revision !== project.revision ? ' (stale)' : ''}</option>)}</select></div><div className="pc-field"><label htmlFor="study-period">Carbon assessment · years</label><input className="pc-input" id="study-period" type="number" min="1" max="100" disabled={!editable} value={period} onChange={event => setPeriod(Number(event.target.value))} /></div></div>
        {editable && invalidBaseline && <p className="pc-notice pc-status--warning">Keep configuring this draft. <Link to={`/projects/${project.id}/baseline`}>Run a baseline for revision {project.revision}</Link> before submitting.</p>}
        {selected.revision !== project.revision && !editable && <p className="pc-notice pc-status--warning">Results belong to frozen revision {selected.revision}. Current project: revision {project.revision}.</p>}
        <fieldset disabled={!editable || busy} className="study-fieldset"><legend className="study-selection-title">Renovation packages</legend><p className="pc-help">Each package is one atomic bundle. Compare packages; do not apply all selected alternatives cumulatively.</p>{packages.filter(item => selected.template !== 'weather' || item.id === 'baseline').map(item => <label className="study-choice" key={item.id}><input type="checkbox" checked={packageIds.includes(item.id)} onChange={() => setPackageIds(toggle(packageIds, item.id))} /><span><strong>{item.name}</strong><small>{item.description}</small>{item.measureIds.length > 0 && <small>Measures: {item.measureIds.map(id => catalogue.find(entry => entry.id === id)?.name ?? id).join(' + ')}</small>}</span></label>)}</fieldset>
        {editable && selected.template !== 'weather' && <details className="study-inspector"><summary className="study-table-button">Compose a renovation package</summary><div className="pc-stack"><p className="pc-help">Combine resolved catalogue measures into one named alternative. This demonstration stores the package in your local workspace.</p><div className="pc-field"><label htmlFor="package-name">Package name</label><input className="pc-input" id="package-name" value={packageName} onChange={event => setPackageName(event.target.value)} maxLength={100} /></div><div className="pc-field"><label htmlFor="package-description">Description</label><input className="pc-input" id="package-description" value={packageDescription} onChange={event => setPackageDescription(event.target.value)} /></div><fieldset className="study-fieldset" disabled={busy}><legend className="study-selection-title">Physical measures</legend>{measures.map(measure => <label key={measure.id} className="study-choice"><input type="checkbox" checked={measureIds.includes(measure.id)} onChange={() => setMeasureIds(toggle(measureIds, measure.id))} /><span><strong>{measure.name}</strong><small>{measure.source} · {measure.version}</small>{measure.incompleteCarbon && <small>Incomplete embodied-carbon factors</small>}</span></label>)}</fieldset>{conflicts.map(conflict => <p role="alert" className="pc-error" key={conflict}>{conflict}</p>)}<div><button className="pc-button" disabled={busy || !packageName.trim() || !measureIds.length || conflicts.length > 0} onClick={() => void act(async () => { const saved = await studioClient.savePackage({ name: packageName.trim(), description: packageDescription.trim(), measureIds }); setPackages(await studioClient.getPackages()); setPackageIds(previous => [...previous, saved.id]); setPackageName(''); setPackageDescription(''); setMeasureIds([]); setMessage('Package saved and selected for this draft.'); })}>Save and select package</button></div></div></details>}
        <fieldset disabled={!editable || busy} className="study-fieldset"><legend className="study-selection-title">Weather conditions</legend><p className="pc-help">AMY uses observed years; TMY is a typical year. Future weather is illustrative until a provider is integrated.</p>{weather.map(item => <label className="study-choice" key={item.id}><input type={selected.template === 'renovation' ? 'radio' : 'checkbox'} name="study-weather" checked={weatherIds.includes(item.id)} onChange={() => setWeatherIds(selected.template === 'renovation' ? [item.id] : toggle(weatherIds, item.id))} /><span><strong>{item.name} {item.kind === 'future' && <span className="pc-badge">Illustrative future</span>}</strong><small>{item.station} · {item.distanceKm} km · {item.source}</small><small>{item.description}</small></span></label>)}</fieldset>
        {selected.template === 'robust' && <p className="pc-notice pc-status--info">Robustness compares each package across the selected weather conditions. Ranking minimises its worst complete portfolio total carbon (embodied + operational). Missing carbon is excluded and disclosed.</p>}
        {counts && <section className="pc-panel pc-stack" aria-labelledby="study-count-title"><h3 id="study-count-title">Execution preview</h3><dl className="pc-metrics"><div><dt>Portfolio scenarios</dt><dd>{counts.scenarios}</dd></div><div><dt>Building cases</dt><dd>{counts.cases}</dd></div><div><dt>Reusable baseline cases</dt><dd>{counts.reused}</dd></div><div><dt>New demo executions</dt><dd>{counts.executions}</dd></div></dl><p className="pc-help">Packages × weather = portfolio scenarios. Each selected building creates a case. Retry attempts are retained separately; reuse requires matching frozen inputs, engine and weather.</p></section>}
        {editable && <details><summary className="pc-help">Demo controls</summary><label className="study-check"><input type="checkbox" checked={demoFailure} onChange={event => setDemoFailure(event.target.checked)} /> Include an illustrative failed case for retry testing.</label></details>}
        {(selected.status === 'queued' || selected.status === 'running') && <div className="study-progress" role="status"><span className="pc-help">{selected.status === 'queued' ? 'Queued for the demo worker' : 'Processing illustrative scenarios'} · {Math.round(selected.progress)}%</span><progress value={selected.progress} max="100" aria-label="Study progress" /><button className="pc-button" disabled={busy} onClick={() => void act(async () => { await studioClient.cancelStudy(project.id, selected.id); await onRefresh(); })}>Cancel study</button></div>}
        {selected.status === 'failed' && <p className="pc-notice pc-status--danger">One or more cases failed. Completed results and failure records remain available; retry failed cases explicitly.</p>}{selected.status === 'cancelled' && <p className="pc-notice pc-status--warning">Cancelled. The frozen plan and attempts remain available.</p>}
        <div className="pc-row">{editable && <button className="pc-button pc-button--primary" disabled={busy || invalidBaseline || !packageIds.length || !weatherIds.length || !name.trim() || period < 1 || period > 100} onClick={() => void save(selected, true)}>Save and run study</button>}{selected.results.length > 0 && <Link className="pc-button pc-button--primary" to={`/projects/${project.id}/results?study=${selected.id}`}>Open study results →</Link>}{(selected.status === 'failed' || selected.status === 'cancelled') && <button className="pc-button" disabled={busy} onClick={() => void act(async () => { await studioClient.retryStudy(project.id, selected.id); await onRefresh(); })}>Retry unfinished cases</button>}</div>
        {selected.attempts.length > 0 && <div className="pc-table-wrap"><table className="pc-table"><caption>Retained attempts · {selected.attempts.length}</caption><thead><tr><th>Attempt</th><th>Status</th><th>Record</th></tr></thead><tbody>{selected.attempts.map(attempt => <tr key={attempt.id}><td>#{attempt.number}</td><td className="study-status">{attempt.status}</td><td>{attempt.message}</td></tr>)}</tbody></table></div>}
      </section>
    </div>}
  </div>;
}
