import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { generateAuditAdvice, AuditAdvice } from '../services/geminiService';
import { PieChart, Loader2, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface FinancialAuditProps {
  transactions: Transaction[];
}

export const FinancialAudit: React.FC<FinancialAuditProps> = ({ transactions }) => {
  const [advice, setAdvice] = useState<AuditAdvice | null>(null);
  const [loading, setLoading] = useState(false);

  // 1. Calcular Totais
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  // Mapeamento de Categorias para 50/30/20
  let needs = 0;
  let wants = 0;
  let savings = 0;

  transactions.filter(t => t.type === 'expense').forEach(t => {
    const cat = t.category.toLowerCase();
    
    // Regras de Classificação
    if (['moradia', 'mercado', 'alimentação', 'saúde', 'transporte', 'educação'].includes(cat)) {
        needs += t.amount;
    } else if (['investimentos', 'reserva', 'dívidas'].includes(cat)) {
        savings += t.amount;
    } else {
        // Lazer, Compras, Presente, Assinaturas, Outros -> Desejos
        wants += t.amount;
    }
  });

  // Calcular Percentuais (evitar divisão por zero)
  const safeIncome = income || 1;
  const needsPct = Math.min((needs / safeIncome) * 100, 100);
  const wantsPct = Math.min((wants / safeIncome) * 100, 100);
  const savingsPct = Math.min((savings / safeIncome) * 100, 100);

  const fetchAdvice = async () => {
    if (income === 0) return;
    setLoading(true);
    const result = await generateAuditAdvice(income, needs, wants, savings);
    setAdvice(result);
    setLoading(false);
  };

  useEffect(() => {
    // Busca automática se tiver dados e ainda não tiver conselho
    if (income > 0 && !advice && !loading) {
        fetchAdvice();
    }
  }, [income]); // Re-executa se a renda mudar (novos dados)

  if (income === 0) {
      return (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 text-center text-slate-400">
              <PieChart className="mx-auto mb-2 opacity-50" size={32}/>
              <p>Registre receitas para habilitar a Auditoria 50/30/20.</p>
          </div>
      );
  }

  const renderBar = (label: string, currentPct: number, targetPct: number, colorClass: string, amount: number) => {
      const isOver = currentPct > targetPct;
      return (
          <div className="mb-4 last:mb-0">
              <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-200 font-medium flex items-center gap-2">
                      {label} 
                      <span className="text-xs text-slate-500 font-normal">(Meta {targetPct}%)</span>
                  </span>
                  <span className={isOver ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                      {currentPct.toFixed(1)}% <span className="text-xs font-normal text-slate-500">R$ {amount.toFixed(0)}</span>
                  </span>
              </div>
              <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden relative">
                  {/* Marcador da Meta */}
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-white/30 z-10" 
                    style={{ left: `${targetPct}%` }} 
                    title={`Meta: ${targetPct}%`}
                  />
                  <div 
                      className={`h-full rounded-full transition-all duration-700 ${colorClass} ${isOver ? 'opacity-100' : 'opacity-80'}`}
                      style={{ width: `${currentPct}%` }}
                  />
              </div>
          </div>
      );
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 p-32 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <PieChart className="text-emerald-400" size={24} /> 
                    Auditoria 50/30/20
                </h3>
                <p className="text-xs text-slate-400 mt-1">Otimize sua distribuição de renda.</p>
            </div>
            {advice && (
                <div className={`px-3 py-1 rounded-lg border flex items-center gap-2 ${
                    advice.score >= 8 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                    advice.score >= 5 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                    'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                    <span className="text-xs uppercase font-bold tracking-wider">Nota</span>
                    <span className="text-xl font-bold">{advice.score}</span>
                </div>
            )}
        </div>

        <div className="space-y-5 relative z-10">
            {renderBar('Necessidades', needsPct, 50, 'bg-blue-500', needs)}
            {renderBar('Desejos (Supérfluos)', wantsPct, 30, 'bg-purple-500', wants)}
            {renderBar('Investimentos / Dívidas', savingsPct, 20, 'bg-emerald-500', savings)}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-700/50 min-h-[80px] relative z-10">
            {loading ? (
                <div className="flex items-center justify-center gap-2 text-slate-500 py-2">
                    <Loader2 className="animate-spin" size={16} /> Analisando dados...
                </div>
            ) : advice ? (
                <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                    <div className="shrink-0 mt-1">
                        {advice.score >= 7 ? <CheckCircle className="text-emerald-500" size={20}/> : <AlertCircle className="text-amber-500" size={20}/>}
                    </div>
                    <div>
                        <p className="text-slate-300 text-sm italic leading-relaxed">"{advice.message}"</p>
                        <p className="text-[10px] text-slate-500 mt-1 font-medium uppercase tracking-wider">— Seu Consultor IA</p>
                    </div>
                </div>
            ) : (
                 <button 
                    onClick={fetchAdvice}
                    className="w-full py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                 >
                    <RefreshCw size={12} /> Gerar Parecer do Consultor
                 </button>
            )}
        </div>
    </div>
  );
};