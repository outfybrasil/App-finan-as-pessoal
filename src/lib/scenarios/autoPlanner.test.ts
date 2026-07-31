import { describe, expect, it } from 'vitest';
import { createAutomaticPaymentPlans } from './autoPlanner';

const transactions = [
  { id: 'rent', description: 'Aluguel', amount: 400, type: 'expense' as const, category: 'Casa', accountId: 'a', date: '2026-07-05', status: 'pending' as const, isFixed: false, isInstallment: false },
  { id: 'light', description: 'Luz', amount: 200, type: 'expense' as const, category: 'Casa', accountId: 'a', date: '2026-07-10', status: 'pending' as const, isFixed: false, isInstallment: false },
];
const accounts = [
  { id: 'a', name: 'Banco A', balance: 300, color: '#000', type: 'checking' },
  { id: 'b', name: 'Banco B', balance: 350, color: '#111', type: 'checking' },
  { id: 'r', name: 'Reserva', balance: 1000, color: '#222', type: 'reserve' },
];

describe('automatic account allocation planner', () => {
  it('moves a payment to another bank and tracks balance before and after', () => {
    const plan = createAutomaticPaymentPlans(accounts, transactions, { start: '2026-07-01', end: '2026-07-31' })[0];
    expect(plan.allocations[0]).toMatchObject({ transactionId: 'rent', accountId: 'a', balanceBefore: 400, balanceAfter: 0 });
    expect(plan.allocations[0].transfers).toEqual([{ fromAccountId: 'b', toAccountId: 'a', amount: 100, fromBalanceAfter: 250 }]);
    expect(plan.allocations[1]).toMatchObject({ transactionId: 'light', accountId: 'b', balanceBefore: 250, balanceAfter: 50 });
  });
  it('combines checking balances without consuming reserve accounts', () => {
    const plan = createAutomaticPaymentPlans(accounts, transactions, { start: '2026-07-01', end: '2026-07-31' })[1];
    expect(plan.allocations.every((item) => item.accountId !== 'r')).toBe(true);
    expect(plan.deferredTransactionIds).toEqual([]);
    expect(plan.allocations.some((item) => item.transfers.length > 0)).toBe(true);
    expect(plan.projectedBalance).toBe(50);
    expect(plan.reserveBalance).toBe(1000);
  });
  it('pays a high-priority expense before a cheaper earlier expense', () => {
    const data = [
      { ...transactions[1], id: 'optional', category: 'Lazer', date: '2099-07-01', amount: 100 },
      { ...transactions[0], id: 'essential', category: 'Saúde', date: '2099-07-20', amount: 400, priority: 'high' as const },
    ];
    const plan = createAutomaticPaymentPlans([{ ...accounts[0], balance: 400 }], data, { start: '2099-07-01', end: '2099-07-31' })[1];
    expect(plan.allocations.map((item) => item.transactionId)).toEqual(['essential']);
    expect(plan.deferredTransactionIds).toEqual(['optional']);
  });
  it('always places rent before every other priority', () => {
    const data = [
      { ...transactions[0], id: 'priority', description: 'Conta urgente', category: 'Saúde', priority: 'high' as const, amount: 100 },
      { ...transactions[1], id: 'rent-first', description: 'Aluguel de casa', category: 'Moradia', amount: 400 },
    ];
    const plan = createAutomaticPaymentPlans([{ ...accounts[0], balance: 400 }], data, { start: '2026-07-01', end: '2026-07-31' })[1];
    expect(plan.allocations.map((item) => item.transactionId)).toEqual(['rent-first']);
    expect(plan.deferredTransactionIds).toEqual(['priority']);
  });
  it('never recommends a payment that makes an account negative', () => {
    const plan = createAutomaticPaymentPlans(
      [{ ...accounts[0], balance: 50 }],
      [{ ...transactions[0], description: 'Aluguel', amount: 400 }, { ...transactions[1], amount: 20 }],
      { start: '2026-07-01', end: '2026-07-31' },
    )[0];
    expect(plan.allocations).toEqual([]);
    expect(plan.deferredTransactionIds).toEqual(['rent', 'light']);
    expect(plan.projectedBalance).toBe(50);
  });
  it('uses forecast income to build a plan for a future month', () => {
    const plan = createAutomaticPaymentPlans(
      [{ ...accounts[0], balance: 0 }],
      [
        { ...transactions[0], id: 'salary', description: 'Salário', type: 'income', amount: 1000, date: '2099-08-05' },
        { ...transactions[0], id: 'future-rent', description: 'Aluguel', amount: 700, date: '2099-08-10' },
      ],
      { start: '2099-08-01', end: '2099-08-31' },
    )[0];
    expect(plan.expectedIncomeIncluded).toBe(true);
    expect(plan.allocations[0]).toMatchObject({ transactionId: 'future-rent', balanceBefore: 1000, balanceAfter: 300 });
    expect(plan.projectedBalance).toBe(300);
  });
});
