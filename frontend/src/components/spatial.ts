// SPDX-License-Identifier: MIT
// Studio drawing helpers. These approximate metres for interaction, not a Core model.
import type { Building, EvidenceValue, Point, PropertyKey } from '../domain/types';
import { centre, polygonArea } from '../domain/geometry';

const DEGREE_M = 111_319.49079327358;
export const toLocal = (point: Point, reference: Point): Point => [
  (point[0] - reference[0]) * DEGREE_M * Math.cos(reference[1] * Math.PI / 180),
  (point[1] - reference[1]) * DEGREE_M,
];
export const toGeographic = (point: Point, reference: Point): Point => [
  reference[0] + point[0] / (DEGREE_M * Math.cos(reference[1] * Math.PI / 180)),
  reference[1] + point[1] / DEGREE_M,
];
export { signedArea, polygonArea, centre, polygonError, pointInPolygon, containsPolygon, polygonsIntersect } from '../domain/geometry';

export function rotateFootprint(points: Point[], degrees: number): Point[] {
  const origin = centre(points), radians = -degrees * Math.PI / 180;
  return points.map(p => {
    const x = p[0] - origin[0], y = p[1] - origin[1];
    return [origin[0] + x * Math.cos(radians) - y * Math.sin(radians), origin[1] + x * Math.sin(radians) + y * Math.cos(radians)];
  });
}
export function overridden(field: EvidenceValue, value: string | number | null): EvidenceValue {
  return { value, origin: value === null || value === '' ? 'missing' : 'override', source: 'User authored in Studio prototype', original: field.original ?? { value: field.value, origin: field.origin, source: field.source } };
}
export function setBuildingField(building: Building, key: PropertyKey, value: string | number | null): Building {
  return { ...building, fields: { ...building.fields, [key]: overridden(building.fields[key], value) },
    components: key === 'height' ? building.components.map(component => ({ ...component, originalHeight: 'originalHeight' in component ? component.originalHeight : component.height, height: typeof value === 'number' ? value : null })) : building.components };
}
export function bulkEdit(buildings: Building[], ids: string[], key: PropertyKey, value: string | number | null, mode: 'fill_missing' | 'replace'): Building[] {
  return buildings.map(building => ids.includes(building.id) && (mode === 'replace' || building.fields[key].value === null || building.fields[key].value === '') ? setBuildingField(building, key, value) : building);
}
export function resetBuildingField(building: Building, key: PropertyKey): Building {
  const field = building.fields[key], source = field.original;
  if (!source) return building;
  return { ...building, fields: { ...building.fields, [key]: { ...source } }, components: key === 'height' ? building.components.map(component => { const { originalHeight, ...rest } = component; return { ...rest, height: 'originalHeight' in component ? originalHeight ?? null : typeof source.value === 'number' ? source.value : null }; }) : building.components };
}
export function draftBuilding(name: string, footprint: Point[], coordinateSpace: Building['coordinateSpace'], height: number, storeys: number): Building {
  const values: Record<PropertyKey, string | number | null> = { year: 1980, function: 'multi_family', height, storeys, area: null, archetype: 'mf_se03', fabric: 'existing', wall: 'Reference wall', roof: 'Reference roof', floor: 'Reference ground floor', windows: 'Reference double glazing', heating: 'District heating', ventilation: 'F', operation: 'Sveby residential' };
  const fields = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value, origin: value === null ? 'missing' : 'override', source: value === null ? 'Heated floor area must be explicitly provided' : 'Explicit illustrative authoring default; review before simulation' }])) as Building['fields'];
  if (coordinateSpace === 'local') fields.area = { value: Math.round(polygonArea(footprint) * storeys), origin: 'override', source: 'Illustrative heated floor area from drawn footprint × storeys; user must review area basis' };
  const id = `building-${crypto.randomUUID()}`;
  return { id, name, footprint, coordinateSpace, included: true, fields, components: [{ id: `${id}-part-1`, name: 'Main volume', footprint, height }], epc: { status: 'missing', label: 'No EPC for authored building', observedEnergy: null } };
}

/** Eight fixed illustrative neighbours for interaction previews, never Core output. */
export function syntheticPreviewContext(building: Building, preset: 'none' | 'rural' | 'urban_lowrise_dense' | 'urban_highrise_dense'): Building[] {
  if (preset === 'none') return [];
  const bounds = building.footprint.reduce((result, p) => [Math.min(result[0], p[0]), Math.min(result[1], p[1]), Math.max(result[2], p[0]), Math.max(result[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]);
  const center = centre(building.footprint), size = preset === 'rural' ? 14 : 23, clearance = preset === 'rural' ? 20 : 10;
  const xOffset = (bounds[2] - bounds[0]) / 2 + size / 2 + clearance, yOffset = (bounds[3] - bounds[1]) / 2 + size / 2 + clearance;
  const positions = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  return positions.map(([x, y], index) => {
    const cx = center[0] + x * xOffset, cy = center[1] + y * yOffset, height = preset === 'urban_highrise_dense' ? 24 + index % 4 * 10 : preset === 'rural' ? 3 + index % 3 * 3 : 6 + index % 4 * 3;
    const ring: Point[] = [[cx - size / 2, cy - size / 2], [cx + size / 2, cy - size / 2], [cx + size / 2, cy + size / 2], [cx - size / 2, cy + size / 2]];
    const neighbour = draftBuilding(`Illustrative ${preset.replace(/_/g, ' ')} neighbour ${index + 1}`, ring, 'local', height, 1), id = `demo-${preset}-${index + 1}`;
    return { ...neighbour, id, included: false, components: [{ id: `${id}-part`, name: 'Illustrative shading volume', footprint: ring, height }], fields: { ...neighbour.fields, height: { value: height, origin: 'override', source: 'Fixed Studio synthetic-context preview fixture; Core generation deferred' } } };
  });
}
