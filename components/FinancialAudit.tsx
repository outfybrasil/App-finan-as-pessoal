import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { PieChart, AlertCircle, CheckCircle2, TrendingUp, Wallet, ShieldCheck, Target } from 'lucide-react';

interface FinancialAuditProps {
    transactions: Transaction[];
}

interface AuditAdvice {
    score: number;
    message: string;
}

export const FinancialAudit: React.FC<FinancialAuditProps> = ({ transactions }) => {
    // 1. Calcular Totais (Excluindo Ajustes)
    const income = transactions
        .filter(t => t.type === 'income' && t.category !== 'Ajuste')
        .reduce((acc, t) => acc + t.amount, 0);

    // Mapeamento de Categorias para 50/30/20
    const totals = useMemo(() => {
        let needs = 0;
        let wants = 0;
        let savings = 0;

        transactions.filter(t => t.type === 'expense' && t.category !== 'Ajuste').forEach(t => {
            const cat = t.category.toLowerCase();

            // Regras de Classificação
            if (['moradia', 'mercado', 'alimentação', 'saúde', 'transporte', 'educação', 'contas'].includes(cat)) {
                needs += t.amount;
            } else if (['investimentos', 'reserva', 'dívidas', 'poupança'].includes(cat)) {
                savings += t.amount;
            } else {
                // Lazer, Compras, Presente, Assinaturas, Outros -> Desejos
                wants += t.amount;
            }
        });

        const safeIncome = income || 1;
        return {
            needs,
            wants,
            savings,
            needsPct: Math.min((needs / safeIncome) * 100, 100),
            wantsPct: Math.min((wants / safeIncome) * 100, 100),
            savingsPct: Math.min((savings / safeIncome) * 100, 100)
        };
    }, [transactions, income]);

    // Local Logic-based advice (Replacing AI as requested)
    const advice = useMemo((): AuditAdvice => {
        if (income === 0) return { score: 0, message: "Aguardando receitas..." };

        let score = 10;
        let message = "Sua saúde financeira está excelente! Você está seguindo perfeitamente a regra 50/30/20.";

        if (totals.needsPct > 60) {
            score -= 3;
            message = "Suas necessidades básicas estão consumindo uma fatia muito grande. Tente reduzir custos fixos.";
        } else if (totals.wantsPct > 40) {
            score -= 2;
            message = "Cuidado com os gastos supérfluos. Eles estão comprometendo sua capacidade de investimento.";
        } else if (totals.savingsPct < 15) {
            score -= 3;
            message = "Seu índice de poupança está baixo. Tente priorizar o 'se pagar primeiro'.";
        }

        if (totals.needsPct > 70) score = 3;
        
        return { score, message };
    }, [totals, income]);

    if (income === 0) {
        return (
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-10 text-center group transition-all duration-500 hover:border-indigo-500/20">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500">
                    <PieChart className="text-slate-600" size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-300 mb-2">Auditoria Financeira</h3>
                <p className="text-slate-500 max-w-xs mx-auto text-sm leading-relaxed">
                    Registre suas receitas para habilitar a <span className="text-indigo-400 font-medium">Metodologia 50/30/20</span> de análise de patrimônio.
                </p>
            </div>
        );
    }

    const renderBar = (label: string, currentPct: number, targetPct: number, colorClass: string, amount: number, icon: React.ReactNode) => {
        const isOver = currentPct > targetPct;
        return (
            <div className="space-y-3">
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-slate-800/50 text-slate-400`}>
                            {icon}
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none mb-1">{label}</p>
                            <p className="text-sm font-bold text-white">R$ {amount.toLocaleString('pt-BR')}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`text-lg font-black tracking-tight ${isOver ? 'text-rose-500' : 'text-slate-200'}`}>
                            {currentPct.toFixed(1)}%
                        </p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Meta: {targetPct}%</p>
                    </div>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden relative border border-white/5">
                    {/* Target Marker */}
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white/20 z-10"
                        style={{ left: `${targetPct}%` }}
                    />
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(0,0,0,0.5)] ${colorClass} ${isOver ? 'opacity-100' : 'opacity-80'}`}
                        style={{ width: `${currentPct}%` }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="group relative bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden active:scale-[0.99] transition-transform">
            {/* Background Glow */}
            <div className={`absolute -right-20 -top-20 w-64 h-64 blur-[80px] opacity-10 transition-opacity duration-1000 pointer-events-none
                ${advice.score >= 7 ? 'bg-emerald-500' : advice.score >= 5 ? 'bg-amber-500' : 'bg-rose-500'}`}></div>

            <div className="flex justify-between items-center mb-10">
                <div>
                    <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                        <ShieldCheck className="text-indigo-400" size={28} />
                        Saúde Financeira
                    </h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">Análise baseada na regra 50/30/20</p>
                </div>
                
                <div className={`relative px-5 py-2.5 rounded-2xl border flex items-center gap-3 overflow-hidden transition-all duration-500
                    ${advice.score >= 8 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    advice.score >= 5 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                    'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                    <div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                    <span className="text-xs font-black uppercase tracking-[0.2em] relative z-10">Nota Final</span>
                    <span className="text-3xl font-black tracking-tighter relative z-10">{advice.score}</span>
                </div>
            </div>

            <div className="space-y-8 mb-10">
                {renderBar('Necessidades', totals.needsPct, 50, 'bg-indigo-500 shadow-indigo-500/20', totals.needs, <Wallet size={16}/>)}
                {renderBar('Desejos Pessoais', totals.wantsPct, 30, 'bg-purple-500 shadow-purple-500/20', totals.wants, <Target size={16}/>)}
                {renderBar('Investimentos', totals.savingsPct, 20, 'bg-emerald-500 shadow-emerald-500/20', totals.savings, <TrendingUp size={16}/>)}
            </div>

            <div className={`relative p-6 rounded-3xl border transition-all duration-500 flex gap-5 items-start
                ${advice.score >= 7 ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-amber-500/5 border-amber-500/10'}`}>
                <div className={`shrink-0 p-3 rounded-2xl ${advice.score >= 7 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                    {advice.score >= 7 ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                </div>
                <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-widest mb-1">Diagnóstico</h4>
                    <p className="text-slate-400 text-sm leading-relaxed font-medium">
                        "{advice.message}"
                    </p>
                </div>
            </div>
        </div>
    );
};