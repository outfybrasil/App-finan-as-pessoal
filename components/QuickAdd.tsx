import React, { useState, useEffect } from 'react';
import { useTravelMode } from '../context/TravelContext';
import { Transaction, TransactionType } from '../types';
import { TrendingUp, TrendingDown, FileText, X, CalendarClock, Trash2, Layers, Info, CheckCircle2, Clock, CreditCard, Plus, Minus, Calculator, ChevronRight, ArrowDownCircle, ArrowUpCircle, PiggyBank, Save } from 'lucide-react';
import { CustomDialog } from './CustomDialog';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, ACCOUNT_OPTIONS } from '../constants/categories';

interface QuickAddProps {
  onAdd: (
    amount: number,
    category: string,
    description: string,
    date: string,
    type: TransactionType,
    installments: number,
    isRecurring: boolean,
    account: string,
    currentInstallment?: number,
    isPaid?: boolean,
    splits?: { account: string; amount: number }[]
  ) => void;
  onEdit?: (id: string, updates: any, updateSeries?: boolean) => void;
  onDelete?: (transaction: Transaction) => void;
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
  const isEditing = !!(initialData && initialData.id && initialData.id !== 'new_transfer');

  // Helper to get local date YYYY-MM-DD
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
  const [account, setAccount] = useState('Carteira');
  const [type, setType] = useState<TransactionType>('expense');
  const [date, setDate] = useState(getLocalDate());
  const [isPaid, setIsPaid] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);
  const [isInstallmentMode, setIsInstallmentMode] = useState(false);
  const [currentInstallment, setCurrentInstallment] = useState(1);
  const [installments, setInstallments] = useState(1);
  const [isSeries, setIsSeries] = useState(false);
  const [updateSeries, setUpdateSeries] = useState(false);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splits, setSplits] = useState<{ account: string; amount: number }[]>([]);
  const [destinationAccount, setDestinationAccount] = useState('Itaú');

  const { isTravelModeActive, travelEventName } = useTravelMode();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    if (isTravelModeActive && !initialData && !isEditing) {
      setCategory('Viagem');
      setDescription(travelEventName);
    }
  }, [isTravelModeActive, travelEventName, initialData, isEditing]);

  useEffect(() => {
    if (initialData) {
      setAmount(initialData.amount.toString());
      setCategory(initialData.category);
      setAccount(initialData.account || 'Carteira');
      setType(initialData.type);
      setDate(initialData.date);
      setIsRecurring(!!initialData.isRecurring);
      setIsPaid(initialData.isPaid !== undefined ? initialData.isPaid : true);

      let rawDesc = initialData.description;
      let detectedSeries = false;

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

      if (initialData.tags) {
        const reserveTag = initialData.tags.find(t => t.startsWith('#reserva:'));
        if (reserveTag) {
          setEnvelope(reserveTag.replace('#reserva:', ''));
          setUseEnvelope(true);
        }
      }

      if (initialData.splits && initialData.splits.length > 0) {
        setIsSplitMode(true);
        setSplits(initialData.splits);
      } else {
        setIsSplitMode(false);
        setSplits([]);
      }

      if (initialData.destinationAccount) {
        setDestinationAccount(initialData.destinationAccount);
      }
    }
  }, [initialData, isEditing]);

  useEffect(() => {
    if (!initialData) {
      const today = getLocalDate();
      setIsPaid(date <= today);
    }
  }, [date, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;

    if (isInstallmentMode && !isRecurring && currentInstallment > installments) {
      setAlertMessage("A parcela atual não pode ser maior que o total.");
      setShowAlertDialog(true);
      return;
    }

    let finalDescription = description.trim();

    if (isEditing && !updateSeries) {
      if (!isRecurring && isInstallmentMode && installments > 1) {
        finalDescription = `${finalDescription} (${currentInstallment}/${installments})`;
      } else if (!isRecurring && isInstallmentMode && currentInstallment > 0) {
        finalDescription = `${finalDescription} (Parcela ${currentInstallment})`;
      }
    }

    const payload = {
      amount: parseFloat(amount),
      category,
      account,
      description: finalDescription,
      date,
      type,
      isRecurring,
      isPaid,
      installments: isInstallmentMode ? installments : 1,
      currentInstallment: currentInstallment,
      splits: isSplitMode ? splits : undefined,
      destinationAccount: type === 'transfer' ? destinationAccount : undefined,
      tags: initialData?.tags || []
    };

    if (isEditing && onEdit) {
      const success = await onEdit(initialData!.id, payload, updateSeries);
      if (success === false) {
        setAlertMessage("Erro ao salvar as alterações. Verifique sua conexão ou campos obrigatórios.");
        setShowAlertDialog(true);
        return; // Não fecha o modal se falhar
      }
    } else {
      onAdd(
        payload.amount,
        payload.category,
        payload.description,
        payload.date,
        payload.type as any,
        payload.installments,
        payload.isRecurring,
        payload.account,
        payload.currentInstallment,
        payload.isPaid,
        payload.splits,
        payload.destinationAccount,
        payload.tags
      );
    }
    onClose();
  };

  const handleAddSplit = () => {
    const totalCurrent = splits.reduce((acc, s) => acc + s.amount, 0);
    const remaining = Math.max(0, parseFloat(amount || '0') - totalCurrent);
    const newSplits = [...splits, { account: 'Carteira', amount: remaining }];
    setSplits(newSplits);
    const newTotal = newSplits.reduce((acc, s) => acc + s.amount, 0);
    setAmount(newTotal.toString());
  };

  const handleRemoveSplit = (index: number) => {
    const newSplits = splits.filter((_, i) => i !== index);
    setSplits(newSplits);
    const newTotal = newSplits.reduce((acc, s) => acc + s.amount, 0);
    setAmount(newTotal.toString());
  };

  const handleSplitChange = (index: number, field: 'account' | 'amount', value: string | number) => {
    const newSplits = [...splits];
    if (field === 'amount') {
      newSplits[index].amount = parseFloat(value as string) || 0;
    } else {
      newSplits[index].account = value as string;
    }
    setSplits(newSplits);
    
    if (field === 'amount') {
      const newTotal = newSplits.reduce((acc, s) => acc + s.amount, 0);
      setAmount(newTotal.toString());
    }
  };

  const totalSplitsAmount = splits.reduce((acc, s) => acc + s.amount, 0);
  const isSplitsValid = !isSplitMode || Math.abs(totalSplitsAmount - (parseFloat(amount) || 0)) < 0.01;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (initialData && onDelete) {
      onDelete(initialData);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  const installmentValue = (parseFloat(amount || '0') / (installments || 1));

  return (
    <>
      <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-300">
        <div className="bg-zinc-950 border-t md:border border-white/5 rounded-t-3xl md:rounded-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-6 md:zoom-in-95 duration-300 flex flex-col max-h-[92dvh] md:max-h-[90vh] shadow-2xl shadow-black/50">
          <div className="flex justify-center pt-3 md:hidden">
            <div className="h-1 w-12 rounded-full bg-zinc-800" />
          </div>

          <div className="flex justify-between items-center p-6 md:p-8 border-b border-white/5 shrink-0 bg-zinc-900/50">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                {isEditing ? 'Editar Registro' : 'Novo Registro'}
              </h2>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Sincronizado via Appwrite</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-white/5">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 md:p-8 space-y-6 md:space-y-8 overflow-y-auto custom-scrollbar">
            {/* Type Selector */}
            <div className="flex gap-4 p-1.5 bg-zinc-900 border border-white/5 rounded-2xl">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl border transition-all duration-500 ${type === 'expense'
                  ? 'bg-rose-500 text-white border-rose-500 shadow-xl shadow-rose-500/20'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
                  }`}
              >
                <ArrowDownCircle size={20} className={type === 'expense' ? 'animate-bounce' : ''} />
                <span className="font-black text-xs uppercase tracking-widest">Despesa</span>
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl border transition-all duration-500 ${type === 'income'
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-xl shadow-emerald-500/20'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
                  }`}
              >
                <ArrowUpCircle size={20} className={type === 'income' ? 'animate-bounce' : ''} />
                <span className="font-black text-xs uppercase tracking-widest">Receita</span>
              </button>
            </div>

            {/* Amount Input */}
            <div className="relative group">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">
                {isInstallmentMode && !isEditing ? 'Valor Total da Compra' : 'Valor do Lançamento'}
              </label>
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 text-xl font-black">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  autoFocus
                  className="w-full bg-zinc-900 border border-white/5 rounded-xl px-6 py-6 pl-14 text-4xl font-black text-zinc-100 outline-none focus:border-zinc-700 transition-all font-sans tracking-tighter"
                />
              </div>
              {isInstallmentMode && !isEditing && amount && (
                <div className="absolute right-4 -bottom-6 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">
                    {installments}x de R$ {installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="group">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Descrição</label>
              <div className="relative">
                <Info size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={type === 'income' ? "Ex: Salário Mensal" : "Ex: Compra de TV"}
                  className="w-full bg-zinc-900 border border-white/5 rounded-xl px-5 py-4 pl-12 text-zinc-100 font-bold placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-all"
                />
              </div>
            </div>

            {/* Grid for Category, Date, Account */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Categoria</label>
                <div className="relative">
                  <Layers size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/5 rounded-xl px-5 py-4 pl-12 text-zinc-100 font-bold outline-none appearance-none cursor-pointer focus:border-zinc-700 transition-all"
                    required
                  >
                    <option value="" disabled className="bg-zinc-950">Selecione</option>
                    {(type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                      <option key={cat} value={cat} className="bg-slate-900">{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Data</label>
                <div className="relative">
                  <CalendarClock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/5 rounded-xl px-5 py-4 pl-12 text-zinc-100 font-bold outline-none cursor-pointer focus:border-zinc-700 transition-all [color-scheme:dark]"
                    required
                  />
                </div>
              </div>
            </div>


            {type === 'transfer' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-2">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Origem</label>
                  <div className="relative">
                    <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                    <select
                      value={account}
                      onChange={(e) => setAccount(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/5 rounded-xl px-5 py-4 pl-12 text-zinc-100 font-bold outline-none appearance-none cursor-pointer focus:border-zinc-700 transition-all font-sans"
                    >
                      {ACCOUNT_OPTIONS.map(acc => (
                        <option key={acc} value={acc} className="bg-zinc-950">{acc}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 text-blue-400">Destino</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500/60 pointer-events-none">
                      <Plus size={18} />
                    </div>
                    <select
                      value={destinationAccount}
                      onChange={(e) => setDestinationAccount(e.target.value)}
                      className="w-full bg-blue-500/5 border border-blue-500/20 rounded-xl px-5 py-4 pl-12 text-zinc-100 font-bold outline-none appearance-none cursor-pointer focus:bg-blue-500/10 transition-all font-sans"
                    >
                      {ACCOUNT_OPTIONS.map(acc => (
                        <option key={acc} value={acc} className="bg-slate-900">{acc}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {account === destinationAccount && (
                  <p className="col-span-1 sm:col-span-2 text-rose-500 text-[10px] font-black uppercase tracking-tighter text-center mt-1">
                    A conta de origem e destino devem ser diferentes.
                  </p>
                )}
              </div>
            ) : !isSplitMode && (
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Conta / Destino</label>
                <div className="relative">
                  <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                  <select
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/5 rounded-xl px-5 py-4 pl-12 text-zinc-100 font-bold outline-none appearance-none cursor-pointer focus:border-zinc-700 transition-all"
                  >
                    {ACCOUNT_OPTIONS.map(acc => (
                      <option key={acc} value={acc} className="bg-slate-900">{acc}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Status & Options Section */}
            <div className="space-y-4">
              <div
                onClick={() => setIsPaid(!isPaid)}
                className={`group flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer ${isPaid
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-zinc-900 border-white/5'
                  }`}
              >
                <div className={`w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center shrink-0 transition-all duration-500 ${isPaid
                  ? 'bg-emerald-500 text-white shadow-emerald-500/20 rotate-0'
                  : 'bg-white/5 text-slate-500 -rotate-12'
                  }`}>
                  {isPaid ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-black uppercase tracking-widest ${isPaid ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {isPaid ? (type === 'income' ? 'Efetivado' : 'Pago') : 'Pendente'}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5">Clique para alternar o status</p>
                </div>
                <div className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${isPaid ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-800'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-lg transition-transform duration-300 ${isPaid ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </div>

              {type === 'expense' && (
                <div className={`group flex flex-col gap-4 p-5 rounded-2xl border transition-all ${isSplitMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-zinc-900 border-white/5'}`}>
                  <div className="flex items-center gap-4 cursor-pointer" onClick={() => {
                    setIsSplitMode(!isSplitMode);
                    if (!isSplitMode && splits.length === 0) {
                      setSplits([{ account, amount: parseFloat(amount) || 0 }]);
                    }
                  }}>
                    <div className={`w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center shrink-0 transition-all duration-500 ${isSplitMode ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-white/5 text-slate-500'}`}>
                      <Calculator size={24} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-black uppercase tracking-widest ${isSplitMode ? 'text-amber-400' : 'text-slate-400'}`}>
                        Pagamento Dividido
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 mt-0.5">Dividir valor entre várias contas</p>
                    </div>
                    <div className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${isSplitMode ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-slate-800'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow-lg transition-transform duration-300 ${isSplitMode ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  {isSplitMode && (
                    <div className="space-y-4 pt-2 animate-in slide-in-from-top-4 duration-300">
                      {splits.map((split, index) => (
                        <div key={index} className="flex gap-3 items-end">
                          <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Conta</label>
                            <select
                              value={split.account}
                              onChange={(e) => handleSplitChange(index, 'account', e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white font-bold outline-none focus:border-amber-500/50 appearance-none"
                            >
                              {ACCOUNT_OPTIONS.map(acc => (
                                <option key={acc} value={acc} className="bg-slate-900">{acc}</option>
                              ))}
                            </select>
                          </div>
                          <div className="w-28 space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Valor</label>
                            <input
                              type="number"
                              step="0.01"
                              value={split.amount}
                              onChange={(e) => handleSplitChange(index, 'amount', e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white font-black outline-none focus:border-amber-500/50"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSplit(index)}
                            disabled={splits.length <= 1}
                            className="bg-rose-500/10 text-rose-500 p-3 rounded-xl hover:bg-rose-500 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-rose-500/10 disabled:hover:text-rose-500"
                          >
                            <Minus size={18} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleAddSplit}
                        className="w-full py-3 flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 text-slate-500 hover:border-amber-500/30 hover:text-amber-500 transition-all"
                      >
                        <Plus size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Adicionar Outra Conta</span>
                      </button>

                      {!isSplitsValid && (
                        <p className="text-rose-500 text-[10px] font-black uppercase tracking-tighter text-center animate-pulse">
                          A soma das contas (R$ {totalSplitsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) deve ser igual ao total (R$ {parseFloat(amount || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Advanced Options */}
              <div className="bg-zinc-900 rounded-2xl p-6 space-y-6 border border-white/5">
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500">
                      <CalendarClock size={16} />
                    </div>
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Recorrência Mensal</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => {
                      setIsRecurring(e.target.checked);
                      if (e.target.checked) setIsInstallmentMode(false);
                    }}
                    className="w-6 h-6 rounded-lg bg-white/5 border-white/10 text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                </div>

                {!isRecurring && type === 'expense' && (
                  <div className="space-y-6 pt-6 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500">
                          <Layers size={16} />
                        </div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Compra Parcelada</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isInstallmentMode}
                        onChange={(e) => {
                          setIsInstallmentMode(e.target.checked);
                          if (!e.target.checked) {
                            setCurrentInstallment(1);
                            setInstallments(1);
                          }
                        }}
                        className="w-6 h-6 rounded-lg bg-white/5 border-white/10 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                    </div>

                    {isInstallmentMode && (
                      <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-300">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Parcela</label>
                          <input
                            type="number"
                            min="1"
                            value={currentInstallment}
                            onChange={(e) => setCurrentInstallment(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full bg-zinc-950 border border-white/5 rounded-xl py-3 text-center text-zinc-100 font-bold outline-none focus:border-zinc-700"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Total</label>
                          <input
                            type="number"
                            min="1"
                            max="60"
                            value={installments}
                            onChange={(e) => setInstallments(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full bg-zinc-950 border border-white/5 rounded-xl py-3 text-center text-zinc-100 font-bold outline-none focus:border-zinc-700"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 -mx-5 md:-mx-8 mt-2 border-t border-white/5 bg-zinc-950 px-5 md:px-8 pt-4 pb-4 pb-safe">
              <div className="flex gap-4">
              {isEditing && (
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="w-14 h-14 shrink-0 rounded-xl bg-transparent border border-rose-500/30 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all outline-none"
                >
                  <Trash2 size={24} />
                </button>
              )}
                <button
                  type="submit"
                  className="w-full h-14 rounded-xl flex items-center justify-center gap-3 bg-emerald-500 text-zinc-950 font-bold tracking-wide transition-all shadow-md mt-2 md:mt-0 hover:bg-emerald-400 active:scale-95"
                >
                  <Save size={20} className="stroke-[2.5]" />
                  {isEditing ? 'Salvar Alterações' : 'Salvar Registro'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <CustomDialog
        isOpen={showDeleteConfirm}
        type="confirm"
        title="Excluir Registro"
        message="Tem certeza que deseja apagar esta movimentação? Esta ação não poderá ser desfeita e afetará seu saldo atual."
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
      {/* Custom Alert Dialog */}
      <CustomDialog
        isOpen={showAlertDialog}
        type="alert"
        title="Atenção"
        variant="warning"
        message={alertMessage}
        onConfirm={() => setShowAlertDialog(false)}
        onCancel={() => setShowAlertDialog(false)}
      />
    </>
  );
};
