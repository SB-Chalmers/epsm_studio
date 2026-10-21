// SPDX-License-Identifier: MIT
import { useEffect, useMemo, useRef, useState } from 'react';
import { mountViewer, type Scene, type SceneObject, type ViewerHandle } from 'epsm_viewer';
import type { Building, Point } from '../domain/types';
import { centre, signedArea, toLocal } from './spatial';
import './spatial.css';

export interface ScenePreviewProps { buildings: Building[]; context?: Building[]; selectedId?: string; onSelect?: (id: string) => void; }

/** Studio-only massing adapter. It intentionally does not produce scientific geometry. */
export function buildPreviewScene(buildings: Building[], context: Building[] = []): Scene {
  const geographic = [...buildings, ...context].find(building => building.coordinateSpace === 'geographic');
  const reference: Point = geographic ? centre(geographic.footprint) : [0, 0];
  const objects: SceneObject[] = [];
  for (const building of [...buildings, ...context]) {
    const isContext = context.some(item => item.id === building.id);
    const parts = building.components.length ? building.components : [{ id: `${building.id}-volume`, name: 'Volume', footprint: building.footprint, height: Number(building.fields.height.value) || null }];
    for (const component of parts) {
      const raw = component.footprint.length ? component.footprint : building.footprint;
      let ring = raw.map(point => building.coordinateSpace === 'geographic' ? toLocal(point, reference) : point);
      if (ring.length < 3) continue;
      if (signedArea(ring) < 0) ring = [...ring].reverse();
      const height = component.height ?? (Number(building.fields.height.value) || 3);
      const metadata = { building_id: building.id, component_id: component.id, studio_preview: true, height_assumed: component.height === null, included: building.included };
      objects.push({ id: `${component.id}-roof`, name: `${building.name} · ${component.name} roof`, kind: isContext ? 'context' : 'surface', vertices: ring.map(p => [p[0], p[1], height]), holes: [], metadata: { ...metadata, surface_type: 'Roof' }, boundary: 'Outdoors', epjson: { surface_type: 'Roof' } });
      objects.push({ id: `${component.id}-floor`, name: `${building.name} · ground`, kind: isContext ? 'context' : 'surface', vertices: [...ring].reverse().map(p => [p[0], p[1], 0]), holes: [], metadata: { ...metadata, surface_type: 'Floor' }, boundary: 'Ground', epjson: { surface_type: 'Floor' } });
      ring.forEach((a, index) => {
        const b = ring[(index + 1) % ring.length];
        objects.push({ id: `${component.id}-wall-${index}`, name: `${building.name} · wall ${index + 1}`, kind: isContext ? 'context' : 'surface', vertices: [[a[0], a[1], 0], [b[0], b[1], 0], [b[0], b[1], height], [a[0], a[1], height]], holes: [], metadata: { ...metadata, surface_type: 'Wall' }, boundary: 'Outdoors', epjson: { surface_type: 'Wall' } });
      });
    }
  }
  return { schema: 'epsm.scene/1', units: 'm', up_axis: 'Z', objects, report: { geometry_only: true, studio_preview: true, coordinate_method: 'Local equirectangular drafting approximation', geographic_reference: reference }, diagnostics: { notice: 'Illustrative Studio massing only; not Core-generated geometry or simulation readiness.' }, preparation: null, internal_mass: {} };
}

export function ScenePreview({ buildings, context = [], selectedId, onSelect }: ScenePreviewProps) {
  const host = useRef<HTMLDivElement>(null), viewer = useRef<ViewerHandle>(), callback = useRef(onSelect);
  const [error, setError] = useState('');
  callback.current = onSelect;
  const scene = useMemo(() => buildPreviewScene(buildings, context), [buildings, context]);
  useEffect(() => {
    if (!host.current) return;
    try {
      viewer.current = mountViewer(host.current, scene, { height: '540px', onSelect: selection => { const id = selection?.metadata.building_id; if (typeof id === 'string') callback.current?.(id); } });
      setError('');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'The 3D viewer could not initialise.'); }
    return () => { viewer.current?.dispose(); viewer.current = undefined; };
  // The handle is mounted once, then consumes subsequent scenes below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { try { viewer.current?.setScene(scene); setError(''); } catch (failure) { setError(String(failure)); } }, [scene]);
  useEffect(() => {
    const object = scene.objects.find(item => item.metadata.building_id === selectedId);
    try { viewer.current?.setSelection(object?.id ?? null); } catch { /* A replacement scene may have removed the selection. */ }
  }, [selectedId, scene]);
  return <section className="spatial-preview" aria-label="Interactive building massing preview">
    <p className="pc-notice">Illustrative massing · metres · EPSM Viewer. This preview is separate from the scientific model and does not establish shading or engine readiness.</p>
    {error && <p className="pc-notice" role="status">3D preview unavailable: {error}. The building table and map remain available.</p>}
    <div ref={host} className="spatial-viewer-host" />
  </section>;
}
export default ScenePreview;
