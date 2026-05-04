import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType } from '../types';
import { Trash2, Layers, ChevronRight, PieChart, AlertCircle, ArrowDownCircle, ArrowUpCircle, RotateCcw, Plus, Undo2, Info } from 'lucide-react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories';
import { CustomDialog } from './CustomDialog';
import { useCategories } from '../context/CategoryContext';

interface CategorySettingsProps {
  transactions: Transaction[];
  onRecategorizeCategory: (oldCategory: string, type: TransactionType, newCategory: string) => Promise<boolean>;
}

export const CategorySettings: React.FC<CategorySettingsProps> = ({ transactions, onRecategorizeCategory }) => {
  const [activeTab, setActiveTab] = useState<TransactionType>('expense');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{ name: string; type: TransactionType; isDefault: boolean } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const { 
    hiddenCategories, 
    hideCategory, 
    unhideCategory, 
    customCategories, 
    addCustomCategory, 
    removeCustomCategory, 
    resetCategories 
  } = useCategories();

  const categoriesData = useMemo(() => {
    const defaults = activeTab === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    
    // Group all transactions by category for the active tab type
    const categoryCounts: Record<string, number> = {};
    transactions
      .filter(t => t.type === activeTab)
      .forEach(t => {
        categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
      });

    // All categories currently in use or in defaults or in custom categories list
    const allAvailable = Array.from(new Set([...defaults, ...Object.keys(categoryCounts), ...customCategories]))
      .filter(cat => cat && cat !== 'Outros' && !hiddenCategories.includes(cat))
      .sort((a, b) => a.localeCompare(b));

    // Removed (hidden) default categories for the current tab
    const removed = defaults.filter(cat => hiddenCategories.includes(cat));

    return {
      all: allAvailable,
      defaults,
      removed,
      counts: categoryCounts
    };
  }, [transactions, activeTab, hiddenCategories, customCategories]);


  const handleDeleteClick = (name: string) => {
    const isDefault = categoriesData.defaults.includes(name);
    setCategoryToDelete({ name, type: activeTab, isDefault });
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    
    setIsDeleting(true);
    try {
      // Recategorize transactions if needed
      const hasTransactions = (categoriesData.counts[categoryToDelete.name] || 0) > 0;
      
      let success = true;
      if (hasTransactions) {
        success = await onRecategorizeCategory(categoryToDelete.name, categoryToDelete.type, 'Outros');
      }
      
      if (success) {
        // If it was a default category, hide it
        if (categoryToDelete.isDefault) {
          hideCategory(categoryToDelete.name);
        } else {
          // If it was a custom category, remove from context
          removeCustomCategory(categoryToDelete.name);
        }
        setShowDeleteConfirm(false);
        setCategoryToDelete(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim()) {
      addCustomCategory(newCategoryName.trim());
      setNewCategoryName('');
    }
  };


  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black font-manrope text-slate-100 flex items-center gap-3">
            <Layers className="text-emerald-500" />
            Gestão de Categorias
          </h2>
          <p className="text-ms-muted text-sm mt-1">Personalize sua lista de {activeTab === 'expense' ? 'gastos' : 'ganhos'} do seu jeito.</p>
        </div>
        
        {hiddenCategories.length > 0 && (
          <button
            onClick={resetCategories}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-emerald-950 transition-all text-xs font-bold border border-emerald-500/20"
          >
            <RotateCcw size={14} />
            Restaurar Tudo
          </button>
        )}
      </div>

      {/* Tabs and Add Category */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div className="flex gap-2 p-1.5 bg-zinc-900/50 rounded-2xl border border-white/5 w-full sm:w-fit backdrop-blur-xl">
          <button
            onClick={() => setActiveTab('expense')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'expense' 
                ? 'bg-rose-500 text-rose-950 shadow-lg shadow-rose-500/20' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <ArrowDownCircle size={16} />
            Despesas
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'income' 
                ? 'bg-emerald-500 text-emerald-950 shadow-lg shadow-emerald-500/20' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <ArrowUpCircle size={16} />
            Receitas
          </button>
        </div>

        <form onSubmit={handleAddCategory} className="flex gap-2 w-full lg:max-w-sm">
          <div className="relative flex-1 group">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Criar nova categoria..."
              className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-3 text-sm font-bold text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none">
              <span className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest">Pressione Enter</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={!newCategoryName.trim()}
            className="flex items-center justify-center w-12 h-12 bg-emerald-500 text-emerald-950 rounded-2xl hover:bg-emerald-400 disabled:opacity-20 disabled:grayscale transition-all shadow-lg shadow-emerald-500/10 active:scale-95"
          >
            <Plus size={24} />
          </button>
        </form>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main List Section */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-ms-muted">Suas Categorias Ativas</h3>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-lg">
              {categoriesData.all.length} Total
            </span>
          </div>

          {categoriesData.all.length === 0 ? (
            <div className="bg-zinc-900/30 border border-dashed border-white/5 rounded-3xl p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-slate-700 mb-4 border border-white/5">
                <PieChart size={32} />
              </div>
              <p className="text-slate-500 text-sm font-bold mb-1">Lista vazia</p>
              <p className="text-slate-600 text-xs">Crie uma categoria ou restaure as padrões acima.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categoriesData.all.map(cat => {
                const isDefault = categoriesData.defaults.includes(cat);
                const count = categoriesData.counts[cat] || 0;
                
                return (
                  <div 
                    key={cat}
                    className="group flex items-center justify-between p-4 bg-zinc-900 border border-white/5 rounded-2xl hover:border-white/10 hover:bg-zinc-800/50 transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        isDefault 
                          ? 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-emerald-950' 
                          : 'bg-white/5 text-slate-500 group-hover:bg-slate-100 group-hover:text-slate-900'
                      }`}>
                        <Layers size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-100 group-hover:text-white transition-colors">{cat}</h4>
                          {isDefault && (
                            <span className="text-[7px] bg-white/5 text-slate-500 border border-white/5 px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest">
                              Sistema
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-ms-muted font-black uppercase tracking-widest mt-0.5">
                          {count} {count === 1 ? 'Lançamento' : 'Lançamentos'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteClick(cat)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-500/5 text-rose-500/40 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white hover:shadow-lg hover:shadow-rose-500/20 active:scale-90"
                      title={isDefault ? "Remover Categoria Padrão" : "Excluir Categoria Permanente"}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar / Restore Section */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/10 rounded-3xl p-6 backdrop-blur-md">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Info size={20} />
              </div>
              <div>
                <h4 className="font-bold text-emerald-400 text-sm">Controle Total</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Você pode <strong className="text-slate-200">excluir qualquer categoria</strong>, inclusive as do sistema.
                  <br /><br />
                  Se houver lançamentos, eles serão movidos automaticamente para <strong className="text-emerald-300">"Outros"</strong> para você não perder seus dados.
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-5 flex items-center gap-2">
              <Undo2 size={14} className="text-rose-500/50" />
              Categorias Removidas
            </h4>
            
            {categoriesData.removed.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest italic">Nenhuma categoria removida</p>
              </div>
            ) : (
              <div className="space-y-2">
                {categoriesData.removed.map(cat => (
                  <div 
                    key={cat} 
                    className="group flex items-center justify-between p-3 bg-zinc-950/50 rounded-2xl border border-white/[0.03] hover:border-emerald-500/20 transition-all"
                  >
                    <span className="text-xs text-slate-400 font-bold group-hover:text-slate-200 transition-colors">{cat}</span>
                    <button
                      onClick={() => unhideCategory(cat)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/5 text-[9px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500 hover:text-emerald-950 transition-all active:scale-95"
                    >
                      Restaurar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-600 mb-3">Dica de Especialista</h4>
            <p className="text-xs text-slate-500 leading-relaxed font-medium italic">
              "Menos é mais. Deixe visível apenas o que você realmente usa no mês para facilitar o registro dos gastos."
            </p>
          </div>
        </div>
      </div>

      <CustomDialog
        isOpen={showDeleteConfirm}
        type="confirm"
        title="Confirmar Exclusão"
        message={`Deseja realmente excluir a categoria "${categoryToDelete?.name}"?`}
        description={
          (categoriesData.counts[categoryToDelete?.name || ''] || 0) > 0
            ? `Atenção: Os ${categoriesData.counts[categoryToDelete?.name || '']} lançamentos desta categoria serão movidos para "Outros".`
            : "Esta categoria não possui lançamentos vinculados."
        }
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={isDeleting}
      />
    </div>
  );
};
