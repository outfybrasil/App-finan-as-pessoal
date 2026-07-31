import { describe, expect, it } from 'vitest';
import {
  addMonthsClamped,
  getEffectiveStatus,
  getCreditCardSummary,
  getLocalIsoDate,
  getTransactionEffectiveStatus,
  getTransactionTotals,
  getTransactionsForView,
  getDailyProjectedBalances,
  parseCurrencyInput,
} from './finance';
import type { Transaction } from '../types';

describe('addMonthsClamped', () => {
  it('mantém o último dia válido ao avançar parcelas', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonthsClamped('2026-03-31', 1)).toBe('2026-04-30');
  });

  it('atravessa anos sem alterar o dia quando ele existe', () => {
    expect(addMonthsClamped('2026-12-15', 1)).toBe('2027-01-15');
  });

  it('recusa datas impossíveis', () => {
    expect(() => addMonthsClamped('2026-02-31', 1)).toThrow('Data inválida');
    expect(() => addMonthsClamped('31/01/2026', 1)).toThrow('Data inválida');
  });
});

describe('getEffectiveStatus', () => {
  it('preserva transações concluídas', () => {
    expect(getEffectiveStatus('completed', '2020-01-01', '2026-07-30')).toBe('completed');
  });

  it('classifica vencidas e futuras', () => {
    expect(getEffectiveStatus('scheduled', '2026-07-29', '2026-07-30')).toBe('pending');
    expect(getEffectiveStatus('pending', '2026-07-30', '2026-07-30')).toBe('scheduled');
  });
});

describe('financial selectors', () => {
  const base = {
    category: 'Teste',
    accountId: 'acc-1',
    isFixed: false,
    isInstallment: false,
  } as const;

  const transactions: Transaction[] = [
    { ...base, id: 'paid-income', description: 'Salário', amount: 3000, type: 'income', date: '2026-07-05', status: 'completed', paymentDate: '2026-07-06' },
    { ...base, id: 'paid-expense', description: 'Aluguel', amount: 1200, type: 'expense', date: '2026-07-10', status: 'completed', paymentDate: '2026-08-01' },
    { ...base, id: 'pending', description: 'Internet', amount: 100, type: 'expense', date: '2026-07-20', status: 'pending' },
    { ...base, id: 'scheduled', description: 'Freela', amount: 500, type: 'income', date: '2026-07-25', status: 'scheduled' },
    { ...base, id: 'other-month', description: 'Agosto', amount: 900, type: 'expense', date: '2026-08-01', status: 'pending' },
  ];
  const july = { start: '2026-07-01', end: '2026-07-31' };

  it('separa realizado de previsto sem retirar pagos da competência', () => {
    expect(getTransactionTotals(transactions, july, 'realized')).toEqual({
      income: 3000,
      expense: 1200,
      balance: 1800,
      count: 2,
    });
    expect(getTransactionTotals(transactions, july, 'forecast')).toEqual({
      income: 500,
      expense: 100,
      balance: 400,
      count: 2,
    });
  });

  it('usa a data de competência para o período, mesmo com pagamento em outro mês', () => {
    expect(getTransactionsForView(transactions, july, 'all').map((item) => item.id)).toEqual([
      'paid-income',
      'paid-expense',
      'pending',
      'scheduled',
    ]);
  });

  it('deriva atraso sem gravar um status redundante', () => {
    expect(getTransactionEffectiveStatus(transactions[2], '2026-07-21')).toBe('overdue');
    expect(getTransactionEffectiveStatus(transactions[3], '2026-07-21')).toBe('scheduled');
    expect(getTransactionEffectiveStatus(transactions[0], '2026-07-21')).toBe('completed');
  });

  it('não duplica compra no cartão com o pagamento bancário da fatura', () => {
    const cardPurchase: Transaction = {
      ...base, id: 'card-purchase', description: 'Compra', amount: 400, type: 'expense', date: '2026-07-10', status: 'pending', kind: 'card_purchase', creditCardId: 'card-1',
    };
    const invoicePayment: Transaction = {
      ...base, id: 'invoice-payment', description: 'Pagamento da fatura', amount: 400, type: 'expense', date: '2026-07-15', status: 'completed', kind: 'invoice_payment', creditCardId: 'card-1', invoiceId: '2026-07',
    };
    expect(getTransactionTotals([cardPurchase, invoicePayment], july, 'all').expense).toBe(400);
  });
});

describe('getDailyProjectedBalances', () => {
  it('parte dos saldos atuais e aplica apenas eventos futuros de caixa', () => {
    const accounts = [{ id: 'bank', name: 'Banco', balance: 1000, color: '#000', type: 'checking' }];
    const base = { category: 'Teste', accountId: 'bank', isFixed: false, isInstallment: false } as const;
    const transactions: Transaction[] = [
      { ...base, id: 'income', description: 'Receita', amount: 500, type: 'income', date: '2026-08-02', status: 'scheduled' },
      { ...base, id: 'expense', description: 'Conta', amount: 200, type: 'expense', date: '2026-08-03', status: 'pending' },
      { ...base, id: 'paid', description: 'Já refletida', amount: 999, type: 'expense', date: '2026-08-01', status: 'completed' },
    ];
    expect(getDailyProjectedBalances(accounts, transactions, { start: '2026-08-01', end: '2026-08-03' })).toEqual({
      '2026-08-01': 1000,
      '2026-08-02': 1500,
      '2026-08-03': 1300,
    });
  });
});

describe('parseCurrencyInput', () => {
  it('converte valores no formato brasileiro', () => {
    expect(parseCurrencyInput('1.234,56')).toBe(1234.56);
    expect(parseCurrencyInput('10')).toBe(10);
  });

  it('recusa zero, negativos e conteúdo inválido', () => {
    expect(parseCurrencyInput('0')).toBeNull();
    expect(parseCurrencyInput('-10')).toBeNull();
    expect(parseCurrencyInput('10abc')).toBeNull();
  });
});

describe('getLocalIsoDate', () => {
  it('não depende da conversão UTC', () => {
    expect(getLocalIsoDate(new Date(2026, 6, 30, 23, 59))).toBe('2026-07-30');
  });
});

describe('getCreditCardSummary', () => {
  const transaction = {
    category: 'Compras',
    accountId: 'card-1',
    date: '2026-08-10',
    isFixed: false,
    isInstallment: false,
  } as const;

  it('separa fatura paga e aberta sem contar receitas', () => {
    const summary = getCreditCardSummary([
      { ...transaction, id: '1', description: 'Mercado', amount: 300, type: 'expense', status: 'completed' },
      { ...transaction, id: '2', description: 'Farmácia', amount: 200, type: 'expense', status: 'scheduled' },
      { ...transaction, id: '3', description: 'Estorno', amount: 50, type: 'income', status: 'completed' },
    ], 1000);

    expect(summary).toEqual({
      invoiceTotal: 500,
      paidTotal: 300,
      openTotal: 200,
      availableLimit: 800,
      usagePercentage: 20,
    });
  });

  it('nunca apresenta limite disponível negativo', () => {
    const summary = getCreditCardSummary([
      { ...transaction, id: '1', description: 'Compra', amount: 1200, type: 'expense', status: 'pending' },
    ], 1000);

    expect(summary.availableLimit).toBe(0);
    expect(summary.usagePercentage).toBe(100);
  });
});
