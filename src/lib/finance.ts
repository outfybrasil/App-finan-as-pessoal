import type { Transaction } from '../types';

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
