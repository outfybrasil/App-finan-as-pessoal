import type { ScenarioResult } from './types';

export function createScenarioExplanationInput(result: ScenarioResult) {
  return {
    period: result.period,
    startingBalance: result.startingBalance,
    endingBalance: result.endingBalance,
    minimumBalance: result.minimumBalance,
    minimumBalanceDate: result.minimumBalanceDate,
    safeToSpend: result.safeToSpend,
    uncoveredItems: result.uncoveredItems,
    warnings: result.warnings,
    accounts: result.accounts.map(({ id, name, endingBalance, minimumBalance }) => ({
      id,
      name,
      endingBalance,
      minimumBalance,
    })),
  };
}
