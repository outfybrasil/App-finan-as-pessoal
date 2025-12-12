import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

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
        const tDate = new Date(t.date);
        // Verificar se pertence ao ano selecionado (ajuste básico de fuso)
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

  // Navegação de ano
  const handlePrevYear = () => setSelectedYear(prev => prev - 1);
  const handleNextYear = () => setSelectedYear(prev => prev + 1);

  return (
    <div className="space-y-6 h-full pb-20 md:pb-0">
      
      {/* Header com Navegação de Ano */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-2xl font-bold text-white self-start md:self-auto">Relatórios Anuais</h2>
          
          <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
            <button onClick={handlePrevYear} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                <ChevronLeft size={20} />
            </button>
            <div className="px-4 flex items-center gap-2 font-medium text-slate-200 min-w-[100px] justify-center">
                <Calendar size={16} className="text-emerald-500" />
                {selectedYear}
            </div>
            <button onClick={handleNextYear} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                <ChevronRight size={20} />
            </button>
          </div>
      </div>

      {/* Cards de Resumo do Ano */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
              <div>
                  <p className="text-xs text-slate-400 font-medium uppercase mb-1">Receita {selectedYear}</p>
                  <p className="text-xl font-bold text-emerald-400">R$ {yearTotals.income.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
              </div>
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><TrendingUp size={20}/></div>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
              <div>
                  <p className="text-xs text-slate-400 font-medium uppercase mb-1">Despesa {selectedYear}</p>
                  <p className="text-xl font-bold text-rose-400">R$ {yearTotals.expense.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
              </div>
              <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500"><TrendingDown size={20}/></div>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
              <div>
                  <p className="text-xs text-slate-400 font-medium uppercase mb-1">Saldo {selectedYear}</p>
                  <p className={`text-xl font-bold ${yearTotals.balance >= 0 ? 'text-white' : 'text-rose-400'}`}>
                      R$ {yearTotals.balance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </p>
              </div>
              <div className="p-2 bg-slate-700 rounded-lg text-slate-300"><Wallet size={20}/></div>
          </div>
      </div>
      
      {/* Gráfico - CORRIGIDO com Flexbox Wrapper */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 h-[400px] flex flex-col">
        <h3 className="text-lg font-medium text-slate-200 mb-6 shrink-0">Fluxo de Caixa Mensal</h3>
        
        {/* Wrapper flex-1 garante que o ResponsiveContainer tenha altura definida */}
        <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{
                    top: 5,
                    right: 10,
                    left: 0,
                    bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickMargin={10} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `R$${val/1000}k`} />
                    <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                    cursor={{fill: '#334155', opacity: 0.2}}
                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                    <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="expense" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Projeção / Info Extra */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
        <h3 className="text-lg font-medium text-slate-200 mb-4">Análise do Período</h3>
        <div className="space-y-4">
           {yearTotals.income > 0 || yearTotals.expense > 0 ? (
               <p className="text-slate-400">
                   Neste ano de <strong>{selectedYear}</strong>, você {yearTotals.balance >= 0 ? 'economizou' : 'gastou acima do ganho'} um total de 
                   <strong className={yearTotals.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}> R$ {Math.abs(yearTotals.balance).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>.
                   {yearTotals.expense > 0 && (
                       <span className="block mt-2 text-sm">
                           Sua média de gastos mensal é de R$ {(yearTotals.expense / 12).toLocaleString('pt-BR', {maximumFractionDigits: 0})}.
                       </span>
                   )}
               </p>
           ) : (
               <p className="text-slate-400">Nenhuma movimentação registrada para o ano de {selectedYear}.</p>
           )}
           
           {/* Barra de Progresso Visual do Balanço */}
           {yearTotals.income > 0 && (
               <div className="mt-4">
                   <div className="flex justify-between text-xs text-slate-500 mb-1">
                       <span>Despesas vs Receita</span>
                       <span>{(yearTotals.expense / yearTotals.income * 100).toFixed(0)}% comprometido</span>
                   </div>
                   <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full ${yearTotals.expense > yearTotals.income ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${Math.min((yearTotals.expense / yearTotals.income) * 100, 100)}%` }}
                        ></div>
                   </div>
               </div>
           )}
        </div>
      </div>
    </div>
  );
};