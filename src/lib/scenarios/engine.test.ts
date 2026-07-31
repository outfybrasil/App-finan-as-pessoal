import { describe, expect, it } from 'vitest';
import { simulateScenario } from './engine';
import type { ScenarioSnapshot } from './types';

const snapshot: ScenarioSnapshot = {
  version: 'test-v1',
  accounts: [
    { id: 'checking', name: 'Conta', balance: 1000 },
    { id: 'reserve', name: 'Reserva', balance: 500 },
  ],
  transactions: [
    { id: 'salary', description: 'Salário', amount: 800, type: 'income', status: 'scheduled', date: '2026-08-10', accountId: 'checking' },
    { id: 'rent', description: 'Aluguel', amount: 1200, type: 'expense', status: 'pending', date: '2026-08-05', accountId: 'checking' },
    { id: 'energy', description: 'Energia', amount: 200, type: 'expense', status: 'scheduled', date: '2026-08-12', accountId: 'checking' },
  ],
};
const options = { startDate: '2026-08-01', endDate: '2026-08-15', minimumReserve: 300 };

describe('simulateScenario', () => {
  it('é determinístico e não modifica a fotografia recebida', () => {
    const before = structuredClone(snapshot);
    const first = simulateScenario(snapshot, [], options);
    const second = simulateScenario(snapshot, [], options);
    expect(first).toEqual(second);
    expect(snapshot).toEqual(before);
    expect(first.endingBalance).toBe(900);
  });

  it('antecipa um pagamento sem contar a despesa duas vezes', () => {
    const result = simulateScenario(snapshot, [
      { id: 'pay-rent', type: 'payment', transactionId: 'rent', accountId: 'checking', amount: 1200, date: '2026-08-02' },
    ], options);
    expect(result.timeline.filter((event) => event.sourceId === 'rent')).toHaveLength(1);
    expect(result.endingBalance).toBe(900);
    expect(result.uncoveredItems).toContain('rent');
  });

  it('mantém o restante de um pagamento parcial no vencimento', () => {
    const result = simulateScenario(snapshot, [
      { id: 'partial-rent', type: 'payment', transactionId: 'rent', accountId: 'checking', amount: 500, date: '2026-08-02' },
    ], options);
    expect(result.timeline.filter((event) => event.sourceId === 'rent').map((event) => event.deltas[0].amount)).toEqual([-500, -700]);
    expect(result.partiallyCoveredItems).toContain('rent');
  });

  it('transfere da reserva sem alterar o saldo total', () => {
    const result = simulateScenario(snapshot, [
      { id: 'use-reserve', type: 'transfer', fromAccountId: 'reserve', toAccountId: 'checking', amount: 400, date: '2026-08-01' },
    ], options);
    expect(result.startingBalance).toBe(1500);
    expect(result.endingBalance).toBe(900);
    expect(result.accounts.find((account) => account.id === 'reserve')?.endingBalance).toBe(100);
  });

  it('simula uma nova saída sem exigir movimentação existente', () => {
    const result = simulateScenario(snapshot, [
      { id: 'invoice', type: 'expense', accountId: 'checking', amount: 300, date: '2026-08-03', description: 'Pagamento da fatura' },
    ], options);
    expect(result.endingBalance).toBe(600);
    expect(result.timeline.find((event) => event.sourceId === 'invoice')?.kind).toBe('expense');
  });

  it('identifica despesa descoberta e saldo negativo por conta', () => {
    const result = simulateScenario(snapshot, [], options);
    expect(result.uncoveredItems).toContain('rent');
    expect(result.accounts.find((account) => account.id === 'checking')?.minimumBalance).toBe(-200);
    expect(result.warnings).toContain('Há despesas que deixam a conta de origem negativa.');
  });

  it('ordena entradas antes de despesas quando ocorrem na mesma data', () => {
    const sameDay = structuredClone(snapshot);
    sameDay.transactions[0].date = '2026-08-05';
    const result = simulateScenario(sameDay, [], options);
    expect(result.timeline.slice(0, 2).map((event) => event.kind)).toEqual(['income', 'expense']);
    expect(result.uncoveredItems).not.toContain('rent');
  });

  it('recusa ações inválidas e pagamentos acima do valor', () => {
    expect(() => simulateScenario(snapshot, [
      { id: 'too-much', type: 'payment', transactionId: 'energy', accountId: 'checking', amount: 201, date: '2026-08-01' },
    ], options)).toThrow('Pagamento excede');
  });
});
