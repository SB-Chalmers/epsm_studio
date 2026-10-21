// SPDX-License-Identifier: MIT
import { aggregateResults, robustRanking } from './logic';
import type { CaseResult } from './types';

/** Weather is an external condition: plot each package at its worst total-carbon outcome. */
export function worstCaseCarbonPoints(results: CaseResult[]) {
  const completePackages = new Set(robustRanking(results).filter(rank => !rank.incomplete).map(rank => rank.packageId));
  return [...new Set(results.map(result => result.packageId))].filter(id => completePackages.has(id)).flatMap(packageId => {
    const cases = results.filter(result => result.packageId === packageId);
    const points = [...new Set(cases.map(result => result.scenarioId))].map(id => {
      const scenario = cases.filter(result => result.scenarioId === id);
      return { id, name: scenario[0].scenarioName, packageId, ...aggregateResults(scenario) };
    });
    if (points.some(point => point.embodiedCarbon === null || point.operationalCarbon === null)) return [];
    const worst = points.reduce((a, b) => (a.embodiedCarbon! + a.operationalCarbon! >= b.embodiedCarbon! + b.operationalCarbon! ? a : b));
    return [worst];
  });
}
