import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  History,
  Plus,
  Target,
  Trash2,
  WalletCards,
} from "lucide-react";
import { useFinanceStore } from "../store";
import { getLocalIsoDate } from "../lib/finance";
import { createScenarioSnapshot } from "../lib/scenarios/selectors";
import { simulateScenario } from "../lib/scenarios/engine";
import { getGoalProjection, getWithdrawalDelayMonths } from "../lib/savings";

const money = (value: number, hidden = false) =>
  hidden
    ? "••••••"
    : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function SavingsView() {
  const {
    accounts,
    transactions,
    savingsGoals,
    hideValues,
    addSavingsGoal,
    deleteSavingsGoal,
    addSavingsGoalActivity,
  } = useFinanceStore();
  const eligibleAccounts = accounts.filter(
    (account) => account.type !== "credit",
  );
  const reserveAccounts = accounts.filter((account) =>
    ["savings", "reserve", "investment"].includes(account.type || ""),
  );
  const totalSaved = reserveAccounts.reduce(
    (sum, account) => sum + account.balance,
    0,
  );
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("0");
  const [monthly, setMonthly] = useState("");
  const [accountId, setAccountId] = useState(eligibleAccounts[0]?.id || "");
  const [targetDate, setTargetDate] = useState("");
  const [expandedGoal, setExpandedGoal] = useState("");
  const [activityType, setActivityType] = useState<
    "contribution" | "withdrawal"
  >("contribution");
  const [activityAmount, setActivityAmount] = useState("");
  const [activityDate, setActivityDate] = useState(getLocalIsoDate());
  const [simulateGoalId, setSimulateGoalId] = useState("");
  const [simulationAmount, setSimulationAmount] = useState("");

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    const targetAmount = Number(target);
    const currentAmount = Number(current);
    const monthlyContribution = Number(monthly);
    if (
      !name.trim() ||
      !accountId ||
      targetAmount <= 0 ||
      currentAmount < 0 ||
      monthlyContribution < 0
    )
      return;
    addSavingsGoal({
      name: name.trim(),
      targetAmount,
      currentAmount,
      monthlyContribution,
      accountId,
      targetDate: targetDate || undefined,
    });
    setName("");
    setTarget("");
    setCurrent("0");
    setMonthly("");
    setTargetDate("");
    setShowForm(false);
  };

  const simulation = useMemo(() => {
    const goal = savingsGoals.find((item) => item.id === simulateGoalId);
    const amount = Number(simulationAmount);
    if (
      !goal ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > goal.currentAmount
    )
      return null;
    try {
      const snapshot = createScenarioSnapshot(accounts, transactions);
      const today = getLocalIsoDate();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      return simulateScenario(
        snapshot,
        [
          {
            id: `withdraw-${goal.id}`,
            type: "expense",
            accountId: goal.accountId,
            amount,
            date: today,
            description: `Retirada da meta ${goal.name}`,
          },
        ],
        {
          startDate: today,
          endDate: getLocalIsoDate(endDate),
          minimumReserve: 0,
        },
      );
    } catch {
      return null;
    }
  }, [accounts, savingsGoals, simulateGoalId, simulationAmount, transactions]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-24">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Reservas e metas</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Acompanhe valores guardados, planeje aportes e simule retiradas
            antes de decidir.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#10b981] px-4 text-xs font-bold text-[#07110e] transition hover:bg-[#34d399] active:scale-[0.98]"
        >
          <Plus size={16} />
          Nova meta
        </button>
      </header>

      <section className="rounded-2xl border border-white/[0.08] bg-[#0f0f13] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-zinc-400">
              Total guardado em reservas e investimentos
            </p>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-white">
              {money(totalSaved, hideValues)}
            </p>
          </div>
          <WalletCards size={24} className="text-emerald-300" />
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Soma apenas contas classificadas como poupança, reserva ou
          investimento.
        </p>
      </section>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#0f0f13] p-5"
        >
          <div>
            <h3 className="text-sm font-semibold text-white">Criar meta</h3>
            <p className="mt-1 text-xs text-zinc-400">
              A meta registra uma alocação vinculada a uma conta. Nenhum
              rendimento é presumido.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs text-zinc-300">
              Nome
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#16161d] px-3 text-white"
              />
            </label>
            <label className="text-xs text-zinc-300">
              Valor desejado
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#16161d] px-3 font-mono text-white"
              />
            </label>
            <label className="text-xs text-zinc-300">
              Valor já alocado
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#16161d] px-3 font-mono text-white"
              />
            </label>
            <label className="text-xs text-zinc-300">
              Aporte mensal
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={monthly}
                onChange={(event) => setMonthly(event.target.value)}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#16161d] px-3 font-mono text-white"
              />
            </label>
            <label className="text-xs text-zinc-300">
              Conta vinculada
              <select
                required
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#16161d] px-3 text-white"
              >
                {eligibleAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-zinc-300">
              Data desejada (opcional)
              <input
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#16161d] px-3 text-white"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="min-h-11 rounded-xl px-4 text-xs font-semibold text-zinc-300 hover:bg-white/[0.05]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-11 rounded-xl bg-[#10b981] px-4 text-xs font-bold text-[#07110e]"
            >
              Criar meta
            </button>
          </div>
        </form>
      )}

      {savingsGoals.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-white/[0.12] px-6 py-12 text-center">
          <Target size={28} className="mx-auto text-zinc-600" />
          <h3 className="mt-3 text-sm font-semibold text-white">
            Nenhuma meta criada
          </h3>
          <p className="mt-1 text-xs text-zinc-400">
            Crie uma meta para planejar aportes e avaliar retiradas.
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          {savingsGoals.map((goal) => {
            const projection = getGoalProjection(goal, getLocalIsoDate());
            const progress = projection.progressPercentage;
            const remaining = projection.remaining;
            const months = projection.estimatedMonths;
            const linked = accounts.find(
              (account) => account.id === goal.accountId,
            );
            const isExpanded = expandedGoal === goal.id;
            return (
              <section
                key={goal.id}
                className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f0f13]"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-white">
                        {goal.name}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-400">
                        {linked?.name || "Conta removida"} ·{" "}
                      {projection.estimatedDate
                        ? `previsão ${projection.estimatedDate} (${months} ${months === 1 ? "mês" : "meses"})`
                        : "sem previsão com o aporte atual"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteSavingsGoal(goal.id)}
                      aria-label={`Excluir ${goal.name}`}
                      className="min-h-11 min-w-11 rounded-xl text-zinc-500 hover:bg-[#281419] hover:text-rose-300"
                    >
                      <Trash2 size={15} className="mx-auto" />
                    </button>
                  </div>
                  <div className="mt-5 flex items-end justify-between gap-4">
                    <div>
                      <p className="font-mono text-xl font-bold tabular-nums text-white">
                        {money(goal.currentAmount, hideValues)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        de {money(goal.targetAmount, hideValues)}
                      </p>
                    </div>
                    <p className="font-mono text-sm font-semibold tabular-nums text-emerald-300">
                      {Math.round(progress)}%
                    </p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-[#10b981]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <dl className="mt-4 grid gap-3 border-t border-white/[0.06] pt-4 text-xs sm:grid-cols-3">
                    <div>
                      <dt className="text-zinc-500">Aporte mensal</dt>
                      <dd className="mt-1 font-mono text-zinc-200">
                        {money(goal.monthlyContribution, hideValues)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Falta guardar</dt>
                      <dd className="mt-1 font-mono text-zinc-200">
                        {money(remaining, hideValues)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Data desejada</dt>
                      <dd className="mt-1 text-zinc-200">
                        {goal.targetDate || "Não definida"}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedGoal(isExpanded ? "" : goal.id)}
                      className="flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.08] px-3 text-xs font-semibold text-zinc-300 hover:bg-white/[0.05]"
                    >
                      <History size={15} />
                      Movimentar e ver histórico{" "}
                      {isExpanded ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSimulateGoalId(
                          simulateGoalId === goal.id ? "" : goal.id,
                        );
                        setSimulationAmount("");
                      }}
                      className="flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.08] px-3 text-xs font-semibold text-zinc-300 hover:bg-white/[0.05]"
                    >
                      <CalendarClock size={15} />
                      Simular retirada
                    </button>
                  </div>
                </div>
                {simulateGoalId === goal.id && (
                  <div className="space-y-3 border-t border-white/[0.06] bg-[#121217] p-5">
                    <label className="block text-xs text-zinc-300">
                      Valor da retirada
                      <input
                        type="number"
                        min="0.01"
                        max={goal.currentAmount}
                        step="0.01"
                        value={simulationAmount}
                        onChange={(event) =>
                          setSimulationAmount(event.target.value)
                        }
                        className="mt-1.5 min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#16161d] px-3 font-mono text-white"
                      />
                    </label>
                    {simulation ? (
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <p className="text-xs text-zinc-500">
                            Meta após retirada
                          </p>
                          <p className="mt-1 font-mono text-sm text-white">
                            {money(
                              goal.currentAmount - Number(simulationAmount),
                              hideValues,
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">
                            Menor saldo do período
                          </p>
                          <p
                            className={`mt-1 font-mono text-sm ${simulation.minimumBalance < 0 ? "text-rose-300" : "text-white"}`}
                          >
                            {money(simulation.minimumBalance, hideValues)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">
                            Atraso estimado
                          </p>
                          <p className="mt-1 text-sm text-white">
                            {getWithdrawalDelayMonths(
                              Number(simulationAmount),
                              goal.monthlyContribution,
                            ) === null
                              ? "Sem previsão"
                              : `${getWithdrawalDelayMonths(Number(simulationAmount), goal.monthlyContribution)} meses`}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400">
                        Informe um valor válido para calcular o impacto.
                      </p>
                    )}
                    {simulation?.warnings.length ? (
                      <div className="flex gap-3 rounded-xl border border-amber-500/25 bg-[#2a2110] p-3 text-amber-100">
                        <AlertTriangle size={16} />
                        <p className="text-xs">
                          {simulation.warnings.join(" ")}
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}
                {isExpanded && (
                  <div className="space-y-4 border-t border-white/[0.06] bg-[#121217] p-5">
                    <div className="grid gap-3 sm:grid-cols-[auto_1fr_1fr_auto]">
                      <div className="flex gap-1 rounded-xl border border-white/[0.08] p-1">
                        {(["contribution", "withdrawal"] as const).map(
                          (type) => (
                            <button
                              key={type}
                              type="button"
                              aria-pressed={activityType === type}
                              onClick={() => setActivityType(type)}
                              className={`min-h-11 rounded-lg px-3 text-xs font-semibold ${activityType === type ? "bg-[#24242c] text-white" : "text-zinc-400"}`}
                            >
                              {type === "contribution" ? "Aporte" : "Retirada"}
                            </button>
                          ),
                        )}
                      </div>
                      <input
                        aria-label="Valor da movimentação"
                        type="number"
                        min="0.01"
                        max={
                          activityType === "withdrawal"
                            ? goal.currentAmount
                            : undefined
                        }
                        step="0.01"
                        value={activityAmount}
                        onChange={(event) =>
                          setActivityAmount(event.target.value)
                        }
                        placeholder="Valor"
                        className="min-h-11 rounded-xl border border-white/[0.08] bg-[#16161d] px-3 font-mono text-white"
                      />
                      <input
                        aria-label="Data da movimentação"
                        type="date"
                        value={activityDate}
                        onChange={(event) =>
                          setActivityDate(event.target.value)
                        }
                        className="min-h-11 rounded-xl border border-white/[0.08] bg-[#16161d] px-3 text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          addSavingsGoalActivity(
                            goal.id,
                            activityType,
                            Number(activityAmount),
                            activityDate,
                          );
                          setActivityAmount("");
                        }}
                        disabled={
                          !Number(activityAmount) ||
                          (activityType === "withdrawal" &&
                            Number(activityAmount) > goal.currentAmount)
                        }
                        className="min-h-11 rounded-xl bg-[#10b981] px-4 text-xs font-bold text-[#07110e] disabled:opacity-40"
                      >
                        Registrar
                      </button>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-300">
                        Histórico
                      </h4>
                      {goal.activities.length === 0 ? (
                        <p className="mt-2 text-xs text-zinc-500">
                          Nenhum aporte ou retirada registrado.
                        </p>
                      ) : (
                        <div className="mt-2 divide-y divide-white/[0.05]">
                          {goal.activities.map((activity) => (
                            <div
                              key={activity.id}
                              className="flex items-center justify-between py-2 text-xs"
                            >
                              <span className="text-zinc-400">
                                {activity.type === "contribution"
                                  ? "Aporte"
                                  : "Retirada"}{" "}
                                · {activity.date}
                              </span>
                              <span
                                className={`font-mono tabular-nums ${activity.type === "contribution" ? "text-emerald-300" : "text-rose-300"}`}
                              >
                                {activity.type === "contribution" ? "+" : "-"}{" "}
                                {money(activity.amount, hideValues)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
