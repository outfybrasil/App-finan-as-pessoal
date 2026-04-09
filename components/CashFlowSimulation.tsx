import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Transaction, TransactionType } from '../types';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  Plus,
  X,
  AlertTriangle,
  GripVertical,
  Filter,
  Sparkles,
  CalendarRange,
  Wallet,
  Trash2,
  ArrowDownCircle,
  ArrowUpCircle
} from 'lucide-react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, ACCOUNT_OPTIONS } from '../constants/categories';

interface CashFlowSimulationProps {
  allTransactions: Transaction[];
  onToggleStatus: (t: Transaction) => void;
  onEditTransaction: (t: Transaction) => void;
  privacyMode?: boolean;
}

interface WhatIfItem {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  account: string;
  category: string;
}

// Represents a row in the simulation timeline
interface SimulationRow {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  account: string;
  category: string;
  isPending: boolean; // real pending transaction
  isWhatIf: boolean; // hypothetical
  originalTransaction?: Transaction;
  runningBalance: number;
}

export const CashFlowSimulation: React.FC<CashFlowSimulationProps> = ({
  allTransactions,
  onToggleStatus,
  onEditTransaction,
  privacyMode = false
}) => {
  const [selectedAccount, setSelectedAccount] = useState<string>('Todas');
  const [whatIfItems, setWhatIfItems] = useState<WhatIfItem[]>([]);
  const [showWhatIfForm, setShowWhatIfForm] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // What-if form state
  const [wiDescription, setWiDescription] = useState('');
  const [wiAmount, setWiAmount] = useState('');
  const [wiType, setWiType] = useState<TransactionType>('expense');
  const [wiDate, setWiDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [wiAccount, setWiAccount] = useState('Carteira');
  const [wiCategory, setWiCategory] = useState('');

  const privacyClass = privacyMode ? 'blur-md select-none' : '';

  // Calculate real starting balance (all paid transactions up to today)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const startingBalance = useMemo(() => {
    return allTransactions
      .filter(t => t.isPaid !== false)
      .reduce((acc, t) => {
        const val = Number(t.amount);
        return t.type === 'income' ? acc + val : acc - val;
      }, 0);
  }, [allTransactions]);

  // Starting balance filtered by account
  const startingBalanceForAccount = useMemo(() => {
    if (selectedAccount === 'Todas') return startingBalance;
    return allTransactions
      .filter(t => t.isPaid !== false && (t.account || 'Carteira') === selectedAccount)
      .reduce((acc, t) => {
        const val = Number(t.amount);
        return t.type === 'income' ? acc + val : acc - val;
      }, 0);
  }, [allTransactions, selectedAccount, startingBalance]);

  // Get all pending transactions (not paid), sorted by date
  const pendingTransactions = useMemo(() => {
    let pending = allTransactions
      .filter(t => t.isPaid === false && t.category !== 'Ajuste');

    if (selectedAccount !== 'Todas') {
      pending = pending.filter(t => (t.account || 'Carteira') === selectedAccount);
    }

    return pending.sort((a, b) => a.date.localeCompare(b.date));
  }, [allTransactions, selectedAccount]);

  // Filtered what-if items by account
  const filteredWhatIfItems = useMemo(() => {
    if (selectedAccount === 'Todas') return whatIfItems;
    return whatIfItems.filter(w => w.account === selectedAccount);
  }, [whatIfItems, selectedAccount]);

  // Build the simulation timeline
  const simulationRows: SimulationRow[] = useMemo(() => {
    // Merge pending transactions and what-if items
    const allItems: {
      id: string;
      description: string;
      amount: number;
      type: TransactionType;
      date: string;
      account: string;
      category: string;
      isPending: boolean;
      isWhatIf: boolean;
      originalTransaction?: Transaction;
    }[] = [];

    pendingTransactions.forEach(t => {
      allItems.push({
        id: t.id,
        description: t.description,
        amount: t.amount,
        type: t.type,
        date: t.date,
        account: t.account || 'Carteira',
        category: t.category,
        isPending: true,
        isWhatIf: false,
        originalTransaction: t,
      });
    });

    filteredWhatIfItems.forEach(w => {
      allItems.push({
        id: w.id,
        description: w.description,
        amount: w.amount,
        type: w.type,
        date: w.date,
        account: w.account,
        category: w.category,
        isPending: false,
        isWhatIf: true,
      });
    });

    // Sort by date
    allItems.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate running balance
    let runningBalance = startingBalanceForAccount;
    return allItems.map(item => {
      if (item.type === 'income') {
        runningBalance += item.amount;
      } else {
        runningBalance -= item.amount;
      }
      return { ...item, runningBalance };
    });
  }, [pendingTransactions, filteredWhatIfItems, startingBalanceForAccount]);

  // Find the lowest point
  const lowestBalance = useMemo(() => {
    if (simulationRows.length === 0) return startingBalanceForAccount;
    return Math.min(startingBalanceForAccount, ...simulationRows.map(r => r.runningBalance));
  }, [simulationRows, startingBalanceForAccount]);

  const hasNegativeProjection = lowestBalance < 0;

  // Unique accounts from transactions
  const availableAccounts = useMemo(() => {
    const accs = new Set(allTransactions.map(t => t.account || 'Carteira'));
    return ['Todas', ...Array.from(accs).sort()];
  }, [allTransactions]);

  // Drag and drop handlers for reordering/date swapping
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== draggedId) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);

    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const draggedRow = simulationRows.find(r => r.id === draggedId);
    const targetRow = simulationRows.find(r => r.id === targetId);

    if (!draggedRow || !targetRow) {
      setDraggedId(null);
      return;
    }

    // Swap dates between the two items
    if (draggedRow.isWhatIf) {
      setWhatIfItems(prev => prev.map(w =>
        w.id === draggedId ? { ...w, date: targetRow.date } : w
      ));
    }

    if (targetRow.isWhatIf) {
      setWhatIfItems(prev => prev.map(w =>
        w.id === targetId ? { ...w, date: draggedRow.date } : w
      ));
    }

    setDraggedId(null);
  };

  // Add what-if item
  const handleAddWhatIf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wiAmount || !wiDescription || !wiCategory) return;

    const newItem: WhatIfItem = {
      id: `whatif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      description: wiDescription,
      amount: parseFloat(wiAmount),
      type: wiType,
      date: wiDate,
      account: wiAccount,
      category: wiCategory
    };

    setWhatIfItems(prev => [...prev, newItem]);
    // Reset form
    setWiDescription('');
    setWiAmount('');
    setWiCategory('');
    setShowWhatIfForm(false);
  };

  const removeWhatIf = (id: string) => {
    setWhatIfItems(prev => prev.filter(w => w.id !== id));
  };

  // Format helpers
  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const dayOfWeek = date.toLocaleDateString('pt-BR', { weekday: 'short' });
    return `${d}/${m} (${dayOfWeek})`;
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getRelativeLabel = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = dateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    target.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff === 0) return 'Hoje';
    if (diff === 1) return 'Amanhã';
    if (diff === -1) return 'Ontem';
    if (diff > 0 && diff <= 7) return `Em ${diff} dias`;
    if (diff < 0) return `${Math.abs(diff)} dias atrás`;
    return null;
  };

  // Final projected balance
  const finalBalance = simulationRows.length > 0
    ? simulationRows[simulationRows.length - 1].runningBalance
    : startingBalanceForAccount;

  const totalPendingExpenses = simulationRows.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
  const totalPendingIncome = simulationRows.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6 pb-24 md:space-y-8 md:pb-0 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-300">
            <Sparkles size={12} className="text-emerald-300" />
            Simulação
          </div>
          <h1 className="mt-3 text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-emerald-400/10 rounded-2xl border border-emerald-400/20 text-emerald-300">
              <CalendarRange size={26} />
            </div>
            Fluxo de Caixa
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium max-w-xl">
            Visualize como seu saldo evolui com cada pagamento pendente. Arraste itens para simular datas diferentes.
          </p>
        </div>

        {/* Account Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-slate-500">
            <Filter size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Conta</span>
          </div>
          <div className="flex glass rounded-2xl p-1 shadow-inner overflow-x-auto">
            {availableAccounts.map(acc => (
              <button
                key={acc}
                onClick={() => setSelectedAccount(acc)}
                className={`px-3 py-2 text-xs font-bold rounded-xl transition-all capitalize whitespace-nowrap ${selectedAccount === acc
                  ? 'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
              >
                {acc}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Starting Balance */}
        <div className="glass-card p-4 md:p-5 rounded-[1.75rem] hover:border-emerald-500/30 transition-all group">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
              <Wallet size={16} />
            </div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-[0.16em]">Saldo Atual</span>
          </div>
          <p className={`text-xl md:text-2xl font-black ${startingBalanceForAccount >= 0 ? 'text-emerald-400' : 'text-rose-400'} ${privacyClass}`}>
            R$ {formatCurrency(startingBalanceForAccount)}
          </p>
        </div>

        {/* Pending Expenses */}
        <div className="glass-card p-4 md:p-5 rounded-[1.75rem] hover:border-rose-500/30 transition-all group">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500">
              <TrendingDown size={16} />
            </div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-[0.16em]">A Pagar</span>
          </div>
          <p className={`text-xl md:text-2xl font-black text-rose-400 ${privacyClass}`}>
            R$ {formatCurrency(totalPendingExpenses)}
          </p>
        </div>

        {/* Pending Income */}
        <div className="glass-card p-4 md:p-5 rounded-[1.75rem] hover:border-emerald-500/30 transition-all group">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
              <TrendingUp size={16} />
            </div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-[0.16em]">A Receber</span>
          </div>
          <p className={`text-xl md:text-2xl font-black text-emerald-400 ${privacyClass}`}>
            R$ {formatCurrency(totalPendingIncome)}
          </p>
        </div>

        {/* Final Projected Balance */}
        <div className={`glass-card p-4 md:p-5 rounded-[1.75rem] transition-all group ${finalBalance < 0 ? 'border-rose-500/30 bg-rose-500/5' : 'hover:border-amber-500/30'}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`p-2 rounded-xl ${finalBalance < 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-400/10 text-emerald-300'}`}>
              <Sparkles size={16} />
            </div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-[0.16em]">Saldo Final</span>
          </div>
          <p className={`text-xl md:text-2xl font-semibold ${finalBalance >= 0 ? 'text-emerald-300' : 'text-rose-300'} ${privacyClass}`}>
            R$ {formatCurrency(finalBalance)}
          </p>
        </div>
      </div>

      {/* Negative Balance Alert */}
      {hasNegativeProjection && (
        <div className="p-5 bg-rose-500/5 border border-rose-500/15 rounded-[2rem] flex items-start gap-4 backdrop-blur-md animate-in slide-in-from-top-4 duration-500">
          <div className="p-3 bg-rose-500/20 rounded-2xl text-rose-500 shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-rose-300 uppercase tracking-[0.16em]">Alerta: Saldo Negativo</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Sua projeção indica que o saldo ficará negativo (mínimo de <span className={`font-bold text-rose-400 ${privacyClass}`}>R$ {formatCurrency(lowestBalance)}</span>). 
              Considere adiar algum pagamento ou adicionar uma entrada prevista.
            </p>
          </div>
        </div>
      )}

      {/* "What If?" Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowWhatIfForm(!showWhatIfForm)}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${showWhatIfForm
            ? 'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
            : 'glass border border-emerald-400/20 text-emerald-200 hover:bg-emerald-400/10'
            }`}
        >
          {showWhatIfForm ? <X size={16} /> : <Plus size={16} />}
          {showWhatIfForm ? 'Cancelar' : 'E se?'}
        </button>
        {whatIfItems.length > 0 && (
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {whatIfItems.length} {whatIfItems.length === 1 ? 'item hipotético' : 'itens hipotéticos'}
          </span>
        )}
      </div>

      {/* What-If Form */}
      {showWhatIfForm && (
        <form onSubmit={handleAddWhatIf} className="glass-card rounded-[2rem] p-6 space-y-5 border-emerald-400/20 animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-sm font-semibold text-emerald-200 uppercase tracking-[0.16em] flex items-center gap-2">
            <Sparkles size={16} />
            Simulação Hipotética
          </h3>
          <p className="text-sm text-slate-300 -mt-2">Adicione uma receita ou despesa fictícia para ver o impacto no fluxo.</p>

          {/* Type selector */}
          <div className="flex gap-3 p-1 glass rounded-2xl">
            <button
              type="button"
              onClick={() => setWiType('expense')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest ${wiType === 'expense'
                ? 'bg-rose-500 text-white shadow-lg'
                : 'text-slate-500 hover:text-white'
                }`}
            >
              <ArrowDownCircle size={16} />
              Despesa
            </button>
            <button
              type="button"
              onClick={() => setWiType('income')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest ${wiType === 'income'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'text-slate-500 hover:text-white'
                }`}
            >
              <ArrowUpCircle size={16} />
              Receita
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="field-label">Descrição</label>
              <input
                type="text"
                value={wiDescription}
                onChange={e => setWiDescription(e.target.value)}
                placeholder="Ex: Parcela do celular"
                className="field-input"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="field-label">Valor</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={wiAmount}
                  onChange={e => setWiAmount(e.target.value)}
                  placeholder="0,00"
                  className="field-input pl-12"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="field-label">Data</label>
              <input
                type="date"
                value={wiDate}
                onChange={e => setWiDate(e.target.value)}
                className="field-input [color-scheme:dark]"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="field-label">Conta</label>
              <select
                value={wiAccount}
                onChange={e => setWiAccount(e.target.value)}
                className="field-input appearance-none cursor-pointer"
              >
                {ACCOUNT_OPTIONS.map(acc => (
                  <option key={acc} value={acc} className="bg-slate-900">{acc}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="field-label">Categoria</label>
              <select
                value={wiCategory}
                onChange={e => setWiCategory(e.target.value)}
                className="field-input appearance-none cursor-pointer"
                required
              >
                <option value="" disabled className="bg-slate-900">Selecione</option>
                {(wiType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                  <option key={cat} value={cat} className="bg-slate-900">{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full py-4"
          >
            Adicionar à Simulação
          </button>
        </form>
      )}

      {/* Timeline */}
      <div className="glass-card rounded-[2rem] md:rounded-[2.5rem] overflow-hidden">
        {/* Table Header */}
        <div className="p-5 md:p-6 border-b border-white/5 bg-white/[0.02]">
          <h3 className="text-lg font-extrabold text-white tracking-tight">Linha do Tempo</h3>
          <p className="text-xs text-slate-500 mt-1">
            {simulationRows.length === 0
              ? 'Nenhuma pendência encontrada. Adicione itens "E se?" para simular cenários.'
              : `${simulationRows.length} ${simulationRows.length === 1 ? 'evento' : 'eventos'} pendentes • Arraste para reordenar datas`
            }
          </p>
        </div>

        {/* Starting Balance Row */}
        <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-white/5 bg-emerald-500/[0.03]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
              <Wallet size={18} />
            </div>
            <div>
              <p className="text-sm font-black text-emerald-400">Saldo Inicial de Hoje</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{formatDate(todayStr)}</p>
            </div>
          </div>
          <p className={`text-lg font-black ${startingBalanceForAccount >= 0 ? 'text-emerald-400' : 'text-rose-400'} ${privacyClass}`}>
            R$ {formatCurrency(startingBalanceForAccount)}
          </p>
        </div>

        {/* Timeline Rows */}
        <div className="divide-y divide-white/[0.03]">
          {simulationRows.map((row, index) => {
            const relativeLabel = getRelativeLabel(row.date);
            const isNegative = row.runningBalance < 0;
            const wasPositive = index === 0
              ? startingBalanceForAccount >= 0
              : simulationRows[index - 1].runningBalance >= 0;
            const justWentNegative = isNegative && wasPositive;

            return (
              <div
                key={row.id}
                draggable
                onDragStart={(e) => handleDragStart(e, row.id)}
                onDragOver={(e) => handleDragOver(e, row.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, row.id)}
                className={`
                  group flex flex-col sm:flex-row sm:items-center justify-between px-5 md:px-6 py-4 transition-all duration-200 cursor-grab active:cursor-grabbing
                  ${dragOverId === row.id ? 'bg-amber-500/10 border-l-4 border-amber-500' : ''}
                  ${draggedId === row.id ? 'opacity-40' : ''}
                  ${row.isWhatIf ? 'bg-amber-500/[0.02] border-l-2 border-l-amber-500/30' : ''}
                  ${justWentNegative ? 'bg-rose-500/[0.05]' : ''}
                  hover:bg-white/[0.02]
                `}
              >
                <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                  {/* Drag handle */}
                  <div className="text-slate-700 hover:text-slate-400 transition-colors shrink-0 hidden sm:block">
                    <GripVertical size={16} />
                  </div>

                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all ${row.type === 'income'
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-slate-800 text-slate-400'
                    } ${row.isWhatIf ? 'border border-dashed border-amber-500/30' : ''}`}
                  >
                    {row.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-100 truncate">{row.description}</p>
                      {row.isWhatIf && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black uppercase tracking-widest shrink-0">
                          Hipotético
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{formatDate(row.date)}</span>
                      {relativeLabel && (
                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${relativeLabel === 'Hoje' ? 'bg-emerald-500/10 text-emerald-400' :
                          relativeLabel === 'Amanhã' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-white/5 text-slate-500'
                          }`}>{relativeLabel}</span>
                      )}
                      <span className="text-[10px] text-slate-600">•</span>
                      <span className="text-[10px] text-slate-500 font-medium">{row.account}</span>
                      <span className="text-[10px] text-slate-600">•</span>
                      <span className="text-[10px] text-emerald-500/60 font-medium">{row.category}</span>
                    </div>
                  </div>
                </div>

                {/* Right side: amount, running balance, actions */}
                <div className="flex items-center gap-3 md:gap-5 mt-3 sm:mt-0 ml-0 sm:ml-4 shrink-0">
                  {/* Amount */}
                  <div className="text-right">
                    <p className={`text-sm font-black ${privacyClass} ${row.type === 'income' ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {row.type === 'income' ? '+' : '-'} R$ {formatCurrency(row.amount)}
                    </p>
                  </div>

                  {/* Arrow */}
                  <span className="text-slate-700 text-lg">→</span>

                  {/* Running Balance */}
                  <div className={`text-right min-w-[110px] px-3 py-1.5 rounded-xl ${isNegative ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-white/[0.03]'}`}>
                    <p className={`text-[9px] font-black uppercase tracking-widest ${isNegative ? 'text-rose-500' : 'text-slate-500'}`}>Saldo</p>
                    <p className={`text-sm font-black ${privacyClass} ${isNegative ? 'text-rose-400' : 'text-white'}`}>
                      R$ {formatCurrency(row.runningBalance)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {row.isPending && row.originalTransaction && (
                      <button
                        onClick={() => onToggleStatus(row.originalTransaction!)}
                        className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/5 hover:shadow-emerald-500/20"
                        title="Marcar como pago"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                    {row.isWhatIf && (
                      <button
                        onClick={() => removeWhatIf(row.id)}
                        className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                        title="Remover simulação"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {simulationRows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="p-4 bg-slate-800 rounded-full mb-4 opacity-50">
              <CalendarRange size={32} className="text-slate-400" />
            </div>
            <p className="text-slate-300 font-bold">Nenhuma pendência encontrada</p>
            <p className="text-sm text-slate-500 mt-1 max-w-xs">
              Todas as transações estão pagas ou não há registros pendentes.
              Use o botão "E se?" acima para simular cenários.
            </p>
          </div>
        )}

        {/* Footer summary */}
        {simulationRows.length > 0 && (
          <div className="px-5 md:px-6 py-4 border-t border-white/5 bg-white/[0.02] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <GripVertical size={14} />
              <span>Arraste os itens para simular pagamento em datas diferentes</span>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${finalBalance >= 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'}`}>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Patrimônio Final:</span>
              <span className={`text-sm font-black ${privacyClass} ${finalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                R$ {formatCurrency(finalBalance)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
