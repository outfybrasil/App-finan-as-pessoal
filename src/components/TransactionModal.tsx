import { useState, useEffect, FormEvent } from 'react';
import { useFinanceStore } from '../store';
import { X, Info } from 'lucide-react';
import { Transaction } from '../types';
import { getEffectiveStatus, getLocalIsoDate, parseCurrencyInput } from '../lib/finance';
import { useDialogAccessibility } from '../hooks/useDialogAccessibility';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTransaction?: Transaction | null;
  initialDate?: string;
}

export default function TransactionModal({ isOpen, onClose, editingTransaction, initialDate }: TransactionModalProps) {
  const { categories, accounts, addTransaction, editTransaction } = useFinanceStore();

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [entries, setEntries] = useState<{date: string, status: 'pending' | 'completed' | 'scheduled'}[]>([{date: '', status: 'completed'}]);
  
  const [isFixed, setIsFixed] = useState(false);
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState(12);

  const [showInstallmentOptions, setShowInstallmentOptions] = useState(false);
  const [pendingEditData, setPendingEditData] = useState<any>(null);
  const dialogRef = useDialogAccessibility(isOpen && !showInstallmentOptions, onClose);

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setDescription(editingTransaction.description);
      setAmount(editingTransaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      setCategory(editingTransaction.category);
      setAccountId(editingTransaction.accountId);
      setEntries([{ date: editingTransaction.date, status: editingTransaction.status }]);
      setIsFixed(editingTransaction.isFixed);
      setIsInstallment(editingTransaction.isInstallment);
      setTotalInstallments(editingTransaction.installmentInfo?.total || 12);
    } else {
      setType('expense');
      setDescription('');
      setAmount('');
      const firstExpCat = categories.find(c => c.type === 'expense');
      setCategory(firstExpCat ? firstExpCat.name : '');
      setAccountId(accounts[0]?.id || '');
      setEntries([{ date: initialDate || getLocalIsoDate(), status: 'scheduled' }]);
      setIsFixed(false);
      setIsInstallment(false);
      setTotalInstallments(12);
    }
  }, [editingTransaction, initialDate, isOpen, categories, accounts]);

  useEffect(() => {
    if (!editingTransaction) {
      const firstCatOfNewType = categories.find(c => c.type === type);
      setCategory(firstCatOfNewType ? firstCatOfNewType.name : '');
    }
  }, [type, categories, editingTransaction]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || !category || !accountId || entries.some(entry => !entry.date)) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const numericAmount = parseCurrencyInput(amount);
    if (numericAmount === null) {
      alert("Por favor, insira um valor válido.");
      return;
    }

    if (editingTransaction) {
      if (editingTransaction.isInstallment) {
        setPendingEditData({
          ...editingTransaction,
          description,
          amount: numericAmount,
          type,
          category,
          accountId,
          date: entries[0].date,
          status: selectedAccount?.type === 'credit' ? getEffectiveStatus('scheduled', entries[0].date) : entries[0].status,
          isFixed,
          isInstallment,
          installmentInfo: isInstallment ? {
            current: editingTransaction.installmentInfo?.current || 1,
            total: totalInstallments,
            groupId: editingTransaction.installmentInfo?.groupId || Math.random().toString(36).substring(2, 11)
          } : undefined,
          ...cardFields,
        });
        setShowInstallmentOptions(true);
        return;
      } else {
        editTransaction({
          ...editingTransaction,
          description,
          amount: numericAmount,
          type,
          category,
          accountId,
          date: entries[0].date,
          status: selectedAccount?.type === 'credit' ? getEffectiveStatus('scheduled', entries[0].date) : entries[0].status,
          isFixed,
          isInstallment,
          installmentInfo: isInstallment ? {
            current: editingTransaction.installmentInfo?.current || 1,
            total: totalInstallments,
            groupId: editingTransaction.installmentInfo?.groupId || Math.random().toString(36).substring(2, 11)
          } : undefined,
          ...cardFields,
        });
      }
    } else {
      entries.forEach(entry => {
        addTransaction({
          description,
          amount: numericAmount,
          type,
          category,
          accountId,
          date: entry.date,
          status: selectedAccount?.type === 'credit' ? getEffectiveStatus('scheduled', entry.date) : entry.status,
          isFixed,
          isInstallment,
          totalInstallments: isInstallment ? totalInstallments : undefined,
          ...cardFields,
        });
      });
    }

    onClose();
  };

  const confirmEdit = (option: 'only-this' | 'this-and-future' | 'all-group') => {
    if (pendingEditData) {
      editTransaction(pendingEditData, option);
      setShowInstallmentOptions(false);
      setPendingEditData(null);
      onClose();
    }
  };

  const filteredCategories = categories.filter(c => c.type === type);
  const selectedAccount = accounts.find((account) => account.id === accountId);
  const cardFields = selectedAccount?.type === 'credit'
    ? { kind: 'card_purchase' as const, creditCardId: selectedAccount.id, invoiceId: undefined }
    : { kind: 'transaction' as const, creditCardId: undefined, invoiceId: undefined };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-dialog-title"
        tabIndex={-1}
        className="w-full max-w-lg bg-[#0f0f13] border border-white/[0.08] rounded-2xl p-6 shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/[0.06]">
          <h2 id="transaction-dialog-title" className="text-lg font-bold font-display text-white">
            {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
          </h2>
          <button 
            onClick={onClose}
            aria-label="Fechar transação"
            className="min-h-11 min-w-11 p-2 hover:bg-white/[0.06] rounded-xl text-zinc-400 hover:text-white transition"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
          
          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#16161d] border border-white/[0.06] rounded-xl">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 text-xs font-semibold rounded-lg transition font-display duration-150 active:scale-[0.98] ${
                type === 'expense'
                  ? 'bg-rose-500 text-white font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              DESPESA
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2 text-xs font-semibold rounded-lg transition font-display duration-150 active:scale-[0.98] ${
                type === 'income'
                  ? 'bg-emerald-500 text-[#07110e] font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              RECEITA
            </button>
          </div>

          {/* Amount and Description */}
          <div className="space-y-3">
            <div>
              <label htmlFor="transaction-amount" className="block text-[11px] text-zinc-400 mb-1 font-mono uppercase">Valor (R$)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-zinc-400 font-mono">R$</span>
                <input
                  id="transaction-amount"
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    if (!digits) {
                      setAmount('');
                    } else {
                      const num = parseInt(digits, 10) / 100;
                      setAmount(num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                    }
                  }}
                  className="w-full pl-11 pr-4 py-3 glass-input rounded-xl text-xl font-bold font-mono tabular-nums text-white placeholder-zinc-700 outline-none focus:border-emerald-400"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="transaction-description" className="block text-[11px] text-zinc-400 mb-1 font-mono uppercase">Descrição</label>
              <input
                id="transaction-description"
                type="text"
                maxLength={120}
                placeholder="Ex: Supermercado, Aluguel, Salário..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs text-white placeholder-zinc-600 outline-none focus:border-emerald-400"
                required
              />
            </div>
          </div>

          {/* Category & Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="transaction-category" className="block text-[11px] text-zinc-400 mb-1 font-mono uppercase">Categoria</label>
              <select
                id="transaction-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 glass-input rounded-xl text-xs text-white outline-none appearance-none cursor-pointer"
                required
              >
                {filteredCategories.map(cat => (
                  <option key={cat.id} value={cat.name} className="bg-[#0f0f13] text-white">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="transaction-account" className="block text-[11px] text-zinc-400 mb-1 font-mono uppercase">Conta / Pagamento</label>
              <select
                id="transaction-account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2.5 glass-input rounded-xl text-xs text-white outline-none appearance-none cursor-pointer"
                required
              >
                {accounts.some((account) => account.type === 'credit') && (
                  <optgroup label="Cartões de crédito" className="bg-[#0f0f13] text-zinc-300">
                    {accounts
                      .filter((account) => account.type === 'credit')
                      .map((account) => (
                        <option key={account.id} value={account.id} className="bg-[#0f0f13] text-white">
                          {account.name}
                        </option>
                      ))}
                  </optgroup>
                )}
                <optgroup label="Contas e carteiras" className="bg-[#0f0f13] text-zinc-300">
                  {accounts
                    .filter((account) => account.type !== 'credit')
                    .map((account) => (
                      <option key={account.id} value={account.id} className="bg-[#0f0f13] text-white">
                        {account.name}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Date & Status */}
          <div>
            <span id="transaction-entries-label" className="block text-[11px] text-zinc-400 mb-1 font-mono uppercase">Data e Situação</span>
            <div className="space-y-2" role="group" aria-labelledby="transaction-entries-label">
              {entries.map((entry, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    aria-label={`Data do lançamento ${index + 1}`}
                    type="date"
                    value={entry.date}
                    onChange={(e) => {
                      const newEntries = [...entries];
                      newEntries[index].date = e.target.value;
                      setEntries(newEntries);
                    }}
                    className="flex-1 px-3 py-2 glass-input rounded-xl text-xs text-white outline-none"
                    required
                  />
                  
                  <div className="flex bg-[#16161d] p-1 rounded-xl items-center border border-white/[0.06] shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const newEntries = [...entries];
                        newEntries[index].status = 'scheduled';
                        setEntries(newEntries);
                      }}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition ${
                        entry.status === 'scheduled'
                          ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      AGENDAR
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newEntries = [...entries];
                        newEntries[index].status = 'pending';
                        setEntries(newEntries);
                      }}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition ml-1 ${
                        entry.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      PENDENTE
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newEntries = [...entries];
                        newEntries[index].status = 'completed';
                        setEntries(newEntries);
                      }}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition ml-1 ${
                        entry.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {type === 'expense' ? 'PAGO' : 'RECEBIDO'}
                    </button>
                  </div>

                  {!editingTransaction && entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newEntries = entries.filter((_, i) => i !== index);
                        setEntries(newEntries);
                      }}
                      className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Toggles */}
          {!editingTransaction && (
            <div className="p-3.5 bg-[#16161d] border border-white/[0.06] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">Lançamento Recorrente (Fixo)</h4>
                  <p className="text-[10px] text-zinc-400">Repete automaticamente todos os meses.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsFixed(!isFixed);
                    if (isInstallment) setIsInstallment(false);
                  }}
                  className={`w-10 h-5 rounded-full p-0.5 transition ${isFixed ? 'bg-emerald-500' : 'bg-zinc-800'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-zinc-950 transition-transform ${isFixed ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              {type === 'expense' && (
                <>
                  <hr className="border-white/[0.06]" />
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-white">Parcelamento</h4>
                      <p className="text-[10px] text-zinc-400">Replica a despesa em parcelas mensais.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsInstallment(!isInstallment);
                        if (isFixed) setIsFixed(false);
                      }}
                      className={`w-10 h-5 rounded-full p-0.5 transition ${isInstallment ? 'bg-rose-500' : 'bg-zinc-800'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-zinc-950 transition-transform ${isInstallment ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                </>
              )}

              {isInstallment && (
                <div className="pt-2">
                  <label htmlFor="transaction-installments" className="block text-[10px] text-zinc-400 mb-1 font-mono uppercase">Quantidade de Parcelas</label>
                  <div className="flex items-center gap-3">
                    <input
                      id="transaction-installments"
                      type="range"
                      min="2"
                      max="36"
                      value={totalInstallments}
                      onChange={(e) => setTotalInstallments(parseInt(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                    <span className="text-xs font-bold text-white font-mono bg-zinc-800 px-2.5 py-1 rounded-md">
                      {totalInstallments}x
                    </span>
                  </div>
                  <div className="mt-2 text-[10px] text-zinc-300 flex items-center gap-1.5 bg-[#1e1216] p-2 border border-rose-500/10 rounded-lg">
                    <Info size={12} className="text-rose-400 shrink-0" />
                    <span>{totalInstallments} parcelas mensais de R$ {(parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className={`w-full py-3 rounded-xl font-semibold font-display text-xs tracking-wide transition duration-150 active:scale-[0.98] ${
                type === 'expense'
                  ? 'bg-rose-500 hover:bg-rose-400 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-[#07110e]'
              }`}
            >
              {editingTransaction ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR LANÇAMENTO'}
            </button>
          </div>
        </form>
      </div>

      {showInstallmentOptions && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80">
          <div className="bg-[#0f0f13] border border-white/[0.08] rounded-2xl p-5 max-w-sm w-full space-y-4">
            <h3 className="text-base font-bold font-display text-white">Editar Parcelamento</h3>
            <p className="text-xs text-zinc-400">Como deseja aplicar esta alteração?</p>
            
            <div className="space-y-2">
              <button 
                type="button"
                onClick={() => confirmEdit('only-this')}
                className="w-full text-left p-3 rounded-xl bg-[#16161d] hover:bg-white/[0.06] transition border border-white/[0.06]"
              >
                <div className="font-semibold text-white text-xs">Somente esta parcela</div>
              </button>
              
              <button 
                type="button"
                onClick={() => confirmEdit('this-and-future')}
                className="w-full text-left p-3 rounded-xl bg-[#16161d] hover:bg-white/[0.06] transition border border-white/[0.06]"
              >
                <div className="font-semibold text-white text-xs">Esta e as próximas</div>
              </button>
              
              <button 
                type="button"
                onClick={() => confirmEdit('all-group')}
                className="w-full text-left p-3 rounded-xl bg-[#16161d] hover:bg-white/[0.06] transition border border-white/[0.06]"
              >
                <div className="font-semibold text-white text-xs">Todas as parcelas</div>
              </button>
            </div>
            
            <button 
              type="button"
              onClick={() => {
                setShowInstallmentOptions(false);
                setPendingEditData(null);
              }}
              className="w-full py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
