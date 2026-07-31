import { useMemo, useState } from 'react';
import { useFinanceStore } from '../store';
import { ChevronLeft, ChevronRight, Download, Printer, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getTransactionEffectiveStatus, type FinancialView } from '../lib/finance';

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ReportsView() {
  const { transactions, accounts, categories, savingsGoals, hideValues } = useFinanceStore();
  const [year, setYear] = useState(new Date().getFullYear());
  const [view, setView] = useState<FinancialView>('realized');
  const [accountId, setAccountId] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const format = (value: number) => hideValues ? '••••••' : money(value);

  const filtered = useMemo(() => transactions.filter((t) => {
    const effective = getTransactionEffectiveStatus(t);
    const viewMatch = view === 'all' || (view === 'realized' ? effective === 'completed' : effective !== 'completed');
    return Number(t.date.slice(0, 4)) === year && viewMatch && (!accountId || t.accountId === accountId) && (!category || t.category === category) && (!status || effective === status);
  }), [transactions, year, view, accountId, category, status]);

  const previous = useMemo(() => transactions.filter((t) => Number(t.date.slice(0, 4)) === year - 1), [transactions, year]);
  const totals = useMemo(() => filtered.reduce((sum, t) => ({ ...sum, [t.type]: sum[t.type] + t.amount }), { income: 0, expense: 0 }), [filtered]);
  const previousExpense = previous.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const variation = previousExpense ? ((totals.expense - previousExpense) / previousExpense) * 100 : null;
  const chart = useMemo(() => months.map((name, index) => {
    const items = filtered.filter((t) => Number(t.date.slice(5, 7)) === index + 1);
    return { name, Entradas: items.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0), Saídas: items.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0) };
  }), [filtered]);
  const future = filtered.filter((t) => getTransactionEffectiveStatus(t) !== 'completed');
  const installments = future.filter((t) => t.isInstallment).reduce((sum, t) => sum + t.amount, 0);
  const reserves = accounts.filter((a) => ['savings', 'reserve', 'investment'].includes(a.type || '')).reduce((sum, a) => sum + a.balance, 0);
  const incomeCommitment = totals.income ? (totals.expense / totals.income) * 100 : 0;

  const exportCsv = () => {
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [['Data', 'Descrição', 'Tipo', 'Categoria', 'Conta', 'Status', 'Valor'], ...filtered.map((t) => [t.date, t.description, t.type, t.category, accounts.find((a) => a.id === t.accountId)?.name || '', getTransactionEffectiveStatus(t), t.amount.toFixed(2)])];
    const blob = new Blob(['\uFEFF' + rows.map((row) => row.map(escape).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `relatorio-${year}.csv`; link.click(); URL.revokeObjectURL(link.href);
  };

  return <div className="mx-auto max-w-5xl space-y-6 pb-24">
    <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#0f0f13] p-2.5">
      <button aria-label="Ano anterior" onClick={() => setYear(year - 1)} className="min-h-11 min-w-11 rounded-xl text-zinc-400 hover:bg-white/[0.05] hover:text-white"><ChevronLeft className="mx-auto" /></button>
      <h2 className="font-display font-bold text-white">Relatório de <span className="text-emerald-400">{year}</span></h2>
      <button aria-label="Próximo ano" onClick={() => setYear(year + 1)} className="min-h-11 min-w-11 rounded-xl text-zinc-400 hover:bg-white/[0.05] hover:text-white"><ChevronRight className="mx-auto" /></button>
    </div>

    <div className="grid gap-3 rounded-2xl border border-white/[0.08] bg-[#0f0f13] p-4 sm:grid-cols-2 lg:grid-cols-5">
      <select aria-label="Visão financeira" value={view} onChange={(e) => setView(e.target.value as FinancialView)} className="min-h-11 rounded-xl bg-[#18181f] px-3 text-xs text-white"><option value="realized">Realizado</option><option value="forecast">Previsto</option><option value="all">Todos</option></select>
      <select aria-label="Conta ou cartão" value={accountId} onChange={(e) => setAccountId(e.target.value)} className="min-h-11 rounded-xl bg-[#18181f] px-3 text-xs text-white"><option value="">Todas as contas</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
      <select aria-label="Categoria" value={category} onChange={(e) => setCategory(e.target.value)} className="min-h-11 rounded-xl bg-[#18181f] px-3 text-xs text-white"><option value="">Todas as categorias</option>{categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
      <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="min-h-11 rounded-xl bg-[#18181f] px-3 text-xs text-white"><option value="">Todos os status</option><option value="completed">Pago</option><option value="pending">Pendente</option><option value="scheduled">Agendado</option><option value="overdue">Atrasado</option></select>
      <div className="flex gap-2"><button onClick={exportCsv} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] text-xs text-zinc-200"><Download size={15}/>CSV</button><button onClick={() => window.print()} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] text-xs text-zinc-200"><Printer size={15}/>PDF</button></div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[['Entradas', totals.income], ['Saídas', totals.expense], ['Saldo', totals.income - totals.expense], ['Reservas', reserves]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-white/[0.08] bg-[#0f0f13] p-4"><p className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</p><p className="mt-1 font-mono text-xl font-bold text-white">{format(Number(value))}</p></div>)}
    </div>

    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-white/[0.08] bg-[#0f0f13] p-4"><p className="text-xs text-zinc-400">Variação anual de despesas</p><p className="mt-2 font-mono font-bold text-white">{hideValues || variation === null ? 'Sem base comparável' : `${variation >= 0 ? '+' : ''}${variation.toFixed(1)}%`}</p></div>
      <div className="rounded-2xl border border-white/[0.08] bg-[#0f0f13] p-4"><p className="text-xs text-zinc-400">Parcelas futuras</p><p className="mt-2 font-mono font-bold text-white">{format(installments)}</p></div>
      <div className="rounded-2xl border border-white/[0.08] bg-[#0f0f13] p-4"><p className="text-xs text-zinc-400">Comprometimento da renda</p><p className="mt-2 font-mono font-bold text-white">{hideValues ? '••••••' : `${incomeCommitment.toFixed(1)}%`}</p></div>
    </div>

    <section className="rounded-[24px] border border-white/[0.08] bg-[#0f0f13] p-5" aria-labelledby="cash-flow-title"><div className="mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-emerald-400"/><h3 id="cash-flow-title" className="text-xs font-bold uppercase tracking-widest text-white">Fluxo de caixa mensal</h3></div>{hideValues ? <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-white/[0.1] text-center text-xs text-zinc-400">Gráfico oculto pelo modo de privacidade.<br/>Valores, proporções e magnitudes não são exibidos.</div> : <div className="h-64"><ResponsiveContainer><BarChart data={chart}><XAxis dataKey="name" stroke="#71717a" fontSize={10}/><YAxis stroke="#71717a" fontSize={9}/><Tooltip formatter={(v) => money(Number(v))}/><Legend/><Bar dataKey="Entradas" fill="#10b981" radius={[4,4,0,0]}/><Bar dataKey="Saídas" fill="#fb7185" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>}
      <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Resumo mensal equivalente ao gráfico</caption><thead className="text-zinc-500"><tr><th className="py-2">Mês</th><th>Entradas</th><th>Saídas</th><th>Saldo</th></tr></thead><tbody>{chart.map((row) => <tr key={row.name} className="border-t border-white/[0.06] text-zinc-300"><th className="py-2 font-medium">{row.name}</th><td>{format(row.Entradas)}</td><td>{format(row.Saídas)}</td><td>{format(row.Entradas-row.Saídas)}</td></tr>)}</tbody></table></div>
    </section>
    <p className="text-xs text-zinc-500">{future.length} movimentações compõem o fluxo futuro. {savingsGoals.length} metas acompanham as contas de reserva.</p>
  </div>;
}
