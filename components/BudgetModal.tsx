import React, { useState, useEffect } from 'react';
import { Budget } from '../types';
import { Button } from './Button';
import { X, Trash2, Wallet, TrendingUp } from 'lucide-react';
import { CustomDialog } from './CustomDialog';
import { EXPENSE_CATEGORIES } from '../constants/categories';

interface BudgetModalProps {
    onSave: (budget: Omit<Budget, 'id'>) => void;
    onUpdate?: (id: string, budget: Partial<Budget>) => void;
    onDelete?: (id: string) => void;
    onClose: () => void;
    initialData?: Budget | null;
    existingCategories?: string[]; 
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
    onSave,
    onUpdate,
    onDelete,
    onClose,
    initialData,
    existingCategories = []
}) => {
    const isEditing = !!initialData;

    const [category, setCategory] = useState('');
    const [limit, setLimit] = useState('');
    const [cumulative, setCumulative] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
            setCategory(initialData.category);
            setLimit(initialData.limit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
            setCumulative(initialData.cumulative || false);
        }
    }, [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const budgetData = {
            category,
            limit: parseCurrency(limit),
            spent: initialData?.spent || 0,
            cumulative
        };

        if (isEditing && onUpdate && initialData) {
            onUpdate(initialData.id, budgetData);
        } else {
            onSave(budgetData);
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

    const availableCategories = isEditing
        ? EXPENSE_CATEGORIES
        : EXPENSE_CATEGORIES.filter(c => !existingCategories.includes(c));

    return (
        <>
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
                <div className="glass-card border-white/10 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 my-8 shadow-[0_0_50px_rgba(0,0,0,0.3)]">
                    {/* Header */}
                    <div className="flex justify-between items-center p-8 border-b border-white/5 bg-white/5">
                        <h2 className="text-2xl font-black text-white flex items-center gap-4 tracking-tighter">
                            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/20">
                                <Wallet size={24} />
                            </div>
                            {isEditing ? 'Editar Orçamento' : 'Novo Orçamento'}
                        </h2>
                        <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-all hover:bg-white/5 rounded-xl">
                            <X size={28} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-8">

                        {/* Category Selection */}
                        <div className="space-y-4">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Categoria de Gasto</label>
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {availableCategories.map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setCategory(cat)}
                                        className={`px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all text-left truncate border-2 ${category === cat
                                                ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                                                : 'bg-white/[0.03] border-white/5 text-slate-400 hover:bg-white/5 hover:text-white'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                            {!category && (
                                <p className="text-[10px] font-bold text-rose-500 mt-2 ml-2 animate-pulse">Escolha uma categoria para continuar</p>
                            )}
                        </div>

                        {/* Limit Input */}
                        <div className="space-y-4">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Limite de Gastos Mensal</label>
                            <div className="relative group">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 text-lg font-black group-focus-within:text-emerald-400">R$</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={limit}
                                    onChange={handleCurrencyChange(setLimit)}
                                    placeholder="0,00"
                                    className="w-full bg-white/[0.03] border-2 border-white/5 rounded-[1.5rem] px-6 py-5 pl-14 text-white text-3xl font-black tracking-tighter focus:border-emerald-500 focus:bg-white/[0.05] outline-none transition-all placeholder:text-slate-800"
                                    required
                                />
                            </div>
                        </div>

                        {/* Cumulative Toggle */}
                        <div className="flex items-center justify-between glass p-6 rounded-[1.5rem] border-white/5 shadow-xl">
                            <div className="space-y-2">
                                <span className="text-sm font-black text-white flex items-center gap-2">
                                    <TrendingUp size={18} className="text-emerald-400" />
                                    Orçamento Acumulativo?
                                </span>
                                <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-widest max-w-[220px]">
                                    O saldo não gasto soma ao limite do próximo mês.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCumulative(!cumulative)}
                                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all active:scale-90 ${cumulative ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-slate-800'
                                    }`}
                            >
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all shadow-md ${cumulative ? 'translate-x-7' : 'translate-x-1.5'
                                    }`} />
                            </button>
                        </div>

                        {/* Actions */}
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
                                disabled={!category || !limit}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-20 text-white font-black text-xs uppercase tracking-[0.2em] rounded-[1.5rem] py-5 transition-all shadow-2xl shadow-emerald-500/20 active:scale-[0.98]"
                            >
                                {isEditing ? 'Salvar Alterações' : 'Confirmar Orçamento'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <CustomDialog
                isOpen={showDeleteConfirm}
                type="confirm"
                title="Excluir Orçamento"
                message={`Esta ação removerá permanentemente o teto de gastos para "${category}". Deseja continuar?`}
                variant="danger"
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </>
    );
};
