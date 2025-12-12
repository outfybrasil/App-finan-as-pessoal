import React, { useState } from 'react';
import { Transaction, Budget } from '../types';
import { Wallet, TrendingUp, TrendingDown, AlertTriangle, ChevronLeft, ChevronRight, Calendar, Edit2, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
  budgets: Budget[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onEditTransaction: (t: Transaction) => void;
  onToggleStatus?: (t: Transaction) => void; // New prop for toggling status
  privacyMode?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  budgets, 
  currentMonth, 
  onMonthChange,
  onEditTransaction,
  onToggleStatus,
  privacyMode = false
}) => {
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  // Navigation handlers
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
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  // Helper para formatar data sem timezone shift (YYYY-MM-DD -> DD/MM/YYYY)
  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  // Helper to check payment status (handles legacy data where isPaid might be undefined)
  const checkPaid = (t: Transaction) => t.isPaid !== false;

  // --- CALCULATIONS ---

  // 1. Current Balance (Actual money in hand - Only Paid)
  const currentIncome = transactions
    .filter(t => t.type === 'income' && checkPaid(t))
    .reduce((acc, t) => acc + t.amount, 0);

  const currentExpense = transactions
    .filter(t => t.type === 'expense' && checkPaid(t))
    .reduce((acc, t) => acc + t.amount, 0);

  const currentBalance = currentIncome - currentExpense;

  // 2. Pending Amounts
  const pendingIncome = transactions
    .filter(t => t.type === 'income' && !checkPaid(t))
    .reduce((acc, t) => acc + t.amount, 0);

  const pendingExpense = transactions
    .filter(t => t.type === 'expense' && !checkPaid(t))
    .reduce((acc, t) => acc + t.amount, 0);

  // 3. Projected Totals (Actual + Pending)
  const projectedBalance = (currentIncome + pendingIncome) - (currentExpense + pendingExpense);

  // Group expenses by category for chart (Shows TOTAL expenses: Paid + Pending to help budgeting)
  const expensesByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const chartData = Object.keys(expensesByCategory).map(key => ({
    name: key,
    value: expensesByCategory[key]
  }));

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Filtered List Logic
  const displayedTransactions = transactions.filter(t => {
      if (filterType === 'all') return true;
      return t.type === filterType;
  });

  // Sorting Logic: 
  // 1. Separate by Type (Income first, then Expense)
  // 2. Alphabetical by Description
  const sortedTransactions = [...displayedTransactions].sort((a, b) => {
      // Sort by date desc first
      if (a.date !== b.date) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (a.type !== b.type) {
          return a.type === 'income' ? -1 : 1;
      }
      return a.description.localeCompare(b.description);
  });

  // Helper styles for privacy
  const privacyClass = privacyMode ? "blur-md select-none bg-slate-700/50 rounded-lg text-transparent animate-pulse" : "";
  const privacyClassSm = privacyMode ? "blur-sm select-none bg-slate-700/50 rounded text-transparent" : "";

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header & Month Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-white">Olá, Gustavo</h1>
          <p className="text-slate-400">Fluxo de caixa de {formatMonth(currentMonth)}.</p>
        </div>
        
        <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="px-4 flex items-center gap-2 font-medium text-slate-200 min-w-[140px] justify-center capitalize">
            <Calendar size={16} className="text-emerald-500" />
            {formatMonth(currentMonth)}
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Main Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Saldo Atual (Realizado) */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 relative overflow-hidden group flex flex-col justify-between h-full">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={64} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-slate-400 text-sm font-medium">Saldo Atual (Realizado)</p>
            <h2 className={`text-3xl font-bold text-white mt-1 w-fit ${privacyClass}`}>
              R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700/50">
             <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Previsão final:</span>
                <span className={`font-medium ${privacyClassSm} ${projectedBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    R$ {projectedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
             </div>
          </div>
        </div>

        {/* Card 2: Receitas (Realizado vs Pendente) */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col justify-between h-full">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm font-medium">Recebido</p>
              <h3 className={`text-2xl font-bold text-emerald-400 mt-1 w-fit ${privacyClass}`}>
                + R$ {currentIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <TrendingUp size={24} className="text-emerald-500" />
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
             <Clock size={12} />
             <span>A receber: <span className={`text-slate-300 ${privacyClassSm}`}>R$ {pendingIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></span>
          </div>
        </div>

        {/* Card 3: Despesas (Pago vs Pendente) */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col justify-between h-full">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm font-medium">Pago</p>
              <h3 className={`text-2xl font-bold text-rose-400 mt-1 w-fit ${privacyClass}`}>
                - R$ {currentExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2 bg-rose-500/20 rounded-lg">
              <TrendingDown size={24} className="text-rose-500" />
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
             <Clock size={12} />
             <span>A pagar: <span className={`text-slate-300 ${privacyClassSm}`}>R$ {pendingExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
             <h3 className="text-lg font-bold text-white">Movimentações</h3>
             
             {/* Filters */}
             <div className="flex p-1 bg-slate-900 rounded-lg">
                <button 
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filterType === 'all' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                    Todos
                </button>
                <button 
                    onClick={() => setFilterType('income')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filterType === 'income' ? 'bg-emerald-500/20 text-emerald-500 shadow border border-emerald-500/20' : 'text-slate-400 hover:text-emerald-400'}`}
                >
                    Receitas
                </button>
                <button 
                    onClick={() => setFilterType('expense')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filterType === 'expense' ? 'bg-rose-500/20 text-rose-500 shadow border border-rose-500/20' : 'text-slate-400 hover:text-rose-400'}`}
                >
                    Despesas
                </button>
             </div>
          </div>

          <div className="space-y-3">
            {sortedTransactions.map(t => {
              const isPaid = checkPaid(t); 
              return (
              <div 
                key={t.id} 
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border group text-left ${isPaid ? 'bg-slate-800 border-transparent hover:bg-slate-750' : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50'}`}
              >
                <div 
                   onClick={() => onEditTransaction(t)}
                   className="flex items-center gap-4 flex-1 cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 relative ${
                      !isPaid ? 'opacity-50 grayscale' : ''
                    } ${t.type === 'income' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                    {t.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    
                    {/* Status Indicator Icon */}
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-800 flex items-center justify-center ${
                        isPaid ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'
                    }`}>
                        {isPaid ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                    </div>
                  </div>
                  
                  <div className="min-w-0">
                    <p className={`font-medium truncate pr-2 flex items-center gap-2 ${isPaid ? 'text-slate-200 group-hover:text-emerald-400' : 'text-slate-400'}`}>
                        {t.description}
                        <Edit2 size={12} className="opacity-0 group-hover:opacity-100 text-slate-500" />
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                        {formatDateDisplay(t.date)} • {t.category}
                        {t.isRecurring && <span className="bg-slate-700 text-[10px] px-1.5 rounded text-slate-300 ml-1">Fixo</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                    <span 
                        onClick={() => onEditTransaction(t)}
                        className={`font-bold whitespace-nowrap cursor-pointer ${
                            !isPaid ? 'text-slate-500' :
                            privacyMode ? 'blur-sm select-none bg-slate-700/50 text-transparent rounded px-1' : 
                            (t.type === 'income' ? 'text-emerald-400' : 'text-slate-200')
                        }`}
                    >
                      {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    
                    {/* Status Toggle Button */}
                    {onToggleStatus && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggleStatus(t); }}
                            className={`p-2 rounded-lg transition-colors ${
                                isPaid 
                                ? 'text-emerald-500 hover:bg-emerald-500/10' 
                                : 'text-slate-500 hover:text-emerald-400 hover:bg-slate-700'
                            }`}
                            title={isPaid ? "Marcar como pendente" : "Marcar como pago"}
                        >
                            {isPaid ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                        </button>
                    )}
                </div>
              </div>
            )})}
            {sortedTransactions.length === 0 && (
              <div className="text-center py-8">
                <p className="text-slate-500 mb-2">
                    {filterType === 'all' 
                        ? 'Nenhuma transação neste mês.' 
                        : filterType === 'income' 
                            ? 'Nenhuma receita encontrada.' 
                            : 'Nenhuma despesa encontrada.'}
                </p>
                {filterType === 'all' && <p className="text-xs text-slate-600">Altere o mês acima ou adicione um novo registro.</p>}
              </div>
            )}
          </div>
        </div>

        {/* Budget Status & Chart */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4">Distribuição de Gastos</h3>
          {/* Changed container to have explicit height instead of flex-1 to solve Recharts warning */}
          <div className="h-[300px] w-full relative">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                  itemStyle={{ color: '#f1f5f9' }}
                  formatter={(value: number) => `R$ ${value.toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Text - Fixed Layout */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
              <div className="text-center w-full max-w-[120px]">
                 <span className="text-slate-500 text-xs uppercase font-medium tracking-wider">Total (Prev.)</span>
                 <p 
                    className={`text-white font-bold text-lg md:text-xl truncate ${privacyMode ? 'blur-sm select-none bg-slate-700/50 text-transparent rounded px-1' : ''}`}
                    title={`R$ ${(currentExpense + pendingExpense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                 >
                    R$ {(currentExpense + pendingExpense).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                 </p>
              </div>
            </div>
          </div>
          
          {/* Critical Budget Warning */}
          {budgets.some(b => b.spent > b.limit * 0.9) && (
            <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-3">
              <AlertTriangle className="text-rose-500" size={20} />
              <p className="text-sm text-rose-200">Atenção: Algumas categorias estão próximas do limite.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};