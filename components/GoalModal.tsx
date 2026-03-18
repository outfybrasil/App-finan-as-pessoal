import React, { useState, useEffect } from 'react';
import { Goal, Transaction } from '../types';
import { Button } from './Button';
import { X, Target, Trash2, TrendingUp, Calculator, Calendar, ArrowRight, Wallet } from 'lucide-react';
import { CustomDialog } from './CustomDialog';

interface GoalModalProps {
  onSave: (goal: Omit<Goal, 'id'>) => void;
  onUpdate?: (id: string, goal: Partial<Goal>) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
  initialData?: Goal | null;
  transactions?: Transaction[];
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
  initialData,
  transactions
}) => {
  const isEditing = !!initialData;

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [icon, setIcon] = useState('🎯');
  const [status, setStatus] = useState<'active' | 'completed'>('active');

  const GOAL_ICONS = ['🎯', '✈️', '🏠', '🚗', '🎓', '💍', '👶', '💻', '🆘', '💰', '🏖️', '🏥'];

  const formatCurrencyInput = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    const amount = parseFloat(digits) / 100;
    return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrency = (value: string) => {
    if (!value) return 0;
    return parseFloat(value.replace(/\./g, '').replace(',', '.'));
  };

  const handleCurrencyChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatCurrencyInput(rawValue);
    setter(formatted);
  };

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setTargetAmount(initialData.targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      setCurrentAmount(initialData.currentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      setDeadline(initialData.deadline);
      if (initialData.icon) setIcon(initialData.icon);
      if (initialData.status) setStatus(initialData.status);
    }
  }, [initialData]);

  const handleCalculate = () => {
    if (!targetAmount || !deadline) return;

    const target = parseCurrency(targetAmount);
    const current = parseCurrency(currentAmount) + parseCurrency(addAmount);
    const today = new Date();
    const end = new Date(deadline);

    let months = (end.getFullYear() - today.getFullYear()) * 12;
    months -= today.getMonth();
    months += end.getMonth();

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

  useEffect(() => {
    if (parseCurrency(targetAmount) > 0 && deadline) {
      handleCalculate();
    } else {
      setCalculation(null);
    }
  }, [targetAmount, currentAmount, addAmount, deadline]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finalCurrentAmount = parseCurrency(currentAmount);
    if (isEditing && addAmount) {
      finalCurrentAmount += parseCurrency(addAmount);
    }

    const goalData = {
      name,
      targetAmount: parseCurrency(targetAmount),
      currentAmount: finalCurrentAmount,
      deadline,
      icon,
      status
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

  const privacyClass = "blur-sm select-none"; // Reference if needed

  return (
    <>
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
        <div className="glass-card border-white/10 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 my-8 shadow-[0_0_80px_rgba(0,0,0,0.4)]">
          {/* Header */}
          <div className="flex justify-between items-center p-8 border-b border-white/5 bg-white/5">
            <h2 className="text-2xl font-black text-white flex items-center gap-4 tracking-tighter">
              <span className="text-4xl drop-shadow-lg">{icon}</span>
              {isEditing ? 'Gerenciar Meta' : 'Nova Meta'}
            </h2>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-all hover:bg-white/5 rounded-xl">
              <X size={28} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Icon Picker */}
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Símbolo do Objetivo</label>
              <div className="flex gap-3 overflow-x-auto p-4 custom-scrollbar -mx-2 bg-black/20 rounded-[1.5rem] border border-white/5">
                {GOAL_ICONS.map(i => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIcon(i)}
                    className={`min-w-[50px] h-[50px] rounded-2xl flex items-center justify-center text-2xl transition-all active:scale-90 ${icon === i
                        ? 'bg-emerald-500/20 border-2 border-emerald-500 shadow-lg shadow-emerald-500/10 scale-110'
                        : 'bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Toggle (Only if editing) */}
            {isEditing && (
              <div className="flex items-center justify-between glass p-5 rounded-[1.5rem] border-white/5 shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                        <Target size={20} />
                    </div>
                    <span className="text-sm font-black text-white tracking-tight">Meta Concluída?</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStatus(prev => prev === 'active' ? 'completed' : 'active')}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all active:scale-90 ${status === 'completed' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-slate-800'
                    }`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all shadow-md ${status === 'completed' ? 'translate-x-7' : 'translate-x-1.5'
                    }`} />
                </button>
              </div>
            )}

            {isEditing && (
              <div className="bg-emerald-500/5 border-2 border-emerald-500/20 p-6 rounded-[2rem] shadow-xl">
                <label className="block text-[10px] font-black text-emerald-400 mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                  <TrendingUp size={16} /> Fazer um Depósito
                </label>
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-300 font-black text-xl">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={addAmount}
                    onChange={handleCurrencyChange(setAddAmount)}
                    placeholder="0,00"
                    className="w-full bg-white/5 border-0 rounded-2xl px-6 py-5 pl-14 text-3xl text-white focus:ring-4 focus:ring-emerald-500/20 placeholder:text-slate-800 font-black tracking-tighter transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Título do Objetivo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Viagem para o Japão"
                className="w-full bg-white/[0.03] border-2 border-white/5 rounded-[1.5rem] px-6 py-5 text-white font-bold text-lg focus:border-emerald-500 focus:bg-white/[0.05] outline-none transition-all placeholder:text-slate-800"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Valor Total</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={targetAmount}
                    onChange={handleCurrencyChange(setTargetAmount)}
                    className="w-full bg-white/[0.03] border-2 border-white/5 rounded-[1.5rem] px-6 pl-12 py-5 text-white font-black tracking-tight focus:border-emerald-500 outline-none transition-all"
                    required
                  />
                </div>
              </div>
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Economizado</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={currentAmount}
                    onChange={handleCurrencyChange(setCurrentAmount)}
                    className="w-full bg-white/[0.03] border-2 border-white/5 rounded-[1.5rem] px-6 pl-12 py-5 text-white font-black tracking-tight focus:border-emerald-500 outline-none transition-all disabled:opacity-30"
                    disabled={!!addAmount}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Data Limite</label>
              <div className="relative">
                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-white/[0.03] border-2 border-white/5 rounded-[1.5rem] px-6 pl-14 py-5 text-white font-black tracking-widest focus:border-emerald-500 outline-none transition-all"
                    required
                />
              </div>
            </div>

            <div className="pt-4">
              {calculation ? (
                <div className="glass rounded-[2rem] border-white/5 p-8 space-y-6 animate-in fade-in slide-in-from-top-4 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Calculator size={80} />
                  </div>
                  
                  <div className="flex items-center gap-3 text-white font-black text-xs uppercase tracking-[0.2em] border-b border-white/5 pb-4">
                    <Calculator size={18} className="text-emerald-500" /> Projeção Financeira
                  </div>

                  {calculation.isFeasible ? (
                    <div className="text-center py-6 bg-emerald-500/10 rounded-[1.5rem] border border-emerald-500/20">
                      <p className="text-emerald-400 font-black text-2xl mb-2 tracking-tighter uppercase">Objetivo Alcançado! 🎉</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 leading-relaxed">Seu saldo atual já é suficiente para cobrir o valor alvo desta meta.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Faltam</p>
                            <p className="text-white font-black tracking-tighter">R$ {calculation.totalNeeded.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Prazo</p>
                            <p className="text-white font-black tracking-tighter">{calculation.monthsRemaining} meses</p>
                        </div>
                      </div>

                      <div className="bg-emerald-500/10 p-6 rounded-[1.5rem] border border-emerald-500/20 shadow-lg shadow-emerald-500/5 text-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block">Investimento Mensal Sugerido</span>
                        <div className="flex items-baseline justify-center gap-2">
                           <span className="text-4xl font-black text-emerald-400 tracking-tighter">
                             R$ {calculation.monthlyRequired.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                           </span>
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">/mês</span>
                        </div>
                      </div>

                      {/* Financial Reality Analysis */}
                      {(() => {
                        if (!transactions || transactions.length === 0 || calculation.monthlyRequired < 10) return null;

                        const now = new Date();
                        const threeMonthsAgo = new Date();
                        threeMonthsAgo.setMonth(now.getMonth() - 3);

                        let totalIncome = 0;
                        let totalExpense = 0;

                        const recentTx = transactions.filter(t => new Date(t.date) >= threeMonthsAgo);
                        if (recentTx.length === 0) return null;

                        recentTx.forEach(t => {
                          if (t.type === 'income') totalIncome += t.amount;
                          else if (t.type === 'expense') totalExpense += t.amount;
                        });

                        const avgSavings = (totalIncome - totalExpense) / 3;
                        const isRealistic = calculation.monthlyRequired <= avgSavings;

                        return (
                          <div className={`p-5 rounded-[1.5rem] text-[11px] border leading-relaxed ${avgSavings <= 0 ? 'bg-rose-500/5 border-rose-500/20' :
                              isRealistic ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'
                            }`}>
                            <p className="font-black uppercase tracking-[0.1em] flex items-center gap-2 mb-3">
                              {avgSavings <= 0 ? <span className="text-rose-400">🚨 Déficit Recente</span> :
                                isRealistic ? <span className="text-emerald-400">💎 Meta Saudável</span> :
                                  <span className="text-amber-400">⚖️ Ajuste Sugerido</span>}
                            </p>

                            {avgSavings <= 0 ? (
                              <p className="text-slate-500 font-bold">
                                Seu fluxo de caixa recente está negativo. Recomendamos revisar gastos antes de comprometer capital nesta meta.
                              </p>
                            ) : isRealistic ? (
                              <p className="text-slate-500 font-bold">
                                Você economiza em média <span className="text-emerald-400">R$ {avgSavings.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span> por mês. Este objetivo está perfeitamente alinhado com seu perfil financeiro.
                              </p>
                            ) : (
                              <p className="text-slate-500 font-bold">
                                A parcela de <span className="text-white">R$ {calculation.monthlyRequired.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span> supera sua sobra média atual de <span className="text-amber-400">R$ {avgSavings.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>. Considere aumentar o prazo para manter sua saúde financeira.
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white/5 border-2 border-dashed border-white/5 rounded-[2rem] p-10 text-center text-slate-700">
                  <Calculator size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="font-black text-[10px] uppercase tracking-widest">Preencha valor e prazo<br/>para calcular a viabilidade</p>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              {isEditing && (
                <button 
                    type="button" 
                    onClick={handleDeleteClick} 
                    className="p-5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-[1.5rem] hover:bg-rose-500 hover:text-white transition-all active:scale-90 shadow-lg shadow-rose-500/5 group"
                >
                  <Trash2 size={24} className="group-hover:scale-110 transition-transform" />
                </button>
              )}
              <button 
                type="submit" 
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs uppercase tracking-[0.2em] rounded-[1.5rem] py-5 transition-all shadow-2xl shadow-emerald-500/20 active:scale-[0.98]"
              >
                {isEditing ? (addAmount ? 'Confirmar Depósito & Salvar' : 'Salvar Alterações') : 'Lançar Nova Meta'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <CustomDialog
        isOpen={showDeleteConfirm}
        type="confirm"
        title="Cancelar Objetivo"
        message="Tem certeza que deseja remover esta meta? Todo o progresso acumulado e as simulações de viabilidade serão permanentemente deletados."
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};