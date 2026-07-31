import type { Account, Transaction } from '../types';
import { addMonthsClamped } from './finance';

export interface InvoiceReference {
  id: string;
  closingDate: string;
  dueDate: string;
  month: string;
}

export interface CreditCardInvoice extends InvoiceReference {
  cardId: string;
  purchases: Transaction[];
  total: number;
  paid: number;
  open: number;
  minimumPayment: number;
  status: 'open' | 'partial' | 'paid';
}

export interface CreditCardOverview {
  invoices: CreditCardInvoice[];
  totalPurchases: number;
  totalPaid: number;
  totalOpen: number;
  availableLimit: number;
  usagePercentage: number;
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function dateWithClampedDay(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(day, daysInMonth(year, month))).padStart(2, '0')}`;
}

function validateCardDays(closingDay: number, dueDay: number) {
  if (!Number.isInteger(closingDay) || closingDay < 1 || closingDay > 31) throw new Error('Dia de fechamento inválido');
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) throw new Error('Dia de vencimento inválido');
}

export function getInvoiceReference(purchaseDate: string, closingDay: number, dueDay: number): InvoiceReference {
  validateCardDays(closingDay, dueDay);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(purchaseDate);
  if (!match) throw new Error('Data da compra inválida');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) throw new Error('Data da compra inválida');

  const closesNextMonth = day > Math.min(closingDay, daysInMonth(year, month));
  const closingMonthAnchor = addMonthsClamped(`${year}-${String(month).padStart(2, '0')}-01`, closesNextMonth ? 1 : 0);
  const [closingYear, closingMonth] = closingMonthAnchor.split('-').map(Number);
  const closingDate = dateWithClampedDay(closingYear, closingMonth, closingDay);
  const dueMonthOffset = dueDay <= closingDay ? 1 : 0;
  const dueMonthAnchor = addMonthsClamped(`${closingYear}-${String(closingMonth).padStart(2, '0')}-01`, dueMonthOffset);
  const [dueYear, dueMonth] = dueMonthAnchor.split('-').map(Number);
  const dueDate = dateWithClampedDay(dueYear, dueMonth, dueDay);
  const monthKey = dueDate.slice(0, 7);

  return { id: monthKey, closingDate, dueDate, month: monthKey };
}

export function isCardPurchase(transaction: Transaction, cardId: string): boolean {
  if (transaction.kind === 'invoice_payment') return false;
  return transaction.type === 'expense' && (transaction.creditCardId === cardId || transaction.accountId === cardId);
}

export function getCreditCardOverview(
  card: Account,
  transactions: Transaction[]
): CreditCardOverview {
  if (card.type !== 'credit') throw new Error('A conta informada não é um cartão de crédito');
  const closingDay = card.closingDay || 1;
  const dueDay = card.dueDay || 10;
  const minimumRate = Math.min(1, Math.max(0, card.minimumPaymentRate ?? 0.15));
  const invoiceMap = new Map<string, CreditCardInvoice>();

  const ensureInvoice = (reference: InvoiceReference) => {
    let invoice = invoiceMap.get(reference.id);
    if (!invoice) {
      invoice = {
        ...reference,
        cardId: card.id,
        purchases: [],
        total: 0,
        paid: 0,
        open: 0,
        minimumPayment: 0,
        status: 'open',
      };
      invoiceMap.set(reference.id, invoice);
    }
    return invoice;
  };

  transactions.filter((transaction) => isCardPurchase(transaction, card.id)).forEach((purchase) => {
    const reference = getInvoiceReference(purchase.date, closingDay, dueDay);
    const invoice = ensureInvoice(reference);
    invoice.purchases.push(purchase);
    invoice.total = roundMoney(invoice.total + purchase.amount);
  });

  transactions
    .filter((transaction) => transaction.kind === 'invoice_payment' && transaction.creditCardId === card.id && transaction.invoiceId)
    .forEach((payment) => {
      const invoice = invoiceMap.get(payment.invoiceId!);
      if (invoice) invoice.paid = roundMoney(invoice.paid + payment.amount);
    });

  const invoices = [...invoiceMap.values()].map((invoice) => {
    invoice.purchases.sort((left, right) => right.date.localeCompare(left.date) || left.id.localeCompare(right.id));
    invoice.open = roundMoney(Math.max(0, invoice.total - invoice.paid));
    invoice.minimumPayment = roundMoney(Math.min(invoice.open, invoice.open * minimumRate));
    invoice.status = invoice.open === 0 ? 'paid' : invoice.paid > 0 ? 'partial' : 'open';
    return invoice;
  }).sort((left, right) => left.dueDate.localeCompare(right.dueDate));

  const totalPurchases = roundMoney(invoices.reduce((sum, invoice) => sum + invoice.total, 0));
  const totalPaid = roundMoney(invoices.reduce((sum, invoice) => sum + invoice.paid, 0));
  const totalOpen = roundMoney(invoices.reduce((sum, invoice) => sum + invoice.open, 0));
  const limit = Math.max(0, Number(card.creditLimit) || 0);

  return {
    invoices,
    totalPurchases,
    totalPaid,
    totalOpen,
    availableLimit: roundMoney(Math.max(0, limit - totalOpen)),
    usagePercentage: limit > 0 ? Math.min(100, (totalOpen / limit) * 100) : 0,
  };
}

export function getInvoiceForReferenceDate(invoices: CreditCardInvoice[], referenceDate: string) {
  return invoices.find((invoice) => invoice.closingDate >= referenceDate)
    || invoices.find((invoice) => invoice.dueDate >= referenceDate)
    || invoices.at(-1);
}
