// SPDX-License-Identifier: MIT
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import type { CaseResult } from '../domain/types';

const ink = '#272B2B';
const accent = '#E9543F';
const grid = '#DFE2DC';

export interface CarbonPoint {
  id: string; name: string; embodiedCarbon: number | null; operationalCarbon: number | null;
}

export function ParetoChart({ points, frontierIds, selectedId, onSelect }: { points: CarbonPoint[]; frontierIds: string[]; selectedId?: string; onSelect: (id: string) => void }) {
  const complete = points.filter(point => point.embodiedCarbon !== null && point.operationalCarbon !== null && Number.isFinite(point.embodiedCarbon) && Number.isFinite(point.operationalCarbon));
  const frontier = complete.filter(point => frontierIds.includes(point.id)).sort((a, b) => a.embodiedCarbon! - b.embodiedCarbon!);
  if (!complete.length) return <p className="pc-notice pc-status--warning">Complete embodied and operational carbon are required to draw the tradeoff.</p>;
  return <div className="study-chart" role="img" aria-label="Embodied versus operational carbon scatter plot. Select a scenario using the table below.">
    <p className="pc-help">Operational carbon · kg CO₂e</p>
    <ResponsiveContainer width="100%" height={320}>
      <ScatterChart margin={{ top: 12, right: 20, bottom: 40, left: 12 }}>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" />
        <XAxis type="number" dataKey="embodiedCarbon" name="Embodied" tick={{ fontSize: 11 }} label={{ value: 'Embodied carbon · kg CO₂e', position: 'bottom', offset: 20 }} />
        <YAxis type="number" dataKey="operationalCarbon" name="Operational" tick={{ fontSize: 11 }} tickFormatter={value => Number(value).toLocaleString('en-GB', { notation: 'compact' })} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name) => [typeof value === 'number' ? `${Math.round(value).toLocaleString()} kg CO₂e` : String(value ?? ''), String(name)]} />
        <Scatter name="Frontier" data={frontier} line={{ stroke: ink, strokeWidth: 1 }} shape={() => <g />} isAnimationActive={false} />
        <Scatter name="Scenarios" data={complete} isAnimationActive={false} onClick={(point: unknown) => { const selected = point as CarbonPoint; if (selected.id) onSelect(selected.id); }}>
          {complete.map(point => <Cell key={point.id} fill={point.id === selectedId ? accent : frontierIds.includes(point.id) ? ink : '#AEB3AB'} stroke="white" strokeWidth={1} />)}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  </div>;
}

export function EnergyCharts({ results, mode }: { results: CaseResult[]; mode: 'monthly' | 'hourly' }) {
  const good = results.filter(result => result.status === 'completed');
  if (!good.length) return <p className="pc-muted">No completed cases in this selection.</p>;
  if (mode === 'monthly') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = months.map((month, index) => ({ month, energy: good.reduce((sum, result) => sum + (result.monthly[index] ?? 0), 0) }));
    return <div className="study-chart" role="img" aria-label="Monthly delivered energy, in kWh, for the selected scenario and buildings"><ResponsiveContainer width="100%" height={260}><BarChart data={data} margin={{ top: 12, right: 16, bottom: 8, left: 12 }}><CartesianGrid stroke={grid} vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(value: unknown) => [`${Math.round(Number(value)).toLocaleString()} kWh`, 'Delivered energy']} /><Bar isAnimationActive={false} dataKey="energy" fill={ink} radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer></div>;
  }
  const hours = [...new Set(good.flatMap(result => result.hourly.map(hour => hour.hour)))].sort((a, b) => a - b);
  const data = hours.map(hour => ({ hour, energy: good.reduce((sum, result) => sum + (result.hourly.find(sample => sample.hour === hour)?.energy ?? 0), 0) }));
  return <div className="pc-stack"><p className="pc-help">{hours.length} illustrative hourly samples. This preview is not an 8,760-hour annual series.</p><div className="study-chart" role="img" aria-label={`${hours.length} illustrative hourly delivered-energy samples, in kWh`}><ResponsiveContainer width="100%" height={260}><LineChart data={data} margin={{ top: 12, right: 20, bottom: 8, left: 12 }}><CartesianGrid stroke={grid} vertical={false} /><XAxis dataKey="hour" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(value: unknown) => [`${Number(value).toFixed(1)} kWh`, 'Delivered energy']} /><Line type="monotone" dataKey="energy" stroke={ink} strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></div>;
}
