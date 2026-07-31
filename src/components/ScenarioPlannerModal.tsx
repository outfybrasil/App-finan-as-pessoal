import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Save, X } from 'lucide-react';
import type { Transaction } from '../types';
import { useFinanceStore } from '../store';
import { getLocalIsoDate } from '../lib/finance';
import { createScenarioSnapshot } from '../lib/scenarios/selectors';
import { simulateScenario } from '../lib/scenarios/engine';
import { useDialogAccessibility } from '../hooks/useDialogAccessibility';

interface Props {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
}

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ScenarioPlannerModal({ isOpen, transaction, onClose }: Props) {
  const dialogRef = useDialogAccessibility(isOpen, onClose);
  const { accounts, transactions } = useFinanceStore();
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isOpen || !transaction) return;
    const today = getLocalIsoDate();
    setAccountId(transaction.accountId || accounts[0]?.id || '');
    setAmount(String(transaction.amount));
    setPaymentDate(today);
    setEndDate(transaction.date > today ? transaction.date : today);
    setSaved(false);
  }, [accounts, isOpen, transaction]);

  const calculation = useMemo(() => {
    if (!transaction || !accountId || !paymentDate || !endDate) return null;
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > transaction.amount || paymentDate > endDate) return null;
    try {
      const snapshot = createScenarioSnapshot(accounts, transactions);
      const options = { startDate: paymentDate, endDate, minimumReserve: 0 };
      return {
        base: simulateScenario(snapshot, [], options),
        simulated: simulateScenario(snapshot, [{
          id: `payment-${transaction.id}`,
          type: 'payment',
          transactionId: transaction.id,
          accountId,
          amount: numericAmount,
          date: paymentDate,
        }], options),
        snapshotVersion: snapshot.version,
      };
    } catch {
      return null;
    }
  }, [accountId, accounts, amount, endDate, paymentDate, transaction, transactions]);

  if (!isOpen || !transaction) return null;

  const handleSave = () => {
    if (!calculation) return;
    localStorage.setItem('finance_scenario_draft', JSON.stringify({
      transactionId: transaction.id,
      accountId,
      amount: Number(amount),
      paymentDate,
      endDate,
      snapshotVersion: calculation.snapshotVersion,
      savedAt: new Date().toISOString(),
    }));
    setSaved(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="scenario-dialog-title"
        tabIndex={-1}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-white/[0.08] bg-[#0f0f13] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] p-5">
          <div>
            <h2 id="scenario-dialog-title" className="text-lg font-bold text-white">Simular pagamento</h2>
            <p className="mt-1 text-sm text-zinc-400">{transaction.description} · nenhuma alteração será aplicada aos dados reais.</p>
          </div>
          <button onClick={onClose} aria-label="Fechar simulação" className="min-h-11 min-w-11 rounded-xl p-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 custom-scrollbar">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-medium text-zinc-300">
              Valor do pagamento
              <input type="number" min="0.01" max={transaction.amount} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#16161d] px-3 font-mono tabular-nums text-white outline-none focus:border-emerald-400/60" />
            </label>
            <label className="space-y-1.5 text-xs font-medium text-zinc-300">
              Conta de origem
              <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#16161d] px-3 text-white outline-none focus:border-emerald-400/60">
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {formatCurrency(account.balance)}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-medium text-zinc-300">
              Data simulada do pagamento
              <input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#16161d] px-3 text-white outline-none focus:border-emerald-400/60" />
            </label>
            <label className="space-y-1.5 text-xs font-medium text-zinc-300">
              Analisar até
              <input type="date" min={paymentDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#16161d] px-3 text-white outline-none focus:border-emerald-400/60" />
            </label>
          </div>

          {calculation ? (
            <div className="mt-6 space-y-5">
              <div className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2">
                {[
                  ['Cenário base', calculation.base],
                  ['Com o pagamento', calculation.simulated],
                ].map(([label, result]) => {
                  const scenario = result as typeof calculation.base;
                  return (
                    <section key={label as string} className="bg-[#121217] p-5">
                      <h3 className="text-sm font-semibold text-zinc-200">{label as string}</h3>
                      <dl className="mt-4 space-y-3 text-sm">
                        <div className="flex justify-between gap-4"><dt className="text-zinc-400">Saldo final</dt><dd className="font-mono font-bold tabular-nums text-white">{formatCurrency(scenario.endingBalance)}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-zinc-400">Menor saldo</dt><dd className={`font-mono font-bold tabular-nums ${scenario.minimumBalance < 0 ? 'text-rose-300' : 'text-white'}`}>{formatCurrency(scenario.minimumBalance)}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-zinc-400">Livre para gastar</dt><dd className="font-mono font-bold tabular-nums text-white">{formatCurrency(scenario.safeToSpend)}</dd></div>
                      </dl>
                    </section>
                  );
                })}
              </div>

              {calculation.simulated.warnings.length > 0 ? (
                <div className="flex gap-3 rounded-xl border border-amber-500/25 bg-[#2a2110] p-4 text-amber-100">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <div><p className="text-sm font-semibold">Atenção ao cenário</p><ul className="mt-1 space-y-1 text-xs text-amber-100/80">{calculation.simulated.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-[#10251f] p-4 text-emerald-100"><Check size={18} aria-hidden="true" /><p className="text-sm">O cenário não gera saldo negativo dentro do período.</p></div>
              )}
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-rose-500/25 bg-[#281419] p-4 text-sm text-rose-200">Revise o valor e as datas para calcular o cenário.</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/[0.08] p-5">
          <p className="text-xs text-zinc-400">{saved ? 'Rascunho salvo neste dispositivo.' : 'Salvar não efetiva o pagamento.'}</p>
          <button type="button" onClick={handleSave} disabled={!calculation} className="flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-bold text-[#07110e] transition hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"><Save size={16} aria-hidden="true" />Salvar cenário</button>
        </div>
      </div>
    </div>
  );
}
