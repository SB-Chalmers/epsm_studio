// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { prepareScene } from 'epsm_viewer';
import type { Point } from '../domain/types';
import { bulkEdit, containsPolygon, draftBuilding, polygonArea, polygonError, polygonsIntersect, resetBuildingField, rotateFootprint, setBuildingField, syntheticPreviewContext, toGeographic, toLocal } from '../components/spatial';
import { buildPreviewScene } from '../components/ScenePreview';

const rectangle: Point[] = [[-10, -6], [10, -6], [10, 6], [-10, 6]];
describe('Studio geometry interactions', () => {
  it('rejects crossing, repeated and degenerate vertices while retaining concave outlines', () => {
    expect(polygonError([[0, 0], [3, 3], [0, 3], [3, 0]])).toMatch(/cross/);
    expect(polygonError([[0, 0], [3, 0], [3, 0], [0, 3]])).toMatch(/duplicate/);
    expect(polygonError([[0, 0], [1, 0], [2, 0]])).toMatch(/positive area/);
    expect(polygonError([[0, 0], [3, 0], [3, 1], [1, 1], [1, 3], [0, 3]])).toBeNull();
  });
  it('requires full boundary containment, including edges crossing a concave notch', () => {
    expect(containsPolygon([[-20, -20], [20, -20], [20, 20], [-20, 20]], rectangle)).toBe(true);
    const notched: Point[] = [[0, 0], [10, 0], [10, 10], [6, 10], [6, 4], [4, 4], [4, 10], [0, 10]];
    expect(containsPolygon(notched, [[2, 2], [8, 2], [8, 8], [2, 8]])).toBe(false);
    expect(containsPolygon(rectangle, [[0, 0], [12, 0], [0, 2]])).toBe(false);
  });
  it('selects edge-crossing buildings without clipping the original footprint', () => {
    const a: Point[] = [[0, 0], [10, 0], [10, 10], [0, 10]], b: Point[] = [[9, 3], [14, 3], [14, 7], [9, 7]];
    const before = structuredClone(b);
    expect(polygonsIntersect(a, b)).toBe(true);
    expect(containsPolygon(a, b)).toBe(false);
    expect(polygonsIntersect(a, [[11, 11], [12, 11], [12, 12], [11, 12]])).toBe(false);
    expect(b).toEqual(before);
    // Crossing strips with no corner inside the opposing shape must also intersect.
    expect(polygonsIntersect([[-5, -1], [5, -1], [5, 1], [-5, 1]], [[-1, -5], [1, -5], [1, 5], [-1, 5]])).toBe(true);
  });
  it('round trips geographic drafting through an explicit reference and preserves rotation area', () => {
    const reference: Point = [11.9665, 57.6983];
    for (const point of rectangle) {
      const returned = toLocal(toGeographic(point, reference), reference);
      expect(returned[0]).toBeCloseTo(point[0], 7); expect(returned[1]).toBeCloseTo(point[1], 7);
    }
    expect(polygonArea(rotateFootprint(rectangle, 35))).toBeCloseTo(240);
  });
  it('builds synthetic preview neighbours explicitly and keeps them separate from the target', () => {
    const building = draftBuilding('Authored', rectangle, 'local', 9, 3);
    expect(syntheticPreviewContext(building, 'none')).toEqual([]);
    for (const preset of ['rural', 'urban_lowrise_dense', 'urban_highrise_dense'] as const) {
      const context = syntheticPreviewContext(building, preset);
      expect(context).toHaveLength(8);
      expect(context.every(neighbour => !polygonsIntersect(building.footprint, neighbour.footprint))).toBe(true);
      expect(context.every(neighbour => neighbour.fields.height.source.includes('fixture'))).toBe(true);
    }
  });
});

describe('evidence-aware property editing', () => {
  it('fills only missing values, previews without mutation and restores source origins', () => {
    const known = draftBuilding('Known', rectangle, 'local', 9, 3), missing = draftBuilding('Missing', rectangle, 'local', 9, 3);
    known.fields.year = { value: 1972, origin: 'source', source: 'Register' };
    missing.fields.year = { value: null, origin: 'missing', source: 'Register year unavailable' };
    const preview = bulkEdit([known, missing], [known.id, missing.id], 'year', 1980, 'fill_missing');
    expect(preview[0]).toBe(known); expect(preview[1].fields.year.value).toBe(1980); expect(missing.fields.year.value).toBeNull();
    expect(resetBuildingField(preview[1], 'year').fields.year).toEqual(missing.fields.year);
    const replacement = bulkEdit([known], [known.id], 'year', 1990, 'replace')[0];
    expect(replacement.fields.year.original).toEqual(known.fields.year);
    expect(resetBuildingField(replacement, 'year').fields.year.origin).toBe('source');
  });
  it('updates every part on explicit whole-building height assignment and restores missing heights', () => {
    const building = draftBuilding('Height missing', rectangle, 'local', 9, 3);
    building.fields.height = { value: null, origin: 'missing', source: 'Unknown' }; building.components[0].height = null;
    building.components.push({ id: 'second', name: 'Wing', height: 6, footprint: rectangle });
    const changed = setBuildingField(building, 'height', 12);
    expect(changed.components.map(part => part.height)).toEqual([12, 12]);
    expect(building.components[0].height).toBeNull();
    const restored = resetBuildingField(changed, 'height');
    expect(restored.fields.height.value).toBeNull();
    expect(restored.components.map(part => part.height)).toEqual([null, 6]);
  });
});

describe('installed EPSM Viewer handoff', () => {
  it('renders detached geographic and multipart drafts with retained building identities', () => {
    const building = draftBuilding('Metric prototype', rectangle, 'local', 9, 3), reference: Point = [11.9665, 57.6983];
    building.coordinateSpace = 'geographic'; building.footprint = rectangle.map(p => toGeographic(p, reference));
    building.components[0].footprint = building.footprint;
    const original = structuredClone(building), scene = buildPreviewScene([building]);
    expect(scene.report.geographic_reference).toHaveLength(2);
    const drawing = prepareScene(scene);
    expect(drawing.objects).toHaveLength(6);
    expect(drawing.objects.every(object => object.metadata.building_id === building.id)).toBe(true);
    const roof = drawing.objects.find(object => object.epjson.surface_type === 'Roof')!;
    expect(roof.vertices.every(point => point[2] === 9)).toBe(true);
    expect(Math.max(...roof.vertices.map(point => point[0])) - Math.min(...roof.vertices.map(point => point[0]))).toBeCloseTo(20, 3);
    expect(building).toEqual(original);
    expect(scene.diagnostics.notice).toContain('not Core-generated');
  });
  it('keeps complete context roof caps and empty drafts valid', () => {
    const building = draftBuilding('Target', rectangle, 'local', 9, 3), context = syntheticPreviewContext(building, 'urban_lowrise_dense');
    const scene = prepareScene(buildPreviewScene([building], context));
    expect(scene.objects.filter(object => object.kind === 'context' && object.metadata.surface_type === 'Roof')).toHaveLength(8);
    expect(prepareScene(buildPreviewScene([])).objects).toEqual([]);
  });
});
