import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { Calendar, CreditCard, AlertCircle, CheckCircle2, Tv, Music, Zap, Wifi, Smartphone, Home, Briefcase, Heart, Clock, ChevronRight } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface SubscriptionsProps {
    transactions: Transaction[];
    onEdit: (t: Transaction) => void;
    onDelete: (id: string) => void;
}

const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('stream') || cat.includes('netflix') || cat.includes('tv')) return <Tv size={20} />;
    if (cat.includes('spotify') || cat.includes('music')) return <Music size={20} />;
    if (cat.includes('internet') || cat.includes('wifi')) return <Wifi size={20} />;
    if (cat.includes('luz') || cat.includes('energia')) return <Zap size={20} />;
    if (cat.includes('celular') || cat.includes('claro') || cat.includes('tim') || cat.includes('vivo')) return <Smartphone size={20} />;
    if (cat.includes('aluguel') || cat.includes('condominio')) return <Home size={20} />;
    if (cat.includes('trabalho') || cat.includes('escritorio')) return <Briefcase size={20} />;
    if (cat.includes('saude') || cat.includes('medico')) return <Heart size={20} />;
    return <Calendar size={20} />;
};

export const Subscriptions: React.FC<SubscriptionsProps> = ({ transactions, onEdit, onDelete }) => {

    // Filter for recurring expenses
    const subscriptions = useMemo(() => {
        return transactions
            .filter(t => t.type === 'expense' && t.isRecurring)
            .sort((a, b) => new Date(a.date).getDate() - new Date(b.date).getDate());
    }, [transactions]);

    const totalMonthly = subscriptions.reduce((acc, t) => acc + t.amount, 0);

    const getDaysUntilDue = (dateStr: string) => {
        const today = new Date();
        const due = new Date(dateStr);
        const currentDue = new Date(today.getFullYear(), today.getMonth(), due.getDate());

        if (currentDue < today) {
            currentDue.setMonth(currentDue.getMonth() + 1);
        }

        const diffTime = Math.abs(currentDue.getTime() - today.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    return (
        <div className="space-y-8 pb-24 md:pb-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-400">
                        Assinaturas
                    </h1>
                    <p className="text-slate-400 mt-2 text-lg">Seus compromissos financeiros recorrentes.</p>
                </div>

                <div className="relative group overflow-hidden">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative bg-slate-900/80 backdrop-blur-xl p-5 rounded-2xl border border-white/10 flex items-center gap-5">
                        <div className="p-3.5 bg-indigo-500/20 rounded-xl text-indigo-400 shadow-inner">
                            <CreditCard size={28} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-black tracking-widest">Custo Mensal Fixo</p>
                            <p className="text-3xl font-black text-white">
                                <span className="text-indigo-400 text-sm font-bold mr-1">R$</span>
                                {totalMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subscriptions.map((sub, index) => {
                    const daysDue = getDaysUntilDue(sub.date);
                    const isPaid = sub.isPaid;

                    return (
                        <div
                            key={sub.id}
                            onClick={() => { triggerHaptic('light'); onEdit(sub); }}
                            className={`group relative overflow-hidden p-6 rounded-3xl border transition-all duration-500 cursor-pointer
                                ${isPaid
                                    ? 'bg-slate-900/30 border-white/5 hover:border-emerald-500/30 grayscale-[0.3] hover:grayscale-0'
                                    : 'bg-gradient-to-b from-slate-800/80 to-slate-900/80 border-white/10 shadow-2xl shadow-black/40 hover:border-indigo-500/50 hover:scale-[1.02] active:scale-[0.98]'
                                }`}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            {/* Glow Effect */}
                            <div className={`absolute -right-10 -top-10 w-32 h-32 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none
                                ${isPaid ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>

                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-4 rounded-2xl transition-colors duration-300 ${
                                    isPaid 
                                        ? 'bg-slate-800/50 text-slate-500' 
                                        : 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white'
                                }`}>
                                    {getCategoryIcon(sub.description + sub.category)}
                                </div>
                                
                                {isPaid ? (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Pago</span>
                                    </div>
                                ) : (
                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors duration-300
                                        ${daysDue <= 3 
                                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse' 
                                            : 'bg-slate-800/80 text-slate-400 border-white/5'}`}>
                                        <Clock size={12} className={daysDue <= 3 ? 'animate-spin-slow' : ''} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                            {daysDue === 0 ? 'Vence Hoje' : daysDue === 1 ? 'Amanhã' : `Em ${daysDue} dias`}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <h3 className={`font-bold text-xl tracking-tight transition-colors duration-300 ${isPaid ? 'text-slate-500' : 'text-white'}`}>
                                    {sub.description}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{sub.category}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Todo dia {new Date(sub.date).getDate()}</span>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Valor Mensal</p>
                                    <p className={`text-2xl font-black tracking-tight ${isPaid ? 'text-slate-600' : 'text-white'}`}>
                                        <span className="text-sm font-bold opacity-50 mr-1">R$</span>
                                        {sub.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                                    ${isPaid 
                                        ? 'bg-slate-800 text-slate-600' 
                                        : 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white group-hover:translate-x-1 shadow-lg shadow-indigo-500/20'
                                    }`}>
                                    <ChevronRight size={20} />
                                </div>
                            </div>
                        </div>
                    );
                })}

                {subscriptions.length === 0 && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-white/5">
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                            <Calendar size={48} className="text-slate-700" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-400 mb-2">Puro e Organizado</h3>
                        <p className="text-slate-600 max-w-sm mx-auto">
                            Você não tem gastos recorrentes registrados ainda. Marque uma despesa como <span className="text-indigo-400 font-bold">"Fixo / Recorrente"</span> para vê-la brilhar aqui.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
