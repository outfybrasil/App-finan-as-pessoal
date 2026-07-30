import { useEffect, useMemo, useState } from 'react';
import { Check, CreditCard, Edit3, ReceiptText, Sliders } from 'lucide-react';
import type { Account, Transaction } from '../types';
import { getCreditCardSummary } from '../lib/finance';

interface CreditCardsOverviewProps {
  accounts: Account[];
  transactions: Transaction[];
  currentMonth: number;
  currentYear: number;
  hideValues: boolean;
  onEditTransaction: (transaction: Transaction) => void;
  onToggleStatus: (transaction: Transaction) => void;
  onOpenSettings: () => void;
}

const formatCurrency = (value: number, hidden: boolean) =>
  hidden
    ? '••••••'
    : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const statusLabel: Record<Transaction['status'], string> = {
  completed: 'Pago',
  pending: 'Pendente',
  scheduled: 'Agendado',
};

export default function CreditCardsOverview({
  accounts,
  transactions,
  currentMonth,
  currentYear,
  hideValues,
  onEditTransaction,
  onToggleStatus,
  onOpenSettings,
}: CreditCardsOverviewProps) {
  const creditCards = accounts.filter((account) => account.type === 'credit');
  const [selectedCardId, setSelectedCardId] = useState('');

  useEffect(() => {
    if (!creditCards.some((card) => card.id === selectedCardId)) {
      setSelectedCardId(creditCards[0]?.id || '');
    }
  }, [creditCards, selectedCardId]);

  const selectedCard = creditCards.find((card) => card.id === selectedCardId);
  const cardTransactions = useMemo(() => {
    if (!selectedCard) return [];

    return transactions
      .filter((transaction) => {
        if (transaction.accountId !== selectedCard.id || transaction.type !== 'expense') return false;
        const [year, month] = transaction.date.split('-').map(Number);
        return year === currentYear && month - 1 === currentMonth;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [currentMonth, currentYear, selectedCard, transactions]);

  if (creditCards.length === 0) {
    return (
      <section className="rounded-2xl border border-white/[0.08] bg-[#0f0f13] p-5" aria-labelledby="credit-cards-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 id="credit-cards-title" className="font-display text-sm font-semibold text-white">Cartões de crédito</h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-400">
              Cadastre cada cartão separadamente para acompanhar fatura, limite e compras por banco.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            className="min-h-11 shrink-0 rounded-xl border border-white/[0.1] px-4 text-xs font-semibold text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.04] active:scale-[0.98]"
          >
            Configurar cartões
          </button>
        </div>
      </section>
    );
  }

  const limit = Number(selectedCard?.creditLimit) || 0;
  const { invoiceTotal, paidTotal, openTotal, availableLimit, usagePercentage } =
    getCreditCardSummary(cardTransactions, limit);

  return (
    <section className="space-y-3" aria-labelledby="credit-cards-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 id="credit-cards-title" className="font-display text-sm font-semibold text-white">Cartões de crédito</h3>
          <p className="mt-0.5 text-xs text-zinc-400">Faturas e compras separadas por cartão.</p>
        </div>
        <div className="flex max-w-full gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Selecionar cartão">
          {creditCards.map((card) => {
            const selected = card.id === selectedCardId;
            return (
              <button
                key={card.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setSelectedCardId(card.id)}
                className={`min-h-11 shrink-0 rounded-xl border px-3.5 text-xs font-semibold transition active:scale-[0.98] ${
                  selected
                    ? 'border-white/20 bg-white/[0.08] text-white'
                    : 'border-white/[0.08] text-zinc-400 hover:border-white/15 hover:text-white'
                }`}
              >
                {card.name}
              </button>
            );
          })}
        </div>
      </div>

      {selectedCard && (
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f0f13]">
          <div className="grid gap-px bg-white/[0.06] sm:grid-cols-[1.35fr_1fr]">
            <div className="bg-[#0f0f13] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: selectedCard.color }}
                  >
                    <CreditCard size={18} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{selectedCard.name}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-400">
                      {selectedCard.closingDay ? `Fecha dia ${selectedCard.closingDay}` : 'Fechamento não informado'}
                      {' · '}
                      {selectedCard.dueDay ? `Vence dia ${selectedCard.dueDay}` : 'Vencimento não informado'}
                    </p>
                  </div>
                </div>
                <ReceiptText size={17} className="shrink-0 text-zinc-500" aria-hidden="true" />
              </div>

              <div className="mt-6">
                <p className="text-xs text-zinc-400">Fatura do mês</p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-white">
                  {formatCurrency(invoiceTotal, hideValues)}
                </p>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-4">
                <div>
                  <dt className="text-[11px] text-zinc-500">Pago</dt>
                  <dd className="mt-1 font-mono text-sm font-semibold tabular-nums text-emerald-400">
                    {formatCurrency(paidTotal, hideValues)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-zinc-500">Em aberto</dt>
                  <dd className="mt-1 font-mono text-sm font-semibold tabular-nums text-amber-400">
                    {formatCurrency(openTotal, hideValues)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-[#0f0f13] p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-zinc-400">Limite disponível</p>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="min-h-11 min-w-11 rounded-xl text-zinc-500 transition hover:bg-white/[0.04] hover:text-white"
                  aria-label={`Configurar ${selectedCard.name}`}
                >
                  <Sliders size={15} className="mx-auto" aria-hidden="true" />
                </button>
              </div>
              <p className="font-mono text-lg font-bold tabular-nums text-white">
                {limit > 0 ? formatCurrency(availableLimit, hideValues) : 'Não informado'}
              </p>
              {limit > 0 && (
                <>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full ${
                        usagePercentage >= 90 ? 'bg-rose-500' : usagePercentage >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${usagePercentage}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-zinc-500">
                    {Math.round(usagePercentage)}% usado de {formatCurrency(limit, hideValues)}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="border-t border-white/[0.06]">
            <div className="flex items-center justify-between px-5 py-3">
              <h4 className="text-xs font-semibold text-zinc-300">Compras neste cartão</h4>
              <span className="font-mono text-[11px] text-zinc-500">{cardTransactions.length} lançamentos</span>
            </div>

            {cardTransactions.length === 0 ? (
              <div className="border-t border-white/[0.04] px-5 py-8 text-center">
                <p className="text-xs text-zinc-400">Nenhuma compra lançada neste cartão durante o mês.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05] border-t border-white/[0.04]">
                {cardTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <button
                      type="button"
                      onClick={() => onToggleStatus(transaction)}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${
                        transaction.status === 'completed'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : 'border-white/[0.08] text-zinc-500 hover:border-white/20 hover:text-white'
                      }`}
                      aria-label={transaction.status === 'completed' ? 'Marcar como pendente' : 'Marcar como pago'}
                    >
                      <Check size={14} aria-hidden="true" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white">{transaction.description}</p>
                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                        {transaction.category} · {transaction.date} · {statusLabel[transaction.status]}
                      </p>
                    </div>

                    <p className="shrink-0 font-mono text-xs font-semibold tabular-nums text-rose-400">
                      {formatCurrency(transaction.amount, hideValues)}
                    </p>
                    <button
                      type="button"
                      onClick={() => onEditTransaction(transaction)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-white/[0.04] hover:text-white"
                      aria-label={`Editar ${transaction.description}`}
                    >
                      <Edit3 size={14} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
