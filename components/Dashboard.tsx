import React, { useState } from 'react';
import { Transaction, Budget } from '../types';
import { Wallet, TrendingUp, TrendingDown, AlertTriangle, ChevronLeft, ChevronRight, Edit2, CheckCircle2, Clock, PiggyBank } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
  budgets: Budget[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onEditTransaction: (t: Transaction) => void;
  onToggleStatus?: (t: Transaction) => void;
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
  // Adicionado tipo 'pending' ao estado
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'pending'>('all');

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

  const checkPaid = (t: Transaction) => t.isPaid !== false;

  // --- CALCULATIONS ---
  const currentIncome = transactions
    .filter(t => t.type === 'income' && checkPaid(t))
    .reduce((acc, t) => acc + t.amount, 0);

  const currentExpense = transactions
    .filter(t => t.type === 'expense' && checkPaid(t))
    .reduce((acc, t) => acc + t.amount, 0);

  const currentBalance = currentIncome - currentExpense;

  const pendingIncome = transactions
    .filter(t => t.type === 'income' && !checkPaid(t))
    .reduce((acc, t) => acc + t.amount, 0);

  const pendingExpense = transactions
    .filter(t => t.type === 'expense' && !checkPaid(t))
    .reduce((acc, t) => acc + t.amount, 0);

  const projectedBalance = (currentIncome + pendingIncome) - (currentExpense + pendingExpense);

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

  // Lógica de filtro atualizada
  const displayedTransactions = transactions.filter(t => {
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

  const privacyClass = privacyMode ? "blur-md select-none opacity-50" : "";
  const privacyClassText = privacyMode ? "text-transparent bg-white/20 rounded blur-sm select-none" : "";

  return (
    <div className="space-y-8 pb-24 md:pb-0">
      
      {/* Header & Month Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Visão Geral</h1>
          <p className="text-slate-400 mt-1">Acompanhe sua saúde financeira.</p>
        </div>
        
        <div className="flex items-center bg-slate-900/50 backdrop-blur-sm rounded-2xl p-1.5 border border-slate-800 shadow-xl">
          <button onClick={prevMonth} className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all">
            <ChevronLeft size={20} />
          </button>
          <div className="px-6 flex items-center gap-2 font-semibold text-slate-200 min-w-[160px] justify-center text-lg">
            {formatMonth(currentMonth)}
          </div>
          <button onClick={nextMonth} className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Hero Section - Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Main Balance Card */}
        <div className="md:col-span-6 relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 shadow-2xl shadow-emerald-900/20 group">
          <div className="absolute top-0 right-0 p-8 opacity-10 transform group-hover:scale-110 transition-transform duration-700">
            <Wallet size={120} className="text-white" />
          </div>
          
          <div className="relative p-8 h-full flex flex-col justify-between z-10">
            <div>
              <div className="flex items-center gap-2 text-emerald-100 mb-2">
                <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md">
                   <Wallet size={18} />
                </div>
                <span className="font-medium">Saldo em Conta</span>
              </div>
              <h2 className={`text-4xl md:text-5xl font-bold text-white tracking-tight mt-2 ${privacyClass}`}>
                R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h2>
            </div>
            
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
               <div>
                  <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider mb-1">Previsão de Fechamento</p>
                  <p className={`text-xl font-bold text-white ${privacyClass}`}>
                    R$ {projectedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
               </div>
               <div className="text-right">
                  {currentBalance > 0 && (
                     <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white backdrop-blur-md border border-white/10">
                        <TrendingUp size={14} /> Positivo
                     </span>
                  )}
               </div>
            </div>
          </div>
        </div>

        {/* Secondary Cards Column */}
        <div className="md:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Income Card */}
            <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 flex flex-col justify-between hover:border-emerald-500/30 transition-colors group">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                   <TrendingUp size={24} />
                </div>
                {pendingIncome > 0 && (
                   <span className="text-[10px] bg-slate-800 px-2 py-1 rounded-full text-slate-400 border border-slate-700">
                     + R$ {pendingIncome.toLocaleString('pt-BR', { compactDisplay: 'short', notation: 'compact' })} pendente
                   </span>
                )}
              </div>
              <div>
                <p className="text-slate-400 text-sm font-medium mt-4">Entradas</p>
                <h3 className={`text-2xl font-bold text-emerald-400 mt-1 ${privacyClassText}`}>
                  R$ {currentIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
              </div>
            </div>

            {/* Expense Card */}
            <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 flex flex-col justify-between hover:border-rose-500/30 transition-colors group">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-all">
                   <TrendingDown size={24} />
                </div>
                {pendingExpense > 0 && (
                   <span className="text-[10px] bg-slate-800 px-2 py-1 rounded-full text-slate-400 border border-slate-700">
                     + R$ {pendingExpense.toLocaleString('pt-BR', { compactDisplay: 'short', notation: 'compact' })} pendente
                   </span>
                )}
              </div>
              <div>
                <p className="text-slate-400 text-sm font-medium mt-4">Saídas</p>
                <h3 className={`text-2xl font-bold text-rose-400 mt-1 ${privacyClassText}`}>
                  R$ {currentExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
              </div>
            </div>
            
            {/* Budget Summary Mini-Card */}
            <div className="sm:col-span-2 bg-slate-800/30 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-700 rounded-xl text-slate-300">
                      <PiggyBank size={20} />
                  </div>
                  <div>
                      <p className="text-sm font-medium text-slate-200">Economia do Mês</p>
                      <p className="text-xs text-slate-500">Receitas - Despesas</p>
                  </div>
               </div>
               <span className={`font-bold text-lg ${currentBalance >= 0 ? 'text-white' : 'text-rose-400'} ${privacyClassText}`}>
                   {((currentIncome - currentExpense) / (currentIncome || 1) * 100).toFixed(0)}%
               </span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Transactions List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between mb-2">
             <h3 className="text-xl font-bold text-white">Últimas Movimentações</h3>
             <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                {/* Botões de Filtro Atualizados */}
                {(['all', 'income', 'expense', 'pending'] as const).map(type => (
                    <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${
                            filterType === type 
                            ? 'bg-slate-700 text-white shadow-sm' 
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        {type === 'all' ? 'Tudo' : type === 'income' ? 'Entradas' : type === 'expense' ? 'Saídas' : 'Pendentes'}
                    </button>
                ))}
             </div>
          </div>

          {/* Container Scrollável para as transações */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {sortedTransactions.map(t => { // Removido .slice(0, 10)
              const isPaid = checkPaid(t); 
              return (
              <div 
                key={t.id} 
                className={`group flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 
                    ${isPaid 
                        ? 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-lg hover:shadow-black/20' 
                        : 'bg-slate-900/40 border-slate-800/50 border-dashed opacity-80'
                    }`}
              >
                <div 
                   onClick={() => onEditTransaction(t)}
                   className="flex items-center gap-4 flex-1 cursor-pointer"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors 
                      ${t.type === 'income' 
                          ? 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white' 
                          : 'bg-rose-500/10 text-rose-500 group-hover:bg-rose-500 group-hover:text-white'
                      } ${!isPaid ? 'grayscale opacity-50' : ''}`}>
                    
                    {t.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  </div>
                  
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className={`font-semibold truncate text-base ${isPaid ? 'text-slate-100' : 'text-slate-400'}`}>
                            {t.description}
                        </p>
                        {!isPaid && (
                            <Clock size={12} className="text-amber-500" />
                        )}
                        {t.isRecurring && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-wide">Fixo</span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {formatDateDisplay(t.date)} • {t.category}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                    <span 
                        onClick={() => onEditTransaction(t)}
                        className={`font-bold text-base cursor-pointer ${
                            !isPaid ? 'text-slate-500' :
                            privacyMode ? privacyClassText : 
                            (t.type === 'income' ? 'text-emerald-400' : 'text-slate-200')
                        }`}
                    >
                      {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    
                    {/* Botão sutil de status */}
                    {onToggleStatus && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggleStatus(t); }}
                            className={`text-xs flex items-center gap-1 transition-colors ${
                                isPaid 
                                ? 'text-emerald-500/0 group-hover:text-emerald-500/50 hover:!text-emerald-500' 
                                : 'text-amber-500 hover:text-emerald-400'
                            }`}
                        >
                            {isPaid ? <CheckCircle2 size={12} /> : <span className="flex items-center gap-1">Pendente <CheckCircle2 size={12}/></span>}
                        </button>
                    )}
                </div>
              </div>
            )})}
            
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
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-6">Para onde vai o dinheiro?</h3>
                
                {chartData.length > 0 ? (
                    <div className="h-[280px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={90}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                            >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                            </Pie>
                            <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)' }}
                            itemStyle={{ color: '#f1f5f9', fontSize: '12px' }}
                            formatter={(value: number) => `R$ ${value.toLocaleString()}`}
                            />
                        </PieChart>
                        </ResponsiveContainer>
                        
                        {/* Center Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                            <span className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Total Saídas</span>
                            <p className={`text-white font-bold text-xl ${privacyClassText}`}>
                                R$ {(currentExpense + pendingExpense).toLocaleString('pt-BR', { notation: 'compact' })}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="h-[280px] flex items-center justify-center text-slate-500 text-sm italic">
                        Sem dados de despesa para exibir.
                    </div>
                )}

                {/* Categories Legend */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                    {chartData.slice(0, 4).map((entry, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-400">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                            <span className="truncate">{entry.name}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Alerts */}
            {budgets.some(b => b.spent > b.limit * 0.9) && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3 animate-pulse">
                <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={20} />
                <div>
                    <p className="text-sm font-bold text-rose-400">Orçamento Crítico</p>
                    <p className="text-xs text-rose-200/70 mt-1">Algumas categorias estão próximas do limite definido.</p>
                </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};