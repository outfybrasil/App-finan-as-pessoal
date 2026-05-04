import React from 'react';
import { Transaction } from '../types';
import { PiggyBank, TrendingUp, Calendar, ArrowRight, ShieldCheck, Info } from 'lucide-react';

interface SavingsProps {
  transactions: Transaction[];
  privacyMode?: boolean;
}

export const Savings: React.FC<SavingsProps> = ({ transactions, privacyMode = false }) => {
  // Filtrar transações da categoria 'Poupança'
  const savingsTransactions = transactions.filter(t => t.category === 'Poupança');
  
  // Total acumulado na poupança
  const totalSaved = savingsTransactions.reduce((acc, t) => {
    // Se for despesa (saída da conta corrente para a poupança), somamos ao saldo da poupança
    // Se por acaso houver um 'income' na poupança (resgate), subtraímos (ou vice-versa dependendo da lógica do app)
    // No contexto do usuário, 'deposito' é uma saída da conta principal.
    return acc + Number(t.amount);
  }, 0);

  // Taxa Nubank Estimada (100% CDI ~ 0.88% ao mês)
  const monthlyRate = 0.0088;

  const calculateYield = (months: number) => {
    return totalSaved * (Math.pow(1 + monthlyRate, months) - 1);
  };

  const projections = [
    { label: 'Em 1 Mês', months: 1, yield: calculateYield(1) },
    { label: 'Em 3 Meses', months: 3, yield: calculateYield(3) },
    { label: 'Em 1 Ano', months: 12, yield: calculateYield(12) }
  ];

  const privacyClassText = privacyMode ? "text-transparent bg-white/20 rounded blur-sm select-none" : "";

  return (
    <div className="space-y-6 pb-8 md:space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-ms-muted">
          <span className="h-1.5 w-1.5 bg-ms-primary" />
          Reserva de Emergência
        </div>
        <h1 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight font-manrope text-slate-100">Poupança Nubank</h1>
        <p className="text-sm text-ms-muted mt-1 font-medium max-w-xl">
          Visualização detalhada dos seus depósitos e projeção de rendimentos (100% CDI).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Card */}
        <div className="lg:col-span-7 bg-[#19191d] rounded-sm p-6 md:p-8 flex flex-col justify-between border border-white/5">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-500/10 rounded-sm">
                <PiggyBank size={24} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-ms-muted">Total Guardado</p>
                <h2 className={`text-4xl md:text-5xl font-black font-manrope mt-1 text-slate-100 ${privacyClassText}`}>
                  R$ {totalSaved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              {projections.map((p) => (
                <div key={p.label} className="p-4 bg-[#25252b] rounded-sm border border-white/5">
                  <p className="text-[9px] font-black uppercase tracking-wider text-ms-muted">{p.label}</p>
                  <p className={`text-lg font-bold mt-2 text-emerald-400 ${privacyClassText}`}>
                    + R$ {p.yield.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Rendimento previsto</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 flex items-center gap-3 text-ms-muted">
            <ShieldCheck size={16} className="text-emerald-500" />
            <span className="text-xs font-medium">Seu dinheiro rende 100% do CDI desde o primeiro dia útil.</span>
          </div>
        </div>

        {/* Projections Info */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#19191d] rounded-sm p-6 border border-white/5">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-100 mb-6 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-400" />
              Simulação de Crescimento
            </h3>
            
            <div className="space-y-4">
              {projections.map((p) => (
                <div key={p.label} className="flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors rounded-sm">
                  <div className="flex items-center gap-3">
                    <Calendar size={14} className="text-ms-muted" />
                    <span className="text-xs font-bold text-slate-300">{p.label}</span>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black text-slate-100 ${privacyClassText}`}>
                      R$ {(totalSaved + p.yield).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[9px] text-emerald-500 font-bold uppercase">Total Previsto</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-3 bg-amber-500/5 border border-amber-500/10 rounded-sm flex gap-3">
              <Info size={16} className="text-amber-500 shrink-0" />
              <p className="text-[10px] text-amber-500/80 font-medium">
                Os valores são estimativas baseadas na taxa Selic atual. Impostos (IR e IOF) não foram descontados.
              </p>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="lg:col-span-12">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-100 mb-4 px-1">Histórico de Depósitos</h3>
          <div className="bg-[#19191d] rounded-sm overflow-hidden border border-white/5">
            {savingsTransactions.length > 0 ? (
              <div className="divide-y divide-white/5">
                {[...savingsTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((t) => (
                  <div key={t.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-500/5 rounded-sm flex items-center justify-center text-emerald-500">
                        <ArrowRight size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-200">{t.description}</p>
                        <p className="text-[10px] text-ms-muted font-black uppercase tracking-widest mt-0.5">
                          {new Date(t.date).toLocaleDateString('pt-BR')} • {t.account}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black text-emerald-400 ${privacyClassText}`}>
                        R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] text-ms-muted font-black uppercase tracking-tighter">Depósito</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <PiggyBank size={48} className="mx-auto text-slate-700 mb-4" />
                <p className="text-slate-400 font-medium">Nenhum depósito encontrado.</p>
                <p className="text-xs text-ms-muted mt-1">Seus depósitos na categoria "Poupança" aparecerão aqui.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
