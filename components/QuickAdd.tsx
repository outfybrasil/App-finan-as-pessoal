import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType } from '../types';
import { Button } from './Button';
import { ArrowUpCircle, ArrowDownCircle, X, CalendarClock, Trash2, Hash, Layers, Info, Copy, CheckCircle2, Clock } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';

interface QuickAddProps {
  onAdd: (
    amount: number, 
    category: string, 
    description: string, 
    date: string, 
    type: TransactionType,
    installments: number,
    isRecurring: boolean,
    currentInstallment?: number,
    isPaid?: boolean
  ) => void;
  onEdit?: (id: string, updates: any, updateSeries?: boolean) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
  initialData?: Transaction | null;
}

export const QuickAdd: React.FC<QuickAddProps> = ({ 
  onAdd, 
  onEdit,
  onDelete,
  onClose, 
  initialData 
}) => {
  const isEditing = !!initialData;

  // Função helper para pegar data local YYYY-MM-DD sem converter para UTC
  const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  // Inicializa com data local correta
  const [date, setDate] = useState(getLocalDate());
  
  // Status Logic
  const [isPaid, setIsPaid] = useState(true);

  // Installment / Recurring Logic
  const [isRecurring, setIsRecurring] = useState(false);
  const [isInstallmentMode, setIsInstallmentMode] = useState(false);
  const [currentInstallment, setCurrentInstallment] = useState(1);
  const [installments, setInstallments] = useState(1);

  // Batch Edit Logic
  const [isSeries, setIsSeries] = useState(false);
  const [updateSeries, setUpdateSeries] = useState(false);
  
  // State for delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (initialData) {
      setAmount(initialData.amount.toString());
      setCategory(initialData.category);
      setType(initialData.type);
      setDate(initialData.date);
      setIsRecurring(!!initialData.isRecurring);
      setIsPaid(initialData.isPaid !== undefined ? initialData.isPaid : true); // Default true if legacy data
      
      let rawDesc = initialData.description;
      let detectedSeries = false;
      
      // Tenta extrair formato (Parcela X/Y) ou (Parcela X)
      const matchSplit = rawDesc.match(/\((\d+)\/(\d+)\)/);
      const matchParcelaOnly = rawDesc.match(/\(Parcela (\d+)\)/);

      if (initialData.groupId || initialData.isRecurring) {
        detectedSeries = true;
      }

      if (matchSplit) {
         setIsInstallmentMode(true);
         setCurrentInstallment(parseInt(matchSplit[1]));
         setInstallments(parseInt(matchSplit[2]));
         rawDesc = rawDesc.replace(/\s\(\d+\/\d+\)/, '').trim();
         detectedSeries = true;
      } else if (matchParcelaOnly) {
         setIsInstallmentMode(true);
         setCurrentInstallment(parseInt(matchParcelaOnly[1]));
         setInstallments(1);
         rawDesc = rawDesc.replace(/\s\(Parcela \d+\)/, '').trim();
         detectedSeries = true;
      }
      
      setDescription(rawDesc);
      setIsSeries(detectedSeries);
    } else {
        // Novo registro: Se a data for hoje ou passado, default PAGO. Se futuro, default PENDENTE.
        const today = getLocalDate();
        setIsPaid(date <= today);
    }
  }, [initialData, date]); // Run status logic when date changes too for new entries

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;
    
    if (isInstallmentMode && !isRecurring && currentInstallment > installments) {
        alert("A parcela atual não pode ser maior que o total.");
        return;
    }

    let finalDescription = description.trim();
    
    // Se for edição e NÃO for atualizar a série inteira, mantemos o sufixo original da parcela na UI
    // Se for atualizar a série, o App.tsx vai reconstruir as descrições das outras parcelas
    if (isEditing && !updateSeries) {
        if (!isRecurring && isInstallmentMode && installments > 1) {
            finalDescription = `${finalDescription} (${currentInstallment}/${installments})`;
        } else if (!isRecurring && isInstallmentMode && currentInstallment > 0) {
             // Caso tenha virado apenas (Parcela X)
             finalDescription = `${finalDescription} (Parcela ${currentInstallment})`;
        }
    }

    const payload = {
      amount: parseFloat(amount),
      category,
      description: finalDescription,
      date,
      type,
      isRecurring,
      isPaid
    };

    if (isEditing && onEdit && initialData) {
      onEdit(initialData.id, payload, updateSeries);
    } else {
      onAdd(
        payload.amount, 
        payload.category, 
        description, 
        payload.date, 
        payload.type, 
        isInstallmentMode ? installments : 1, 
        payload.isRecurring,
        currentInstallment,
        isPaid
      );
    }
    onClose();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (initialData && onDelete) {
        onDelete(initialData.id);
        setShowDeleteConfirm(false);
        onClose();
    }
  };

  const installmentValue = (parseFloat(amount || '0') / (installments || 1));
  const remainingInstallments = Math.max(0, installments - currentInstallment);

  // Adicionado 'Mercado' explicitamente
  const expenseCategories = ['Mercado', 'Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Educação', 'Compras', 'Outros'];
  const incomeCategories = ['Salário', 'Freelance', 'Investimentos', 'Presente', 'Outros'];

  return (
    <>
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center p-4 border-b border-slate-800 shrink-0">
            <h2 className="text-xl font-bold text-slate-100">
              {isEditing ? 'Editar Registro' : 'Novo Registro'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
            {/* Type Selector */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                  type === 'expense' 
                    ? 'bg-rose-500/10 border-rose-500 text-rose-500' 
                    : 'bg-slate-800 border-transparent text-slate-400 hover:bg-slate-750'
                }`}
              >
                <ArrowDownCircle size={20} />
                <span className="font-semibold">Despesa</span>
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                  type === 'income' 
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' 
                    : 'bg-slate-800 border-transparent text-slate-400 hover:bg-slate-750'
                }`}
              >
                <ArrowUpCircle size={20} />
                <span className="font-semibold">Receita</span>
              </button>
            </div>

            {/* Amount Input */}
            <div className="relative">
              <label className="block text-xs font-medium text-slate-400 mb-1">
                {isInstallmentMode && !isEditing ? 'Valor Total da Compra' : 'Valor'}
              </label>
              <span className="absolute left-4 top-9 text-slate-400 text-lg">R$</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                autoFocus={!isEditing}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 text-2xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder:text-slate-700"
                required
              />
              {isInstallmentMode && !isEditing && amount && (
                 <p className="text-[10px] text-slate-500 text-right mt-1 px-1">
                    Serão {installments}x de R$ {installmentValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                 </p>
              )}
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Descrição</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={type === 'income' ? "Ex: Salário Mensal" : "Ex: Compra de TV"}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-slate-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-slate-600 outline-none appearance-none"
                    required
                  >
                    <option value="" disabled>Selecione</option>
                    {(type === 'expense' ? expenseCategories : incomeCategories).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    {type === 'income' ? 'Data Recebimento' : 'Data Vencimento'}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-slate-600 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Status Toggle (Paid/Pending) */}
              <div 
                  onClick={() => setIsPaid(!isPaid)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isPaid 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-slate-800 border-slate-700'
                  }`}
              >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isPaid ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'
                  }`}>
                      {isPaid ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                  </div>
                  <div>
                      <p className={`font-medium ${isPaid ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {isPaid 
                            ? (type === 'income' ? 'Valor Recebido' : 'Conta Paga') 
                            : (type === 'income' ? 'A Receber' : 'Pagamento Pendente')}
                      </p>
                      <p className="text-xs text-slate-500">
                          {isPaid ? 'Esta transação já foi efetivada.' : 'Marque quando o valor sair/entrar na conta.'}
                      </p>
                  </div>
                  <div className="ml-auto">
                       <div className={`w-12 h-6 rounded-full p-1 transition-colors ${isPaid ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                           <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isPaid ? 'translate-x-6' : 'translate-x-0'}`} />
                       </div>
                  </div>
              </div>

              {/* Installments / Recurring Options */}
              <div className="bg-slate-800/50 p-4 rounded-xl space-y-4 border border-slate-800/50">
                  <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                          <CalendarClock size={16} />
                          {type === 'expense' ? 'Despesa fixa mensal?' : 'Receita fixa mensal?'}
                      </label>
                      <input 
                          type="checkbox" 
                          checked={isRecurring}
                          onChange={(e) => {
                              setIsRecurring(e.target.checked);
                              if(e.target.checked) {
                                  setIsInstallmentMode(false);
                              }
                          }}
                          className={`w-5 h-5 rounded bg-slate-700 border-slate-600 focus:ring-offset-slate-900 ${
                              type === 'expense' 
                              ? 'text-rose-500 focus:ring-rose-500' 
                              : 'text-emerald-500 focus:ring-emerald-500'
                          }`}
                      />
                  </div>

                  {/* Edit Series Toggle */}
                  {isEditing && isSeries && (
                    <div className="animate-in fade-in slide-in-from-top-1 bg-slate-700/30 p-3 rounded-lg border border-slate-600/50">
                       <div className="flex items-center justify-between">
                           <label className="text-xs font-medium text-indigo-300 flex items-center gap-2">
                               <Copy size={14} />
                               Aplicar alterações em todas as parcelas?
                           </label>
                           <input 
                              type="checkbox" 
                              checked={updateSeries}
                              onChange={(e) => setUpdateSeries(e.target.checked)}
                              className="w-4 h-4 rounded bg-slate-700 border-slate-500 text-indigo-500 focus:ring-indigo-500"
                           />
                       </div>
                       <p className="text--[10px] text-slate-400 mt-1">
                          Se marcado, o valor e a categoria serão atualizados em todos os lançamentos futuros desta série.
                       </p>
                    </div>
                  )}

                  {!isRecurring && type === 'expense' && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 border-t border-slate-700/50 pt-4">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <Layers size={16} />
                                Parcelamento?
                            </label>
                            <input 
                              type="checkbox" 
                              checked={isInstallmentMode}
                              onChange={(e) => {
                                  setIsInstallmentMode(e.target.checked);
                                  if(!e.target.checked) {
                                      setCurrentInstallment(1);
                                      setInstallments(1);
                                  }
                              }}
                              className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900"
                            />
                          </div>
                          
                          {isInstallmentMode && (
                            <div className="animate-in fade-in slide-in-from-top-1 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-medium text-amber-400">Parcela Atual / Total</label>
                                    <span className="text-[10px] text-slate-500">Ex: 3 de 10</span>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1">
                                        <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                                        <input
                                            type="number"
                                            min="1"
                                            value={currentInstallment}
                                            onChange={(e) => setCurrentInstallment(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-full bg-slate-800 border-slate-600 rounded-lg pl-9 pr-3 py-2 text-white focus:ring-2 focus:ring-amber-500 outline-none text-center font-mono"
                                        />
                                    </div>
                                    <span className="text-slate-400 font-medium">de</span>
                                    <div className="relative flex-1">
                                        <Layers size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                                        <input
                                            type="number"
                                            min="1"
                                            max="60"
                                            value={installments}
                                            onChange={(e) => setInstallments(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-full bg-slate-800 border-slate-600 rounded-lg pl-9 pr-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none text-center font-mono"
                                        />
                                    </div>
                                </div>
                                
                                {!isEditing && remainingInstallments > 0 && (
                                   <div className="mt-3 flex items-start gap-2 text-xs text-emerald-400">
                                      <Info size={14} className="shrink-0 mt-0.5" />
                                      <p>
                                        O sistema criará automaticamente as <strong>{remainingInstallments}</strong> parcelas futuras (marcadas como pendentes).
                                      </p>
                                   </div>
                                )}
                            </div>
                          )}
                      </div>
                  )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              {isEditing && (
                  <Button 
                      type="button" 
                      variant="danger" 
                      onClick={handleDeleteClick} 
                      className="shrink-0 flex items-center gap-2"
                      title="Excluir este registro"
                  >
                      <Trash2 size={18} />
                      <span className="hidden sm:inline">Excluir</span>
                  </Button>
              )}
              <Button type="submit" fullWidth size="lg">
                  {isEditing ? 'Salvar Alterações' : 'Confirmar Registro'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Excluir Registro"
        message="Tem certeza que deseja apagar esta movimentação? Esta ação não poderá ser desfeita e afetará seu saldo atual."
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};