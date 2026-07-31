import type { SavingsGoal } from '../types';

export interface GoalProjection {
  remaining: number;
  progressPercentage: number;
  estimatedMonths: number | null;
  estimatedDate: string | null;
}

export function getGoalProjection(goal: Pick<SavingsGoal, 'targetAmount' | 'currentAmount' | 'monthlyContribution'>, referenceDate: string): GoalProjection {
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const progressPercentage = goal.targetAmount > 0 ? Math.min(100, Math.max(0, goal.currentAmount / goal.targetAmount * 100)) : 0;
  const estimatedMonths = remaining === 0 ? 0 : goal.monthlyContribution > 0 ? Math.ceil(remaining / goal.monthlyContribution) : null;
  let estimatedDate: string | null = null;
  if (estimatedMonths !== null) {
    const date = new Date(`${referenceDate}T12:00:00`);
    date.setMonth(date.getMonth() + estimatedMonths);
    estimatedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  return { remaining, progressPercentage, estimatedMonths, estimatedDate };
}

export function getWithdrawalDelayMonths(amount: number, monthlyContribution: number): number | null {
  if (amount <= 0) return 0;
  return monthlyContribution > 0 ? Math.ceil(amount / monthlyContribution) : null;
}
