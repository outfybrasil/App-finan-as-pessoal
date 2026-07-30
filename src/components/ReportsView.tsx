import { useState } from 'react';
import { useFinanceStore } from '../store';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, BarChart3, PieChart, Layers } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ReportsView() {
  const { transactions, hideValues } = useFinanceStore();
  const [selectedYear, setSelectedYear] = useState(2026);

  const monthsShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthsFull = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Year selector triggers
  const handlePrevYear = () => setSelectedYear(selectedYear - 1);
  const handleNextYear = () => setSelectedYear(selectedYear + 1);

  // Helper to format currency
  const formatVal = (num: number) => {
    if (hideValues) return '••••••';
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Filter transactions for selected year
  const yearlyTransactions = transactions.filter(t => {
    return new Date(t.date + 'T12:00:00').getFullYear() === selectedYear;
  });

  // Totals
  const totalIncome = yearlyTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = yearlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  // Compile monthly data for Recharts (dual bars: Income vs Expense)
  const monthlyChartData = monthsShort.map((month, idx) => {
    const monthTrans = yearlyTransactions.filter(t => {
      const date = new Date(t.date + 'T12:00:00');
      return date.getMonth() === idx;
    });

    const income = monthTrans
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = monthTrans
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      name: month,
      Entradas: Math.round(income * 100) / 100,
      Saídas: Math.round(expense * 100) / 100
    };
  });

  // Category breakdown calculations (expense only)
  const categoryExpenses: { [key: string]: number } = {};
  yearlyTransactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
    });

  const sortedCategoryExpenses = Object.entries(categoryExpenses)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const totalCategoryExpensesSum = sortedCategoryExpenses.reduce((sum, item) => sum + item.amount, 0);

  // Recharts custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#121212] border border-[#222222] p-4 rounded-2xl shadow-xl font-sans text-xs">
          <p className="text-gray-400 font-mono mb-1.5">{label} de {selectedYear}</p>
          <p className="text-emerald-accent font-medium flex justify-between gap-6 mb-1">
            <span>Receitas:</span>
            <span className="font-bold font-mono">{formatVal(payload[0].value)}</span>
          </p>
          <p className="text-pink-accent font-medium flex justify-between gap-6">
            <span>Despesas:</span>
            <span className="font-bold font-mono">{formatVal(payload[1].value)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      
      {/* Year Selector Row */}
      <div className="flex items-center justify-between glass-card p-2.5 rounded-2xl">
        <button 
          onClick={handlePrevYear}
          className="p-2 hover:bg-dark-bg rounded-xl text-gray-400 hover:text-white transition"
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="flex items-center gap-2 font-display font-bold text-white text-base">
          <span>Relatório de</span>
          <span className="bg-emerald-accent/10 border border-emerald-accent/15 px-3 py-0.5 rounded-lg text-emerald-accent">{selectedYear}</span>
        </div>
        
        <button 
          onClick={handleNextYear}
          className="p-2 hover:bg-dark-bg rounded-xl text-gray-400 hover:text-white transition"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Annual KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Receita Anual */}
        <div className="glass-card rounded-[24px] p-5 relative overflow-hidden">
          <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-1.5 font-bold">Receita Anual</p>
          <h3 className="text-2xl font-black font-display text-white">
            {formatVal(totalIncome)}
          </h3>
          <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-emerald-accent/5 rounded-full blur-xl"></div>
        </div>

        {/* Despesa Anual */}
        <div className="glass-card rounded-[24px] p-5 relative overflow-hidden">
          <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-1.5 font-bold">Despesa Anual</p>
          <h3 className="text-2xl font-black font-display text-white">
            {formatVal(totalExpense)}
          </h3>
          <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-pink-accent/5 rounded-full blur-xl"></div>
        </div>

        {/* Balanço Final */}
        <div className="glass-card rounded-[24px] p-5 relative overflow-hidden">
          <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-1.5 font-bold">Balanço Final</p>
          <h3 className={`text-2xl font-black font-display ${balance >= 0 ? 'text-emerald-accent' : 'text-pink-accent'}`}>
            {formatVal(balance)}
          </h3>
          <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-blue-500/5 rounded-full blur-xl"></div>
        </div>
      </div>

      {/* Dual Bar Chart Comparison */}
      <div className="glass-card rounded-[28px] p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-emerald-accent" />
            <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">Comparativo de Fluxo</h3>
          </div>
          <span className="text-[10px] text-gray-400 font-mono bg-[#1a1a1a] px-2 py-0.5 rounded">Mês a Mês</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyChartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <XAxis 
                dataKey="name" 
                stroke="#555555" 
                fontSize={9} 
                tickLine={false} 
                axisLine={false}
                fontFamily="JetBrains Mono"
              />
              <YAxis 
                stroke="#555555" 
                fontSize={9} 
                tickLine={false} 
                axisLine={false}
                fontFamily="JetBrains Mono"
                tickFormatter={(v) => `R$ ${v}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                iconSize={8}
                iconType="circle"
                wrapperStyle={{ fontSize: 9, fontFamily: 'JetBrains Mono', paddingTop: 10 }}
              />
              <Bar dataKey="Entradas" fill="#00C896" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Saídas" fill="#FF3B6A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Expense Breakdown */}
      <div className="glass-card rounded-[28px] p-5 space-y-4.5 shadow-xl">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-pink-accent" />
          <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">Gastos por Categoria</h3>
        </div>

        {sortedCategoryExpenses.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-6">Nenhum gasto registrado neste ano.</p>
        ) : (
          <div className="space-y-3.5">
            {sortedCategoryExpenses.map((catItem, idx) => {
              const percent = totalCategoryExpensesSum > 0 
                ? Math.round((catItem.amount / totalCategoryExpensesSum) * 100) 
                : 0;

              return (
                <div key={catItem.category} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-white tracking-tight">{catItem.category}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-gray-400 font-bold">{formatVal(catItem.amount)}</span>
                      <span className="text-gray-600">({percent}%)</span>
                    </div>
                  </div>
                  
                  {/* Progress Line */}
                  <div className="w-full bg-dark-bg h-1.5 rounded-full overflow-hidden border border-dark-border">
                    <div 
                      className="bg-pink-accent h-full rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
