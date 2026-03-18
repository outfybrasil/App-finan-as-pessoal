import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell } from 'recharts';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown, Wallet, BarChart3, Info } from 'lucide-react';

interface ReportsProps {
  transactions: Transaction[];
}

export const Reports: React.FC<ReportsProps> = ({ transactions }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // 1. Processar dados apenas para o ano selecionado
  const { chartData, yearTotals } = useMemo(() => {
    // Inicializar os 12 meses do ano
    const data = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(selectedYear, i, 1);
        const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
        return {
            name: monthName.charAt(0).toUpperCase() + monthName.slice(1), // Jan, Fev...
            income: 0,
            expense: 0,
            monthIndex: i
        };
    });

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
        if (t.category === 'Ajuste') return;

        const tDate = new Date(t.date);
        const year = tDate.getUTCFullYear();
        const month = tDate.getUTCMonth();

        if (year === selectedYear) {
            if (t.type === 'income') {
                data[month].income += t.amount;
                totalIncome += t.amount;
            } else {
                data[month].expense += t.amount;
                totalExpense += t.amount;
            }
        }
    });

    return { 
        chartData: data, 
        yearTotals: { 
            income: totalIncome, 
            expense: totalExpense, 
            balance: totalIncome - totalExpense 
        } 
    };

  }, [transactions, selectedYear]);

  const handlePrevYear = () => setSelectedYear(prev => prev - 1);
  const handleNextYear = () => setSelectedYear(prev => prev + 1);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header com Navegação de Ano */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full group-hover:bg-blue-500/30 transition-all" />
            <div className="relative p-5 bg-slate-900/40 backdrop-blur-xl rounded-[1.8rem] border border-white/10 text-blue-400 shadow-2xl group-hover:scale-105 transition-transform">
              <BarChart3 size={32} className="stroke-[1.5]" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none">
              Relatórios <span className="text-blue-500">Anuais</span>
            </h1>
            <p className="text-slate-500 font-bold mt-2 tracking-wide uppercase text-[10px] opacity-70">Análise de desempenho e fluxo de caixa</p>
          </div>
        </div>
          
        <div className="flex items-center bg-slate-900/40 backdrop-blur-xl p-2 rounded-[2rem] border border-white/10 shadow-2xl">
          <button 
            onClick={handlePrevYear} 
            className="p-4 hover:bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all active:scale-90"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="px-8 flex items-center gap-4 font-black text-2xl text-white min-w-[160px] justify-center tracking-tighter">
            <Calendar size={20} className="text-blue-500" />
            {selectedYear}
          </div>
          <button 
            onClick={handleNextYear} 
            className="p-4 hover:bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all active:scale-90"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </header>

      {/* Cards de Resumo do Ano */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-3xl border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
              <TrendingUp size={80} />
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500"><TrendingUp size={20}/></div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Receita Anual</p>
            </div>
            <p className="text-3xl font-black text-white tracking-tighter">
              R$ {yearTotals.income.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
            </p>
          </div>

          <div className="glass-card p-6 rounded-3xl border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
              <TrendingDown size={80} />
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500"><TrendingDown size={20}/></div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Despesa Anual</p>
            </div>
            <p className="text-3xl font-black text-white tracking-tighter">
              R$ {yearTotals.expense.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
            </p>
          </div>

          <div className="glass-card p-6 rounded-3xl border-white/5 relative overflow-hidden group bg-gradient-to-br from-white/[0.02] to-transparent">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
              <Wallet size={80} />
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500"><Wallet size={20}/></div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Balanço Final</p>
            </div>
            <p className={`text-3xl font-black tracking-tighter ${yearTotals.balance >= 0 ? 'text-white' : 'text-rose-400'}`}>
              R$ {yearTotals.balance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
            </p>
          </div>
      </div>
      
      {/* Gráfico */}
      <div className="glass-card p-8 rounded-[2.5rem] border-white/10 h-[500px] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between mb-8 shrink-0">
          <h3 className="text-xl font-black text-white tracking-tight uppercase">Fluxo de Caixa Mensal</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Receitas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Despesas</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#475569" 
                      fontSize={11} 
                      tickMargin={15} 
                      axisLine={false}
                      tickLine={false}
                      fontFamily="Inter, sans-serif"
                      fontWeight="700"
                    />
                    <YAxis 
                      stroke="#475569" 
                      fontSize={11} 
                      tickFormatter={(val) => `R$${val/1000}k`} 
                      axisLine={false}
                      tickLine={false}
                      fontFamily="Inter, sans-serif"
                      fontWeight="700"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        borderRadius: '1.5rem',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        color: '#f1f5f9',
                        padding: '16px'
                      }}
                      itemStyle={{ fontFamily: 'Inter, sans-serif', fontWeight: '900', fontSize: '14px', textTransform: 'uppercase' }}
                      labelStyle={{ marginBottom: '8px', opacity: 0.5, fontWeight: '900', fontSize: '10px', textTransform: 'uppercase' }}
                      cursor={{ fill: 'rgba(255,255,255,0.02)', radius: 16 }}
                      formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
                    />
                    <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[8, 8, 8, 8]} maxBarSize={32}>
                      {chartData.map((_entry, index) => (
                        <Cell key={`cell-income-${index}`} fillOpacity={0.8} />
                      ))}
                    </Bar>
                    <Bar dataKey="expense" name="Despesas" fill="#f43f5e" radius={[8, 8, 8, 8]} maxBarSize={32}>
                      {chartData.map((_entry, index) => (
                        <Cell key={`cell-expense-${index}`} fillOpacity={0.8} />
                      ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Análise do Período */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-8 rounded-[2rem] border-white/5 bg-white/[0.01]">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-3">
            <Info size={16} className="text-blue-400" />
            Insights de {selectedYear}
          </h3>
          <div className="space-y-6">
             {yearTotals.income > 0 || yearTotals.expense > 0 ? (
                 <p className="text-slate-400 text-lg font-bold leading-relaxed">
                     Neste ciclo de <span className="text-white font-black">{selectedYear}</span>, o seu fluxo de caixa resultou em uma 
                     <span className={yearTotals.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}> {yearTotals.balance >= 0 ? 'economia líquida' : 'despesa excedente'}</span> de 
                     <span className="text-white font-black"> R$ {Math.abs(yearTotals.balance).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>.
                     {yearTotals.expense > 0 && (
                         <span className="block mt-4 text-sm bg-white/5 border border-white/5 rounded-2xl p-4">
                             Sua média de consumo operacional mensal foi de <span className="text-white underline underline-offset-4 decoration-rose-500/50">R$ {(yearTotals.expense / 12).toLocaleString('pt-BR', {maximumFractionDigits: 0})}</span>.
                         </span>
                     )}
                 </p>
             ) : (
                 <div className="flex flex-col items-center justify-center py-8 opacity-40">
                   <BarChart3 size={40} className="mb-4" />
                   <p className="text-slate-400 font-bold">Nenhum dado registrado para {selectedYear}</p>
                 </div>
             )}
          </div>
        </div>

        <div className="glass-card p-8 rounded-[2rem] border-white/5 bg-white/[0.01]">
           <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Eficiência Financeira</h3>
           {yearTotals.income > 0 ? (
               <div className="space-y-8">
                   <div className="relative pt-2">
                       <div className="flex justify-between items-end mb-4">
                           <div>
                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Taxa de Comprometimento</p>
                             <p className="text-4xl font-black text-white">{(yearTotals.expense / yearTotals.income * 100).toFixed(0)}%</p>
                           </div>
                           <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${yearTotals.expense > yearTotals.income ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                              {yearTotals.expense > yearTotals.income ? 'Crítico' : 'Saudável'}
                           </span>
                       </div>
                       <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 shadow-inner">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(0,0,0,0.5)] ${yearTotals.expense > yearTotals.income ? 'bg-gradient-to-r from-rose-600 to-rose-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'}`} 
                                style={{ width: `${Math.min((yearTotals.expense / yearTotals.income) * 100, 100)}%` }}
                            />
                       </div>
                       <div className="flex justify-between mt-4">
                          <p className="text-[10px] font-bold text-slate-600 uppercase">0%</p>
                          <p className="text-[10px] font-bold text-slate-600 uppercase">Gasto Ideal (70%)</p>
                          <p className="text-[10px] font-bold text-slate-600 uppercase">100%</p>
                       </div>
                   </div>
               </div>
           ) : (
             <div className="flex flex-col items-center justify-center py-8 opacity-40">
               <TrendingUp size={40} className="mb-4" />
               <p className="text-slate-400 font-bold">Aguardando dados de receita</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};