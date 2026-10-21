// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MapInstance } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { TerraDraw, TerraDrawPolygonMode, TerraDrawRectangleMode, TerraDrawSelectMode } from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';
import type { FeatureCollection, Feature, Polygon } from 'geojson';
import type { Building, Point } from '../domain/types';
import { centre, polygonArea, toLocal } from './spatial';
import 'maplibre-gl/dist/maplibre-gl.css';
import './spatial.css';

export type BoundaryRole = 'target' | 'context';
export interface SpatialMapProps { buildings: Building[]; context?: Building[]; targetBoundary?: Point[] | null; contextBoundary?: Point[] | null; location?: Point; selectedId?: string; onSelect?: (id: string) => void; editable?: boolean; editableRoles?: BoundaryRole[]; onBoundaryChange?: (role: BoundaryRole, points: Point[] | null) => void; }
const closed = (ring: Point[]) => [...ring, ring[0]];
const polygonFeature = (id: string, ring: Point[], properties: Record<string, string | boolean>): Feature<Polygon> => ({ type: 'Feature', id, properties, geometry: { type: 'Polygon', coordinates: [closed(ring)] } });
const blankStyle = { version: 8 as const, sources: {}, layers: [{ id: 'paper', type: 'background' as const, paint: { 'background-color': '#f1f2ee' } }] };
// MapLibre 6 ships an external worker; bundle it rather than resolving it beside Vite's prebundle.
maplibregl.setWorkerUrl(workerUrl);

export function SpatialMap(props: SpatialMapProps) {
  const host = useRef<HTMLDivElement>(null), map = useRef<MapInstance>(), drawing = useRef<TerraDraw>(), latest = useRef(props), role = useRef<BoundaryRole>('target');
  const [ready, setReady] = useState(false), [warning, setWarning] = useState(''), [mode, setMode] = useState('pan'), [activeRole, setActiveRole] = useState<BoundaryRole>(props.editableRoles?.[0] ?? 'target');
  latest.current = props;
  const features = (): FeatureCollection => ({ type: 'FeatureCollection', features: [
    ...latest.current.buildings.filter(building => building.coordinateSpace === 'geographic').map(building => polygonFeature(building.id, building.footprint, { role: 'building', selected: building.id === latest.current.selectedId, included: building.included, name: building.name })),
    ...(latest.current.context ?? []).filter(building => building.coordinateSpace === 'geographic').map(building => polygonFeature(building.id, building.footprint, { role: 'neighbour', selected: building.id === latest.current.selectedId, included: false, name: building.name })),
    ...(latest.current.contextBoundary?.length ? [polygonFeature('context-boundary', latest.current.contextBoundary, { role: 'context', selected: false })] : []),
    ...(latest.current.targetBoundary?.length ? [polygonFeature('target-boundary', latest.current.targetBoundary, { role: 'target', selected: false })] : []),
  ] });
  useEffect(() => {
    if (!host.current) return;
    let disposed = false, fallback: ReturnType<typeof setTimeout>;
    try {
      const instance = new maplibregl.Map({ container: host.current, style: 'https://tiles.openfreemap.org/styles/positron', center: latest.current.location ?? [11.9665, 57.6983], zoom: 15.5, attributionControl: { compact: false } });
      map.current = instance;
      instance.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
      instance.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
      const initialise = () => {
        if (disposed || instance.getSource('studio-geometry')) return;
        clearTimeout(fallback);
        instance.addSource('studio-geometry', { type: 'geojson', data: features() });
        instance.addLayer({ id: 'studio-fills', type: 'fill', source: 'studio-geometry', paint: { 'fill-color': ['case', ['==', ['get', 'selected'], true], '#E9543F', ['==', ['get', 'role'], 'building'], '#818b81', '#777d78'], 'fill-opacity': ['case', ['==', ['get', 'role'], 'context'], .025, ['==', ['get', 'role'], 'target'], .04, .3] } });
        instance.addLayer({ id: 'studio-selection-casing', type: 'line', source: 'studio-geometry', filter: ['==', ['get', 'selected'], true], paint: { 'line-color': '#ffffff', 'line-width': 7 } });
        instance.addLayer({ id: 'studio-outlines', type: 'line', source: 'studio-geometry', filter: ['!=', ['get', 'role'], 'context'], paint: { 'line-color': ['case', ['==', ['get', 'selected'], true], '#E9543F', '#272B2B'], 'line-width': ['case', ['==', ['get', 'selected'], true], 3, 1.8] } });
        instance.addLayer({ id: 'studio-context-boundary', type: 'line', source: 'studio-geometry', filter: ['==', ['get', 'role'], 'context'], paint: { 'line-color': '#272B2B', 'line-width': 2, 'line-dasharray': [3, 2] } });
        const draw = new TerraDraw({ adapter: new TerraDrawMapLibreGLAdapter({ map: instance, coordinatePrecision: 9 }), modes: [new TerraDrawRectangleMode({ drawInteraction: 'click-drag', styles: { fillColor: '#E9543F', fillOpacity: .08, outlineColor: '#AE3729', outlineWidth: 2 } }), new TerraDrawPolygonMode({ styles: { fillColor: '#E9543F', fillOpacity: .08, outlineColor: '#AE3729', outlineWidth: 2 } }), new TerraDrawSelectMode({ flags: { polygon: { feature: { draggable: true, coordinates: { draggable: true, midpoints: true, deletable: true } } }, rectangle: { feature: { draggable: true, coordinates: { draggable: true } } } } })] });
        drawing.current = draw;
        draw.start(); draw.setMode('static');
        draw.on('finish', id => {
          const feature = draw.getSnapshotFeature(id);
          if (!feature || feature.geometry.type !== 'Polygon') return;
          const points = feature.geometry.coordinates[0].slice(0, -1).map(p => [p[0], p[1]] as Point);
          const recordedRole = feature.properties.role;
          latest.current.onBoundaryChange?.(recordedRole === 'context' || recordedRole === 'target' ? recordedRole : role.current, points);
          // Keep edit handles after editing, but return a newly drawn shape to pan.
          if (!recordedRole) setTimeout(() => { if (!disposed) { draw.clear(); draw.setMode('static'); setMode('pan'); } }, 0);
        });
        setReady(true);
      };
      instance.on('load', initialise); instance.on('style.load', initialise);
      instance.on('error', () => {
        setWarning('Basemap tiles are unavailable. Your boundaries and drawing tools remain usable on the plain map.');
        if (!instance.getSource('studio-geometry') && !instance.isStyleLoaded()) { try { instance.setStyle(blankStyle); } catch { /* WebGL failure is reported by the fallback below. */ } }
      });
      fallback = setTimeout(() => { if (!disposed && !instance.getSource('studio-geometry')) { setWarning('The basemap did not load. Drawing remains available on a plain map.'); instance.setStyle(blankStyle); instance.once('style.load', initialise); } }, 7000);
      instance.on('click', 'studio-fills', event => {
        const hit = event.features?.find(feature => feature.properties?.role === 'building' || feature.properties?.role === 'neighbour');
        if (hit && drawing.current?.getMode() === 'static') latest.current.onSelect?.(String(hit.id));
      });
      return () => { disposed = true; clearTimeout(fallback); drawStop(); instance.remove(); map.current = undefined; };
    } catch (error) { setWarning(`Interactive map unavailable: ${error instanceof Error ? error.message : String(error)}. Use the building list and coordinate fields.`); }
    function drawStop() { try { drawing.current?.stop(); } catch { /* An incomplete map must still clean up. */ } drawing.current = undefined; }
  // A map instance is retained across controlled geometry and selection changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { const source = map.current?.getSource('studio-geometry') as GeoJSONSource | undefined; source?.setData(features()); }, [props.buildings, props.context, props.selectedId, props.targetBoundary, props.contextBoundary, ready]);
  useEffect(() => { if (props.location && ready) map.current?.jumpTo({ center: props.location }); }, [props.location?.[0], props.location?.[1], ready]);
  const startTool = (next: 'pan' | 'rectangle' | 'polygon' | 'edit') => {
    const draw = drawing.current;
    if (!draw) return;
    draw.clear(); role.current = activeRole;
    if (next === 'edit') {
      const ring = activeRole === 'context' ? props.contextBoundary : props.targetBoundary;
      if (!ring?.length) return;
      draw.addFeatures([{ id: `${activeRole}-edit`, type: 'Feature', properties: { mode: 'polygon', role: activeRole }, geometry: { type: 'Polygon', coordinates: [closed(ring)] } }]);
      draw.setMode('select'); draw.selectFeature(`${activeRole}-edit`);
    } else draw.setMode(next === 'pan' ? 'static' : next);
    setMode(next);
  };
  useEffect(() => { if (props.editableRoles && !props.editableRoles.includes(activeRole)) { drawing.current?.clear(); drawing.current?.setMode('static'); setActiveRole(props.editableRoles[0]); setMode('pan'); } }, [props.editableRoles?.join(','), activeRole]);
  const fit = () => {
    const points = [...(props.contextBoundary ?? []), ...(props.targetBoundary ?? []), ...props.buildings.flatMap(building => building.coordinateSpace === 'geographic' ? building.footprint : [])];
    if (!points.length) return;
    map.current?.fitBounds(points.reduce((bounds, point) => bounds.extend(point), new maplibregl.LngLatBounds(points[0], points[0])), { padding: 60, maxZoom: 17, duration: 0 });
  };
  const boundaryArea = (ring: Point[] | null | undefined) => ring?.length ? `${polygonArea(ring.map(p => toLocal(p, centre(ring)))).toLocaleString(undefined, { maximumFractionDigits: 0 })} m²` : 'Not drawn';
  return <section className="spatial-map-panel" aria-label="Site map and area selection">
    {props.editable && <div className="spatial-toolbar">
      <label>Editing boundary<select className="pc-input" value={activeRole} onChange={event => { startTool('pan'); setActiveRole(event.target.value as BoundaryRole); }}>{(!props.editableRoles || props.editableRoles.includes('target')) && <option value="target">Simulation targets</option>}{(!props.editableRoles || props.editableRoles.includes('context')) && <option value="context">Context area</option>}</select></label>
      {(['pan', 'rectangle', 'polygon', 'edit'] as const).map(tool => <button key={tool} type="button" className="pc-button" disabled={!ready} aria-pressed={mode === tool} onClick={() => startTool(tool)}>{tool === 'pan' ? 'Pan' : tool === 'edit' ? 'Edit vertices' : `Draw ${tool}`}</button>)}
      <button type="button" className="pc-button" onClick={() => { startTool('pan'); props.onBoundaryChange?.(activeRole, null); }}>Clear {activeRole === 'target' ? 'targets' : 'context'}</button>
    </div>}
    <div className="spatial-map" ref={host} />
    {warning && <p className="pc-notice" role="status">{warning}</p>}
    <div className="spatial-map-legend"><span><i className="spatial-legend-target" />Simulation targets · {boundaryArea(props.targetBoundary)}</span><span><i className="spatial-legend-context" />Context area · {boundaryArea(props.contextBoundary)}</span><span><i className="spatial-legend-selection" />Selected building</span><button type="button" className="pc-button" onClick={fit}>Show bounds</button></div>
    {props.editable && <p className="spatial-hint">Draw the context area around all simulation targets. Rectangle: drag two corners. Polygon: click vertices and finish on the first vertex. Edit mode exposes draggable vertices. Basemap © OpenFreeMap / OpenMapTiles / OpenStreetMap contributors.</p>}
  </section>;
}
export default SpatialMap;
