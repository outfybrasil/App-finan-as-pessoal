import React, { useState, useEffect } from 'react';
import { generateFinancialInsights } from '../services/geminiService';
import { Transaction, Budget, Goal, Insight } from '../types';
import { Sparkles, Lightbulb, TrendingUp, AlertOctagon, Loader2, CheckCircle2, X, ArrowRight } from 'lucide-react';
import { Button } from './Button';
import { FinancialAudit } from './FinancialAudit';

interface InsightsProps {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
}

export const Insights: React.FC<InsightsProps> = ({ transactions, budgets, goals }) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const result = await generateFinancialInsights(transactions, budgets, goals);
      setInsights(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount if empty
  useEffect(() => {
    if (insights.length === 0) {
      fetchInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getIcon = (type: Insight['type']) => {
    switch (type) {
      case 'opportunity': return <Lightbulb className="text-amber-400" size={24} />;
      case 'warning': return <AlertOctagon className="text-rose-500" size={24} />;
      case 'debt': return <TrendingUp className="text-blue-400" size={24} />;
      default: return <Sparkles className="text-purple-400" size={24} />;
    }
  };

  const getBorderColor = (type: Insight['type']) => {
    switch (type) {
      case 'opportunity': return 'border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10';
      case 'warning': return 'border-rose-500/50 bg-rose-500/5 hover:bg-rose-500/10';
      case 'debt': return 'border-blue-500/50 bg-blue-500/5 hover:bg-blue-500/10';
      default: return 'border-purple-500/50 bg-purple-500/5 hover:bg-purple-500/10';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 md:pb-0">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-purple-500/20 mb-4">
          <Sparkles className="text-white w-8 h-8" />
        </div>
        <h2 className="text-3xl font-bold text-white">Assistente Inteligente</h2>
        <p className="text-slate-400 max-w-lg mx-auto">
          Análise inteligente dos seus hábitos financeiros para encontrar oportunidades de economia e alertas de tendências.
        </p>
      </div>

      {/* Financial Audit Section (New Idea #2) */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <FinancialAudit transactions={transactions} />
      </div>

      <div className="flex justify-between items-center pt-8 border-t border-slate-800">
         <h3 className="text-xl font-bold text-white">Insights Sugeridos</h3>
         <Button 
            size="sm"
            onClick={fetchInsights} 
            disabled={loading}
            className="flex items-center gap-2"
            variant="secondary"
          >
            {loading ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14} />}
            {loading ? 'Analisando...' : 'Atualizar'}
          </Button>
      </div>

      <div className="grid gap-4">
        {insights.map((insight) => (
          <div 
            key={insight.id}
            className={`p-6 rounded-2xl border backdrop-blur-sm transition-all duration-300 cursor-default ${getBorderColor(insight.type)}`}
          >
            <div className="flex items-start gap-4">
              <div className="mt-1 p-2 bg-slate-900/50 rounded-lg shrink-0">
                {getIcon(insight.type)}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">{insight.title}</h3>
                <p className="text-slate-300 leading-relaxed">{insight.description}</p>
                
                {insight.actionPlan && insight.actionPlan.length > 0 && (
                  <button 
                    onClick={() => setSelectedInsight(insight)}
                    className="mt-3 text-sm font-medium text-emerald-400 hover:text-emerald-300 underline underline-offset-4 flex items-center gap-1 transition-colors"
                  >
                    Ver como aplicar <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {!loading && insights.length === 0 && (
          <div className="text-center p-8 bg-slate-800/50 rounded-2xl border border-slate-800 border-dashed">
            <p className="text-slate-500">Nenhum insight gerado ainda. Registre mais transações para alimentar a IA.</p>
          </div>
        )}
      </div>

      {/* Action Plan Modal */}
      {selectedInsight && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                             <div className="p-2 bg-slate-800 rounded-lg">
                                {getIcon(selectedInsight.type)}
                             </div>
                             <h3 className="text-xl font-bold text-white leading-tight">Plano de Ação</h3>
                        </div>
                        <button onClick={() => setSelectedInsight(null)} className="text-slate-400 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="mb-6">
                        <h4 className="font-semibold text-white mb-2">{selectedInsight.title}</h4>
                        <p className="text-slate-400 text-sm">{selectedInsight.description}</p>
                    </div>

                    <div className="space-y-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Passos Recomendados</h5>
                        {selectedInsight.actionPlan?.map((step, idx) => (
                            <div key={idx} className="flex gap-3 items-start">
                                <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                                <p className="text-slate-200 text-sm leading-relaxed">{step}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6">
                        <Button fullWidth onClick={() => setSelectedInsight(null)}>
                            Entendi, vou aplicar!
                        </Button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};