// SPDX-License-Identifier: MIT
import { expect, it } from 'vitest';
import { worstCaseCarbonPoints } from '../domain/comparisons';
import { paretoFront } from '../domain/logic';
import type { CaseResult } from '../domain/types';
const sample = (packageId: string, weather: string, building: string, embodiedCarbon: number | null, operationalCarbon: number, status: CaseResult['status'] = 'completed'): CaseResult => ({ id: `${packageId}-${weather}-${building}`, buildingId: building, buildingName: building, scenarioId: `${packageId}-${weather}`, scenarioName: `${packageId} ${weather}`, packageId, weatherId: weather, engine: 'rc', status, area: 100, annualEnergy: 1000, embodiedCarbon, operationalCarbon, monthly: [], hourly: [] });
it('plots one worst portfolio weather outcome per package, keeping weather out of renovation decisions', () => {
  const points = worstCaseCarbonPoints([
    sample('A', 'warm', '1', 10, 20), sample('A', 'warm', '2', 10, 20),
    sample('A', 'cold', '1', 10, 60), sample('A', 'cold', '2', 10, 60),
    sample('B', 'warm', '1', 20, 5), sample('B', 'warm', '2', 20, 5),
    sample('B', 'cold', '1', 20, 30), sample('B', 'cold', '2', 20, 30),
    sample('C', 'warm', '1', 10, 20), sample('C', 'cold', '1', null, 30),
    sample('D', 'warm', '1', 40, 80), sample('D', 'warm', '2', 40, 80),
    sample('D', 'cold', '1', 40, 90), sample('D', 'cold', '2', 40, 90),
    sample('failed', 'warm', '1', 5, 1, 'failed'),
  ]);
  expect(points.map(point => point.id)).toEqual(['A-cold', 'B-cold', 'D-cold']);
  expect(points[0]).toMatchObject({ embodiedCarbon: 20, operationalCarbon: 120 });
  expect(paretoFront(points).map(point => point.id)).toEqual(['A-cold', 'B-cold']);
});
