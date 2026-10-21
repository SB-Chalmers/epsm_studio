// SPDX-License-Identifier: MIT
// Pure planar geometry checks shared by authoring and job readiness.
import type { Point } from "./types";

export const signedArea = (ring: Point[]): number => ring.reduce((area, p, i) => {
  const next = ring[(i + 1) % ring.length];
  return area + p[0] * next[1] - next[0] * p[1];
}, 0) / 2;
export const polygonArea = (ring: Point[]): number => Math.abs(signedArea(ring));
export const centre = (ring: Point[]): Point => ring.length ? [ring.reduce((sum, p) => sum + p[0], 0) / ring.length, ring.reduce((sum, p) => sum + p[1], 0) / ring.length] : [0, 0];
const cross = (a: Point, b: Point, c: Point) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const onSegment = (p: Point, a: Point, b: Point): boolean => Math.abs(cross(a, b, p)) < 1e-12 && p[0] >= Math.min(a[0], b[0]) - 1e-12 && p[0] <= Math.max(a[0], b[0]) + 1e-12 && p[1] >= Math.min(a[1], b[1]) - 1e-12 && p[1] <= Math.max(a[1], b[1]) + 1e-12;
const properCross = (a: Point, b: Point, c: Point, d: Point): boolean => cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;
export function polygonError(ring: Point[]): string | null {
  if (ring.length < 3) return 'Draw at least three vertices to close the footprint.';
  if (ring.some(p => p.length !== 2 || p.some(v => !Number.isFinite(v)))) return 'Every coordinate must be finite.';
  if (new Set(ring.map(p => p.join(','))).size !== ring.length) return 'Remove duplicate vertices.';
  for (let i = 0; i < ring.length; i++) for (let j = i + 1; j < ring.length; j++) {
    if (j === i + 1 || (i === 0 && j === ring.length - 1)) continue;
    const a = ring[i], b = ring[(i + 1) % ring.length], c = ring[j], d = ring[(j + 1) % ring.length];
    if (properCross(a, b, c, d) || onSegment(a, c, d) || onSegment(b, c, d) || onSegment(c, a, b) || onSegment(d, a, b)) return 'The outline crosses or touches itself. Move the affected vertices.';
  }
  if (polygonArea(ring) < 1e-12) return 'The footprint needs a positive area.';
  return null;
}
export function pointInPolygon(point: Point, ring: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if (onSegment(point, a, b)) return true;
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
export function containsPolygon(outer: Point[], inner: Point[]): boolean {
  return !polygonError(outer) && !polygonError(inner) && inner.every(p => pointInPolygon(p, outer)) && inner.every((a, i) => {
    const b = inner[(i + 1) % inner.length];
    return pointInPolygon([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], outer) && outer.every((c, j) => !properCross(a, b, c, outer[(j + 1) % outer.length]));
  });
}
/** Boundary touches count as intersections; callers retain the complete footprint. */
export function polygonsIntersect(a: Point[], b: Point[]): boolean {
  if (polygonError(a) || polygonError(b)) return false;
  return a.some(p => pointInPolygon(p, b)) || b.some(p => pointInPolygon(p, a)) || a.some((p, i) => b.some((q, j) => properCross(p, a[(i + 1) % a.length], q, b[(j + 1) % b.length])));
}
