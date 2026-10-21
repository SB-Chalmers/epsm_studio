// SPDX-License-Identifier: MIT
// Explicit demo fixtures. Scientific libraries and live services are not called here.
import type { Account, Building, CatalogueItem, EvidenceValue, Point, Project, RenovationPackage, Settings, Weather } from '../domain/types';

export const accounts: Account[] = [
  { id: 'demo-alex', name: 'Alex Lind', initials: 'AL', email: 'alex.lind@chalmers.se' },
  { id: 'demo-sam', name: 'Sam Berg', initials: 'SB', email: 'sam.berg@chalmers.se' },
];
export const defaultSettings: Settings = { density: 'comfortable', reducedMotion: false, defaultEngine: 'rc', defaultWeather: 'tmy', assessmentPeriod: 50 };
export const weather: Weather[] = [
  { id: 'tmy-gothenburg', name: 'Gothenburg · typical year', kind: 'tmy', year: 2023, station: 'Gothenburg–Landvetter', distanceKm: 21.5, source: 'Illustrative OneBuilding TMYx file', description: 'Demo station selection. Nearest-station discovery is a planned provider.', multiplier: 1 },
  { id: 'amy-2023', name: 'Gothenburg · AMY 2023', kind: 'amy', year: 2023, station: 'Göteborg A', distanceKm: 2.7, source: 'smhi2epw AMY · simulated response', description: 'Completed actual year; demo recovery and station receipt.', multiplier: 1.08 },
  { id: 'amy-2022', name: 'Gothenburg · AMY 2022', kind: 'amy', year: 2022, station: 'Göteborg A', distanceKm: 2.7, source: 'smhi2epw AMY · simulated response', description: 'Second completed year for climate sensitivity.', multiplier: .94 },
  { id: 'future-2050', name: 'Gothenburg · future 2050', kind: 'future', year: 2050, station: 'Gothenburg reference', distanceKm: 21.5, source: 'Planned future-weather provider · synthetic fixture', description: 'Illustrative future climate. pyfwg integration is not available in smhi2epw.', multiplier: .78 },
];
export const catalogue: CatalogueItem[] = [
  { id: 'mat-mineral-wool', name: 'Mineral wool', kind: 'material', category: 'Insulation', description: 'Illustrative insulation definition; confirm product carbon evidence before assessment.', source: 'epsm_data authoring model · demo values', version: 'demo-1', properties: { conductivity: .037, density: 35, specificHeat: 840 } },
  { id: 'mat-concrete', name: 'Concrete', kind: 'material', category: 'Structure', description: 'Heavy structural material example.', source: 'epsm_data authoring model · demo values', version: 'demo-1', properties: { conductivity: 1.7, density: 2300, specificHeat: 880 } },
  { id: 'mat-timber', name: 'Timber', kind: 'material', category: 'Structure', description: 'Generic timber; product and biogenic boundaries require review.', source: 'epsm_data authoring model · demo values', version: 'demo-1', properties: { conductivity: .13, density: 500, specificHeat: 1600 } },
  { id: 'wall-mf-1970', name: 'MF SE.02 · external wall', kind: 'construction', category: 'External wall', description: 'Representative original-era assembly; selection is an assumption about the actual building.', source: 'epsm_data MF SE.02 · illustrative preview', version: 'demo-1', properties: { uValue: .45 }, layers: [{ name: 'Render', thickness: .020 }, { name: 'Mineral wool', thickness: .080 }, { name: 'Concrete', thickness: .180 }] },
  { id: 'roof-mf-1970', name: 'MF SE.02 · top floor', kind: 'construction', category: 'Roof', description: 'Representative top-floor construction.', source: 'epsm_data · illustrative preview', version: 'demo-1', properties: { uValue: .3 }, layers: [{ name: 'Mineral wool', thickness: .140 }, { name: 'Concrete', thickness: .180 }] },
  { id: 'floor-mf-1970', name: 'MF SE.02 · ground floor', kind: 'construction', category: 'Ground floor', description: 'Ground performance and soil boundaries remain distinct.', source: 'epsm_data · illustrative preview', version: 'demo-1', properties: { uValue: .4 }, layers: [{ name: 'Concrete', thickness: .180 }, { name: 'Insulation', thickness: .070 }] },
  { id: 'measure-envelope', name: 'Insulate envelope', kind: 'renovation', category: 'Envelope', description: 'Illustrative executable package definition, not a curated production catalogue.', source: 'Studio demo catalogue · epsm_data measure contract', version: 'demo-1', properties: { insulationMm: 150, conductivity: .037 }, multiplier: .68, embodiedPerM2: 52 },
  { id: 'measure-windows', name: 'Replace windows', kind: 'renovation', category: 'Windows', description: 'Whole-window replacement; airtightness is an independent assumption.', source: 'Studio demo catalogue · epsm_data measure contract', version: 'demo-1', properties: { uValue: 1.1, shgc: .55 }, multiplier: .84, embodiedPerM2: 24 },
  { id: 'measure-ftx', name: 'Install FTX', kind: 'renovation', category: 'Systems', description: 'Illustrative heat-recovery system; installed system performance needs evidence.', source: 'Studio demo catalogue · explicit HVAC assumption', version: 'demo-1', properties: { recovery: .75 }, multiplier: .79, embodiedPerM2: 16 },
  { id: 'measure-unknown', name: 'Experimental façade', kind: 'renovation', category: 'Envelope', description: 'Energy response can be previewed; embodied carbon is unknown.', source: 'Unsourced demo measure · incomplete environmental factors', version: 'demo-1', properties: { insulationMm: 200 }, multiplier: .6, incompleteCarbon: true, incompatibleWith: ['measure-envelope'] },
];
export const packages: RenovationPackage[] = [
  { id: 'baseline', name: 'Unchanged baseline', measureIds: [], description: 'Frozen reference building without additional measures.' },
  { id: 'envelope', name: 'Envelope insulation', measureIds: ['measure-envelope'], description: 'Insulate the external envelope.' },
  { id: 'windows', name: 'Window upgrade', measureIds: ['measure-windows'], description: 'Replace windows only.' },
  { id: 'deep', name: 'Deep renovation', measureIds: ['measure-envelope', 'measure-windows', 'measure-ftx'], description: 'Envelope, windows and heat recovery.' },
  { id: 'incomplete', name: 'Experimental façade', measureIds: ['measure-unknown'], description: 'Demonstrates incomplete embodied-carbon evidence.' },
];
const evidence = (value: string | number | null, origin: EvidenceValue['origin'] = 'catalogue', source = 'Illustrative catalogue assumption'): EvidenceValue => ({ value, origin, source });
const rectangle = (x: number, y: number, w = .00048, h = .00027): Point[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
export function demoBuilding(index: number): Building {
  const footprint = rectangle(11.96495 + (index % 3) * .001, 57.69735 + Math.floor(index / 3) * .00055);
  const year = [1968, 1972, 1954, 1981, 1990, 2002, 2010, 2023, 1964, 1975, 1988, 1959][index];
  const category = index === 4 ? 'office' : index === 5 ? 'school' : index === 10 ? 'generic' : 'multi_family';
  const era = year <= 1960 ? '01' : year <= 1975 ? '02' : year <= 1985 ? '03' : year <= 1995 ? '04' : year <= 2005 ? '05' : year <= 2021 ? '06' : '07';
  const building: Building = { id: `gbg-${index + 1}`, name: ['Landala 01', 'Landala 02', 'Vasastaden 03', 'Chalmers 04', 'Campus office', 'Campus school', 'Landala 07', 'New courtyard', 'Split-height block', 'Landala 10', 'Mixed-use hall', 'Landala 12'][index], footprint, coordinateSpace: 'geographic', included: true,
    fields: { year: evidence(year, 'source', 'epsm_db register fixture'), function: evidence(category, 'source', 'epsm_db purpose fixture'), height: evidence(index === 4 ? 15 : 12, 'source', 'epsm_db component-height fixture'), storeys: evidence(index === 4 ? 5 : 4, 'source', 'Reported or explicit demo geometry'), area: evidence(680 + index * 105, 'source', 'Illustrative heated-area evidence'), archetype: evidence(`${category === 'multi_family' ? 'mf' : category}_se${era}`), fabric: evidence(year >= 2022 ? 'single configuration' : 'existing'), wall: evidence('MF SE.02 external wall'), roof: evidence('MF SE.02 top floor'), floor: evidence('MF SE.02 ground floor'), windows: evidence('Original double glazing'), heating: evidence('District heating', 'override', 'Explicit demo system choice'), ventilation: evidence('F', 'override', 'Explicit demo system choice'), operation: evidence(category === 'school' ? 'Sveby school · explicit calendar' : category === 'office' ? 'Sveby office · explicit calendar' : 'Sveby residential') }, components: [], epc: { status: 'missing', label: 'No linked certificate', observedEnergy: null } };
  building.components = [{ id: `${building.id}-a`, name: 'Main volume', footprint, height: Number(building.fields.height.value) }];
  if (index === 0 || index === 4) building.epc = { status: 'qualified', label: 'Unique dated single-building certificate · demo', observedEnergy: 96 + index * 3 };
  if (index === 1) building.epc = { status: 'shared', label: 'Shared certificate: quantities are not allocated', observedEnergy: null };
  if (index === 2) { building.fields.year = evidence(null, 'missing', 'Register year unavailable'); building.fields.archetype = evidence(null, 'missing', 'Construction year required'); }
  if (index === 3) { building.fields.height = evidence(null, 'missing', 'Height could not be determined'); building.components[0].height = null; }
  if (index === 6) building.epc = { status: 'conflict', label: 'Conflicting latest dates: no automatic selection', observedEnergy: null };
  if (index === 8) { building.components = [{ id: `${building.id}-a`, name: 'Lower part', footprint: rectangle(footprint[0][0], footprint[0][1], .00023), height: 9 }, { id: `${building.id}-b`, name: 'Upper part', footprint: rectangle(footprint[0][0] + .00025, footprint[0][1], .00023), height: 15 }]; building.fields.height = evidence(15, 'source', 'Component-specific heights; review both volumes'); }
  if (index === 10) building.fields.operation = evidence(null, 'missing', 'Unsupported use requires explicit operation profile');
  return building;
}
export const sample = { buildings: Array.from({ length: 12 }, (_, i) => demoBuilding(i)), context: [12, 13, 14, 15].map((i) => { const b = demoBuilding(i % 12); b.id = `context-${i}`; b.name = `Context ${i - 11}`; b.footprint = rectangle(i % 2 ? 11.9636 : 11.969, 57.6971 + Math.floor((i - 12) / 2) * .0026); b.components = [{ id: `${b.id}-a`, name: 'Shading volume', footprint: b.footprint, height: 15 }]; return b; }), targetBoundary: rectangle(11.9647, 57.6971, .0037, .0027), contextBoundary: rectangle(11.9632, 57.6961, .0072, .0049), location: [11.9665, 57.6983] as Point };
export function seedProjects(ownerId: string, now: number): Project[] {
  const createdAt = new Date(now - 86400000 * 3).toISOString();
  return [{ id: `${ownerId}-landala`, ownerId, name: ownerId === 'demo-alex' ? 'Landala renovation portfolio' : 'Sam’s campus pilot', description: 'A small private demo portfolio. All results and source records are illustrative.', createdAt, updatedAt: createdAt, revision: 1, route: 'map', siteType: 'actual', location: sample.location, contextPreset: 'none', targetBoundary: sample.targetBoundary, contextBoundary: sample.contextBoundary, buildings: [demoBuilding(0), demoBuilding(1), demoBuilding(4)], contextBuildings: sample.context, baselines: [], studies: [] }];
}
