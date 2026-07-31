import { useMemo, useState } from 'react';
import { useFinanceStore } from '../store';
import { TrendingUp, TrendingDown, CreditCard, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check, AlertCircle, Edit3, Trash2, Sliders, Calendar, Eye, EyeOff, Wallet, ShieldCheck, Sparkles } from 'lucide-react';
import { Transaction, Account } from '../types';
import SelectAccountModal from './SelectAccountModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import CreditCardsOverview from './CreditCardsOverview';
import { getTransactionTotals, getTransactionsForView, type FinancialView } from '../lib/finance';
import AutomaticScenarioModal from './AutomaticScenarioModal';

interface DashboardViewProps {
  onEditTransaction: (t: Transaction) => void;
}

export default function DashboardView({ onEditTransaction }: DashboardViewProps) {
  const { 
    accounts, 
    transactions, 
    updateAccountBalance,
    editTransaction,
    payTransaction,
    payCreditCardInvoice,
    deleteTransaction,
    hideValues,
    toggleHideValues,
    categoryBudgets,
    setCategoryBudget,
    setActiveTab,
  } = useFinanceStore();

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // States for account edit
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountBalanceInput, setAccountBalanceInput] = useState('');

  // States for accordion categories
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'scheduled' | 'completed'>('all');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [financialView, setFinancialView] = useState<FinancialView>('realized');
  const [showAutomaticScenario, setShowAutomaticScenario] = useState(false);

  // States for toggle status payment
  const [transactionToComplete, setTransactionToComplete] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  // Month navigation
  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const monthsNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const formatVal = (num: number) => {
    if (hideValues) return '••••••';
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const monthPeriod = useMemo(() => ({
    start: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`,
    end: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(new Date(currentYear, currentMonth + 1, 0).getDate()).padStart(2, '0')}`,
  }), [currentMonth, currentYear]);

  const monthlyTransactions = useMemo(
    () => getTransactionsForView(transactions, monthPeriod, 'all'),
    [transactions, monthPeriod]
  );
  const realizedTotals = useMemo(
    () => getTransactionTotals(transactions, monthPeriod, 'realized'),
    [transactions, monthPeriod]
  );
  const displayedTotals = useMemo(
    () => getTransactionTotals(transactions, monthPeriod, financialView),
    [transactions, monthPeriod, financialView]
  );
  const monthlyIncome = realizedTotals.income;
  const monthlyExpense = realizedTotals.expense;

  // Calculate actual account balance 
  const getActualAccountBalance = (account: Account) => {
    return account.balance;
  };

  // Edit account balance
  const handleEditAccountSubmit = (id: string) => {
    const parsed = parseFloat(accountBalanceInput.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(parsed)) {
      updateAccountBalance(id, parsed);
    }
    setEditingAccountId(null);
  };

  const startEditAccount = (acc: Account) => {
    setEditingAccountId(acc.id);
    setAccountBalanceInput(acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  // Group transactions by category for listing
  const transactionsToGroup = monthlyTransactions.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
    return true;
  });
  const transactionsByCategory = [...transactionsToGroup].reduce((acc, t) => {
    const cat = t.category || 'Outros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);
  
  const sortedCategories = Object.keys(transactionsByCategory).sort();

  // Quick action: toggle transaction completed/pending
  const handleToggleStatus = (t: Transaction) => {
    if (t.status === 'pending' || t.status === 'scheduled') {
      setTransactionToComplete(t);
    } else {
      editTransaction({
        ...t,
        status: 'pending',
        paymentDate: undefined,
      });
    }
  };

  const handleConfirmPaymentAccount = (data: { accountId: string, amountPaid: number, paymentDate: string, intendedStatus?: 'completed' | 'scheduled' }) => {
    if (transactionToComplete) {
      payTransaction(transactionToComplete.id, data.accountId, data.amountPaid, data.paymentDate, data.intendedStatus);
      setFilterStatus('all');
      setTransactionToComplete(null);
    }
  };

  const handleDelete = (t: Transaction) => {
    setTransactionToDelete(t);
  };

  const handleConfirmDelete = (option: 'only-this' | 'this-and-future' | 'all-group') => {
    if (transactionToDelete) {
      deleteTransaction(transactionToDelete.id, option);
      setTransactionToDelete(null);
    }
  };

  // --- DYNAMIC FINANCIAL INSIGHTS ---
  const getFinancialInsights = () => {
    const list = [];
    
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 : 0;
    if (monthlyIncome > 0) {
      if (savingsRate >= 20) {
        list.push({
          type: 'success',
          title: 'Excelente Taxa de Poupança!',
          description: `Você guardou ${savingsRate.toFixed(1)}% das suas receitas este mês, superando a recomendação de 20%.`,
          tip: 'Considere transferir o excedente para um investimento de rendimento alto.',
          icon: 'ShieldCheck',
          color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
        });
      } else if (savingsRate > 0) {
        const targetSavings = monthlyIncome * 0.2;
        const missingAmount = targetSavings - (monthlyIncome - monthlyExpense);
        list.push({
          type: 'warning',
          title: 'Aumente sua Poupança',
          description: `Sua taxa de poupança está em ${savingsRate.toFixed(1)}% este mês (meta recomendada: 20%).`,
          tip: `Guarde mais ${formatVal(missingAmount)} para atingir a meta ideal.`,
          icon: 'TrendingUp',
          color: 'text-amber-400 border-amber-500/20 bg-amber-500/5'
        });
      } else {
        list.push({
          type: 'danger',
          title: 'Alerta de Orçamento Negativo',
          description: 'Suas despesas superaram suas receitas neste mês.',
          tip: 'Revise gastos variáveis e adie compras não essenciais.',
          icon: 'AlertCircle',
          color: 'text-rose-400 border-rose-500/20 bg-rose-500/5'
        });
      }
    }

    const categorySumMap: Record<string, number> = {};
    monthlyTransactions
      .filter(t => t.type === 'expense' && t.status === 'completed')
      .forEach(t => {
        categorySumMap[t.category] = (categorySumMap[t.category] || 0) + t.amount;
      });

    const categoriesSorted = Object.entries(categorySumMap).sort((a, b) => b[1] - a[1]);
    if (categoriesSorted.length > 0 && monthlyExpense > 0) {
      const [topCat, topCatAmount] = categoriesSorted[0];
      const percent = (topCatAmount / monthlyExpense) * 100;
      if (percent >= 30) {
        list.push({
          type: 'info',
          title: `Maior Gasto: ${topCat}`,
          description: `"${topCat}" representa ${percent.toFixed(0)}% (${formatVal(topCatAmount)}) das despesas do mês.`,
          tip: 'Estipule um limite de orçamento para conter gastos nessa categoria.',
          icon: 'Sliders',
          color: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5'
        });
      }
    }

    if (list.length === 0) {
      list.push({
        type: 'info',
        title: 'Painel Atualizado',
        description: 'Registre suas movimentações financeiras para visualizar estatísticas automáticas do seu caixa.',
        tip: 'Mantenha receitas e despesas em dia para projecões de saldo precisas.',
        icon: 'Sparkles',
        color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
      });
    }

    return list;
  };

  const budgetSpentMap: Record<string, number> = {};
  monthlyTransactions
    .filter(t => t.type === 'expense' && t.status === 'completed')
    .forEach(t => {
      budgetSpentMap[t.category] = (budgetSpentMap[t.category] || 0) + t.amount;
    });

  let totalBudgets = 0;
  let totalBudgetSpent = 0;
  
  if (categoryBudgets) {
    Object.entries(categoryBudgets).forEach(([cat, limit]) => {
      if (limit > 0) {
        totalBudgets += limit;
        totalBudgetSpent += budgetSpentMap[cat] || 0;
      }
    });
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      
      {/* Month Selector */}
      <div className="flex items-center justify-between bg-[#0f0f13] border border-white/[0.08] rounded-2xl p-3">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2 hover:bg-white/[0.06] rounded-xl transition duration-150 active:scale-[0.96]">
            <ChevronLeft size={18} className="text-zinc-400" />
          </button>
          <div className="w-36 text-center">
            <span className="text-sm font-semibold tracking-wide text-white uppercase font-display">
              {monthsNames[currentMonth]} {currentYear}
            </span>
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-white/[0.06] rounded-xl transition duration-150 active:scale-[0.96]">
            <ChevronRight size={18} className="text-zinc-400" />
          </button>
        </div>

        <button 
          onClick={toggleHideValues}
          className="p-2 bg-[#16161d] border border-white/[0.08] hover:bg-white/[0.08] rounded-xl transition duration-150 active:scale-[0.96] text-zinc-400"
          title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
        >
          {hideValues ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-emerald-500/20 bg-[#102019] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl"><h2 className="text-base font-bold text-white">Encontre o melhor caminho para pagar o mês</h2><p className="mt-1 text-xs leading-relaxed text-emerald-100/70">Um clique analisa saldos, receitas e todas as despesas abertas de {monthsNames[currentMonth]}, apresentando três estratégias prontas.</p></div>
        <button type="button" onClick={() => setShowAutomaticScenario(true)} className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-bold text-[#07110e] transition hover:bg-emerald-400 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"><Sparkles size={17} aria-hidden="true"/>Simular meu mês</button>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/[0.08] bg-[#0f0f13] p-1" role="group" aria-label="Visão dos totais do mês">
          {([
            ['realized', 'Realizado'],
            ['forecast', 'Previsto'],
            ['all', 'Todos'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={financialView === value}
              onClick={() => setFinancialView(value)}
              className={`min-h-11 rounded-lg px-3 text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 active:scale-[0.98] ${
                financialView === value
                  ? 'bg-[#24242c] text-white'
                  : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-400">
          {financialView === 'realized'
            ? 'Somente movimentações pagas neste mês.'
            : financialView === 'forecast'
              ? 'Pendentes e agendadas deste mês.'
              : 'Todas as movimentações da competência.'}
        </p>
      </div>

      {/* Monthly Summary Cards - Clean Impeccable Design */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#0f0f13] border border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2 text-emerald-400">
            <TrendingUp size={15} />
            <span className="text-xs font-semibold font-mono tracking-wider">RECEITAS</span>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-white">{formatVal(displayedTotals.income)}</p>
        </div>

        <div className="bg-[#0f0f13] border border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2 text-rose-400">
            <TrendingDown size={15} />
            <span className="text-xs font-semibold font-mono tracking-wider">DESPESAS</span>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-white">{formatVal(displayedTotals.expense)}</p>
        </div>

        <div className="bg-[#0f0f13] border border-white/[0.08] rounded-2xl p-5 col-span-1 sm:col-span-1">
          <div className="flex items-center gap-2 mb-2 text-indigo-400">
            <Wallet size={15} />
            <span className="text-xs font-semibold font-mono tracking-wider">SALDO DO MÊS</span>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-white">{formatVal(displayedTotals.balance)}</p>
        </div>
      </div>

      {/* Smart Financial Insights */}
      <div className="bg-[#0f0f13] border border-white/[0.08] rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">Assessor Financeiro</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {getFinancialInsights().map((insight, idx) => {
            const IconComponent = 
              insight.icon === 'ShieldCheck' ? ShieldCheck :
              insight.icon === 'TrendingUp' ? TrendingUp :
              insight.icon === 'AlertCircle' ? AlertCircle :
              insight.icon === 'Sliders' ? Sliders :
              insight.icon === 'Calendar' ? Calendar : Sparkles;

            return (
              <div 
                key={idx}
                className={`p-4 rounded-xl border ${insight.color} flex gap-3`}
              >
                <div className="p-1.5 bg-black/20 rounded-lg h-fit shrink-0">
                  <IconComponent size={15} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider font-display">{insight.title}</h4>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">{insight.description}</p>
                  <p className="text-[11px] text-zinc-400 font-sans italic border-t border-white/[0.06] pt-1.5 mt-1.5">
                    <span className="font-semibold text-zinc-200">Recomendação:</span> {insight.tip}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* General Budget Control Summary */}
      {totalBudgets > 0 && (
        <div className="bg-[#0f0f13] border border-white/[0.08] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders size={14} className="text-indigo-400 shrink-0" />
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">Orçamento Planejado</h3>
            </div>
            <span className="text-[10px] text-indigo-400 font-mono font-bold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
              {Math.round((totalBudgetSpent / totalBudgets) * 100)}% Consumido
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-lg font-bold font-mono tabular-nums text-white">
                  {formatVal(totalBudgetSpent)} <span className="text-xs text-zinc-400 font-medium font-sans">de {formatVal(totalBudgets)}</span>
                </p>
              </div>
              
              <p className={`text-xs font-bold font-mono tabular-nums ${totalBudgetSpent > totalBudgets ? 'text-rose-400' : 'text-emerald-400'}`}>
                {totalBudgetSpent > totalBudgets ? 'Excedido' : `Restante ${formatVal(totalBudgets - totalBudgetSpent)}`}
              </p>
            </div>

            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  totalBudgetSpent > totalBudgets 
                    ? 'bg-rose-500' 
                    : totalBudgetSpent > totalBudgets * 0.8
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (totalBudgetSpent / totalBudgets) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Accounts List */}
      <CreditCardsOverview
        accounts={accounts}
        transactions={transactions}
        currentMonth={currentMonth}
        currentYear={currentYear}
        hideValues={hideValues}
        onEditTransaction={onEditTransaction}
        onOpenSettings={() => setActiveTab('ajustes')}
        onPayInvoice={payCreditCardInvoice}
      />

      {/* Accounts List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">Contas e saldos</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {accounts.filter((account) => account.type !== 'credit').map(acc => {
            const currentBalance = getActualAccountBalance(acc);
            const isCredit = acc.type === 'credit';
            
            return (
              <div 
                key={acc.id} 
                className="bg-[#0f0f13] border border-white/[0.08] hover:border-white/[0.16] rounded-2xl p-4 flex flex-col gap-3 transition duration-150"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-sm"
                      style={{ backgroundColor: acc.color }}
                    >
                      {isCredit ? <CreditCard size={16} /> : (acc.bank ? acc.bank.substring(0, 2).toUpperCase() : acc.name.substring(0, 2).toUpperCase())}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-semibold text-white">{acc.name}</h4>
                        {acc.bank && (
                          <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-400">
                            {acc.bank}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <button 
                          onClick={() => startEditAccount(acc)}
                          className="text-[10px] text-zinc-500 hover:text-indigo-400 flex items-center gap-1 transition"
                        >
                          <Edit3 size={10} /> Ajustar
                        </button>
                        {isCredit && acc.dueDay && (
                          <span className="text-[9px] text-zinc-400 font-mono">
                            Venc. dia {acc.dueDay}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {editingAccountId === acc.id ? (
                    <div className="flex items-center gap-1 bg-[#16161d] p-1 rounded-lg border border-white/[0.08]">
                      <span className="text-xs font-mono text-zinc-400">R$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="w-20 bg-transparent px-1 py-0.5 text-xs font-mono text-white outline-none"
                        value={accountBalanceInput}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          if (!digits) {
                            setAccountBalanceInput('');
                          } else {
                            const num = parseInt(digits, 10) / 100;
                            setAccountBalanceInput(num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                          }
                        }}
                        autoFocus
                      />
                      <button 
                        onClick={() => handleEditAccountSubmit(acc.id)}
                        className="p-1 bg-emerald-500/20 text-emerald-400 rounded-md hover:bg-emerald-500/30 transition"
                      >
                        <Check size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {isCredit ? 'Fatura' : 'Saldo'}
                      </span>
                      <p className={`text-sm font-bold font-mono tabular-nums ${isCredit ? 'text-rose-400' : 'text-white'}`}>
                        {formatVal(currentBalance)}
                      </p>
                    </div>
                  )}
                </div>

                {isCredit && acc.creditLimit && (
                  <div className="space-y-1 pt-1 border-t border-white/[0.04]">
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span>Disp: <strong className="text-zinc-200">{formatVal(Math.max(0, acc.creditLimit - currentBalance))}</strong></span>
                      <span>Total: {formatVal(acc.creditLimit)}</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          currentBalance > acc.creditLimit * 0.9 
                            ? 'bg-rose-500' 
                            : currentBalance > acc.creditLimit * 0.75
                              ? 'bg-amber-500'
                              : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.min(100, (currentBalance / acc.creditLimit) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Histórico do Mês */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">Movimentações</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterType('all')}
              className={`min-h-11 text-[10px] px-2.5 py-1 rounded-lg font-semibold uppercase tracking-wider transition ${
                filterType === 'all' ? 'bg-white/10 text-white border border-white/20' : 'bg-transparent text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`min-h-11 text-[10px] px-2.5 py-1 rounded-lg font-semibold uppercase tracking-wider transition ${
                filterType === 'income' ? 'bg-[#10251f] text-emerald-300 border border-emerald-500/30' : 'bg-transparent text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              Entradas
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`min-h-11 text-[10px] px-2.5 py-1 rounded-lg font-semibold uppercase tracking-wider transition ${
                filterType === 'expense' ? 'bg-[#281419] text-rose-300 border border-rose-500/30' : 'bg-transparent text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              Saídas
            </button>
            <div className="w-px h-3 bg-white/10 mx-0.5"></div>
            <button
              onClick={() => setFilterStatus(filterStatus === 'pending' ? 'all' : 'pending')}
              className={`min-h-11 text-[10px] px-2.5 py-1 rounded-lg font-semibold uppercase tracking-wider transition ${
                filterStatus === 'pending' ? 'bg-[#2a2110] text-amber-300 border border-amber-500/30' : 'bg-transparent text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setFilterStatus(filterStatus === 'scheduled' ? 'all' : 'scheduled')}
              className={`min-h-11 text-[10px] px-2.5 py-1 rounded-lg font-semibold uppercase tracking-wider transition ${
                filterStatus === 'scheduled' ? 'bg-[#111d30] text-blue-300 border border-blue-500/30' : 'bg-transparent text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              Agendados
            </button>
            <button
              onClick={() => setFilterStatus(filterStatus === 'completed' ? 'all' : 'completed')}
              className={`min-h-11 text-[10px] px-2.5 py-1 rounded-lg font-semibold uppercase tracking-wider transition ${
                filterStatus === 'completed' ? 'bg-[#10251f] text-emerald-300 border border-emerald-500/30' : 'bg-transparent text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              Pagos
            </button>
          </div>
        </div>
        
        {transactionsToGroup.length === 0 ? (
          <div className="bg-[#0f0f13] border border-white/[0.08] rounded-2xl py-10 px-6 text-center">
            <Calendar size={28} className="text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-400 font-medium">Nenhuma transação encontrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedCategories.map(category => {
              const isExpanded = expandedCategories[category];
              const categoryTotal = transactionsByCategory[category].reduce((sum, t) => sum + (t.type === 'expense' ? -t.amount : t.amount), 0);
              
              const isExpenseCategory = transactionsByCategory[category].some(t => t.type === 'expense');
              const categorySpent = transactionsByCategory[category]
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);
              const budgetLimit = categoryBudgets ? (categoryBudgets[category] || 0) : 0;
              
              return (
              <div key={category} className="bg-[#0f0f13] border border-white/[0.08] rounded-2xl overflow-hidden">
                <button 
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition text-left"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">{category}</h4>
                      <p className="text-[11px] text-zinc-500">{transactionsByCategory[category].length} lançamentos</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-bold font-mono tabular-nums ${categoryTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {categoryTotal >= 0 ? '+' : '-'} {formatVal(Math.abs(categoryTotal))}
                    </p>
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="p-4 pt-0 space-y-2 border-t border-white/[0.04]">
                    {isExpenseCategory && (
                      <div className="flex items-center justify-between bg-[#16161d] border border-white/[0.06] p-2.5 rounded-xl mb-2 mt-2">
                        <div className="flex items-center gap-2">
                          <Sliders size={12} className="text-indigo-400 shrink-0" />
                          <span className="text-xs text-zinc-300">
                            {budgetLimit > 0 ? `Limite: ${formatVal(budgetLimit)}` : 'Sem limite estipulado'}
                          </span>
                        </div>
                        <input
                          type="number"
                          placeholder="Definir limite (R$)"
                          className="w-28 bg-transparent border border-white/[0.1] px-2 py-0.5 rounded text-xs font-mono text-white outline-none focus:border-indigo-400"
                          defaultValue={budgetLimit > 0 ? budgetLimit : ''}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            setCategoryBudget(category, isNaN(val) ? 0 : val);
                          }}
                        />
                      </div>
                    )}

                    {transactionsByCategory[category].map(t => (
                      <div 
                        key={t.id} 
                        className="flex items-center justify-between p-3 bg-[#16161d]/60 border border-white/[0.04] rounded-xl hover:border-white/[0.1] transition"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleStatus(t)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition border ${
                              t.status === 'completed' 
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                                : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300'
                            }`}
                            title={t.status === 'completed' ? 'Marcar como Pendente' : 'Marcar como Pago'}
                          >
                            <Check size={12} />
                          </button>
                          <div>
                            <p className="text-xs font-medium text-white">{t.description}</p>
                            <p className="text-[10px] text-zinc-500 font-mono">
                              {t.date} • {accounts.find(a => a.id === t.accountId)?.name || 'Sem conta'}
                              {t.status === 'completed' && (
                                <span className="text-emerald-400"> • Pago{t.paymentDate ? ` em ${t.paymentDate}` : ''}</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-bold font-mono tabular-nums ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {t.type === 'income' ? '+' : '-'} {formatVal(t.amount)}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onEditTransaction(t)}
                              className="p-1 text-zinc-500 hover:text-white transition"
                              title="Editar"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(t)}
                              className="p-1 text-zinc-500 hover:text-rose-400 transition"
                              title="Excluir"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
            })}
          </div>
        )}
      </div>

      {transactionToComplete && (
        <SelectAccountModal
          isOpen={!!transactionToComplete}
          onClose={() => setTransactionToComplete(null)}
          onConfirm={handleConfirmPaymentAccount}
          transaction={transactionToComplete}
        />
      )}

      {transactionToDelete && (
        <ConfirmDeleteModal
          isOpen={!!transactionToDelete}
          onClose={() => setTransactionToDelete(null)}
          onConfirm={handleConfirmDelete}
          transaction={transactionToDelete}
        />
      )}

      <AutomaticScenarioModal isOpen={showAutomaticScenario} onClose={() => setShowAutomaticScenario(false)} accounts={accounts} transactions={transactions} period={monthPeriod} monthLabel={`${monthsNames[currentMonth]} de ${currentYear}`} hideValues={hideValues} />
    </div>
  );
}
