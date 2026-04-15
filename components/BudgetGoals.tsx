import React, { useState } from 'react';
import { Budget, Goal, Transaction } from '../types';
import { Target, Trophy, Plus, Edit2, Wallet, TrendingUp, ChevronRight, Calculator } from 'lucide-react';
import { GoalModal } from './GoalModal';
import { BudgetModal } from './BudgetModal';
import { SmartGoals } from './SmartGoals';

interface BudgetGoalsProps {
  budgets: Budget[];
  goals: Goal[];
  transactions: Transaction[];
  onAddGoal?: (goal: Omit<Goal, 'id'>) => void;
  onUpdateGoal?: (id: string, goal: Partial<Goal>) => void;
  onDeleteGoal?: (id: string) => void;
  onAddBudget?: (budget: Omit<Budget, 'id'>) => void;
  onUpdateBudget?: (id: string, budget: Partial<Budget>) => void;
  onDeleteBudget?: (id: string) => void;
  privacyMode?: boolean;
}

export const BudgetGoals: React.FC<BudgetGoalsProps> = ({
  budgets,
  goals,
  transactions,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onAddBudget,
  onUpdateBudget,
  onDeleteBudget,
  privacyMode = false
}) => {
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);

  const getProgressColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 100) return 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]';
    if (percentage >= 80) return 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]';
    return 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]';
  };

  const handleEditGoal = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowGoalModal(true);
  };

  const handleCloseModal = () => {
    setSelectedGoal(null);
    setShowGoalModal(false);
    setSelectedBudget(null);
    setShowBudgetModal(false);
  };

  const handleEditBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    setShowBudgetModal(true);
  };

  const privacyClass = privacyMode ? "blur-sm select-none bg-slate-700/50 rounded text-transparent" : "";

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Budgets Section */}
      <section>
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full group-hover:bg-emerald-500/30 transition-all" />
              <div className="relative p-5 bg-slate-900/40 backdrop-blur-xl rounded-[1.8rem] border border-white/10 text-emerald-400 shadow-2xl group-hover:scale-105 transition-transform">
                <Wallet size={32} className="stroke-[1.5]" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none">
                Seus <span className="text-emerald-500">Orçamentos</span>
              </h1>
              <p className="text-slate-500 font-bold mt-2 tracking-wide uppercase text-[10px] opacity-70">Controle rigoroso de limites por categoria</p>
            </div>
          </div>

          <button
            onClick={() => setShowBudgetModal(true)}
            className="bg-emerald-500 text-black rounded-[1.5rem] px-8 py-4 flex items-center gap-3 font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-emerald-500/20 group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform stroke-[3]" />
            Adicionar Limite
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {budgets.map(budget => {
            const percentage = Math.min((budget.spent / budget.limit) * 100, 100);
            const remaining = budget.limit - budget.spent;

            return (
              <div
                key={budget.id}
                onClick={() => handleEditBudget(budget)}
                className="glass-card p-6 rounded-[2rem] border-white/5 hover:border-emerald-500/30 cursor-pointer transition-all hover:shadow-2xl hover:shadow-emerald-900/10 group relative"
              >
                <div className="absolute top-6 right-6 text-slate-600 group-hover:text-emerald-500 transition-all group-hover:scale-110">
                  <Edit2 size={18} />
                </div>
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-black text-xl text-white tracking-tight">{budget.category}</h3>
                    <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${remaining < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                      {remaining < 0 ? 'Limite Excedido' : 'Saldo Disponível'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-black ${remaining < 0 ? 'text-rose-400' : 'text-white'} ${privacyClass}`}>
                      R$ {Math.abs(remaining).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="h-3 bg-slate-900 rounded-full overflow-hidden border border-white/5 p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${getProgressColor(budget.spent, budget.limit)}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-500">Gasto: <span className={`text-slate-300 ${privacyMode ? "blur-xs" : ""}`}>R$ {budget.spent.toLocaleString('pt-BR')}</span></span>
                    <span className="text-slate-500">Limite: <span className={`text-slate-300 ${privacyMode ? "blur-xs" : ""}`}>R$ {budget.limit.toLocaleString('pt-BR')}</span></span>
                  </div>
                </div>

                {budget.cumulative && remaining > 0 && (
                  <div className="mt-6 pt-4 border-t border-white/5 text-[10px] font-black text-emerald-400 flex items-center gap-2 uppercase tracking-widest">
                    <TrendingUp size={14} />
                    Acumula para o próximo mês
                  </div>
                )}
              </div>
            );
          })}
          
          {budgets.length === 0 && (
            <button
              onClick={() => setShowBudgetModal(true)}
              className="col-span-full py-20 rounded-[2.5rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-4 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/20 hover:bg-emerald-500/5 transition-all group"
            >
              <div className="w-16 h-16 rounded-3xl bg-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calculator size={32} />
              </div>
              <div>
                <p className="text-lg font-black text-white">Nenhum orçamento definido</p>
                <p className="text-sm font-bold text-slate-600">Clique para estabelecer sua primeira meta de gastos</p>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* Goals Section */}
      <section>
        <SmartGoals 
          goals={goals} 
          onAddGoal={() => setShowGoalModal(true)} 
          onUpdateGoal={handleEditGoal} 
        />
      </section>

      {/* Modals Rendering */}
      {showGoalModal && (
        <GoalModal
          onClose={handleCloseModal}
          transactions={transactions}
          onSave={(g) => { if (onAddGoal) onAddGoal(g); }}
          onUpdate={(id, g) => { if (onUpdateGoal) onUpdateGoal(id, g); }}
          onDelete={(id) => { if (onDeleteGoal) onDeleteGoal(id); }}
          initialData={selectedGoal}
        />
      )}

      {showBudgetModal && (
        <BudgetModal
          onClose={handleCloseModal}
          onSave={(b) => { if (onAddBudget) onAddBudget(b); }}
          onUpdate={(id, b) => { if (onUpdateBudget) onUpdateBudget(id, b); }}
          onDelete={(id) => { if (onDeleteBudget) onDeleteBudget(id); }}
          initialData={selectedBudget}
          existingCategories={budgets.map(b => b.category)}
        />
      )}
    </div>
  );
};