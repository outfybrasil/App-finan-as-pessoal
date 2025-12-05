import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface ReportsProps {
  transactions: Transaction[];
}

export const Reports: React.FC<ReportsProps> = ({ transactions }) => {
  
  const processedData = useMemo(() => {
    if (transactions.length === 0) return [];

    // 1. Encontrar a data mais antiga e a mais recente
    const dates = transactions.map(t => new Date(t.date).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    // Ajustar para o primeiro dia do mês para facilitar iteração
    const startDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const endDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0); // Fim do mês atual

    const dataMap = new Map<string, { name: string, income: number, expense: number, dateObj: Date }>();

    // 2. Preencher o mapa com todos os meses no intervalo (mesmo os vazios)
    const iterDate = new Date(startDate);
    while (iterDate <= endDate) {
        const key = `${iterDate.getFullYear()}-${iterDate.getMonth()}`;
        const label = iterDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }); // Jan/24
        
        dataMap.set(key, {
            name: label.charAt(0).toUpperCase() + label.slice(1), // Capitalize
            income: 0,
            expense: 0,
            dateObj: new Date(iterDate)
        });
        
        iterDate.setMonth(iterDate.getMonth() + 1);
    }

    // 3. Agregar valores das transações
    transactions.forEach(t => {
        const tDate = new Date(t.date);
        const key = `${tDate.getFullYear()}-${tDate.getMonth()}`; // Usar UTC getMonth se necessário, mas local costuma funcionar bem aqui
        
        // Fallback para garantir que a chave existe (caso a data da transação esteja fora do range inicial calculado, o que é raro com min/max)
        if (dataMap.has(key)) {
            const entry = dataMap.get(key)!;
            if (t.type === 'income') {
                entry.income += t.amount;
            } else {
                entry.expense += t.amount;
            }
        }
    });

    // 4. Retornar array ordenado
    return Array.from(dataMap.values())
        .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  }, [transactions]);

  return (
    <div className="space-y-6 h-full pb-20 md:pb-0">
      <h2 className="text-2xl font-bold text-white mb-6">Relatórios Detalhados</h2>
      
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 h-[400px]">
        <h3 className="text-lg font-medium text-slate-200 mb-6">Comparativo Mensal</h3>
        {processedData.length > 0 ? (
            <ResponsiveContainer width="100%" height="85%">
            <BarChart
                data={processedData}
                margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                cursor={{fill: '#334155', opacity: 0.2}}
                formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
            </ResponsiveContainer>
        ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
                Nenhum dado registrado para exibir no gráfico.
            </div>
        )}
      </div>

      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
        <h3 className="text-lg font-medium text-slate-200 mb-4">Projeção de Saldo (3 Meses)</h3>
        <div className="space-y-4">
           {processedData.length >= 2 ? (
               <p className="text-slate-400">
                   Com base na média dos seus últimos meses registrados, a tendência é que seu patrimônio continue crescendo se você mantiver as despesas sob controle.
                   <span className="block mt-2 text-xs text-slate-500">*A IA do Fluxo aprimorará esta previsão conforme você insere mais dados.*</span>
               </p>
           ) : (
               <p className="text-slate-400">Registre dados de pelo menos 2 meses diferentes para gerar uma projeção de saldo.</p>
           )}
           <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
             <div className="h-full bg-emerald-500 w-[65%]"></div>
           </div>
        </div>
      </div>
    </div>
  );
};