import { describe, expect, it } from 'vitest';
import { getGoalProjection, getWithdrawalDelayMonths } from './savings';

describe('goal projections', () => {
  it('calcula progresso, prazo e data sem presumir rendimento', () => {
    expect(getGoalProjection({ targetAmount: 12000, currentAmount: 3000, monthlyContribution: 1000 }, '2026-08-01')).toEqual({
      remaining: 9000, progressPercentage: 25, estimatedMonths: 9, estimatedDate: '2027-05-01',
    });
  });
  it('não promete prazo quando não há aporte planejado', () => {
    expect(getGoalProjection({ targetAmount: 1000, currentAmount: 100, monthlyContribution: 0 }, '2026-08-01').estimatedDate).toBeNull();
  });
  it('traduz retirada em atraso de aportes', () => {
    expect(getWithdrawalDelayMonths(1200, 500)).toBe(3);
    expect(getWithdrawalDelayMonths(1200, 0)).toBeNull();
  });
});
