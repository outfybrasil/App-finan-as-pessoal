import React, { useState } from 'react';
import { Transaction, Budget } from '../types';
import { Wallet, TrendingUp, TrendingDown, AlertTriangle, ChevronLeft, ChevronRight, Calendar, Edit2, Filter } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
  budgets: Budget[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onEditTransaction: (t: Transaction) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  budgets, 
  currentMonth, 
  onMonthChange,
  onEditTransaction
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

  // Totals calculations (always based on full month data)
  const totalBalance = transactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0);
  const monthlyIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const monthlyExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

  // Group expenses by category for chart
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

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header & Month Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-white">Olá, Investidor</h1>
          <p className="text-slate-400">Resumo financeiro de {formatMonth(currentMonth)}.</p>
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
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={64} className="text-emerald-500" />
          </div>
          <p className="text-slate-400 text-sm font-medium">Saldo do Mês</p>
          <h2 className="text-3xl font-bold text-white mt-1">
            R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
          <div className="mt-4 flex items-center text-xs text-emerald-400 bg-emerald-500/10 w-fit px-2 py-1 rounded-full">
            <TrendingUp size={12} className="mr-1" />
            <span>Fluxo Mensal</span>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm font-medium">Receitas</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                + R$ {monthlyIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <TrendingUp size={24} className="text-emerald-500" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm font-medium">Despesas</p>
              <h3 className="text-2xl font-bold text-rose-400 mt-1">
                - R$ {monthlyExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2 bg-rose-500/20 rounded-lg">
              <TrendingDown size={24} className="text-rose-500" />
            </div>
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
            {displayedTransactions.map(t => (
              <button 
                key={t.id} 
                onClick={() => onEditTransaction(t)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-750 transition-colors border border-transparent hover:border-slate-700 group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${t.type === 'income' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                    {t.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-200 truncate pr-2 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                        {t.description}
                        <Edit2 size={12} className="opacity-0 group-hover:opacity-100 text-slate-500" />
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                        {new Date(t.date).toLocaleDateString('pt-BR')} • {t.category}
                        {t.isRecurring && <span className="bg-slate-700 text-[10px] px-1.5 rounded text-slate-300 ml-1">Fixo</span>}
                    </p>
                  </div>
                </div>
                <span className={`font-bold whitespace-nowrap ${t.type === 'income' ? 'text-emerald-400' : 'text-slate-200'}`}>
                  {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </button>
            ))}
            {displayedTransactions.length === 0 && (
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
                 <span className="text-slate-500 text-xs uppercase font-medium tracking-wider">Total</span>
                 <p 
                    className="text-white font-bold text-lg md:text-xl truncate"
                    title={`R$ ${monthlyExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                 >
                    R$ {monthlyExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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