import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Save, X } from "lucide-react";
import type { Transaction } from "../types";
import { useFinanceStore } from "../store";
import { getLocalIsoDate } from "../lib/finance";
import { createScenarioSnapshot } from "../lib/scenarios/selectors";
import { simulateScenario } from "../lib/scenarios/engine";
import { useDialogAccessibility } from "../hooks/useDialogAccessibility";

interface Props {
  isOpen: boolean;
  transactions: Transaction[];
  onClose: () => void;
}
const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function MultiScenarioPlannerModal({
  isOpen,
  transactions: selected,
  onClose,
}: Props) {
  const dialogRef = useDialogAccessibility(isOpen, onClose);
  const { accounts, transactions } = useFinanceStore();
  const cashAccounts = accounts.filter((account) => account.type !== "credit");
  const [accountId, setAccountId] = useState("");
  const [paymentDate, setPaymentDate] = useState(getLocalIsoDate());
  const [endDate, setEndDate] = useState(getLocalIsoDate());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const today = getLocalIsoDate();
    setAccountId(cashAccounts[0]?.id || "");
    setPaymentDate(today);
    setEndDate(
      selected.reduce(
        (latest, transaction) =>
          transaction.date > latest ? transaction.date : latest,
        today,
      ),
    );
    setSaved(false);
  }, [isOpen, selected]);

  const calculation = useMemo(() => {
    if (!isOpen || selected.length === 0 || !accountId || paymentDate > endDate)
      return null;
    try {
      const snapshot = createScenarioSnapshot(accounts, transactions);
      const options = { startDate: paymentDate, endDate, minimumReserve: 0 };
      return {
        version: snapshot.version,
        base: simulateScenario(snapshot, [], options),
        simulated: simulateScenario(
          snapshot,
          selected.map((transaction) => ({
            id: `multi-${transaction.id}`,
            type: "payment" as const,
            transactionId: transaction.id,
            accountId,
            amount: transaction.amount,
            date: paymentDate,
          })),
          options,
        ),
      };
    } catch {
      return null;
    }
  }, [
    accountId,
    accounts,
    endDate,
    isOpen,
    paymentDate,
    selected,
    transactions,
  ]);

  if (!isOpen) return null;
  const total = selected.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );
  const saveDraft = () => {
    if (!calculation) return;
    localStorage.setItem(
      "finance_multi_scenario_draft",
      JSON.stringify({
        transactionIds: selected.map((item) => item.id),
        accountId,
        paymentDate,
        endDate,
        snapshotVersion: calculation.version,
        savedAt: new Date().toISOString(),
      }),
    );
    setSaved(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="multi-scenario-title"
        tabIndex={-1}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-white/[0.08] bg-[#0f0f13] shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-white/[0.08] p-5">
          <div>
            <h2
              id="multi-scenario-title"
              className="text-lg font-bold text-white"
            >
              Simular pagamentos selecionados
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              {selected.length} movimentações · {money(total)} · nenhum dado
              real será alterado.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar cenário"
            className="min-h-11 min-w-11 rounded-xl text-zinc-400 hover:bg-white/[0.05] hover:text-white"
          >
            <X size={18} className="mx-auto" />
          </button>
        </div>
        <div className="space-y-5 overflow-y-auto p-5 custom-scrollbar">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-zinc-300">
              Conta de origem
              <select
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#16161d] px-3 text-white"
              >
                {cashAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · {money(account.balance)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-zinc-300">
              Data dos pagamentos
              <input
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#16161d] px-3 text-white"
              />
            </label>
            <label className="text-xs text-zinc-300">
              Analisar até
              <input
                type="date"
                min={paymentDate}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#16161d] px-3 text-white"
              />
            </label>
          </div>
          <div className="max-h-40 divide-y divide-white/[0.05] overflow-y-auto rounded-xl border border-white/[0.08]">
            {selected.map((item) => (
              <div
                key={item.id}
                className="flex justify-between gap-3 px-3 py-2 text-xs"
              >
                <span className="truncate text-zinc-300">
                  {item.description}
                </span>
                <span className="font-mono tabular-nums text-white">
                  {money(item.amount)}
                </span>
              </div>
            ))}
          </div>
          {calculation ? (
            <>
              <div className="grid gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2">
                {[
                  ["Cenário base", calculation.base],
                  ["Após pagamentos", calculation.simulated],
                ].map(([label, result]) => {
                  const scenario = result as typeof calculation.base;
                  return (
                    <dl key={label as string} className="bg-[#121217] p-4">
                      <dt className="text-xs font-semibold text-zinc-300">
                        {label as string}
                      </dt>
                      <dd className="mt-3 flex justify-between text-xs text-zinc-400">
                        <span>Saldo final</span>
                        <strong className="font-mono tabular-nums text-white">
                          {money(scenario.endingBalance)}
                        </strong>
                      </dd>
                      <dd className="mt-2 flex justify-between text-xs text-zinc-400">
                        <span>Menor saldo</span>
                        <strong
                          className={`font-mono tabular-nums ${scenario.minimumBalance < 0 ? "text-rose-300" : "text-white"}`}
                        >
                          {money(scenario.minimumBalance)}
                        </strong>
                      </dd>
                    </dl>
                  );
                })}
              </div>
              {calculation.simulated.warnings.length > 0 && (
                <div className="flex gap-3 rounded-xl border border-amber-500/25 bg-[#2a2110] p-3 text-amber-100">
                  <AlertTriangle size={17} className="shrink-0" />
                  <p className="text-xs">
                    {calculation.simulated.warnings.join(" ")}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="rounded-xl border border-rose-500/25 bg-[#281419] p-3 text-xs text-rose-100">
              Não foi possível calcular com as opções informadas.
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-white/[0.08] p-5">
          <p className="text-xs text-zinc-400">
            {saved
              ? "Rascunho salvo neste dispositivo."
              : "Salvar não efetiva pagamentos."}
          </p>
          <button
            onClick={saveDraft}
            disabled={!calculation}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-[#10b981] px-4 text-xs font-bold text-[#07110e] disabled:opacity-40"
          >
            <Save size={15} />
            Salvar cenário
          </button>
        </div>
      </div>
    </div>
  );
}
