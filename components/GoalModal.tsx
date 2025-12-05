import React, { useState, useEffect } from 'react';
import { Goal, Transaction } from '../types';
import { Button } from './Button';
import { X, Target, Trash2, TrendingUp, Calculator, Calendar, ArrowRight } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';

interface GoalModalProps {
  onSave: (goal: Omit<Goal, 'id'>) => void;
  onUpdate?: (id: string, goal: Partial<Goal>) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
  initialData?: Goal | null;
  transactions?: Transaction[]; // Mantido como opcional para compatibilidade, mas não usado no cálculo simples
}

interface CalculationResult {
  monthlyRequired: number;
  monthsRemaining: number;
  totalNeeded: number;
  isFeasible: boolean;
}

export const GoalModal: React.FC<GoalModalProps> = ({ 
  onSave, 
  onUpdate,
  onDelete,
  onClose, 
  initialData
}) => {
  const isEditing = !!initialData;

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [addAmount, setAddAmount] = useState(''); 
  
  // Calculator State
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);

  // Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setTargetAmount(initialData.targetAmount.toString());
      setCurrentAmount(initialData.currentAmount.toString());
      setDeadline(initialData.deadline);
    }
  }, [initialData]);

  // Função de Calculadora Matemática (Substitui a IA)
  const handleCalculate = () => {
      if (!targetAmount || !deadline) {
          return;
      }

      const target = parseFloat(targetAmount);
      // O saldo considerado é o atual + o que está sendo depositado agora (se houver)
      const current = parseFloat(currentAmount || '0') + parseFloat(addAmount || '0');
      
      const today = new Date();
      const end = new Date(deadline);
      
      // Cálculo de meses restantes
      let months = (end.getFullYear() - today.getFullYear()) * 12;
      months -= today.getMonth();
      months += end.getMonth();
      
      // Se a data for no passado ou mês atual, consideramos 1 mês para evitar divisão por zero
      const monthsRemaining = Math.max(months, 1);
      
      const totalNeeded = target - current;
      const monthlyRequired = totalNeeded > 0 ? totalNeeded / monthsRemaining : 0;

      setCalculation({
          monthlyRequired,
          monthsRemaining,
          totalNeeded,
          isFeasible: totalNeeded <= 0
      });
  };

  // Recalcular automaticamente quando os valores mudam, se o usuário já tiver clicado em calcular ou se os campos estiverem preenchidos
  useEffect(() => {
    if (targetAmount && deadline) {
        handleCalculate();
    } else {
        setCalculation(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetAmount, currentAmount, addAmount, deadline]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalCurrentAmount = parseFloat(currentAmount || '0');
    if (isEditing && addAmount) {
        finalCurrentAmount += parseFloat(addAmount);
    }

    const goalData = {
      name,
      targetAmount: parseFloat(targetAmount),
      currentAmount: finalCurrentAmount,
      deadline
    };

    if (isEditing && onUpdate && initialData) {
      onUpdate(initialData.id, goalData);
    } else {
      onSave(goalData);
    }
    onClose();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (initialData && onDelete) {
        onDelete(initialData.id);
        setShowDeleteConfirm(false);
        onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8">
          <div className="flex justify-between items-center p-4 border-b border-slate-800">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Target className="text-emerald-500" size={20}/>
              {isEditing ? 'Gerenciar Meta' : 'Nova Meta'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            
            {isEditing && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl mb-4">
                <label className="block text-xs font-bold text-emerald-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp size={14} /> Depositar na Meta
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-200 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-slate-800 border-0 rounded-lg px-4 py-3 pl-10 text-xl text-white focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-600 font-bold"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Nome do Objetivo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Viagem para Europa"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Valor Alvo</label>
                  <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">R$</span>
                      <input
                      type="number"
                      step="0.01"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 pl-8 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      required
                      />
                  </div>
              </div>
              <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Saldo Atual</label>
                  <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">R$</span>
                      <input
                      type="number"
                      step="0.01"
                      value={currentAmount}
                      onChange={(e) => setCurrentAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 pl-8 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      disabled={!!addAmount} 
                      />
                  </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Prazo Estimado</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />
            </div>

            {/* Calculator Result Section */}
            <div className="pt-2">
              {calculation ? (
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-center gap-2 text-slate-300 font-bold border-b border-slate-700 pb-2">
                          <Calculator size={16} className="text-emerald-500" /> Calculadora de Meta
                      </div>
                      
                      {calculation.isFeasible ? (
                          <div className="text-center py-2">
                             <p className="text-emerald-400 font-bold text-lg mb-1">Meta Atingida! 🎉</p>
                             <p className="text-xs text-slate-400">O saldo atual já cobre o valor alvo.</p>
                          </div>
                      ) : (
                          <>
                             <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-xs">Falta acumular:</span>
                                <span className="text-slate-200 font-medium text-sm">R$ {calculation.totalNeeded.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                             </div>
                             
                             <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-xs">Tempo restante:</span>
                                <span className="text-slate-200 font-medium text-sm">{calculation.monthsRemaining} meses</span>
                             </div>

                             <div className="mt-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 flex flex-col items-center">
                                <span className="text-slate-400 text-xs mb-1">Você precisa guardar</span>
                                <span className="text-emerald-400 font-bold text-xl">
                                    R$ {calculation.monthlyRequired.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                    <span className="text-sm text-slate-500 font-normal"> /mês</span>
                                </span>
                             </div>
                          </>
                      )}
                  </div>
              ) : (
                  <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-4 text-center text-slate-500 text-sm">
                      <p>Preencha o valor e o prazo para calcular as parcelas.</p>
                  </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-800 mt-2">
              {isEditing && (
                  <Button type="button" variant="danger" onClick={handleDeleteClick} className="shrink-0">
                      <Trash2 size={20} />
                  </Button>
              )}
              <Button type="submit" fullWidth>
                {isEditing ? (addAmount ? 'Confirmar Depósito & Salvar' : 'Salvar Alterações') : 'Criar Meta'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Excluir Meta"
        message="Tem certeza que deseja excluir esta meta financeira? Todo o histórico de progresso deste objetivo será perdido."
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};