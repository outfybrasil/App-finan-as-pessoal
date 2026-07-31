import { useState } from 'react';
import { useFinanceStore } from '../store';
import { 
  Search, 
  Filter, 
  Calendar, 
  ArrowUpDown, 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  Edit3, 
  Tag, 
  Clock, 
  Inbox,
  CheckCircle,
  HelpCircle,
  Briefcase,
  Sliders,
  Tv,
  User,
  ShoppingBag,
  FileText,
  GraduationCap,
  Utensils,
  Car,
  HeartPulse,
  Compass,
  Coins,
  PlusCircle, ChevronDown, ChevronUp,
  Activity, CheckSquare, Square, Undo2
} from 'lucide-react';
import { Transaction } from '../types';
import SelectAccountModal from "./SelectAccountModal";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import { getTransactionEffectiveStatus, type EffectiveTransactionStatus } from '../lib/finance';
import ScenarioPlannerModal from './ScenarioPlannerModal';
import MultiScenarioPlannerModal from './MultiScenarioPlannerModal';

interface HistoryViewProps {
  onEditTransaction: (t: Transaction) => void;
}

export default function HistoryView({ onEditTransaction }: HistoryViewProps) {
  const { 
    transactions, 
    accounts, 
    categories, 
    hideValues, 
    currentMonth, 
    currentYear, 
    selectedDate,
    editTransaction,
    payTransaction, 
    deleteTransaction 
  } = useFinanceStore();

  // Filters State
  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'semana' | 'mes' | 'ano' | 'todos'>('todos');
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [typeFilter, setTypeFilter] = useState<'todos' | 'income' | 'expense'>('todos');
  const [accountFilter, setAccountFilter] = useState<string>('todas');
  const [statusFilter, setStatusFilter] = useState<'todos' | EffectiveTransactionStatus>('todos');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [transactionToComplete, setTransactionToComplete] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [transactionToSimulate, setTransactionToSimulate] = useState<Transaction | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [groupMode, setGroupMode] = useState<'category' | 'account'>('category');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showMultiScenario, setShowMultiScenario] = useState(false);
  const [undoTransaction, setUndoTransaction] = useState<Transaction | null>(null);

  // Month and Day names helper
  const monthsNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const formatVal = (num: number) => {
    if (hideValues) return '••••••';
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Date helper functions for filtering
  const isDateInWeek = (dateStr: string, refDateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const ref = new Date(refDateStr + 'T12:00:00');
    
    // Sunday as start of week
    const refDay = ref.getDay();
    const startOfWeek = new Date(ref);
    startOfWeek.setDate(ref.getDate() - refDay);
    startOfWeek.setHours(0,0,0,0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23,59,59,999);
    
    const tTime = date.getTime();
    return tTime >= startOfWeek.getTime() && tTime <= endOfWeek.getTime();
  };

  const isDateInMonth = (dateStr: string, refMonth: number, refYear: number) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.getMonth() === refMonth && date.getFullYear() === refYear;
  };

  const isDateInYear = (dateStr: string, refYear: number) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.getFullYear() === refYear;
  };

  // Filter and Sort Transactions
  const filteredTransactions = transactions.filter(t => {
    // 1. Search filter
    if (search && !t.description.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }

    // 2. Type filter
    if (typeFilter !== 'todos' && t.type !== typeFilter) {
      return false;
    }

    // 3. Category filter
    if (categoryFilter !== 'todas' && t.category !== categoryFilter) {
      return false;
    }

    // 4. Period filter
    if (periodFilter === 'semana') {
      if (!isDateInWeek(t.date, selectedDate)) return false;
    } else if (periodFilter === 'mes') {
      if (!isDateInMonth(t.date, currentMonth, currentYear)) return false;
    } else if (periodFilter === 'ano') {
      if (!isDateInYear(t.date, currentYear)) return false;
    }

    // 5. Account filter
    if (accountFilter !== 'todas' && t.accountId !== accountFilter) {
      return false;
    }

    // 6. Status filter
    if (statusFilter !== 'todos') {
      if (getTransactionEffectiveStatus(t) !== statusFilter) return false;
    }

    return true;
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    const timeA = new Date(a.date + 'T12:00:00').getTime();
    const timeB = new Date(b.date + 'T12:00:00').getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  // Calculate dynamic stats based on filtered set
  const cashTransactions = filteredTransactions.filter(t => t.kind !== 'card_purchase');
  const filteredIncomes = cashTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredExpenses = cashTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredBalance = filteredIncomes - filteredExpenses;

  // Group transactions by category or account/card
  const groupedTransactions = sortedTransactions.reduce((acc, t) => {
    const key = groupMode === 'category' ? t.category : (accounts.find((account) => account.id === t.accountId)?.name || 'Sem conta');
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);
  
  // Sort category names alphabetically
  const categoryNames = Object.keys(groupedTransactions).sort();
  const selectedTransactions = transactions.filter((transaction) => selectedIds.includes(transaction.id));
  
  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  // Toggle transaction completed status
  const handleToggleStatus = (t: Transaction) => {
    if (t.status === 'pending' || t.status === 'scheduled') {
      setTransactionToComplete(t);
    } else {
      setUndoTransaction(t);
      editTransaction({
        ...t,
        status: 'pending'
      });
    }
  };

  const handleConfirmPaymentAccount = (data: { accountId: string, amountPaid: number, paymentDate: string, intendedStatus?: 'completed' | 'scheduled' }) => {
    if (transactionToComplete) {
      if (data.amountPaid === transactionToComplete.amount) setUndoTransaction(transactionToComplete);
      payTransaction(transactionToComplete.id, data.accountId, data.amountPaid, data.paymentDate, data.intendedStatus);
      setTransactionToComplete(null);
    }
  };

  const undoLastStatusChange = () => {
    if (!undoTransaction) return;
    editTransaction(undoTransaction);
    setUndoTransaction(null);
  };

  // Delete handler matching Dashboard design
  const handleDelete = (t: Transaction) => {
    setTransactionToDelete(t);
  };

  const handleConfirmDelete = (option: 'only-this' | 'this-and-future' | 'all-group') => {
    if (transactionToDelete) {
      deleteTransaction(transactionToDelete.id, option);
      setTransactionToDelete(null);
    }
  };

  // Helper to get formatted display date
  const getDisplayDate = (dateStr: string) => {
    const dateObj = new Date(dateStr + 'T12:00:00');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="space-y-6 w-full">
      
      {/* Search and Filters panel */}
      <div className="glass-card rounded-[28px] p-5 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full glass-input rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-accent/50 focus:ring-1 focus:ring-emerald-accent/20 transition-all"
            />
          </div>

          {/* Sort Order and Clear Buttons */}
          <div className="flex gap-2">
            <button 
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="px-4 py-3 glass-card-interactive rounded-2xl text-gray-400 hover:text-white flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider shrink-0"
              title="Mudar ordenação"
            >
              <ArrowUpDown size={14} className="text-emerald-accent" />
              <span>{sortOrder === 'desc' ? 'Mais recentes' : 'Mais antigos'}</span>
            </button>
            
            {(search || periodFilter !== 'todos' || categoryFilter !== 'todas' || typeFilter !== 'todos' || accountFilter !== 'todas' || statusFilter !== 'todos') && (
              <button 
                onClick={() => {
                  setSearch('');
                  setPeriodFilter('todos');
                  setCategoryFilter('todas');
                  setTypeFilter('todos');
                  setAccountFilter('todas');
                  setStatusFilter('todos');
                }}
                className="px-3 py-3 glass-card-interactive rounded-2xl text-pink-accent/80 hover:text-pink-accent text-xs font-bold font-mono uppercase tracking-wider shrink-0"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {/* Filters Selectors Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-2">
          {/* Period Selection */}
          <div className="space-y-1.5">
            <span id="history-period-label" className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold block">Período</span>
            <div role="group" aria-labelledby="history-period-label" className="grid grid-cols-4 gap-1 p-1 glass-input rounded-xl min-h-11 items-center">
              {(['todos', 'semana', 'mes', 'ano'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodFilter(p)}
                  className={`py-1 rounded-lg text-[10px] font-bold uppercase transition select-none tracking-wider ${
                    periodFilter === p 
                      ? 'bg-emerald-accent text-black shadow-md' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {p === 'todos' ? 'Tudo' : p === 'semana' ? 'Sem' : p === 'mes' ? 'Mês' : 'Ano'}
                </button>
              ))}
            </div>
          </div>

          {/* Type Selection */}
          <div className="space-y-1.5">
            <span id="history-type-label" className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold block">Tipo</span>
            <div role="group" aria-labelledby="history-type-label" className="grid grid-cols-3 gap-1 p-1 glass-input rounded-xl min-h-11 items-center">
              {(['todos', 'income', 'expense'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`py-1 rounded-lg text-[10px] font-bold uppercase transition select-none tracking-wider ${
                    typeFilter === t 
                      ? t === 'income' 
                        ? 'bg-emerald-accent text-black shadow-md' 
                        : 'bg-pink-accent text-black shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {t === 'todos' ? 'Todos' : t === 'income' ? 'Rec' : 'Des'}
                </button>
              ))}
            </div>
          </div>

          {/* Category Dropdown Selection */}
          <div className="space-y-1.5">
            <label htmlFor="history-category" className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold block">Categoria</label>
            <div className="relative">
              <select
                id="history-category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full h-[42px] px-3 glass-input rounded-xl text-xs text-white outline-none transition appearance-none cursor-pointer pr-8"
              >
                <option value="todas" className="bg-[#121212] text-white">Todas</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name} className="bg-[#121212] text-white">
                    {cat.name}
                  </option>
                ))}
              </select>
              <Tag size={12} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Account Dropdown Selection */}
          <div className="space-y-1.5">
            <label htmlFor="history-account" className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold block">Conta</label>
            <div className="relative">
              <select
                id="history-account"
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="w-full h-[42px] px-3 glass-input rounded-xl text-xs text-white outline-none transition appearance-none cursor-pointer pr-8"
              >
                <option value="todas" className="bg-[#121212] text-white">Todas as Contas</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id} className="bg-[#121212] text-white">
                    {acc.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none" style={{ backgroundColor: accounts.find(a => a.id === accountFilter)?.color || 'transparent' }}></div>
            </div>
          </div>

          {/* Status Selection */}
          <div className="space-y-1.5">
            <span id="history-status-label" className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold block">Situação</span>
            <div role="group" aria-labelledby="history-status-label" className="grid grid-cols-5 gap-1 p-1 glass-input rounded-xl min-h-11 items-center">
              {(['todos', 'completed', 'pending', 'scheduled', 'overdue'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  aria-pressed={statusFilter === s}
                  className={`py-1 rounded-lg text-[9px] font-bold uppercase transition select-none tracking-wider ${
                    statusFilter === s 
                      ? 'bg-white/10 text-white shadow-md' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {s === 'todos' ? 'Todos' : s === 'completed' ? 'Pago' : s === 'pending' ? 'Pend' : s === 'scheduled' ? 'Agend' : 'Atras'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filtered Statistics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Entradas Filtradas */}
        <div className="glass-card rounded-[24px] p-5 relative overflow-hidden shadow-lg border border-emerald-accent/5">
          <div className="absolute -right-6 -top-6 w-16 h-16 bg-emerald-accent/5 rounded-full blur-xl"></div>
          <p className="text-gray-400 text-[10px] font-mono uppercase tracking-widest mb-1 font-bold">Total Recebido</p>
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-accent" />
            <h3 className="text-xl font-black font-display text-white">
              {formatVal(filteredIncomes)}
            </h3>
          </div>
        </div>

        {/* Saídas Filtradas */}
        <div className="glass-card rounded-[24px] p-5 relative overflow-hidden shadow-lg border border-pink-accent/5">
          <div className="absolute -right-6 -top-6 w-16 h-16 bg-pink-accent/5 rounded-full blur-xl"></div>
          <p className="text-gray-400 text-[10px] font-mono uppercase tracking-widest mb-1 font-bold">Total Pago/Gasto</p>
          <div className="flex items-center gap-2">
            <TrendingDown size={16} className="text-pink-accent" />
            <h3 className="text-xl font-black font-display text-white">
              {formatVal(filteredExpenses)}
            </h3>
          </div>
        </div>

        {/* Balanço Filtrado */}
        <div className="glass-card rounded-[24px] p-5 relative overflow-hidden shadow-lg border border-white/5">
          <p className="text-gray-400 text-[10px] font-mono uppercase tracking-widest mb-1 font-bold">Balanço do Período</p>
          <div className="flex items-center gap-2">
            <Activity size={16} className={filteredBalance >= 0 ? 'text-emerald-accent' : 'text-pink-accent'} />
            <h3 className={`text-xl font-black font-display ${filteredBalance >= 0 ? 'text-emerald-accent' : 'text-pink-accent'}`}>
              {formatVal(filteredBalance)}
            </h3>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">Resultados</h3>
          <span className="text-[10px] font-mono text-gray-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full uppercase">
            {sortedTransactions.length} Lançamentos
          </span>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-[#0f0f13] p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1" role="group" aria-label="Agrupar movimentações">
            {([['category', 'Por categoria'], ['account', 'Por conta/cartão']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={groupMode === value} onClick={() => setGroupMode(value)} className={`min-h-11 rounded-xl px-3 text-xs font-semibold transition ${groupMode === value ? 'bg-[#24242c] text-white' : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'}`}>{label}</button>)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-400">{selectedIds.length ? `${selectedIds.length} selecionada${selectedIds.length === 1 ? '' : 's'}` : 'Selecione uma despesa pendente abaixo'}</span>
            <button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={() => selectedIds.length === 1 ? setTransactionToSimulate(selectedTransactions[0]) : setShowMultiScenario(true)}
              className="min-h-11 rounded-xl bg-[#10b981] px-4 text-xs font-bold text-[#07110e] transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              Criar cenário com a seleção
            </button>
          </div>
        </div>

        {undoTransaction && <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#16161d] p-3"><p className="text-xs text-zinc-300">Situação de “{undoTransaction.description}” alterada.</p><button type="button" onClick={undoLastStatusChange} className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-emerald-300 hover:bg-[#10251f]"><Undo2 size={15} />Desfazer</button></div>}

        {sortedTransactions.length === 0 ? (
          <div className="glass-card border-dashed rounded-[32px] py-16 px-6 text-center shadow-xl flex flex-col items-center justify-center">
            <Inbox size={36} className="text-gray-600 mb-3" />
            <p className="text-sm text-gray-400 font-semibold font-display">Nenhuma transação encontrada</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              Nenhuma movimentação corresponde aos critérios de pesquisa selecionados. Tente ajustar os filtros ou o termo de busca.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {categoryNames.map(cat => {
              const txs = groupedTransactions[cat];
              const isExpanded = expandedCategories[cat];
              const catTotal = txs.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
              const catCount = txs.length;

              return (
                <div key={cat} className="glass-card rounded-[24px] overflow-hidden shadow-sm border border-white/5">
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-dark-bg/50 border border-white/10 flex items-center justify-center">
                        <Tag size={16} className="text-gray-400" />
                      </div>
                      <div className="text-left">
                        <h4 className="text-sm font-bold text-white">{cat}</h4>
                        <span className="text-[10px] text-gray-500 font-mono">{catCount} lançamento{catCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-black font-display ${catTotal >= 0 ? 'text-emerald-accent' : 'text-pink-accent'}`}>
                        {catTotal >= 0 ? '+' : ''}{formatVal(catTotal)}
                      </span>
                      {isExpanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-3 border-t border-white/5 bg-dark-bg/30 space-y-2">
                      {txs.map(t => {
                        const account = accounts.find(a => a.id === t.accountId);
                        const isExpense = t.type === 'expense';
                        const isCompleted = t.status === 'completed';
                        const effectiveStatus = getTransactionEffectiveStatus(t);

                        return (
                          <div 
                            key={t.id}
                            className="bg-dark-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group border border-white/5 hover:border-white/10 transition"
                          >
                            <div className="flex items-start sm:items-center gap-3">
                              {isExpense && !isCompleted && t.kind !== 'card_purchase' && <button type="button" onClick={() => setSelectedIds((current) => current.includes(t.id) ? current.filter((id) => id !== t.id) : [...current, t.id])} aria-label={`${selectedIds.includes(t.id) ? 'Remover' : 'Selecionar'} ${t.description}`} aria-pressed={selectedIds.includes(t.id)} className="min-h-11 min-w-11 rounded-xl text-zinc-400 hover:bg-white/[0.05] hover:text-white">{selectedIds.includes(t.id) ? <CheckSquare size={18} className="mx-auto text-emerald-300" /> : <Square size={18} className="mx-auto" />}</button>}
                              {/* Icon Sphere */}
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 sm:mt-0 ${
                                isExpense 
                                  ? 'bg-pink-accent/5 text-pink-accent border-pink-accent/10' 
                                  : 'bg-emerald-accent/5 text-emerald-accent border-emerald-accent/10'
                              }`}>
                                {isExpense ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                              </div>

                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-sm font-bold text-white tracking-tight">{t.description}</h4>
                                  {t.isFixed && (
                                    <span className="text-[9px] font-mono bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded-md border border-indigo-500/15">Fixo</span>
                                  )}
                                  {t.isInstallment && t.installmentInfo && (
                                    <span className="text-[9px] font-mono bg-pink-accent/10 text-pink-accent px-1.5 py-0.5 rounded-md border border-pink-accent/15">
                                      {t.installmentInfo.current}/{t.installmentInfo.total}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-2">
                                  {/* Display Date */}
                                  <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
                                    <Calendar size={10} className="text-gray-500" />
                                    <span>{getDisplayDate(t.date)}</span>
                                  </div>
                                  {account && (
                                    <>
                                      <span className="text-gray-600 text-[10px] hidden sm:inline">•</span>
                                      {/* Display Account */}
                                      <span 
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-md inline-flex items-center gap-1"
                                        style={{ color: account.color, backgroundColor: `${account.color}18` }}
                                      >
                                        {account.type === 'credit' ? '💳 ' : ''}{account.name}{account.bank && account.bank !== account.name ? ` (${account.bank})` : ''}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-white/5 pt-3 sm:border-t-0 sm:pt-0">
                              {/* Amount & Status info */}
                              <div className="text-left sm:text-right flex flex-col items-start sm:items-end">
                                {t.originalAmount && t.originalAmount !== t.amount && (
                                  <span className="text-[10px] text-gray-500 line-through mb-0.5" title={`Valor original: ${formatVal(t.originalAmount)}`}>
                                    {formatVal(t.originalAmount)}
                                  </span>
                                )}
                                <p className={`text-sm font-black font-display ${isExpense ? 'text-pink-accent' : 'text-emerald-accent'}`}>
                                  {isExpense ? '-' : '+'} {formatVal(t.amount)}
                                </p>
                                
                                <button 
                                  onClick={() => handleToggleStatus(t)}
                                  disabled={t.kind === 'card_purchase'}
                                  className={`text-[9px] font-mono font-bold mt-0.5 px-1.5 py-0.5 rounded-md transition ${
                                    t.kind === 'card_purchase'
                                      ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 cursor-default'
                                    : effectiveStatus === 'completed'
                                      ? 'bg-emerald-accent/10 text-emerald-accent border border-emerald-accent/15'
                                      : effectiveStatus === 'overdue'
                                        ? 'bg-[#281419] text-rose-300 border border-rose-500/25'
                                      : effectiveStatus === 'scheduled'
                                        ? 'bg-blue-500/10 text-blue-500 border border-blue-500/15'
                                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/15'
                                  }`}
                                  title={t.kind === 'card_purchase' ? 'O pagamento é controlado pela fatura' : 'Clique para alternar situação'}
                                >
                                  {t.kind === 'card_purchase' ? 'NA FATURA' : effectiveStatus === 'completed' ? 'PAGO' : effectiveStatus === 'overdue' ? 'ATRASADO' : effectiveStatus === 'scheduled' ? 'AGENDADO' : 'PENDENTE'}
                                </button>
                              </div>

                              {/* Action controls */}
                              <div className="flex items-center gap-1">
                                {isExpense && !isCompleted && (
                                  <button
                                    onClick={() => setTransactionToSimulate(t)}
                                    className="min-h-11 min-w-11 p-2 hover:bg-[#10251f] text-zinc-400 hover:text-emerald-300 rounded-lg transition"
                                    title="Simular pagamento"
                                    aria-label={`Simular pagamento de ${t.description}`}
                                  >
                                    <Activity size={14} aria-hidden="true" />
                                    <span className="hidden lg:inline text-[10px] font-semibold">Simular</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => onEditTransaction(t)}
                                  className="min-h-11 min-w-11 p-2 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
                                  title="Editar"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDelete(t)}
                                  className="min-h-11 min-w-11 p-2 hover:bg-white/5 text-gray-400 hover:text-pink-accent rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70"
                                  title="Excluir"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
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
        )}
      </div>

          <ConfirmDeleteModal
        isOpen={!!transactionToDelete}
        transaction={transactionToDelete}
        onClose={() => setTransactionToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      <SelectAccountModal
        isOpen={!!transactionToComplete}
        transaction={transactionToComplete}
        onClose={() => setTransactionToComplete(null)}
        onConfirm={handleConfirmPaymentAccount}
      />
      <ScenarioPlannerModal
        isOpen={!!transactionToSimulate}
        transaction={transactionToSimulate}
        onClose={() => setTransactionToSimulate(null)}
      />
      <MultiScenarioPlannerModal isOpen={showMultiScenario} transactions={selectedTransactions} onClose={() => setShowMultiScenario(false)} />
    </div>
  );
}
