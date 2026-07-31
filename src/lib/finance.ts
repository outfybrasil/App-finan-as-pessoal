import type { Account, Transaction } from '../types';

export type EffectiveTransactionStatus = Transaction['status'] | 'overdue';
export type FinancialView = 'realized' | 'forecast' | 'all';

export interface DatePeriod {
  start: string;
  end: string;
}

export interface TransactionTotals {
  income: number;
  expense: number;
  balance: number;
  count: number;
}

export function getLocalIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getEffectiveStatus(
  status: Transaction['status'],
  dateStr: string,
  today = getLocalIsoDate()
): Transaction['status'] {
  if (status === 'completed') return 'completed';
  return dateStr < today ? 'pending' : 'scheduled';
}

/**
 * Derives the status shown to the user without persisting a second source of truth.
 * A pending transaction is overdue only after its competence/due date has passed.
 */
export function getTransactionEffectiveStatus(
  transaction: Pick<Transaction, 'status' | 'date'>,
  today = getLocalIsoDate()
): EffectiveTransactionStatus {
  if (transaction.status === 'completed') return 'completed';
  if (transaction.date < today) return 'overdue';
  return transaction.status;
}

export function isTransactionInPeriod(
  transaction: Pick<Transaction, 'date'>,
  period: DatePeriod
): boolean {
  return transaction.date >= period.start && transaction.date <= period.end;
}

export function getTransactionsForView(
  transactions: Transaction[],
  period: DatePeriod,
  view: FinancialView
): Transaction[] {
  return transactions.filter((transaction) => {
    if (transaction.kind === 'card_purchase') return false;
    if (!isTransactionInPeriod(transaction, period)) return false;
    if (view === 'realized') return transaction.status === 'completed';
    if (view === 'forecast') return transaction.status !== 'completed';
    return true;
  });
}

export function getTransactionTotals(
  transactions: Transaction[],
  period: DatePeriod,
  view: FinancialView
): TransactionTotals {
  const selected = getTransactionsForView(transactions, period, view);
  const totals = selected.reduce(
    (result, transaction) => {
      if (transaction.type === 'income') result.income += transaction.amount;
      else result.expense += transaction.amount;
      return result;
    },
    { income: 0, expense: 0 }
  );

  return {
    ...totals,
    balance: totals.income - totals.expense,
    count: selected.length,
  };
}

export function getDailyProjectedBalances(
  accounts: Account[],
  transactions: Transaction[],
  period: DatePeriod
): Record<string, number> {
  let balance = accounts
    .filter((account) => account.type !== 'credit')
    .reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const events = transactions
    .filter((transaction) => transaction.kind !== 'card_purchase' && transaction.status !== 'completed' && isTransactionInPeriod(transaction, period))
    .sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id));
  const result: Record<string, number> = {};
  const cursor = new Date(`${period.start}T12:00:00`);
  const end = new Date(`${period.end}T12:00:00`);
  let eventIndex = 0;

  while (cursor <= end) {
    const date = getLocalIsoDate(cursor);
    while (eventIndex < events.length && events[eventIndex].date === date) {
      const event = events[eventIndex];
      balance += event.type === 'income' ? event.amount : -event.amount;
      eventIndex += 1;
    }
    result[date] = Math.round((balance + Number.EPSILON) * 100) / 100;
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

export function addMonthsClamped(dateStr: string, months: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) throw new Error(`Data inválida: ${dateStr}`);

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const originalLastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  if (month < 1 || month > 12 || day < 1 || day > originalLastDay) {
    throw new Error(`Data inválida: ${dateStr}`);
  }

  const targetMonthStart = new Date(Date.UTC(year, month - 1 + months, 1));
  const targetYear = targetMonthStart.getUTCFullYear();
  const targetMonth = targetMonthStart.getUTCMonth();
  const targetLastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();

  return [
    targetYear,
    String(targetMonth + 1).padStart(2, '0'),
    String(Math.min(day, targetLastDay)).padStart(2, '0'),
  ].join('-');
}

export function parseCurrencyInput(value: string): number | null {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function getCreditCardSummary(transactions: Transaction[], creditLimit = 0) {
  const expenses = transactions.filter((transaction) => transaction.type === 'expense');
  const invoiceTotal = expenses.reduce((sum, transaction) => sum + transaction.amount, 0);
  const paidTotal = expenses
    .filter((transaction) => transaction.status === 'completed')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const openTotal = invoiceTotal - paidTotal;

  return {
    invoiceTotal,
    paidTotal,
    openTotal,
    availableLimit: creditLimit > 0 ? Math.max(0, creditLimit - openTotal) : 0,
    usagePercentage: creditLimit > 0 ? Math.min(100, (openTotal / creditLimit) * 100) : 0,
  };
}
