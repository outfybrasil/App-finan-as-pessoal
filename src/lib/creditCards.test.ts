import { describe, expect, it } from 'vitest';
import type { Account, Transaction } from '../types';
import { getCreditCardOverview, getInvoiceReference } from './creditCards';

const card: Account = {
  id: 'nubank', name: 'Nubank', balance: 0, color: '#820ad1', type: 'credit',
  creditLimit: 2000, closingDay: 7, dueDay: 15, minimumPaymentRate: 0.2,
};
const purchase = {
  type: 'expense', category: 'Compras', accountId: 'nubank', status: 'pending',
  isFixed: false, isInstallment: false, kind: 'card_purchase', creditCardId: 'nubank',
} as const;

describe('getInvoiceReference', () => {
  it('coloca compras antes do fechamento na fatura corrente', () => {
    expect(getInvoiceReference('2026-08-07', 7, 15)).toEqual({
      id: '2026-08', month: '2026-08', closingDate: '2026-08-07', dueDate: '2026-08-15',
    });
  });

  it('leva compras após o fechamento para a próxima fatura', () => {
    expect(getInvoiceReference('2026-08-08', 7, 15).dueDate).toBe('2026-09-15');
  });

  it('trata vencimento no mês seguinte e virada do ano', () => {
    expect(getInvoiceReference('2026-12-20', 25, 5).dueDate).toBe('2027-01-05');
    expect(getInvoiceReference('2026-12-26', 25, 5).dueDate).toBe('2027-02-05');
  });

  it('limita fechamento e vencimento ao último dia do mês', () => {
    expect(getInvoiceReference('2026-02-20', 31, 31).closingDate).toBe('2026-02-28');
  });
});

describe('getCreditCardOverview', () => {
  const transactions: Transaction[] = [
    { ...purchase, id: 'market', description: 'Mercado', amount: 600, date: '2026-08-05' },
    { ...purchase, id: 'phone', description: 'Celular', amount: 300, date: '2026-08-08' },
    { ...purchase, id: 'other-card', description: 'Outro', amount: 999, date: '2026-08-05', accountId: 'itau', creditCardId: 'itau' },
    { ...purchase, id: 'payment', description: 'Pagamento da fatura', amount: 200, date: '2026-08-10', accountId: 'checking', status: 'completed', kind: 'invoice_payment', invoiceId: '2026-08' },
  ];

  it('separa cartões e associa cada compra a uma única fatura', () => {
    const overview = getCreditCardOverview(card, transactions);
    expect(overview.invoices).toHaveLength(2);
    expect(overview.invoices.flatMap((invoice) => invoice.purchases.map((item) => item.id))).toEqual(['market', 'phone']);
  });

  it('deriva pagamento parcial, mínimo e limite disponível', () => {
    const overview = getCreditCardOverview(card, transactions);
    const august = overview.invoices[0];
    expect(august).toMatchObject({ total: 600, paid: 200, open: 400, minimumPayment: 80, status: 'partial' });
    expect(overview.totalOpen).toBe(700);
    expect(overview.availableLimit).toBe(1300);
    expect(overview.usagePercentage).toBe(35);
  });

  it('mantém as compras no histórico após quitar a fatura', () => {
    const paid = transactions.map((item) => item.id === 'payment' ? { ...item, amount: 600 } : item);
    const august = getCreditCardOverview(card, paid).invoices[0];
    expect(august.status).toBe('paid');
    expect(august.purchases.map((item) => item.id)).toEqual(['market']);
  });
});
