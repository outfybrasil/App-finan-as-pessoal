import type { Account, Transaction } from '../../types';

export type AutomaticPlanKind = 'due' | 'protected' | 'relief';
export interface FundingTransfer { fromAccountId: string; toAccountId: string; amount: number; fromBalanceAfter: number; }
export interface PaymentAllocation { transactionId: string; accountId: string; amount: number; balanceBefore: number; balanceAfter: number; transfers: FundingTransfer[]; }
export interface AutomaticPaymentPlan {
  kind: AutomaticPlanKind; title: string; description: string; allocations: PaymentAllocation[]; deferredTransactionIds: string[];
  paidAmount: number; deferredAmount: number; projectedBalance: number; reserveBalance: number; expectedIncome: number; expectedIncomeIncluded: boolean; openingSpendableBalance: number; risk: 'low' | 'medium' | 'high';
}
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const isReserve = (account: Account) => ['reserve', 'savings', 'investment'].includes(account.type || '');
const essentialCategories = new Set(['alimentacao', 'aluguel', 'casa', 'educacao', 'energia', 'moradia', 'saude', 'transporte']);
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const priorityRank = (transaction: Transaction, today: string) => {
  if (normalize(transaction.category || '').includes('aluguel') || normalize(transaction.description).includes('aluguel')) return -1;
  if (transaction.priority === 'high') return 0;
  if (transaction.date < today) return 1;
  if (transaction.isFixed) return 2;
  if (essentialCategories.has(normalize(transaction.category || ''))) return 3;
  return 4;
};
const byPriorityThenDue = (today: string) => (a: Transaction, b: Transaction) =>
  priorityRank(a, today) - priorityRank(b, today) || a.date.localeCompare(b.date) || b.amount - a.amount;

export function createAutomaticPaymentPlans(accounts: Account[], transactions: Transaction[], period: { start: string; end: string }): AutomaticPaymentPlan[] {
  const usable = accounts.filter((account) => account.type !== 'credit');
  const month = transactions.filter((t) => t.date >= period.start && t.date <= period.end && t.status !== 'completed' && t.kind !== 'card_purchase');
  const expenses = month.filter((t) => t.type === 'expense');
  const incomes = month.filter((t) => t.type === 'income');
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const expectedIncomeIncluded = period.start > today;
  // Future months use their forecast income; the open/current month uses only cash already received.
  const opening = new Map(usable.map((account) => [account.id, round(account.balance + (expectedIncomeIncluded ? incomes.filter((t) => t.accountId === account.id).reduce((sum, t) => sum + t.amount, 0) : 0))]));
  const expectedIncome = round(incomes.reduce((sum, transaction) => sum + transaction.amount, 0));
  const openingSpendableBalance = round(usable.filter((account) => !isReserve(account)).reduce((sum, account) => sum + account.balance, 0));

  const build = (kind: AutomaticPlanKind, title: string, description: string, ordered: Transaction[], protectReserve: boolean, allowNegative: boolean, bestFit: boolean): AutomaticPaymentPlan => {
    const balances = new Map(opening); const allocations: PaymentAllocation[] = []; const deferredTransactionIds: string[] = [];
    let rentBlocked = false;
    ordered.forEach((transaction) => {
      if (rentBlocked) { deferredTransactionIds.push(transaction.id); return; }
      const candidates = usable.filter((account) => !protectReserve || !isReserve(account));
      const sufficient = candidates.filter((account) => (balances.get(account.id) || 0) >= transaction.amount);
      let chosen: Account | undefined;
      const transfers: FundingTransfer[] = [];
      const preferred = sufficient.find((account) => account.id === transaction.accountId);
      if (preferred) chosen = preferred;
      else if (sufficient.length) chosen = [...sufficient].sort((a, b) => bestFit ? (balances.get(a.id)! - transaction.amount) - (balances.get(b.id)! - transaction.amount) : balances.get(b.id)! - balances.get(a.id)!)[0];
      else if (candidates.reduce((sum, account) => sum + Math.max(0, balances.get(account.id) || 0), 0) >= transaction.amount) {
        chosen = candidates.find((account) => account.id === transaction.accountId) || [...candidates].sort((a, b) => balances.get(b.id)! - balances.get(a.id)!)[0];
        let missing = transaction.amount - Math.max(0, balances.get(chosen.id) || 0);
        [...candidates].filter((account) => account.id !== chosen!.id).sort((a, b) => balances.get(b.id)! - balances.get(a.id)!).forEach((donor) => {
          if (missing <= 0) return;
          const donorBalance = Math.max(0, balances.get(donor.id) || 0);
          const amount = round(Math.min(donorBalance, missing));
          if (amount <= 0) return;
          balances.set(donor.id, round(donorBalance - amount));
          balances.set(chosen!.id, round((balances.get(chosen!.id) || 0) + amount));
          transfers.push({ fromAccountId: donor.id, toAccountId: chosen!.id, amount, fromBalanceAfter: balances.get(donor.id)! });
          missing = round(missing - amount);
        });
      }
      else if (allowNegative && candidates.length) chosen = [...candidates].sort((a, b) => balances.get(b.id)! - balances.get(a.id)!)[0];
      if (!chosen) {
        deferredTransactionIds.push(transaction.id);
        if (priorityRank(transaction, today) === -1) rentBlocked = true;
        return;
      }
      const balanceBefore = balances.get(chosen.id) || 0; const balanceAfter = round(balanceBefore - transaction.amount); balances.set(chosen.id, balanceAfter);
      allocations.push({ transactionId: transaction.id, accountId: chosen.id, amount: transaction.amount, balanceBefore, balanceAfter, transfers });
    });
    const paidAmount = round(allocations.reduce((sum, item) => sum + item.amount, 0));
    const deferredAmount = round(expenses.filter((t) => deferredTransactionIds.includes(t.id)).reduce((sum, t) => sum + t.amount, 0));
    const projectedBalance = round(usable.filter((account) => !isReserve(account)).reduce((sum, account) => sum + (balances.get(account.id) || 0), 0));
    const reserveBalance = round(usable.filter(isReserve).reduce((sum, account) => sum + (balances.get(account.id) || 0), 0));
    return { kind, title, description, allocations, deferredTransactionIds, paidAmount, deferredAmount, projectedBalance, reserveBalance, expectedIncome, expectedIncomeIncluded, openingSpendableBalance, risk: allocations.some((item) => item.balanceAfter < 0) || projectedBalance < 0 ? 'high' : deferredTransactionIds.length ? 'medium' : 'low' };
  };
  const dueFirst = [...expenses].sort(byPriorityThenDue(today));
  const smallFirst = [...expenses].sort((a, b) => priorityRank(a, today) - priorityRank(b, today) || a.amount - b.amount || a.date.localeCompare(b.date));
  return [
    build('due', 'Prioridades primeiro', 'Quita aluguel e prioridades com saldo real, combinando contas correntes quando necessário.', dueFirst, true, false, false),
    build('protected', 'Prioridades sem usar reservas', 'Paga primeiro o que é prioritário usando apenas contas correntes e carteiras.', dueFirst, true, false, false),
    build('relief', 'Prioridades e mais contas quitadas', 'Depois das prioridades, começa pelos menores compromissos para reduzir contas abertas.', smallFirst, true, false, true),
  ];
}
