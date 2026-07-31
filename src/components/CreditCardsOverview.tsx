import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, CreditCard, Edit3, ReceiptText, Sliders, X } from 'lucide-react';
import type { Account, Transaction } from '../types';
import { getCreditCardOverview, getInvoiceForReferenceDate, type CreditCardInvoice } from '../lib/creditCards';
import { getLocalIsoDate } from '../lib/finance';
import { createScenarioSnapshot } from '../lib/scenarios/selectors';
import { simulateScenario } from '../lib/scenarios/engine';

interface CreditCardsOverviewProps {
  accounts: Account[];
  transactions: Transaction[];
  currentMonth: number;
  currentYear: number;
  hideValues: boolean;
  onEditTransaction: (transaction: Transaction) => void;
  onOpenSettings: () => void;
  onPayInvoice: (creditCardId: string, invoiceId: string, accountId: string, amount: number, paymentDate: string) => void;
}

type PurchaseFilter = 'all' | 'open' | 'paid' | 'installments';
type PaymentChoice = 'total' | 'minimum' | 'custom';

const formatCurrency = (value: number, hidden: boolean) => hidden
  ? '••••••'
  : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatMonth = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, monthNumber - 1, 1)))
    .replace('.', '');
};

const formatDate = (date: string) => {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};

export default function CreditCardsOverview({
  accounts,
  transactions,
  currentMonth,
  currentYear,
  hideValues,
  onEditTransaction,
  onOpenSettings,
  onPayInvoice,
}: CreditCardsOverviewProps) {
  const creditCards = accounts.filter((account) => account.type === 'credit');
  const paymentAccounts = accounts.filter((account) => account.type !== 'credit');
  const [selectedCardId, setSelectedCardId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [purchaseFilter, setPurchaseFilter] = useState<PurchaseFilter>('all');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('total');
  const [customAmount, setCustomAmount] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentDate, setPaymentDate] = useState(getLocalIsoDate());
  const [paymentMessage, setPaymentMessage] = useState('');

  useEffect(() => {
    if (!creditCards.some((card) => card.id === selectedCardId)) setSelectedCardId(creditCards[0]?.id || '');
  }, [creditCards, selectedCardId]);

  const selectedCard = creditCards.find((card) => card.id === selectedCardId);
  const overview = useMemo(
    () => selectedCard ? getCreditCardOverview(selectedCard, transactions) : null,
    [selectedCard, transactions]
  );
  const referenceDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
  const currentInvoice = overview ? getInvoiceForReferenceDate(overview.invoices, referenceDate) : undefined;

  useEffect(() => {
    if (!overview) return;
    if (!overview.invoices.some((invoice) => invoice.id === selectedInvoiceId)) {
      setSelectedInvoiceId(currentInvoice?.id || overview.invoices[0]?.id || '');
    }
  }, [currentInvoice?.id, overview, selectedInvoiceId]);

  useEffect(() => {
    setShowPayment(false);
    setPaymentMessage('');
    setPurchaseFilter('all');
  }, [selectedCardId, selectedInvoiceId]);

  useEffect(() => {
    if (!paymentAccounts.some((account) => account.id === paymentAccountId)) {
      setPaymentAccountId(selectedCard?.paymentAccountId || paymentAccounts[0]?.id || '');
    }
  }, [paymentAccountId, paymentAccounts, selectedCard?.paymentAccountId]);

  if (creditCards.length === 0) {
    return (
      <section className="rounded-2xl border border-white/[0.08] bg-[#0f0f13] p-5" aria-labelledby="credit-cards-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 id="credit-cards-title" className="text-sm font-semibold text-white">Cartões de crédito</h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-400">Cadastre cada cartão separadamente para organizar compras, faturas e limites.</p>
          </div>
          <button type="button" onClick={onOpenSettings} className="min-h-11 shrink-0 rounded-xl border border-white/[0.1] px-4 text-xs font-semibold text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.04] active:scale-[0.98]">Configurar cartões</button>
        </div>
      </section>
    );
  }

  if (!selectedCard || !overview) return null;
  const invoice = overview.invoices.find((item) => item.id === selectedInvoiceId) || currentInvoice;
  const currentIndex = currentInvoice ? overview.invoices.findIndex((item) => item.id === currentInvoice.id) : -1;
  const nextInvoice = currentIndex >= 0 ? overview.invoices[currentIndex + 1] : undefined;
  const previousInvoices = currentIndex > 0 ? overview.invoices.slice(0, currentIndex).reverse() : [];
  const visiblePurchases = (invoice?.purchases || []).filter((purchase) => {
    if (purchaseFilter === 'installments') return purchase.isInstallment;
    if (purchaseFilter === 'paid') return invoice?.status === 'paid';
    if (purchaseFilter === 'open') return invoice?.status !== 'paid';
    return true;
  });
  const paymentAmount = invoice
    ? paymentChoice === 'total' ? invoice.open : paymentChoice === 'minimum' ? invoice.minimumPayment : Number(customAmount)
    : 0;
  const paymentCalculation = (() => {
    if (!invoice || !paymentAccountId || !Number.isFinite(paymentAmount) || paymentAmount <= 0 || paymentAmount > invoice.open) return null;
    try {
      const snapshot = createScenarioSnapshot(accounts, transactions);
      const endDate = invoice.dueDate > paymentDate ? invoice.dueDate : paymentDate;
      const options = { startDate: paymentDate, endDate, minimumReserve: 0 };
      return {
        base: simulateScenario(snapshot, [], options),
        simulated: simulateScenario(snapshot, [{ id: `invoice-${invoice.id}`, type: 'expense', accountId: paymentAccountId, amount: paymentAmount, date: paymentDate, description: `Pagamento da fatura ${selectedCard.name}` }], options),
      };
    } catch {
      return null;
    }
  })();

  const selectInvoice = (selected?: CreditCardInvoice) => {
    if (selected) setSelectedInvoiceId(selected.id);
  };

  const registerPayment = () => {
    if (!invoice || !paymentCalculation) return;
    onPayInvoice(selectedCard.id, invoice.id, paymentAccountId, paymentAmount, paymentDate);
    setPaymentMessage(`Pagamento de ${formatCurrency(paymentAmount, false)} registrado sem remover as compras.`);
    setShowPayment(false);
  };

  return (
    <section className="space-y-4" aria-labelledby="credit-cards-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 id="credit-cards-title" className="text-sm font-semibold text-white">Cartões de crédito</h3>
          <p className="mt-0.5 text-xs text-zinc-400">Compras agrupadas pela data de fechamento de cada cartão.</p>
        </div>
        <div className="flex max-w-full gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Selecionar cartão">
          {creditCards.map((card) => (
            <button key={card.id} type="button" role="tab" aria-selected={card.id === selectedCardId} onClick={() => setSelectedCardId(card.id)} className={`min-h-11 shrink-0 rounded-xl border px-3.5 text-xs font-semibold transition active:scale-[0.98] ${card.id === selectedCardId ? 'border-white/20 bg-white/[0.08] text-white' : 'border-white/[0.08] text-zinc-400 hover:border-white/15 hover:text-white'}`}>{card.name}</button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f0f13]">
        <div className="grid gap-px bg-white/[0.06] sm:grid-cols-[1.35fr_1fr]">
          <div className="bg-[#0f0f13] p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: selectedCard.color }}><CreditCard size={18} aria-hidden="true" /></div>
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{selectedCard.name}</p><p className="mt-0.5 text-[11px] text-zinc-400">Fecha dia {selectedCard.closingDay || 1} · vence dia {selectedCard.dueDay || 10}</p></div>
              </div>
              <button type="button" onClick={onOpenSettings} className="min-h-11 min-w-11 rounded-xl text-zinc-500 transition hover:bg-white/[0.04] hover:text-white" aria-label={`Configurar ${selectedCard.name}`}><Sliders size={16} className="mx-auto" aria-hidden="true" /></button>
            </div>
            <p className="mt-6 text-xs text-zinc-400">Total em aberto</p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-white">{formatCurrency(overview.totalOpen, hideValues)}</p>
          </div>
          <div className="bg-[#0f0f13] p-5">
            <p className="text-xs text-zinc-400">Limite disponível</p>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums text-white">{selectedCard.creditLimit ? formatCurrency(overview.availableLimit, hideValues) : 'Não informado'}</p>
            {selectedCard.creditLimit ? <><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className={`h-full rounded-full ${overview.usagePercentage >= 90 ? 'bg-[#f43f5e]' : overview.usagePercentage >= 75 ? 'bg-[#f59e0b]' : 'bg-[#10b981]'}`} style={{ width: `${overview.usagePercentage}%` }} /></div><p className="mt-2 text-[11px] text-zinc-400">{Math.round(overview.usagePercentage)}% usado de {formatCurrency(selectedCard.creditLimit, hideValues)}</p></> : null}
          </div>
        </div>

        {overview.invoices.length === 0 ? (
          <div className="border-t border-white/[0.06] px-5 py-10 text-center"><ReceiptText size={24} className="mx-auto text-zinc-600" aria-hidden="true" /><p className="mt-3 text-sm text-zinc-300">Nenhuma fatura criada ainda.</p><p className="mt-1 text-xs text-zinc-500">Compras lançadas neste cartão aparecerão aqui automaticamente.</p></div>
        ) : invoice ? (
          <>
            <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] px-5 py-3">
              <button type="button" onClick={() => selectInvoice(currentInvoice)} disabled={!currentInvoice} className={`min-h-11 rounded-xl px-3 text-xs font-semibold transition ${invoice.id === currentInvoice?.id ? 'bg-[#24242c] text-white' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white'} disabled:opacity-40`}>Atual</button>
              <button type="button" onClick={() => selectInvoice(nextInvoice)} disabled={!nextInvoice} className={`min-h-11 rounded-xl px-3 text-xs font-semibold transition ${invoice.id === nextInvoice?.id ? 'bg-[#24242c] text-white' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white'} disabled:opacity-40`}>Próxima</button>
              {previousInvoices.length > 0 && <label className="text-xs text-zinc-400">Anteriores <select value={previousInvoices.some((item) => item.id === invoice.id) ? invoice.id : ''} onChange={(event) => setSelectedInvoiceId(event.target.value)} className="ml-2 min-h-11 rounded-xl border border-white/[0.08] bg-[#16161d] px-3 text-white"><option value="" disabled>Selecionar</option>{previousInvoices.map((item) => <option key={item.id} value={item.id}>{formatMonth(item.month)}</option>)}</select></label>}
            </div>

            <div className="border-t border-white/[0.06] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div><div className="flex items-center gap-2"><h4 className="text-base font-semibold capitalize text-white">Fatura {formatMonth(invoice.month)}</h4><span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${invoice.status === 'paid' ? 'border-emerald-500/25 bg-[#10251f] text-emerald-200' : invoice.status === 'partial' ? 'border-amber-500/25 bg-[#2a2110] text-amber-200' : 'border-white/[0.08] text-zinc-300'}`}>{invoice.status === 'paid' ? 'Paga' : invoice.status === 'partial' ? 'Parcial' : 'Em aberto'}</span></div><p className="mt-1 text-xs text-zinc-400">Fechamento {formatDate(invoice.closingDate)} · vencimento {formatDate(invoice.dueDate)}</p></div>
                <div className="text-left sm:text-right"><p className="font-mono text-xl font-bold tabular-nums text-white">{formatCurrency(invoice.total, hideValues)}</p><p className="mt-1 text-xs text-zinc-400">Em aberto {formatCurrency(invoice.open, hideValues)}</p></div>
              </div>

              {invoice.open > 0 && <button type="button" onClick={() => setShowPayment((value) => !value)} className="mt-4 min-h-11 rounded-xl bg-emerald-500 px-4 text-xs font-bold text-[#07110e] transition hover:bg-emerald-400 active:scale-[0.98]">{showPayment ? 'Fechar simulação' : 'Simular pagamento da fatura'}</button>}
              {paymentMessage && <p role="status" className="mt-4 rounded-xl border border-emerald-500/25 bg-[#10251f] p-3 text-xs text-emerald-100">{paymentMessage}</p>}

              {showPayment && invoice.open > 0 && (
                <div className="mt-5 space-y-4 border-t border-white/[0.06] pt-5">
                  <div className="flex items-start justify-between gap-4"><div><h5 className="text-sm font-semibold text-white">Comparar pagamento</h5><p className="mt-1 text-xs text-zinc-400">A simulação não altera seus dados. O registro só acontece no botão final.</p></div><button type="button" onClick={() => setShowPayment(false)} aria-label="Fechar simulação" className="min-h-11 min-w-11 rounded-xl text-zinc-400 hover:bg-white/[0.04] hover:text-white"><X size={16} className="mx-auto" /></button></div>
                  <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Valor do pagamento">
                    {[['total', 'Total', invoice.open], ['minimum', 'Mínimo', invoice.minimumPayment], ['custom', 'Outro valor', Number(customAmount) || 0] as const].map(([value, label, choiceAmount]) => <button key={value} type="button" aria-pressed={paymentChoice === value} onClick={() => setPaymentChoice(value as PaymentChoice)} className={`min-h-14 rounded-xl border px-3 text-left transition ${paymentChoice === value ? 'border-emerald-500/35 bg-[#10251f] text-white' : 'border-white/[0.08] text-zinc-300 hover:border-white/20'}`}><span className="block text-xs font-semibold">{label}</span><span className="mt-1 block font-mono text-xs tabular-nums">{formatCurrency(choiceAmount as number, hideValues)}</span></button>)}
                  </div>
                  {paymentChoice === 'custom' && <label className="block text-xs text-zinc-300">Valor personalizado<input type="number" min="0.01" max={invoice.open} step="0.01" value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#16161d] px-3 font-mono tabular-nums text-white outline-none focus:border-emerald-400/60" /></label>}
                  <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-zinc-300">Conta de pagamento<select value={paymentAccountId} onChange={(event) => setPaymentAccountId(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#16161d] px-3 text-white">{paymentAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {formatCurrency(account.balance, hideValues)}</option>)}</select></label><label className="text-xs text-zinc-300">Data do pagamento<input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#16161d] px-3 text-white" /></label></div>
                  {paymentCalculation ? <div className="grid gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2">{[['Sem pagamento', paymentCalculation.base], ['Com pagamento', paymentCalculation.simulated]].map(([label, result]) => { const scenario = result as typeof paymentCalculation.base; return <dl key={label as string} className="bg-[#121217] p-4"><dt className="text-xs font-semibold text-zinc-300">{label as string}</dt><dd className="mt-3 flex justify-between text-xs text-zinc-400"><span>Saldo final</span><strong className="font-mono tabular-nums text-white">{formatCurrency(scenario.endingBalance, hideValues)}</strong></dd><dd className="mt-2 flex justify-between text-xs text-zinc-400"><span>Menor saldo</span><strong className={`font-mono tabular-nums ${scenario.minimumBalance < 0 ? 'text-rose-300' : 'text-white'}`}>{formatCurrency(scenario.minimumBalance, hideValues)}</strong></dd></dl>; })}</div> : <p className="rounded-xl border border-rose-500/25 bg-[#281419] p-3 text-xs text-rose-100">Informe um valor válido, limitado ao total em aberto.</p>}
                  {paymentCalculation?.simulated.warnings.length ? <div className="flex gap-3 rounded-xl border border-amber-500/25 bg-[#2a2110] p-3 text-amber-100"><AlertTriangle size={17} className="shrink-0" /><p className="text-xs">{paymentCalculation.simulated.warnings.join(' ')}</p></div> : null}
                  {paymentAmount > 0 && paymentAmount < invoice.open && <div className="flex gap-3 rounded-xl border border-amber-500/25 bg-[#2a2110] p-3 text-amber-100"><AlertTriangle size={17} className="shrink-0" /><p className="text-xs">O saldo restante poderá gerar juros e encargos. A taxa não está cadastrada, por isso o custo não foi estimado.</p></div>}
                  <button type="button" disabled={!paymentCalculation} onClick={registerPayment} className="min-h-11 w-full rounded-xl bg-emerald-500 px-4 text-sm font-bold text-[#07110e] transition hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40">Registrar pagamento de {formatCurrency(Number.isFinite(paymentAmount) ? paymentAmount : 0, hideValues)}</button>
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.06]">
              <div className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"><h4 className="text-xs font-semibold text-zinc-300">Compras da fatura</h4><div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar compras">{([['all', 'Todas'], ['open', 'Em aberto'], ['paid', 'Pagas'], ['installments', 'Parceladas']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={purchaseFilter === value} onClick={() => setPurchaseFilter(value)} className={`min-h-11 rounded-lg px-2.5 text-[10px] font-semibold transition ${purchaseFilter === value ? 'bg-[#24242c] text-white' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white'}`}>{label}</button>)}</div></div>
              {visiblePurchases.length === 0 ? <p className="border-t border-white/[0.04] px-5 py-8 text-center text-xs text-zinc-400">Nenhuma compra corresponde a este filtro.</p> : <div className="divide-y divide-white/[0.05] border-t border-white/[0.04]">{visiblePurchases.map((purchase) => <div key={purchase.id} className="flex items-center gap-3 px-5 py-3"><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-white">{purchase.description}</p><p className="mt-0.5 text-[11px] text-zinc-400">{purchase.category} · {formatDate(purchase.date)}{purchase.installmentInfo ? ` · ${purchase.installmentInfo.current}/${purchase.installmentInfo.total}` : ''}</p></div><p className="shrink-0 font-mono text-xs font-semibold tabular-nums text-rose-300">{formatCurrency(purchase.amount, hideValues)}</p><button type="button" onClick={() => onEditTransaction(purchase)} className="min-h-11 min-w-11 rounded-xl text-zinc-400 transition hover:bg-white/[0.04] hover:text-white" aria-label={`Editar ${purchase.description}`}><Edit3 size={14} className="mx-auto" /></button></div>)}</div>}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
