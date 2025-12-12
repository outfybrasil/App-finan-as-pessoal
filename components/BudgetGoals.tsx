import React, { useState } from 'react';
import { Budget, Goal, Transaction } from '../types';
import { Target, Trophy, Plus, Edit2 } from 'lucide-react';
import { GoalModal } from './GoalModal';

interface BudgetGoalsProps {
  budgets: Budget[];
  goals: Goal[];
  transactions: Transaction[]; 
  onAddGoal?: (goal: Omit<Goal, 'id'>) => void;
  onUpdateGoal?: (id: string, goal: Partial<Goal>) => void;
  onDeleteGoal?: (id: string) => void;
  privacyMode?: boolean; // Novo prop
}

export const BudgetGoals: React.FC<BudgetGoalsProps> = ({ 
  budgets, 
  goals,
  transactions,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  privacyMode = false
}) => {
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const getProgressColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 100) return 'bg-rose-500';
    if (percentage >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const handleEditGoal = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowGoalModal(true);
  };

  const handleCloseModal = () => {
    setSelectedGoal(null);
    setShowGoalModal(false);
  };

  const privacyClass = privacyMode ? "blur-sm select-none bg-slate-700/50 rounded text-transparent" : "";

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      
      {/* Budgets Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Orçamentos Mensais</h2>
          <span className="text-sm text-slate-400">Flexível por Categoria</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map(budget => {
            const percentage = Math.min((budget.spent / budget.limit) * 100, 100);
            const remaining = budget.limit - budget.spent;
            
            return (
              <div key={budget.id} className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-white">{budget.category}</span>
                  <span className={`text-sm ${remaining < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {remaining < 0 ? 'Excedido' : 'Restante'}: <span className={privacyClass}>R$ {Math.abs(remaining).toFixed(0)}</span>
                  </span>
                </div>
                
                <div className="h-4 bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${getProgressColor(budget.spent, budget.limit)}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>Gasto: <span className={privacyMode ? "blur-xs select-none" : ""}>R$ {budget.spent}</span></span>
                  <span>Limite: <span className={privacyMode ? "blur-xs select-none" : ""}>R$ {budget.limit}</span></span>
                </div>

                {budget.cumulative && remaining > 0 && (
                   <div className="mt-3 text-xs text-emerald-400 flex items-center gap-1">
                      <span className="block w-2 h-2 rounded-full bg-emerald-400"></span>
                      Acumula para o próximo mês
                   </div>
                )}
              </div>
            );
          })}
          {budgets.length === 0 && (
            <div className="col-span-full p-6 text-center text-slate-500 bg-slate-800/50 rounded-xl border border-slate-800 border-dashed">
                Ainda não há orçamentos configurados.
            </div>
          )}
        </div>
      </section>

      {/* Goals Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="text-amber-400" size={24}/> Metas SMART
          </h2>
          <button 
            onClick={() => setShowGoalModal(true)}
            className="text-emerald-400 text-sm font-medium hover:text-emerald-300 flex items-center gap-1 transition-colors"
          >
            <Plus size={16} /> Nova Meta
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {goals.map(goal => {
            const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
            return (
              <div 
                key={goal.id} 
                onClick={() => handleEditGoal(goal)}
                className="bg-slate-800 p-6 rounded-2xl border border-slate-700 relative group hover:border-emerald-500/50 transition-all cursor-pointer hover:shadow-lg hover:shadow-emerald-900/10"
              >
                 <div className="absolute top-4 right-4 text-slate-600 group-hover:text-emerald-500 transition-colors">
                    <Edit2 size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                 </div>
                 
                 <h3 className="font-bold text-lg text-white mb-1 pr-6">{goal.name}</h3>
                 <p className="text-xs text-slate-400 mb-4">Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}</p>
                 
                 <div className="flex items-end gap-1 mb-2">
                    <span className={`text-2xl font-bold text-emerald-400 ${privacyClass}`}>R$ {goal.currentAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                    <span className="text-xs text-slate-500 mb-1.5 font-medium">/ <span className={privacyMode ? 'blur-xs select-none' : ''}>{goal.targetAmount.toLocaleString('pt-BR', {compactDisplay: 'short', notation: 'compact'})}</span></span>
                 </div>
                 
                 <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-700"
                      style={{ width: `${percentage}%` }}
                    ></div>
                 </div>
                 <p className="text-right text-xs text-slate-500 mt-2">{percentage.toFixed(0)}% concluído</p>
              </div>
            );
          })}
          
          {/* Add New Goal Card (Visible if empty or as the last item) */}
          <button 
            onClick={() => setShowGoalModal(true)}
            className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700 border-dashed flex flex-col items-center justify-center gap-3 hover:bg-slate-800 hover:border-slate-600 transition-all text-slate-500 hover:text-emerald-400 min-h-[180px]"
          >
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                <Plus size={24} />
            </div>
            <span className="font-medium">Criar nova meta</span>
          </button>
        </div>
      </section>

      {showGoalModal && (
        <GoalModal 
            onClose={handleCloseModal}
            transactions={transactions}
            onSave={(g) => { if(onAddGoal) onAddGoal(g); }}
            onUpdate={(id, g) => { if(onUpdateGoal) onUpdateGoal(id, g); }}
            onDelete={(id) => { if(onDeleteGoal) onDeleteGoal(id); }}
            initialData={selectedGoal}
        />
      )}
    </div>
  );
};