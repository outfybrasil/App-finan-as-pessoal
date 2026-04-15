import React from 'react';
import { Trophy, Target, TrendingUp, Plus, Sparkles, ChevronRight, Calculator, Calendar } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface SmartGoalsProps {
    goals: any[];
    onAddGoal: () => void;
    onUpdateGoal: (goal: any) => void;
}

export const SmartGoals: React.FC<SmartGoalsProps> = ({ goals = [], onAddGoal, onUpdateGoal }) => {

    const calculateProgress = (current: number, target: number) => {
        return Math.min(100, Math.max(0, (current / target) * 100));
    };

    return (
        <div className="space-y-8 pb-24 md:pb-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-400">
                        Cofrinhos
                    </h1>
                    <p className="text-slate-400 mt-2 text-lg">Metas inteligentes para seus sonhos reais.</p>
                </div>
                
                <button
                    onClick={() => { triggerHaptic('medium'); onAddGoal(); }}
                    className="group relative px-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all active:scale-95 shadow-2xl shadow-emerald-500/20"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <Plus size={18} className="relative z-10" />
                    <span className="relative z-10">Nova Meta</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {goals.map((goal, index) => {
                    const progress = calculateProgress(goal.currentAmount || 0, goal.targetAmount);
                    const isCompleted = progress >= 100;

                    return (
                        <div
                            key={goal.id || index}
                            onClick={() => { triggerHaptic('light'); onUpdateGoal(goal); }}
                            className={`group relative overflow-hidden p-8 rounded-[2.5rem] border transition-all duration-500 cursor-pointer
                                ${isCompleted
                                    ? 'bg-gradient-to-br from-amber-500/10 to-yellow-600/10 border-yellow-500/30'
                                    : 'bg-slate-900/40 backdrop-blur-xl border-white/5 hover:border-indigo-500/30 active:scale-[0.98]'
                                }`}
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            {/* Decorative Background Icon */}
                            <div className="absolute -right-6 -top-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-700 pointer-events-none">
                                {isCompleted ? <Trophy size={180} /> : <Target size={180} />}
                            </div>

                            <div className="flex justify-between items-start mb-10 relative z-10">
                                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-2xl transition-all duration-500 group-hover:scale-110
                                    ${isCompleted ? 'bg-yellow-500 text-yellow-950 rotate-6' : 'bg-slate-800 text-slate-400'}`}>
                                    {goal.icon || '🎯'}
                                </div>
                                
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Meta Final</p>
                                    <p className={`text-2xl font-black tracking-tight ${isCompleted ? 'text-yellow-500' : 'text-white'}`}>
                                        <span className="text-sm font-bold opacity-50 mr-1">R$</span>
                                        {goal.targetAmount.toLocaleString('pt-BR')}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6 relative z-10">
                                <div className="flex justify-between items-end">
                                    <h3 className="text-2xl font-black text-white tracking-tight">{goal.name}</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-3xl font-black tracking-tighter ${isCompleted ? 'text-yellow-500' : 'text-indigo-400'}`}>
                                            {progress.toFixed(0)}
                                        </span>
                                        <span className="text-sm font-bold text-slate-500">%</span>
                                    </div>
                                </div>

                                {/* Modern Progress Bar */}
                                <div className="h-4 bg-slate-950/50 rounded-full overflow-hidden p-1 border border-white/5 relative">
                                    <div
                                        className={`h-full rounded-full transition-all duration-[1.5s] ease-out shadow-[0_0_20px_rgba(0,0,0,0.5)] relative
                                            ${isCompleted ? 'bg-gradient-to-r from-yellow-400 to-amber-600' : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 bg-[length:200%_100%] animate-gradient'}`}
                                        style={{ width: `${progress}%` }}
                                    >
                                        <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                                    </div>
                                </div>

                                <div className="flex transition-all duration-500 pt-2">
                                    <div className="flex-1 space-y-1">
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Acumulado</p>
                                        <p className="text-xl font-bold text-white">
                                            <span className="text-sm opacity-50 mr-1">R$</span>
                                            {(goal.currentAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        {goal.deadline && (
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Prazo</p>
                                                <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                                                    <Calendar size={12} className="text-indigo-400" />
                                                    {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                                                </div>
                                            </div>
                                        )}
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300
                                            ${isCompleted 
                                                ? 'bg-yellow-500/20 text-yellow-500' 
                                                : 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white group-hover:translate-x-1 shadow-2xl shadow-indigo-500/20'}`}>
                                            <ChevronRight size={24} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {goals.length === 0 && (
                    <div className="col-span-full py-24 flex flex-col items-center justify-center text-center bg-slate-950/20 rounded-[3.5rem] border-2 border-dashed border-white/5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-indigo-500/5 blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 shadow-inner">
                            <Sparkles size={48} className="text-yellow-500 animate-pulse" />
                        </div>
                        <h3 className="text-3xl font-black text-white mb-3">Seu futuro começa aqui</h3>
                        <p className="text-slate-500 max-w-sm mb-10 text-lg leading-relaxed">
                            Viagens, conquistas ou liberdade financeira? Organize seus sonhos em cofrinhos e veja seu patrimônio crescer.
                        </p>
                        <button
                            onClick={onAddGoal}
                            className="px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-[0_20px_40px_rgba(16,185,129,0.3)] transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3"
                        >
                            Criar Primeiro Cofrinho <Plus size={20} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
