// SPDX-License-Identifier: MIT
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { studioClient, studioDrafts } from '../data/client';
import type { Point, Project } from '../domain/types';
import { FootprintEditor } from '../components/FootprintEditor';
import { SpatialMap } from '../components/SpatialMap';
import { ScenePreview } from '../components/ScenePreview';
import { containsPolygon, draftBuilding, polygonsIntersect, polygonArea, polygonError, syntheticPreviewContext, toGeographic } from '../components/spatial';
import '../components/spatial.css';

interface NewProjectDraft { name: string; description: string; route: Project['route']; siteType: Project['siteType']; location: Point; target: Point[] | null; context: Point[] | null; footprint: Point[]; height: number; storeys: number; preset: Project['contextPreset']; }

export function NewProjectPage() {
  const navigate = useNavigate();
  const [name, setName] = useState(''), [description, setDescription] = useState('');
  const [route, setRoute] = useState<Project['route']>('map'), [siteType, setSiteType] = useState<Project['siteType']>('hypothetical');
  const [sample, setSample] = useState<Awaited<ReturnType<typeof studioClient.getSampleBuildings>>>();
  const [location, setLocation] = useState<Point>([11.9665, 57.6983]);
  const [target, setTarget] = useState<Point[] | null>(null), [context, setContext] = useState<Point[] | null>(null);
  const [footprint, setFootprint] = useState<Point[]>([[-10, -6], [10, -6], [10, 6], [-10, 6]]);
  const [height, setHeight] = useState(9), [storeys, setStoreys] = useState(3), [preset, setPreset] = useState<Project['contextPreset']>('urban_lowrise_dense');
  const [preview, setPreview] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [draftReady, setDraftReady] = useState(false), [recovered, setRecovered] = useState(false);
  useEffect(() => { let cancelled = false; Promise.all([studioClient.getSampleBuildings(), studioDrafts.get<NewProjectDraft>('new-project')]).then(([data, draft]) => {
    if (cancelled) return;
    setSample(data);
    if (draft) { setName(draft.name); setDescription(draft.description); setRoute(draft.route); setSiteType(draft.siteType); setLocation(draft.location); setTarget(draft.target); setContext(draft.context); setFootprint(draft.footprint); setHeight(draft.height); setStoreys(draft.storeys); setPreset(draft.preset); setRecovered(true); }
    else { setTarget(data.targetBoundary); setContext(data.contextBoundary); setLocation(data.location); }
    setDraftReady(true);
  }).catch(failure => { if (!cancelled) setError(String(failure)); }); return () => { cancelled = true; }; }, []);
  useEffect(() => { if (!draftReady) return; void studioDrafts.set<NewProjectDraft>('new-project', { name, description, route, siteType, location, target, context, footprint, height, storeys, preset }).catch(failure => setError(`Draft could not be saved: ${String(failure)}`)); }, [draftReady, name, description, route, siteType, location, target, context, footprint, height, storeys, preset]);
  const isActual = route === 'map' || siteType === 'actual';
  const custom = useMemo(() => {
    const building = draftBuilding('Custom building', footprint, 'local', height, storeys);
    if (isActual) {
      building.coordinateSpace = 'geographic'; building.footprint = footprint.map(point => toGeographic(point, location));
      building.components = building.components.map(component => ({ ...component, footprint: building.footprint }));
    }
    return building;
  }, [footprint, height, storeys, isActual, location]);
  const candidates = sample?.buildings ?? [];
  const selection = route === 'map' ? candidates.filter(building => target && polygonsIntersect(building.footprint, target)) : [custom];
  const synthetic = useMemo(() => syntheticPreviewContext(custom, preset), [custom, preset]);
  const neighbours = isActual ? context ? [...candidates, ...(sample?.context ?? [])].filter(building => polygonsIntersect(building.footprint, context) && !selection.some(selected => selected.id === building.id) && (route === 'map' || !polygonsIntersect(building.footprint, custom.footprint))) : [] : synthetic;
  const selectedOutline = route === 'map' ? target : custom.footprint;
  const boundaryError = isActual && (!context ? 'Draw a context area before creating the project.' : polygonError(context) ? `Context area: ${polygonError(context)}` : !selectedOutline ? 'Draw a simulation-target area.' : !containsPolygon(context, selectedOutline) ? 'The context area must contain the entire simulation-target boundary.' : selection.some(building => !containsPolygon(context, building.footprint)) ? 'Expand context to contain every selected building’s full footprint, including buildings crossing the target boundary.' : null);
  const shapeError = route === 'custom' ? polygonError(footprint) : target ? polygonError(target) : 'Draw the simulation-target area.';
  const outsideSample = isActual && sample && selectedOutline && !containsPolygon(sample.contextBoundary, selectedOutline);
  const create = async () => {
    setError('');
    if (!name.trim()) { setError('Enter a project name.'); return; }
    if (shapeError || boundaryError) { setError(shapeError || boundaryError || 'Review the geometry.'); return; }
    if (!selection.length) { setError('No sample buildings are inside this target area. Return to the Gothenburg sample or draw a custom building.'); return; }
    if (!Number.isFinite(height) || height <= 0 || !Number.isInteger(storeys) || storeys < 1) { setError('Height must be positive and storeys must be a positive whole number.'); return; }
    setBusy(true);
    try {
      const project = await studioClient.createProject({ name: name.trim(), description, route, siteType: isActual ? 'actual' : 'hypothetical', location, contextPreset: isActual ? 'none' : preset, targetBoundary: isActual ? selectedOutline : null, contextBoundary: isActual ? context : null, buildings: selection.map(building => ({ ...building, included: true })), contextBuildings: neighbours });
      await studioDrafts.remove('new-project'); setDraftReady(false);
      navigate(`/projects/${project.id}/buildings`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : String(failure)); } finally { setBusy(false); }
  };
  return <div className="spatial-page">
    <div className="spatial-heading"><div><p className="spatial-eyebrow">A new starting point</p><h1>Create a project</h1><p>Define the place and buildings first. Review their evidence before running a baseline.</p></div><Link className="pc-button" to="/home">Back to home</Link></div>
    {recovered && <p className="pc-notice" role="status">Recovered your unfinished project draft. Form edits stay private to this demo account in this browser.</p>}
    <section className="spatial-section"><h2>01 · Choose your buildings</h2><div className="spatial-choice-grid" role="group" aria-label="Project creation path">
      <button className="spatial-choice" type="button" aria-pressed={route === 'map'} onClick={() => setRoute('map')}><span className="spatial-choice-mark">01</span><strong>Select from map</strong><span>Select simulation targets and their surrounding context. Review source evidence and apply archetypes.</span></button>
      <button className="spatial-choice" type="button" aria-pressed={route === 'custom'} onClick={() => setRoute('custom')}><span className="spatial-choice-mark">02</span><strong>Author a custom building</strong><span>Draw a hypothetical design or place a new building on an actual site.</span></button>
    </div></section>
    {route === 'custom' && <section className="spatial-section"><h2>02 · Choose a site</h2><div className="spatial-toolbar" role="group" aria-label="Custom building site type"><button className="pc-button" aria-pressed={siteType === 'hypothetical'} onClick={() => setSiteType('hypothetical')}>Hypothetical site</button><button className="pc-button" aria-pressed={siteType === 'actual'} onClick={() => setSiteType('actual')}>Actual site</button></div>
      {siteType === 'hypothetical' ? <label className="spatial-field">Synthetic neighbourhood<select className="pc-input" value={preset} onChange={event => setPreset(event.target.value as Project['contextPreset'])}><option value="none">Open site · no neighbours</option><option value="rural">Rural · sparse low neighbours</option><option value="urban_lowrise_dense">Dense low-rise · 6–15 m neighbours</option><option value="urban_highrise_dense">Dense high-rise · 24–60 m neighbours</option></select><span className="spatial-hint">Aligned with Core presets. Illustrative geometry, seed 0, radius 100 m. The prototype records this choice; scientific context is generated later by Core.</span></label> : <p className="pc-notice">The footprint is authored in local metres and positioned at the location below. Draw a context boundary around it to collect neighbouring massing.</p>}
    </section>}
    {isActual && <section className="spatial-section"><h2>{route === 'map' ? '02' : '03'} · Define the site</h2><div className="spatial-location"><label>Longitude (°)<input className="pc-input" type="number" step="0.0001" value={location[0]} onChange={event => setLocation([Number(event.target.value), location[1]])} /></label><label>Latitude (°)<input className="pc-input" type="number" step="0.0001" value={location[1]} onChange={event => setLocation([location[0], Number(event.target.value)])} /></label><button className="pc-button" onClick={() => { if (sample) { setTarget(sample.targetBoundary); setContext(sample.contextBoundary); setLocation(sample.location); } }}>Use Gothenburg sample</button></div>
      <p className="pc-notice">Real map · sample building evidence. The fixed Gothenburg sample is independent of the basemap. This prototype does not fetch national building records.</p>
      <SpatialMap buildings={route === 'map' ? candidates.map(building => ({ ...building, included: selection.some(selected => selected.id === building.id) })) : [custom]} context={route === 'map' ? sample?.context : neighbours} targetBoundary={route === 'map' ? target : custom.footprint} contextBoundary={context} location={location} editable editableRoles={route === 'custom' ? ['context'] : undefined} onBoundaryChange={(role, points) => { if (role === 'context') setContext(points); else if (route === 'map') setTarget(points); }} />
      {outsideSample && <p className="pc-notice spatial-warning">Outside sample coverage. The map can move anywhere, but building evidence is only available in the Gothenburg sample. Use custom authoring for this location.</p>}
      {boundaryError && <p className="pc-notice spatial-warning">Selection check: {boundaryError}</p>}
      <div className="spatial-summary"><span><strong>{selection.length}</strong> simulation targets</span><span><strong>{neighbours.length}</strong> context buildings</span><span>Every intersecting footprint is retained in full; review individual inclusions next.</span></div>
    </section>}
    {route === 'custom' && <section className="spatial-section"><h2>{isActual ? '04' : '03'} · Draw the building</h2><FootprintEditor value={footprint} onChange={setFootprint} /><div className="editor-controls"><label>Building height (m)<input className="pc-input" type="number" min="1" step="0.1" value={height} onChange={event => setHeight(Number(event.target.value))} /></label><label>Above-ground storeys<input className="pc-input" type="number" min="1" step="1" value={storeys} onChange={event => setStoreys(Number(event.target.value))} /></label><span>Illustrative floor area: {(polygonArea(footprint) * storeys).toFixed(0)} m² · review area basis in the building inspector.</span></div><p className="spatial-hint">Starts with explicit illustrative residential defaults. Set construction year, function, fabric, systems and the heated area in the next step.</p></section>}
    <section className="spatial-section"><div className="spatial-heading"><div><h2>Preview the starting model</h2><p>The next step opens a linked map, table and inspector for each building.</p></div><button className="pc-button" onClick={() => setPreview(value => !value)}>{preview ? 'Hide 3D preview' : 'Show 3D preview'}</button></div>{preview && <ScenePreview buildings={selection} context={neighbours} />}</section>
    <section className="spatial-section"><h2>Name your project</h2><div className="spatial-form-grid"><label>Project name · required<input className="pc-input" required maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="For example, Gothenburg courtyard portfolio" /></label><label>Description<textarea className="pc-input" value={description} onChange={event => setDescription(event.target.value)} rows={2} placeholder="What would you like to investigate?" /></label></div>
      {error && <p className="pc-notice spatial-error" role="alert">{error}</p>}<div className="spatial-actions"><button className="pc-button pc-button--primary" disabled={busy || !sample} onClick={create}>{busy ? 'Creating project…' : 'Create project & review buildings'}</button><span>Saved privately in this browser’s demo workspace.</span></div>
    </section>
  </div>;
}
export default NewProjectPage;
