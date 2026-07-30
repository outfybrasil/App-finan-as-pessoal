import { describe, expect, it } from 'vitest';
import {
  addMonthsClamped,
  getEffectiveStatus,
  getCreditCardSummary,
  getLocalIsoDate,
  parseCurrencyInput,
} from './finance';

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
