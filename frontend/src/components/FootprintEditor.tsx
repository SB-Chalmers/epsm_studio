// SPDX-License-Identifier: MIT
import { useId, useRef, useState, type PointerEvent } from 'react';
import type { Point } from '../domain/types';
import { centre, polygonArea, polygonError, rotateFootprint } from './spatial';
import './spatial.css';

interface FootprintEditorProps { value: Point[]; onChange: (points: Point[]) => void; }
export function FootprintEditor({ value, onChange }: FootprintEditorProps) {
  const svg = useRef<SVGSVGElement>(null), drag = useRef<{ index?: number; start: Point; before: Point[] }>();
  const [tool, setTool] = useState<'edit' | 'rectangle' | 'polygon'>('edit');
  const [draft, setDraft] = useState<Point[]>([]), [history, setHistory] = useState<Point[][]>([]), [future, setFuture] = useState<Point[][]>([]);
  const [length, setLength] = useState(20), [width, setWidth] = useState(12), [angle, setAngle] = useState(0), [zoom, setZoom] = useState(1);
  const gridId = useId().replace(/:/g, ''), origin = centre(value), radius = Math.max(30, ...value.map(p => Math.max(Math.abs(p[0] - origin[0]), Math.abs(p[1] - origin[1])) + 10)) / zoom;
  const view = [origin[0] - radius, -origin[1] - radius * .7, radius * 2, radius * 1.4];
  const commit = (points: Point[]) => { setHistory(previous => [...previous, structuredClone(value)]); setFuture([]); onChange(points); };
  const coordinate = (event: PointerEvent<SVGSVGElement>): Point => {
    const canvas = svg.current!, point = new DOMPoint(event.clientX, event.clientY).matrixTransform(canvas.getScreenCTM()!.inverse());
    return [Math.round(point.x * 2) / 2, Math.round(-point.y * 2) / 2];
  };
  const start = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    const point = coordinate(event);
    if (tool === 'polygon') { setDraft(points => [...points, point]); return; }
    if (tool === 'rectangle') { drag.current = { start: point, before: value }; setDraft([point, point, point, point]); event.currentTarget.setPointerCapture(event.pointerId); return; }
    const index = Number((event.target as Element).getAttribute('data-vertex'));
    if ((event.target as Element).hasAttribute('data-vertex') && Number.isInteger(index)) { drag.current = { index, start: point, before: structuredClone(value) }; event.currentTarget.setPointerCapture(event.pointerId); }
  };
  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const point = coordinate(event), state = drag.current;
    if (state.index === undefined) setDraft([state.start, [point[0], state.start[1]], point, [state.start[0], point[1]]]);
    else onChange(value.map((vertex, index) => index === state.index ? point : vertex));
  };
  const finish = () => {
    const state = drag.current;
    if (!state) return;
    drag.current = undefined;
    if (state.index === undefined) { commit(draft); setDraft([]); setTool('edit'); }
    else { setHistory(previous => [...previous, state.before]); setFuture([]); }
  };
  const undo = () => { const previous = history[history.length - 1]; if (!previous) return; setFuture(items => [...items, structuredClone(value)]); setHistory(items => items.slice(0, -1)); onChange(previous); };
  const redo = () => { const next = future[future.length - 1]; if (!next) return; setHistory(items => [...items, structuredClone(value)]); setFuture(items => items.slice(0, -1)); onChange(next); };
  const error = polygonError(value);
  return <section className="editor-panel" aria-label="Building footprint authoring">
    <div className="spatial-toolbar" role="group" aria-label="Footprint drawing tools">
      {(['edit', 'rectangle', 'polygon'] as const).map(mode => <button type="button" className="pc-button" aria-pressed={tool === mode} key={mode} onClick={() => { setTool(mode); setDraft([]); }}>{mode === 'edit' ? 'Edit vertices' : mode === 'rectangle' ? 'Draw rectangle' : 'Draw polygon'}</button>)}
      <button type="button" className="pc-button" disabled={!history.length} onClick={undo}>Undo</button><button type="button" className="pc-button" disabled={!future.length} onClick={redo}>Redo</button>
      <button type="button" className="pc-button" onClick={() => setZoom(z => Math.min(3, z * 1.3))}>Zoom in</button><button type="button" className="pc-button" onClick={() => setZoom(z => Math.max(.3, z / 1.3))}>Zoom out</button>
      <button type="button" className="pc-button" onClick={() => setZoom(1)}>Fit outline</button>
    </div>
    <p id={`${gridId}-help`} className="spatial-hint">{tool === 'polygon' ? 'Click each corner, then choose Finish polygon. Vertices snap to 0.5 m.' : tool === 'rectangle' ? 'Drag from one corner to the opposite corner.' : 'Drag a vertex or edit its coordinates below. North is up; dimensions are in metres.'}</p>
    {tool === 'polygon' && <button type="button" className="pc-button pc-button--primary" disabled={draft.length < 3} onClick={() => { commit(draft); setDraft([]); setTool('edit'); }}>Finish polygon ({draft.length} vertices)</button>}
    <svg ref={svg} className="editor-canvas" viewBox={view.join(' ')} role="img" aria-label="Metric footprint drawing canvas; coordinate fields provide keyboard editing" aria-describedby={`${gridId}-help`} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={() => { if (drag.current) onChange(drag.current.before); drag.current = undefined; setDraft([]); }}>
      <defs><pattern id={gridId} width="2" height="2" patternUnits="userSpaceOnUse"><path d="M 2 0 L 0 0 0 2" fill="none" stroke="var(--epsm-color-divider, #dfe2dc)" strokeWidth=".06" /></pattern></defs>
      <rect x={view[0]} y={view[1]} width={view[2]} height={view[3]} fill={`url(#${gridId})`} />
      <polygon points={value.map(p => `${p[0]},${-p[1]}`).join(' ')} className={error ? 'editor-footprint editor-footprint--invalid' : 'editor-footprint'} />
      {draft.length > 0 && <polyline points={draft.map(p => `${p[0]},${-p[1]}`).join(' ')} fill="none" stroke="var(--epsm-color-selection, #e9543f)" strokeWidth=".35" />}
      {tool === 'edit' && value.map((p, index) => <rect key={index} data-vertex={index} x={p[0] - .65} y={-p[1] - .65} width="1.3" height="1.3" className="editor-handle" />)}
      <text x={view[0] + 2} y={view[1] + 4} className="editor-north">N ↑</text>
    </svg>
    <div className="spatial-summary"><span>Footprint <strong>{polygonArea(value).toFixed(1)} m²</strong></span><span>{value.length} vertices</span><span>0.5 m snap · 2 m grid</span></div>
    {error && <p className="pc-notice spatial-error" role="alert">Invalid footprint: {error}</p>}
    <div className="editor-controls">
      <label>Rectangle length (m)<input className="pc-input" type="number" min="1" value={length} onChange={event => setLength(Number(event.target.value))} /></label>
      <label>Rectangle width (m)<input className="pc-input" type="number" min="1" value={width} onChange={event => setWidth(Number(event.target.value))} /></label>
      <button type="button" className="pc-button" disabled={length <= 0 || width <= 0} onClick={() => commit([[-length / 2, -width / 2], [length / 2, -width / 2], [length / 2, width / 2], [-length / 2, width / 2]])}>Apply rectangle</button>
      <label>Rotate clockwise (°)<input className="pc-input" type="number" min="-360" max="360" value={angle} onChange={event => setAngle(Number(event.target.value))} /></label>
      <button type="button" className="pc-button" onClick={() => { commit(rotateFootprint(value, angle)); setAngle(0); }}>Rotate outline</button>
    </div>
    <details><summary>Vertex coordinates · local metres</summary><p>These fields are an alternative to pointer drawing. Positive Y points north.</p>
      <div className="editor-vertices">{value.map((p, index) => <fieldset key={index}><legend>Vertex {index + 1}</legend>{(['X', 'Y'] as const).map((axis, position) => <label key={axis}>{axis} (m)<input className="pc-input" type="number" step="0.5" value={Number(p[position].toFixed(3))} onChange={event => commit(value.map((vertex, i) => i === index ? vertex.map((v, j) => j === position ? Number(event.target.value) : v) as Point : vertex))} /></label>)}<button type="button" className="pc-button" disabled={value.length <= 3} onClick={() => commit(value.filter((_, i) => i !== index))}>Remove vertex</button></fieldset>)}</div>
    </details>
  </section>;
}
export default FootprintEditor;
