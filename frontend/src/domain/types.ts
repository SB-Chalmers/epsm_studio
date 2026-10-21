// SPDX-License-Identifier: MIT
export type Point = [number, number];
export type Engine = 'rc' | 'energyplus';
export type RunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type Origin = 'source' | 'catalogue' | 'override' | 'missing';
export type PropertyKey = 'year' | 'function' | 'height' | 'storeys' | 'area' | 'archetype' | 'fabric' | 'wall' | 'roof' | 'floor' | 'windows' | 'heating' | 'ventilation' | 'operation';
export interface EvidenceValue { value: string | number | null; origin: Origin; source: string; original?: { value: string | number | null; origin: Origin; source: string }; }
export interface BuildingComponent { id: string; name: string; footprint: Point[]; height: number | null; originalHeight?: number | null; }
export interface Building { id: string; name: string; footprint: Point[]; coordinateSpace: 'geographic' | 'local'; included: boolean; fields: Record<PropertyKey, EvidenceValue>; components: BuildingComponent[]; epc: { reviewed?: boolean; status: 'qualified' | 'shared' | 'conflict' | 'missing'; label: string; observedEnergy: number | null; }; }
export interface Account { id: string; name: string; initials: string; email: string; }
export interface Settings { density: 'comfortable' | 'compact'; reducedMotion: boolean; defaultEngine: Engine; defaultWeather: 'tmy' | 'amy'; assessmentPeriod: number; }
export interface Weather { id: string; name: string; kind: 'tmy' | 'amy' | 'future'; year: number; station: string; distanceKm: number; source: string; description: string; multiplier: number; }
export interface CatalogueItem { id: string; name: string; kind: 'material' | 'construction' | 'renovation'; category: string; description: string; source: string; version: string; properties: Record<string, string | number>; layers?: { name: string; thickness: number }[]; multiplier?: number; embodiedPerM2?: number; incompleteCarbon?: boolean; incompatibleWith?: string[]; }
export interface RenovationPackage { id: string; name: string; measureIds: string[]; description: string; }
export interface PackageSnapshot extends RenovationPackage { measures: CatalogueItem[]; }
export interface RunContextSnapshot { location: Point; route: Project['route']; siteType: Project['siteType']; contextPreset: Project['contextPreset']; targetBoundary: Point[] | null; contextBoundary: Point[] | null; contextBuildings: Building[]; contextOmission: boolean; }
export interface CaseResult { id: string; buildingId: string; buildingName: string; scenarioId: string; scenarioName: string; packageId: string; weatherId: string; engine: Engine; status: 'completed' | 'failed' | 'cancelled'; area: number; annualEnergy: number | null; embodiedCarbon: number | null; operationalCarbon: number | null; monthly: number[]; hourly: { hour: number; energy: number }[]; error?: string; }
export interface Attempt { id: string; number: number; startedAt: string; status: RunStatus; message: string; }
export interface BaselineRun { id: string; name: string; revision: number; engine: Engine; weatherId: string; assessmentPeriod: number; contextOmission: boolean; status: RunStatus; startedAt: string; durationMs: number; progress: number; snapshot: Building[]; contextSnapshot?: RunContextSnapshot; results: CaseResult[]; attempts: Attempt[]; demoFailure: boolean; }
export type StudyTemplate = 'weather' | 'renovation' | 'robust' | 'custom';
export interface Scenario { id: string; name: string; packageId: string; weatherId: string; }
export interface Study { id: string; name: string; template: StudyTemplate; baselineId: string | null; assessmentPeriod: number; packageIds: string[]; weatherIds: string[]; status: 'draft' | RunStatus; scenarios: Scenario[]; results: CaseResult[]; attempts: Attempt[]; startedAt?: string; durationMs: number; progress: number; revision: number; snapshot?: Building[]; contextSnapshot?: RunContextSnapshot; packageSnapshot?: PackageSnapshot[]; demoFailure: boolean; updatedAt: string; }
export interface Project { id: string; ownerId: string; name: string; description: string; createdAt: string; updatedAt: string; revision: number; route: 'custom' | 'map'; siteType: 'hypothetical' | 'actual'; location: Point; contextPreset: 'none' | 'rural' | 'urban_lowrise_dense' | 'urban_highrise_dense'; targetBoundary: Point[] | null; contextBoundary: Point[] | null; buildings: Building[]; contextBuildings: Building[]; baselines: BaselineRun[]; studies: Study[]; }
export type ProjectInput = Pick<Project, 'name' | 'route' | 'siteType'> & Partial<Pick<Project, 'description' | 'location' | 'contextPreset' | 'targetBoundary' | 'contextBoundary' | 'buildings' | 'contextBuildings'>>;
export type DraftPatch = Partial<Pick<Project, 'name' | 'description' | 'location' | 'contextPreset' | 'targetBoundary' | 'contextBoundary' | 'buildings' | 'contextBuildings'>>;
export type StudyInput = Pick<Study, 'name' | 'template'> & Partial<Pick<Study, 'baselineId' | 'assessmentPeriod' | 'packageIds' | 'weatherIds' | 'demoFailure'>>;
export interface SystemStatus { cpu: number; memoryUsed: number; memoryTotal: number; storageUsed: number; storageTotal: number; workers: number; capacity: number; queued: number; running: number; updatedAt: string; }
export interface StudioClient {
 drafts: { get<T>(key: string): Promise<T | null>; set<T>(key: string, value: T): Promise<void>; remove(key: string): Promise<void> };
 getSession(): Promise<Account | null>; getAccounts(): Promise<Account[]>; signInDemo(accountId?: string): Promise<Account>; signOut(): Promise<void>;
 getSettings(): Promise<Settings>; updateSettings(patch: Partial<Settings>): Promise<Settings>; resetWorkspace(): Promise<void>;
 listProjects(): Promise<Project[]>; getProject(id: string): Promise<Project>; createProject(input: ProjectInput): Promise<Project>; updateProject(id: string, patch: DraftPatch, expectedRevision: number): Promise<Project>; deleteProject(id: string): Promise<void>;
 getCatalogue(): Promise<CatalogueItem[]>; getWeather(): Promise<Weather[]>; getPackages(): Promise<RenovationPackage[]>; savePackage(input: Pick<RenovationPackage, 'name' | 'measureIds' | 'description'>, id?: string): Promise<RenovationPackage>; getSampleBuildings(): Promise<{ buildings: Building[]; context: Building[]; targetBoundary: Point[]; contextBoundary: Point[]; location: Point }>;
 runBaseline(projectId: string, input: { engine: Engine; weatherId: string; assessmentPeriod: number; contextOmission: boolean; demoFailure?: boolean }): Promise<BaselineRun>; cancelBaseline(projectId: string, runId: string): Promise<void>;
 createStudy(projectId: string, input: StudyInput): Promise<Study>; updateStudy(projectId: string, studyId: string, patch: Partial<StudyInput>): Promise<Study>; duplicateStudy(projectId: string, studyId: string): Promise<Study>; submitStudy(projectId: string, studyId: string): Promise<Study>; cancelStudy(projectId: string, studyId: string): Promise<void>; retryStudy(projectId: string, studyId: string): Promise<Study>;
 getSystemStatus(): Promise<SystemStatus>;
}
export interface ProjectPageProps { project: Project; onRefresh: () => Promise<void>; }
export const propertyLabels: Record<PropertyKey, string> = { year: 'Construction year', function: 'Building function', height: 'Height (m)', storeys: 'Above-ground storeys', area: 'Heated floor area (m²)', archetype: 'Archetype', fabric: 'Current fabric state', wall: 'Wall construction', roof: 'Roof construction', floor: 'Ground floor', windows: 'Windows', heating: 'Heating', ventilation: 'Ventilation', operation: 'Operation profile' };
export const fieldValue = (building: Building, key: PropertyKey): string | number | null => building.fields[key].value;
export const selectedBuildings = (project: Project): Building[] => project.buildings.filter(b => b.included);
export const currentBaseline = (project: Project): BaselineRun | undefined => [...project.baselines].reverse().find(b => b.status === 'completed');
