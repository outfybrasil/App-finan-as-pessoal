import React, { useState, useEffect } from 'react';
import { Transaction, Budget } from '../types';
import { Wallet, TrendingUp, TrendingDown, AlertTriangle, ChevronLeft, ChevronRight, Edit2, CheckCircle2, Clock, PiggyBank, CreditCard, X, Save, CalendarRange, Landmark, Plane, PieChart as PieChartIcon, Layers, FileText, MoreVertical, Scale, ArrowRightLeft, Info, HelpCircle } from 'lucide-react';
import { CustomDialog } from './CustomDialog';
import { useTravelMode } from '../context/TravelContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from './Button';

interface DashboardProps {
  transactions: Transaction[]; // Transações do MÊS (para gráficos e listas)
  allTransactions?: Transaction[]; // TODAS as transações (não usado para saldo visual neste modo)
  budgets: Budget[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onEditTransaction: (t: Transaction) => void;
  onToggleStatus?: (t: Transaction) => void;
  onAdjustBalance?: (account: string, newBalance: number) => void;
  privacyMode?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  allTransactions = [],
  budgets,
  currentMonth,
  onMonthChange,
  onEditTransaction,
  onToggleStatus,
  onAdjustBalance,
  privacyMode = false
}) => {
  // Adicionado tipo 'pending' ao estado
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'pending'>('all');
  const [itemsToShow, setItemsToShow] = useState(10);
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(true);
  const [isGrouped, setIsGrouped] = useState(() => {
    return localStorage.getItem('dashboard_isGrouped') === 'true';
  });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem('dashboard_isGrouped', isGrouped.toString());
  }, [isGrouped]);


  const { isTravelModeActive, travelEventName } = useTravelMode();

  const prevMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    onMonthChange(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
  };

  const formatMonth = (date: Date) => {
    const str = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}`;
  };

  // Helper for compact number formatting to avoid TS errors with 'as any' inline
  const formatCompact = (val: number) => {
    return val.toLocaleString('pt-BR', {
      compactDisplay: 'short',
      notation: 'compact'
    } as any);
  };

  const checkPaid = (t: Transaction) => t.isPaid !== false;

  // --- MONTHLY CALCULATIONS ---
  // A pedido: Todas as métricas agora são estritamente do mês selecionado.
  // "Não deve puxar do mês anterior" -> Usamos apenas a prop `transactions`
  // IMPORTANT: Filter out 'Ajuste' so legacy cumulative corrections don't skew the monthly flow.

  const currentIncome = transactions
    .filter(t => t.type === 'income' && checkPaid(t) && t.category !== 'Ajuste')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const currentExpense = transactions
    .filter(t => t.type === 'expense' && checkPaid(t) && t.category !== 'Ajuste')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  // Month Balance (Fluxo do Mês - Realizado)
  const monthlyBalance = currentIncome - currentExpense;

  const pendingIncome = transactions
    .filter(t => t.type === 'income' && !checkPaid(t) && t.category !== 'Ajuste')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const pendingExpense = transactions
    .filter(t => t.type === 'expense' && !checkPaid(t) && t.category !== 'Ajuste')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  // Projected Balance (Previsto = Realizado + Pendente)
  const projectedBalance = monthlyBalance + (pendingIncome - pendingExpense);

  const expensesByCategory = transactions
    .filter(t => t.type === 'expense' && t.category !== 'Ajuste')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);



  // --- ACCOUNT BALANCES (TOTAL) ---
  // Para os cartões de conta, usamos TODAS as transações para mostrar o saldo REAL acumulado.
  // Incluímos 'Ajuste' pois ele faz parte da correção do saldo.
  const accountsToIterate = allTransactions.length > 0 ? allTransactions : transactions;
  
  // Identify all unique accounts from both t.account and t.splits
  const allAccountNames = new Set<string>();
  accountsToIterate.forEach(t => {
    if (t.splits && t.splits.length > 0) {
      t.splits.forEach(s => allAccountNames.add(s.account));
    } else {
      allAccountNames.add(t.account || 'Carteira');
    }
  });

  const accounts = Array.from(allAccountNames);

  const accountBalances = accounts.map(acc => {
    const income = accountsToIterate
      .filter(t => (t.type === 'income' || t.type === 'transfer') && checkPaid(t))
      .reduce((sum, t) => {
        if (t.type === 'transfer') {
          return t.destinationAccount === acc ? sum + Number(t.amount) : sum;
        }
        if (t.splits && t.splits.length > 0) {
          const split = t.splits.find(s => s.account === acc);
          return sum + (split ? Number(split.amount) : 0);
        }
        return (t.account || 'Carteira') === acc ? sum + Number(t.amount) : sum;
      }, 0);

    const expense = accountsToIterate
      .filter(t => (t.type === 'expense' || t.type === 'transfer') && checkPaid(t))
      .reduce((sum, t) => {
        if (t.type === 'transfer') {
          return t.account === acc ? sum + Number(t.amount) : sum;
        }
        if (t.splits && t.splits.length > 0) {
          const split = t.splits.find(s => s.account === acc);
          return sum + (split ? Number(split.amount) : 0);
        }
        return (t.account || 'Carteira') === acc ? sum + Number(t.amount) : sum;
      }, 0);

    return { name: acc, balance: income - expense };
  }).sort((a, b) => b.balance - a.balance);

  const totalRealBalance = accountBalances.reduce((sum, acc) => sum + acc.balance, 0);



  // Projeção Final (Fluxo Previsto do Mês = Realizado + Pendente)
  const finalMonthProjection = projectedBalance;

  const totalMonthlyFlow = monthlyBalance;


  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#ec4899'];
  const INCOME_COLORS = ['#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#06b6d4'];

  const [chartType, setChartType] = useState<'income' | 'expense'>('expense');
  const [selectedAccountForAction, setSelectedAccountForAction] = useState<{ name: string, balance: number } | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);

  // INCOME CALCULATION for Chart
  const incomeByCategory = transactions
    .filter(t => t.type === 'income' && t.category !== 'Ajuste')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);

  const chartData = Object.keys(expensesByCategory).map(key => ({
    name: key,
    value: expensesByCategory[key]
  }));

  const incomeChartData = Object.keys(incomeByCategory).map(key => ({
    name: key,
    value: incomeByCategory[key]
  }));

  const currentChartData = chartType === 'expense' ? chartData : incomeChartData;
  const distributionData = currentChartData; // Use current selection for distribution section

  // Lógica de filtro atualizada
  const displayedTransactions = transactions.filter(t => {
    // Ocultar ajustes da lista de transações
    if (t.category === 'Ajuste') return false;

    if (filterType === 'all') return true;
    if (filterType === 'pending') return !checkPaid(t);
    return t.type === filterType;
  });

  const sortedTransactions = [...displayedTransactions].sort((a, b) => {
    if (a.date !== b.date) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    if (a.type !== b.type) {
      return a.type === 'income' ? -1 : 1;
    }
    return a.description.localeCompare(b.description);
  });

  // Lógica de agrupamento
  const groupedTransactions = sortedTransactions.reduce((acc, t) => {
    const category = t.category || 'Outros';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const categoryGroups = Object.entries(groupedTransactions).sort((a, b) => {
    return a[0].localeCompare(b[0]);
  });

  const toggleCategory = (category: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setExpandedCategories(newSet);
  };

  const hasMoreItems = sortedTransactions.length > itemsToShow;
  const paginatedTransactions = sortedTransactions.slice(0, itemsToShow);

  const privacyClass = privacyMode ? "blur-md select-none opacity-50" : "";
  const privacyClassText = privacyMode ? "text-transparent bg-white/20 rounded blur-sm select-none" : "";
  const savingsRate = currentIncome > 0 ? (monthlyBalance / currentIncome) * 100 : 0;
  const balanceTone = totalMonthlyFlow >= 0 ? 'text-emerald-300' : 'text-rose-300';
  const monthPulseLabel = pendingExpense > pendingIncome
    ? 'Mais saídas pendentes do que entradas previstas.'
    : pendingIncome > 0 || pendingExpense > 0
      ? 'O mês ainda tem valores pendentes para fechar.'
      : 'Tudo registrado para este mês até agora.';

  // Handlers for Account Adjustment
  const handleAccountClick = (name: string, balance: number) => {
    setSelectedAccountForAction({ name, balance });
    setShowAccountModal(true);
  };



  const handleChooseAdjust = () => {
    if (!selectedAccountForAction) return;
    setShowAccountModal(false);
    setShowAdjustDialog(true);
  };

  const onConfirmAdjustment = (value: string) => {
    if (!selectedAccountForAction || !value) {
      setShowAdjustDialog(false);
      return;
    }
    const newBalance = parseFloat(value.replace(',', '.'));
    if (!isNaN(newBalance)) {
      onAdjustBalance?.(selectedAccountForAction.name, newBalance);
    }
    setShowAdjustDialog(false);
  };

  const handleChooseTransfer = () => {
    if (!selectedAccountForAction) return;
    setShowAccountModal(false);
    // Abre o QuickAdd pré-configurado para transferência com a conta selecionada como origem
    onEditTransaction({
      id: 'new_transfer',
      description: 'Transferência',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      type: 'transfer',
      category: 'Transferência',
      account: selectedAccountForAction.name,
      isPaid: true
    } as any);
  };

  return (
    <>
      <div className="space-y-6 pb-4 md:space-y-8 md:pb-0">

        {/* Header & Month Selector */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-6">
          <div className="w-full md:w-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-ms-muted" style={{letterSpacing:'0.22em'}}>
              <span className="h-1.5 w-1.5 bg-ms-primary" />
              Pulso do mês
            </div>
            <h1 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight font-manrope" style={{color:'#e7e4ec'}}>Visão Geral</h1>
            <p className="text-sm text-ms-muted mt-1 font-medium max-w-xl">{monthPulseLabel}</p>
            {isTravelModeActive && (
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 text-ms-tertiary text-xs font-bold" style={{backgroundColor:'rgba(255,177,72,0.08)',borderRadius:'4px'}}>
                <Plane size={14} />
                Modo Viagem Ativo: {travelEventName}
              </div>
            )}
          </div>

          <div className="flex w-full md:w-auto items-center justify-between p-1" style={{backgroundColor:'#19191d',borderRadius:'4px'}}>
            <button onClick={prevMonth} className="p-3 text-ms-muted hover:text-ms-on transition-colors" style={{borderRadius:'4px'}}>
              <ChevronLeft size={20} />
            </button>
            <div className="px-4 md:px-6 flex items-center font-bold min-w-0 flex-1 justify-center text-base md:text-lg font-manrope" style={{color:'#e7e4ec'}}>
              {formatMonth(currentMonth)}
            </div>
            <button onClick={nextMonth} className="p-3 text-ms-muted hover:text-ms-on transition-colors" style={{borderRadius:'4px'}}>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Hero Section - Cards */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* Main Balance Card — Monolith Slate */}
          <div className="md:col-span-6 relative overflow-hidden" style={{backgroundColor:'#19191d',borderRadius:'4px'}}>
            <div className="relative p-6 md:p-8 h-full flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-ms-muted mb-4" style={{letterSpacing:'0.22em'}}>Fluxo Líquido Mensal</p>
                <div className="flex items-start justify-between gap-3">
                  <h2 className={`financial-display text-4xl sm:text-5xl md:text-6xl font-manrope ${privacyClass}`} style={{color:'#e7e4ec',fontVariantNumeric:'tabular-nums',letterSpacing:'-0.04em'}}>
                    R$ {totalMonthlyFlow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h2>
                  <div className="shrink-0 px-3 py-2 text-left" style={{backgroundColor: totalMonthlyFlow >= 0 ? 'rgba(78,222,163,0.08)' : 'rgba(255,111,126,0.08)',borderRadius:'4px'}}>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-ms-muted">Status</p>
                    <p className="text-sm font-black" style={{color: totalMonthlyFlow >= 0 ? '#4edea3' : '#ff6f7e'}}>
                      {totalMonthlyFlow >= 0 ? 'Saudável' : 'Ajustar'}
                    </p>
                  </div>
                </div>

                <div className={`${isSummaryCollapsed ? 'hidden md:grid' : 'grid'} mt-8 grid-cols-3 gap-2`}>
                  <div className="px-3 py-3" style={{backgroundColor:'#25252b',borderRadius:'4px'}}>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-ms-muted">Entradas</p>
                    <p className={`mt-2 text-sm font-black tnum ${privacyClassText}`} style={{color:'#4edea3'}}>
                      R$ {formatCompact(currentIncome)}
                    </p>
                  </div>
                  <div className="px-3 py-3" style={{backgroundColor:'#25252b',borderRadius:'4px'}}>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-ms-muted">Saídas</p>
                    <p className={`mt-2 text-sm font-black tnum ${privacyClassText}`} style={{color:'#ff6f7e'}}>
                      R$ {formatCompact(currentExpense)}
                    </p>
                  </div>
                  <div className="px-3 py-3" style={{backgroundColor:'#25252b',borderRadius:'4px'}}>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-ms-muted">Pendências</p>
                    <p className={`mt-2 text-sm font-black tnum ${privacyClassText}`} style={{color: pendingExpense > 0 ? '#ffb148' : '#e7e4ec'}}>
                      R$ {formatCompact(pendingExpense)}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`${isSummaryCollapsed ? 'hidden md:flex' : 'flex'} mt-8 pt-6 items-start justify-between gap-4`} style={{borderTop:'1px solid rgba(71,71,78,0.15)'}}>
                <div>
                  <p className="text-ms-muted text-[10px] font-black uppercase tracking-[0.15em] mb-2">Projeção Final</p>
                  <div className={`flex items-center gap-2 ${privacyClass}`}>
                    <span className="text-xl md:text-2xl font-black font-manrope tnum" style={{color: finalMonthProjection >= 0 ? '#4edea3' : '#ff6f7e'}}>
                      R$ {finalMonthProjection.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-ms-muted text-[10px] font-black uppercase tracking-[0.15em] mb-2">Patrimônio Hoje</p>
                  <p className={`text-base md:text-lg font-bold tnum ${privacyClass}`} style={{color:'#e7e4ec'}}>
                    R$ {totalRealBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
                className="md:hidden mt-4 w-full py-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-ms-muted hover:text-ms-on transition-colors pt-4"
                style={{borderTop:'1px solid rgba(71,71,78,0.15)'}}
              >
                {isSummaryCollapsed ? 'Ver Detalhes' : 'Recolher'}
                {isSummaryCollapsed ? <ChevronRight size={14} className="rotate-90" /> : <ChevronRight size={14} className="-rotate-90" />}
              </button>
            </div>
          </div>

          {/* Secondary Cards Column */}
          <div className="md:col-span-6 grid grid-cols-2 gap-4 md:gap-6">

            {/* Income Card */}
            <div className="p-6 flex flex-col justify-between min-h-[154px]" style={{backgroundColor:'#19191d',borderRadius:'4px'}}>
              <div className="flex justify-between items-start">
                <div className="p-2" style={{backgroundColor:'rgba(78,222,163,0.08)',borderRadius:'4px'}}>
                  <TrendingUp size={18} style={{color:'#4edea3'}} />
                </div>
                {pendingIncome > 0 && (
                  <span className="text-[9px] badge-income px-2 py-1 font-bold tnum">
                    + R$ {formatCompact(pendingIncome)}
                  </span>
                )}
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider mt-4 text-ms-muted">Entradas</p>
                <h3 className={`text-xl sm:text-3xl font-black font-manrope tnum mt-1 ${privacyClassText}`} style={{color:'#4edea3'}}>
                  R$ {currentIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
              </div>
            </div>

            {/* Expense Card */}
            <div className="p-6 flex flex-col justify-between min-h-[154px]" style={{backgroundColor:'#19191d',borderRadius:'4px'}}>
              <div className="flex justify-between items-start">
                <div className="p-2" style={{backgroundColor:'rgba(255,111,126,0.08)',borderRadius:'4px'}}>
                  <TrendingDown size={18} style={{color:'#ff6f7e'}} />
                </div>
                {pendingExpense > 0 && (
                  <span className="text-[9px] badge-expense px-2 py-1 font-bold tnum">
                    + R$ {formatCompact(pendingExpense)}
                  </span>
                )}
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider mt-4 text-ms-muted">Saídas</p>
                <h3 className={`text-xl sm:text-3xl font-black font-manrope tnum mt-1 ${privacyClassText}`} style={{color:'#e7e4ec'}}>
                  R$ {currentExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
              </div>
            </div>

            {/* Savings Rate Mini-Card */}
            <div className="col-span-2 p-4 flex items-center justify-between gap-4" style={{backgroundColor:'#25252b',borderRadius:'4px'}}>
              <div className="flex items-center gap-3">
                <div className="p-2" style={{backgroundColor:'rgba(78,222,163,0.08)',borderRadius:'4px'}}>
                  <PiggyBank size={18} style={{color:'#4edea3'}} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{color:'#e7e4ec'}}>Economia do Mês</p>
                  <p className="text-xs text-ms-muted">Receitas − Despesas</p>
                </div>
              </div>
              <span className={`font-bold text-lg tnum font-manrope ${privacyClassText}`} style={{color: monthlyBalance >= 0 ? '#4edea3' : '#ff6f7e'}}>
                {savingsRate.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Account Balances Section */}
        <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
          <div className="mb-4 flex items-center justify-between px-1">
            <div>
              <h3 className="text-sm font-bold tracking-tight font-manrope" style={{color:'#e7e4ec'}}>Contas</h3>
              <p className="text-xs text-ms-muted mt-1">Toque em uma conta para ajustar.</p>
            </div>
          </div>

          <div className="flex gap-3 md:gap-4 min-w-max snap-x snap-mandatory">
            {accountBalances.map(acc => (
              <div
                key={acc.name}
                onClick={() => handleAccountClick(acc.name as string, acc.balance)}
                className="p-5 min-w-[180px] md:min-w-[200px] flex flex-col justify-between cursor-pointer snap-start transition-opacity hover:opacity-80"
                style={{backgroundColor:'#19191d',borderRadius:'4px'}}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CreditCard size={14} className="text-ms-muted" />
                    <span className="text-[11px] font-bold tracking-wide" style={{color:'#e7e4ec'}}>{acc.name}</span>
                  </div>
                  <Edit2 size={12} className="text-ms-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-ms-muted font-medium mb-1">Saldo Disponível</span>
                  <p className={`text-xl font-bold tnum font-manrope tracking-tight ${privacyClassText}`} style={{color: acc.balance >= 0 ? '#e7e4ec' : '#ff6f7e'}}>
                    R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))}
            {accountBalances.length === 0 && (
              <div className="text-ms-muted text-sm italic p-4">
                Registre transações neste mês para ver o fluxo das contas.
              </div>
            )}
          </div>
          <p className="text-[10px] text-ms-muted mt-2 px-1">* Valores refletem apenas entradas e saídas deste mês.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Transactions List */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4 mt-8">
              <div>
                <h3 className="text-lg font-bold font-manrope tracking-tight" style={{color:'#e7e4ec'}}>Movimentações</h3>
                <p className="text-xs text-ms-muted mt-1">Toque para editar ou marque como concluído.</p>
              </div>
              <div className="flex p-1 overflow-x-auto" style={{backgroundColor:'#19191d',borderRadius:'4px'}}>
                {(['all', 'income', 'expense', 'pending'] as const).map(fType => (
                  <button
                    key={fType}
                    onClick={() => setFilterType(fType)}
                    className="px-4 py-2 text-[11px] font-medium whitespace-nowrap transition-colors"
                    style={{
                      borderRadius:'4px',
                      backgroundColor: filterType === fType ? '#25252b' : 'transparent',
                      color: filterType === fType ? '#e7e4ec' : '#acaab1'
                    }}
                  >
                    {fType === 'all' ? 'Tudo' : fType === 'income' ? 'Entradas' : fType === 'expense' ? 'Saídas' : 'Pendentes'}
                  </button>
                ))}
                <button
                  onClick={() => setIsGrouped(!isGrouped)}
                  className={`ml-2 px-3 py-2 text-[11px] font-bold flex items-center gap-2 transition-all border border-white/5`}
                  style={{
                    borderRadius: '4px',
                    backgroundColor: isGrouped ? 'rgba(78,222,163,0.1)' : 'transparent',
                    color: isGrouped ? '#4edea3' : '#acaab1'
                  }}
                  title={isGrouped ? "Ver lista simples" : "Agrupar por categoria"}
                >
                  <Layers size={14} />
                  <span className="hidden sm:inline">{isGrouped ? 'Agrupado' : 'Agrupar'}</span>
                </button>
              </div>
            </div>

            {/* Container Scrollável para as transações */}
            <div className="space-y-px md:max-h-[600px] overflow-y-auto pr-0 md:pr-2 custom-scrollbar border-t border-white/5">
              {isGrouped ? (
                /* VISÃO AGRUPADA (ACCORDION) */
                <div className="space-y-3 pt-4">
                  {categoryGroups.map(([category, items]) => {
                    const isExpanded = expandedCategories.has(category);
                    const totalAmount = items.reduce((sum, item) => {
                      const val = Number(item.amount);
                      return item.type === 'income' ? sum + val : sum - val;
                    }, 0);

                    return (
                      <div key={category} className="overflow-hidden" style={{ backgroundColor: '#19191d', borderRadius: '4px' }}>
                        <button
                          onClick={() => toggleCategory(category)}
                          className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-sm ${totalAmount >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                              <PieChartIcon size={16} />
                            </div>
                            <div className="text-left">
                              <h4 className="text-sm font-bold text-slate-100">{category}</h4>
                              <p className="text-[10px] text-ms-muted uppercase font-black tracking-widest">
                                {items.length} {items.length === 1 ? 'item' : 'itens'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`text-sm font-black tnum ${privacyClassText} ${totalAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              R$ {Math.abs(totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <ChevronRight size={16} className={`text-ms-muted transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
                            {items.map(t => {
                              const isPaid = checkPaid(t);
                              const isTransfer = t.type === 'transfer';
                              return (
                                <div
                                  key={t.id}
                                  onClick={(e) => { e.stopPropagation(); onEditTransaction(t); }}
                                  className="flex items-center justify-between p-4 pl-12 hover:bg-white/[0.03] border-b border-white/[0.02] cursor-pointer group"
                                >
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-sm font-bold ${isPaid ? 'text-slate-200' : 'text-slate-500'}`}>{t.description}</span>
                                      {t.isPriority && <AlertTriangle size={12} className="text-amber-500" />}
                                    </div>
                                    <span className="text-[10px] text-slate-500 mt-0.5">{formatDateDisplay(t.date)} • {t.account || 'Carteira'}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className={`text-xs font-black tnum ${privacyClassText} ${t.type === 'income' ? 'text-emerald-500' : 'text-slate-300'}`}>
                                      {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                    {onToggleStatus && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); onToggleStatus(t); }}
                                        className={`p-1 rounded-full transition-colors ${isPaid ? 'text-emerald-500/40 hover:text-emerald-500' : 'text-amber-500'}`}
                                      >
                                        {isPaid ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* VISÃO LISTA PADRÃO */
                paginatedTransactions.map(t => {
                  const isPaid = checkPaid(t);
                  const isTransfer = t.type === 'transfer';
                  
                  return (
                    <div
                      key={t.id}
                      onClick={() => onEditTransaction(t)}
                      className={`group flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-5 transition-all duration-200 border-b border-white/5 relative overflow-hidden cursor-pointer
                      ${isPaid
                          ? 'bg-slate-950/40 hover:bg-white/[0.03]'
                          : 'bg-slate-900/10 opacity-60'
                        }`}
                    >
                      {/* Lateral Status Bar */}
                      <div className={`absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-300
                        ${t.type === 'income' ? 'bg-emerald-500' : isTransfer ? 'bg-blue-500' : 'bg-slate-700'}
                        ${!isPaid ? 'opacity-30' : 'opacity-100'}
                      `} />

                      <div className="flex items-center gap-5 flex-1 min-w-0">
                        <div className={`w-11 h-11 rounded-sm flex items-center justify-center shrink-0 border transition-all duration-500
                        ${t.type === 'income'
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-black'
                            : isTransfer
                            ? 'bg-blue-500/5 border-blue-500/20 text-blue-500 group-hover:bg-blue-500 group-hover:text-white'
                            : 'bg-slate-800/40 border-slate-700/50 text-slate-500 group-hover:bg-slate-100 group-hover:text-black'
                          } ${!isPaid ? 'grayscale opacity-30' : ''}`}>

                          {isTransfer ? <Layers size={18} /> : t.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                        </div>

                          <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <p className={`font-bold truncate text-[15px] tracking-tight ${isPaid ? 'text-slate-100' : 'text-slate-500'}`}>
                              {t.description}
                            </p>
                            {t.isPriority && <AlertTriangle size={14} className="text-amber-500 shrink-0" />}
                            {!isPaid && <Clock size={12} className="text-amber-500 shrink-0" />}
                            {t.isRecurring && (
                              <span className="text-[8px] px-1.5 py-0.5 rounded-sm bg-slate-800 text-slate-500 border border-white/5 font-black uppercase tracking-[0.15em]">Fixo</span>
                            )}
                          </div>
                          
                          <div className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-2 font-black uppercase tracking-[0.12em]">
                            <span className="text-slate-400">{formatDateDisplay(t.date)}</span>
                            <span className="w-1 h-1 bg-slate-800 rounded-full" />
                            
                            {isTransfer ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-300">{t.account}</span>
                                <ChevronRight size={10} className="text-slate-600" />
                                <span className="text-blue-400">{t.destinationAccount}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">{t.account || 'Carteira'}</span>
                            )}
                            
                            <span className="w-1 h-1 bg-slate-800 rounded-full" />
                            <span className={`${t.type === 'income' ? 'text-emerald-500/60' : isTransfer ? 'text-blue-500/60' : 'text-slate-600'}`}>
                              {t.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3 sm:gap-2">
                        <span
                          className={`font-black text-base sm:text-[17px] tracking-tighter transition-all ${!isPaid ? 'text-slate-700' :
                            privacyMode ? privacyClassText :
                              (t.type === 'income' ? 'text-emerald-400' : isTransfer ? 'text-blue-400' : 'text-slate-100')
                            }`}
                        >
                          {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>

                        {onToggleStatus && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onToggleStatus(t); }}
                            className={`text-[9px] flex items-center gap-1.5 font-black uppercase tracking-[0.18em] transition-all rounded-sm px-2.5 py-1 border ${isPaid
                              ? 'bg-emerald-500/5 border-emerald-500/0 text-emerald-500/40 group-hover:border-emerald-500/20 group-hover:text-emerald-500'
                              : 'bg-amber-500/5 border-amber-500/20 text-amber-500/80 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400'
                              }`}
                          >
                            {isPaid ? <CheckCircle2 size={11} /> : <span>Pendente</span>}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}

              {!isGrouped && hasMoreItems && (
                <div className="pt-6 flex justify-center">
                  <button 
                    onClick={() => setItemsToShow(prev => prev + 10)}
                    className="w-full md:w-auto px-10 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                  >
                    Carregar mais transações
                  </button>
                </div>
              )}

              {sortedTransactions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-900/30 rounded-3xl border border-slate-800 border-dashed text-center">
                  <div className="p-4 bg-slate-800 rounded-full mb-4 opacity-50">
                    <Wallet size={32} className="text-slate-400" />
                  </div>
                  <p className="text-slate-300 font-medium">Nada por aqui ainda</p>
                  <p className="text-sm text-slate-500 mt-1 max-w-xs">
                    {filterType === 'pending'
                      ? 'Nenhuma pendência para este mês.'
                      : 'Comece adicionando suas receitas e despesas para ver a mágica acontecer.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Chart & Alerts */}
          <div className="lg:col-span-5 space-y-6">
            {/* Distribution Chart Section */}
            <div className="p-5 md:p-8 flex flex-col" style={{backgroundColor:'#19191d',borderRadius:'4px'}}>
              <div className="flex items-center justify-between gap-3 mb-6 md:mb-8">
                <h3 className="text-xl font-extrabold font-manrope tracking-tight" style={{color:'#e7e4ec'}}>Distribuição</h3>
                <div className="flex p-1" style={{backgroundColor:'#25252b',borderRadius:'4px'}}>
                  <button
                    onClick={() => setChartType('expense')}
                    className="px-3 py-1.5 text-xs font-bold transition-all"
                    style={{
                      borderRadius:'4px',
                      backgroundColor: chartType === 'expense' ? '#ff6f7e' : 'transparent',
                      color: chartType === 'expense' ? '#fff' : '#acaab1'
                    }}
                  >
                    Saídas
                  </button>
                  <button
                    onClick={() => setChartType('income')}
                    className="px-3 py-1.5 text-xs font-bold transition-all"
                    style={{
                      borderRadius:'4px',
                      backgroundColor: chartType === 'income' ? '#4edea3' : 'transparent',
                      color: chartType === 'income' ? '#004a31' : '#acaab1'
                    }}
                  >
                    Entradas
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center min-h-[260px] md:min-h-[300px]">
                {distributionData.length > 0 ? (
                  <>
                    <div className="h-[220px] md:h-[250px] w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={distributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={75}
                            outerRadius={95}
                            paddingAngle={8}
                            dataKey="value"
                            stroke="none"
                          >
                            {distributionData.map((_entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={chartType === 'expense' ? COLORS[index % COLORS.length] : INCOME_COLORS[index % INCOME_COLORS.length]} 
                                className="filter transition-all duration-500 hover:brightness-125 hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="glass-card p-3 border-white/5 shadow-2xl">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{payload[0].name}</p>
                                    <p className="text-lg font-black text-white">R$ {payload[0].value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      
                      {/* Center Content */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
                          {chartType === 'expense' ? 'Gasto Total' : 'Renda Total'}
                        </span>
                        <p className={`text-2xl font-black text-white ${privacyClass}`}>
                          {chartType === 'expense' ? (currentExpense + pendingExpense).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : (currentIncome + pendingIncome).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                      {distributionData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center justify-between p-3 rounded-2xl glass hover:bg-white/5 transition-all">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px_rgba(255,255,255,0.1)]" style={{ backgroundColor: chartType === 'expense' ? COLORS[index % COLORS.length] : INCOME_COLORS[index % INCOME_COLORS.length] }} />
                            <span className="text-slate-200 text-xs font-bold truncate tracking-tight">{entry.name}</span>
                          </div>
                          <span className="text-slate-500 text-[10px] font-black tracking-tighter">
                            {((entry.value / Math.max(1, (chartType === 'expense' ? (currentExpense + pendingExpense) : (currentIncome + pendingIncome)))) * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-600 py-10">
                    <PieChart as PieChartIcon size={48} className="opacity-10 mb-4" />
                    <p className="text-xs font-black uppercase tracking-[0.3em] opacity-40">Sem dados</p>
                  </div>
                )}
              </div>
            </div>

            {/* Alerts & Budgets */}
            {budgets.some(b => b.spent > b.limit * 0.9) && (
              <div className="p-5 flex items-start gap-4" style={{backgroundColor:'rgba(255,111,126,0.06)',borderRadius:'4px'}}>
                <div className="p-3" style={{backgroundColor:'rgba(255,111,126,0.15)',borderRadius:'4px'}}>
                  <AlertTriangle size={20} style={{color:'#ff6f7e'}} />
                </div>
                <div>
                  <p className="text-sm font-black uppercase tracking-widest" style={{color:'#ff6f7e'}}>Atenção Crítica</p>
                  <p className="text-xs text-ms-muted mt-1 leading-relaxed">Você atingiu 90% do limite em um ou mais orçamentos este mês.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>



      {/* Account Action Modal */}
      {showAccountModal && selectedAccountForAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setShowAccountModal(false)}
          />
          <div className="relative w-full max-w-sm bg-slate-900 border border-white/10 p-6 rounded-[2rem] shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-black text-white mb-2 tracking-tight">Ações da Conta</h3>
            <p className="text-slate-400 text-sm mb-6">
              O que você deseja fazer com a conta <span className="text-emerald-400 font-bold">{selectedAccountForAction.name}</span>?
            </p>
            
            <div className="space-y-3">
              <button
                onClick={handleChooseAdjust}
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl group-hover:bg-emerald-500 group-hover:text-black transition-all">
                    <Edit2 size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-100">Ajustar Saldo</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Ajuste manual de correção</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-600 group-hover:text-slate-300 transition-all" />
              </button>

              <button
                onClick={handleChooseTransfer}
                className="w-full flex items-center justify-between p-4 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 rounded-2xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-all">
                    <Layers size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-100">Fazer Transferência</p>
                    <p className="text-[10px] text-blue-500/80 uppercase tracking-widest font-black">Mover entre contas (Pix)</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-blue-500/40 group-hover:text-blue-400 transition-all" />
              </button>
            </div>

            <button
              onClick={() => setShowAccountModal(false)}
              className="w-full mt-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {/* Custom Dialog for Balance Adjustment */}
      <CustomDialog
        isOpen={showAdjustDialog}
        type="prompt"
        title="Ajustar Saldo"
        message={`Informe o saldo atual real para a conta: ${selectedAccountForAction?.name}`}
        defaultValue={selectedAccountForAction?.balance.toString() || '0'}
        placeholder="0,00"
        onConfirm={onConfirmAdjustment}
        onCancel={() => setShowAdjustDialog(false)}
      />
    </>
  );
};
