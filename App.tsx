import React, { useState, useEffect } from 'react';
import { View, Transaction, Budget, Goal, TransactionType } from './types';
import { LayoutDashboard, Plus, PieChart, BarChart3, ShoppingCart, Calendar as CalendarIcon, Eye, EyeOff, LogOut, CreditCard, Download, Wallet, CalendarRange } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { QuickAdd } from './components/QuickAdd';
import { Savings } from './components/Savings';
import { Reports } from './components/Reports';
import { ShoppingList } from './components/ShoppingList';
import { CalendarView } from './components/CalendarView';
import { Auth } from './components/Auth';
import { useAuth } from './hooks/useAuth';
import { useFinance } from './hooks/useFinance';
import { TravelModeSettings } from './components/TravelMode';
import { CategorySettings } from './components/CategorySettings';
import { TravelProvider } from './context/TravelContext';
import { CategoryProvider } from './context/CategoryContext';
import { PiggyBank, Settings, AlertTriangle } from 'lucide-react';

import { DeleteSeriesModal } from './components/DeleteSeriesModal';
import { CustomDialog } from './components/CustomDialog';

const App: React.FC = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const {
    transactions: allTransactions,
    setTransactions: setAllTransactions,
    budgets,
    goals,
    loading: dataLoading,
    addTransaction: addTransactionService,
    updateTransaction: updateTransactionService,
    deleteTransaction: deleteTransactionService,
    addGoal: addGoalService,
    updateGoal: updateGoalService,
    deleteGoal: deleteGoalService,
    addBudget: addBudgetService,
    updateBudget: updateBudgetService,
    deleteBudget: deleteBudgetService,
    accounts,
    addAccount: addAccountService,
    updateAccount: updateAccountService,
    deleteAccount: deleteAccountService,
    deleteMultipleTransactions,
    recategorizeTransactions
  } = useFinance(user?.$id);

  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const [privacyMode, setPrivacyMode] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);

  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);

  const [globalAlert, setGlobalAlert] = useState<{ show: boolean, message: string }>({ show: false, message: '' });

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    const filtered = allTransactions.filter(t => {
      // Robust date comparison: YYYY-MM string match
      if (!t.date) return false;
      const [tYear, tMonth] = t.date.split('-').map(Number);
      return tMonth === (currentMonth.getMonth() + 1) &&
        tYear === currentMonth.getFullYear();
    });
    setFilteredTransactions(filtered);
  }, [allTransactions, currentMonth]);

  const handleAddTransaction = async (
    amount: number,
    category: string,
    description: string,
    date: string,
    type: TransactionType,
    installments: number = 1,
    isRecurring: boolean = false,
    account: string = 'Carteira',
    currentInstallment: number = 1,
    isPaid: boolean = true,
    splits?: { account: string; amount: number }[],
    destinationAccount?: string,
    tags?: string[],
    isPriority?: boolean
  ) => {

    const newTransactions: any[] = [];
    const groupId = (installments > 1 || isRecurring) ? `grp_${generateId()}` : undefined;

    if (type === 'expense' && installments > 1) {
      const installmentValue = amount; // Valor informado é o valor da parcela, não o total
      const startDate = new Date(date);
      let monthOffset = 0;

      for (let i = currentInstallment; i <= installments; i++) {
        const currentDate = new Date(startDate);
        currentDate.setMonth(startDate.getMonth() + monthOffset);
        const isThisInstallmentPaid = (i === currentInstallment) ? isPaid : false;

        newTransactions.push({
          groupId,
          amount: parseFloat(installmentValue.toFixed(2)),
          category,
          account,
          description: `${description} (${i}/${installments})`,
          date: currentDate.toISOString().split('T')[0],
          type,
          isRecurring: false,
          isPaid: isThisInstallmentPaid,
          isPriority,
          splits: (i === currentInstallment) ? splits : undefined, // Only split the first installment for now (simplification)
          tags // Passa a tag (envelope)
        });
        monthOffset++;
      }
    }
    else if (isRecurring) {
      const startDate = new Date(date);
      const RECURRENCE_HORIZON = 12;

      for (let i = 0; i < RECURRENCE_HORIZON; i++) {
        const currentDate = new Date(startDate);
        currentDate.setMonth(startDate.getMonth() + i);
        const isThisItemPaid = (i === 0) ? isPaid : false;

        newTransactions.push({
          groupId,
          amount: amount,
          category,
          account,
          description: description,
          date: currentDate.toISOString().split('T')[0],
          type,
          isRecurring: true,
          isPaid: isThisItemPaid,
          isPriority,
          splits: (i === 0) ? splits : undefined,
          destinationAccount: (i === 0) ? destinationAccount : undefined,
          tags // Passa a tag
        });
      }
    }
    else {
      newTransactions.push({
        amount,
        category,
        account,
        description,
        date,
        type,
        isRecurring,
        isPaid,
        isPriority,
        splits,
        destinationAccount,
        tags // Passa a tag
      });
    }

    const success = await addTransactionService(newTransactions);
    if (!success) {
      setGlobalAlert({ show: true, message: "Erro ao salvar os lançamentos no banco de dados." });
    }
  };

  // Função para ajustar saldo criando uma transação de diferença
  const handleAdjustBalance = async (accountName: string, newBalance: number) => {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Identificar e Remover ajustes anteriores DO MESMO DIA para evitar duplicação/acumulo
    const adjustmentsToDelete = allTransactions.filter(t =>
      t.category === 'Ajuste' &&
      (t.account || 'Carteira') === accountName &&
      t.date === todayStr
    );

    let cleanTransactions = [...allTransactions];

    if (adjustmentsToDelete.length > 0) {
      // Remover localmente para cálculo (o hook atualizará o estado real após delete)
      cleanTransactions = allTransactions.filter(t => !adjustmentsToDelete.some(adj => adj.id === t.id));

      // Remover do banco
      for (const adj of adjustmentsToDelete) {
        await deleteTransactionService(adj.id);
      }
    }

    // 2. Calcular saldo atual "limpo" (sem os ajustes de hoje)
    const currentBalance = cleanTransactions.reduce((acc, t) => {
      if (t.isPaid === false) return acc;
      
      let amountForAccount = 0;
      let isIncome = t.type === 'income';

      if (t.type === 'transfer') {
        if (t.destinationAccount === accountName) {
          amountForAccount = Number(t.amount);
          isIncome = true;
        } else if ((t.account || 'Carteira') === accountName) {
          amountForAccount = Number(t.amount);
          isIncome = false;
        } else {
          return acc;
        }
      } else if (t.splits && t.splits.length > 0) {
        const split = t.splits.find(s => s.account === accountName);
        if (split) {
          amountForAccount = Number(split.amount);
          // Se for despesa, subtrai. Se for receita, soma.
        } else {
          return acc; 
        }
      } else if ((t.account || 'Carteira') === accountName) {
        amountForAccount = Number(t.amount);
      } else {
        return acc;
      }

      return isIncome ? acc + amountForAccount : acc - amountForAccount;
    }, 0);

    const difference = newBalance - currentBalance;

    if (Math.abs(difference) < 0.01) return;

    const type: TransactionType = difference > 0 ? 'income' : 'expense';
    const amount = Math.abs(difference);

    await handleAddTransaction(
      amount,
      'Ajuste',
      'Correção de Saldo (Sistema)',
      todayStr,
      type,
      1,
      false,
      accountName,
      1,
      true,
      undefined,
      undefined,
      undefined
    );
  };

  const handleEditTransaction = async (id: string, updates: any, updateSeries: boolean = false): Promise<boolean> => {
    let transactionsToUpdate: { id: string, data: any }[] = [];

    if (!updateSeries) {
      transactionsToUpdate.push({ id, data: updates });
    } else {
      const original = allTransactions.find(t => t.id === id);
      if (!original) return false;

      let siblings: Transaction[] = [];

      if (original.groupId) {
        siblings = allTransactions.filter(t => t.groupId === original.groupId);
      } else {
        const cleanDesc = original.description.replace(/\s\(\d+\/\d+\)$/, '').replace(/\s\(Parcela \d+\)$/, '').trim();
        siblings = allTransactions.filter(t =>
          t.type === original.type &&
          t.category === original.category &&
          t.description.includes(cleanDesc)
        );
      }

      siblings.forEach(sibling => {
        let newDescription = updates.description;

        const matchSplit = sibling.description.match(/\s\(\d+\/\d+\)$/);
        const matchParcela = sibling.description.match(/\s\(Parcela \d+\)$/);

        if (matchSplit) {
          newDescription += matchSplit[0];
        } else if (matchParcela) {
          newDescription += matchParcela[0];
        }

        const siblingUpdates = {
          ...updates,
          description: newDescription,
          date: sibling.id === id ? updates.date : sibling.date,
          isPaid: sibling.id === id ? updates.isPaid : sibling.isPaid,
          // Propagate account change if editing series
          account: updates.account
        };

        transactionsToUpdate.push({ id: sibling.id, data: siblingUpdates });
      });
    }

    const promises = transactionsToUpdate.map(t => updateTransactionService(t.id, t.data));
    const results = await Promise.all(promises);
    
    if (results.some(r => r === null)) {
      setGlobalAlert({ 
        show: true, 
        message: "Erro ao atualizar uma ou mais transações. Verifique os campos no Appwrite (Ex: atributos obrigatórios ausentes)." 
      });
      return false;
    }

    setTransactionToEdit(null);
    return true;
  };

  const handleToggleStatus = async (t: Transaction) => {
    const newStatus = !t.isPaid;
    // Optimistic update
    setAllTransactions(prev => prev.map(item =>
      item.id === t.id ? { ...item, isPaid: newStatus } : item
    ));

    await updateTransactionService(t.id, { isPaid: newStatus });
  };

  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [showDeleteSeriesModal, setShowDeleteSeriesModal] = useState(false);
  const [showSingleDeleteConfirm, setShowSingleDeleteConfirm] = useState(false);

  const handleDeleteTransaction = async (transaction: Transaction) => {
    // Se faz parte de um grupo (parcela/recorrente), pergunta opções
    if (transaction.groupId) {
      setTransactionToDelete(transaction);
      setShowDeleteSeriesModal(true);
      return;
    }

    // Se é único, confirmação customizada
    setTransactionToDelete(transaction);
    setShowSingleDeleteConfirm(true);
  };

  const handleConfirmSingleDelete = async () => {
    if (!transactionToDelete) return;
    await deleteTransactionService(transactionToDelete.id);
    setAllTransactions(prev => prev.filter(t => t.id !== transactionToDelete.id));
    setShowSingleDeleteConfirm(false);
    setTransactionToDelete(null);
  };

  const handleConfirmDeleteOne = async () => {
    if (!transactionToDelete) return;
    const id = transactionToDelete.id;

    // UI Update
    setAllTransactions(prev => prev.filter(t => t.id !== id));
    setShowDeleteSeriesModal(false);

    await deleteTransactionService(id);
    setTransactionToDelete(null);
  };

  const handleConfirmDeleteSeries = async () => {
    if (!transactionToDelete || !transactionToDelete.groupId) return;

    // Finds current and future transactions
    const toDeleteIds = allTransactions
      .filter(t =>
        t.groupId === transactionToDelete.groupId &&
        t.date >= transactionToDelete.date &&
        // Garante que não apaga parcelas anteriores se a data for igual mas id diferente (raro, mas safe)
        (t.date > transactionToDelete.date || t.id === transactionToDelete.id)
      )
      .map(t => t.id);

    // UI Update
    setAllTransactions(prev => prev.filter(t => !toDeleteIds.includes(t.id)));
    setShowDeleteSeriesModal(false);

    await deleteMultipleTransactions(toDeleteIds);
    setTransactionToDelete(null);
  };

  const handleAddGoal = async (goalData: Omit<Goal, 'id'>) => {
    await addGoalService(goalData);
  };

  const handleUpdateGoal = async (id: string, updates: Partial<Goal>) => {
    await updateGoalService(id, updates);
  };

  const handleDeleteGoal = async (id: string) => {
    await deleteGoalService(id);
  };

  const handleAddBudget = async (budgetData: Omit<Budget, 'id'>) => {
    await addBudgetService(budgetData);
  };

  const handleUpdateBudget = async (id: string, updates: Partial<Budget>) => {
    await updateBudgetService(id, updates);
  };

  const handleDeleteBudget = async (id: string) => {
    await deleteBudgetService(id);
  };

  const openEditModal = (t: Transaction) => {
    setTransactionToEdit(t);
    setShowQuickAdd(true);
  };

  const handleFinishShopping = (total: number, itemsSummary: string) => {
    const preFill: any = {
      amount: total,
      category: 'Mercado',
      account: 'Carteira',
      description: `Compras: ${itemsSummary || 'Lista de Mercado'}`,
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      isRecurring: false,
      isPaid: true
    };
    setTransactionToEdit({ ...preFill, id: '' });
    setShowQuickAdd(true);
  };

  const navItems = [
    { view: View.DASHBOARD, label: 'Início', icon: LayoutDashboard },
    { view: View.CALENDAR, label: 'Calendário', icon: CalendarIcon },
    { view: View.SAVINGS, label: 'Poupança', icon: PiggyBank },
    { view: View.SHOPPING_LIST, label: 'Lista', icon: ShoppingCart },
    { view: View.REPORTS, label: 'Relatórios', icon: BarChart3 },
    { view: View.SETTINGS, label: 'Ajustes', icon: Settings },
  ];

  const activeNavItem = navItems.find((item) => item.view === currentView) ?? navItems[0];
  const mobileViewDescription = currentView === View.DASHBOARD
    ? 'Resumo do mês, contas e movimentações mais recentes.'
    : currentView === View.CALENDAR
      ? 'Navegue pelo mês e ajuste registros direto no calendário.'
      : currentView === View.SAVINGS
        ? 'Acompanhe seus depósitos e o rendimento da sua reserva.'
        : currentView === View.SHOPPING_LIST
          ? 'Lista rápida para compras e lançamento ao finalizar.'
          : 'Leitura do comportamento financeiro com mais contexto.';

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-slate-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl"></div>
          <p>Sincronizando dados...</p>
        </div>
      </div>
    );
  }
  return (
    <CategoryProvider>
      <TravelProvider>
  
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans overflow-x-hidden">

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-72 border-r border-white/5 bg-zinc-950 p-6 fixed h-full z-20 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-3 mb-8 px-2 shrink-0">
            <div className="w-10 h-10 bg-zinc-900 border border-white/10 rounded-lg flex items-center justify-center">
              <Wallet size={20} className="text-emerald-500" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-zinc-100 leading-none">Fluxo</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">App</span>
            </div>
          </div>

          <div className="mb-6 px-2 shrink-0">
            <button
              onClick={() => { setTransactionToEdit(null); setShowQuickAdd(true); }}
              className="bg-emerald-500 text-zinc-950 rounded-2xl h-12 w-full flex items-center justify-center gap-2 font-bold text-sm transition-all duration-300 hover:bg-emerald-400 active:scale-95 shadow-[0_0_20px_rgba(52,211,153,0.15)] hover:shadow-[0_0_25px_rgba(52,211,153,0.3)]"
            >
              <Plus size={18} className="stroke-[2.5]" />
              Registrar
            </button>
          </div>

          <nav className="space-y-2 flex-1">
            {navItems.map((item) => (
              <button
                key={item.view}
                onClick={() => setCurrentView(item.view)}
                className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group ${currentView === item.view
                  ? 'bg-emerald-500/10 text-white font-bold ring-1 ring-emerald-500/20 shadow-[0_0_20px_rgba(52,211,153,0.05)]'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                  }`}
              >
                <item.icon size={22} className={currentView === item.view ? 'text-emerald-400' : 'text-slate-600 group-hover:text-slate-400 transition-colors'} />
                <span className="text-sm tracking-tight font-medium">{item.label}</span>
                {currentView === item.view && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-8 space-y-3">
            <button
              onClick={() => setPrivacyMode(!privacyMode)}
              className="w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center group-hover:border-white/10">
                {privacyMode ? <EyeOff size={18} /> : <Eye size={18} />}
              </div>
              <span className="text-sm font-bold">{privacyMode ? 'Mostrar Valores' : 'Ocultar Valores'}</span>
            </button>

            <button
              onClick={logout}
              className="w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-rose-500/70 hover:text-rose-400 hover:bg-rose-500/5 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/10 flex items-center justify-center group-hover:border-rose-500/20">
                <LogOut size={18} />
              </div>
              <span className="text-sm font-bold">Sair da Conta</span>
            </button>



            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="w-full flex items-center gap-3 mt-4 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all border border-emerald-500/10"
              >
                <Download size={16} />
                Instalar App
              </button>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-72 pb-20 md:p-8 md:pb-12 overflow-y-auto min-h-screen relative bg-zinc-950">
          
          {/* Mobile Header - compact single row */}
          <div className="md:hidden sticky top-0 bg-zinc-950 border-b border-white/5 z-30">
            <div className="flex items-center justify-between gap-3 px-4 h-14">
              {/* Logo + Título da View */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 bg-zinc-900 border border-white/10 rounded-lg flex items-center justify-center shrink-0">
                  <Wallet size={16} className="text-emerald-500" />
                </div>
                <h1 className="text-base font-bold tracking-tight text-zinc-100 truncate">{activeNavItem.label}</h1>
              </div>

              {/* Ações rápidas */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setPrivacyMode(!privacyMode)}
                  className={`h-9 w-9 rounded-xl border transition-colors flex items-center justify-center ${
                    privacyMode
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : 'border-white/5 bg-zinc-900 text-zinc-400'
                  }`}
                  title={privacyMode ? 'Mostrar valores' : 'Ocultar valores'}
                >
                  {privacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>

                <button
                  onClick={logout}
                  className="h-9 w-9 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400 flex items-center justify-center"
                  title="Sair"
                >
                  <LogOut size={16} />
                </button>

                <button
                  onClick={() => { setTransactionToEdit(null); setShowQuickAdd(true); }}
                  className="h-9 px-3 rounded-xl bg-emerald-500 text-zinc-950 flex items-center justify-center gap-1.5 font-bold text-sm active:scale-95 transition-transform"
                  title="Registrar"
                >
                  <Plus size={16} className="stroke-[2.5]" />
                  <span>Novo</span>
                </button>
              </div>
            </div>

            {deferredPrompt && (
              <div className="px-4 pb-2">
                <button
                  onClick={handleInstallClick}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] px-4 py-2.5 text-[11px] font-bold text-emerald-400"
                >
                  <Download size={14} />
                  Instalar App
                </button>
              </div>
            )}
          </div>

          <div className="max-w-6xl mx-auto relative z-10 px-4 md:px-0 pt-4 md:pt-0">
            {currentView === View.DASHBOARD && (
              <Dashboard
                transactions={filteredTransactions}
                allTransactions={allTransactions}
                budgets={budgets}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
                onEditTransaction={openEditModal}
                onToggleStatus={handleToggleStatus}
                onAdjustBalance={handleAdjustBalance}
                privacyMode={privacyMode}
              />
            )}

            {currentView === View.CALENDAR && (
              <CalendarView
                transactions={filteredTransactions}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
                onEditTransaction={openEditModal}
                onToggleStatus={handleToggleStatus}
                privacyMode={privacyMode}
              />
            )}
            {currentView === View.SHOPPING_LIST && (
              <ShoppingList onFinishShopping={handleFinishShopping} />
            )}
            {currentView === View.SAVINGS && (
              <Savings transactions={allTransactions} privacyMode={privacyMode} />
            )}
            {currentView === View.REPORTS && <Reports transactions={allTransactions} />}
            {currentView === View.SETTINGS && (
              <CategorySettings 
                transactions={allTransactions} 
                onRecategorizeCategory={async (oldCat, type, newCat) => {
                  const success = await recategorizeTransactions(oldCat, type, newCat);
                  if (!success) {
                    setGlobalAlert({ show: true, message: "Erro ao recategorizar transações da categoria apagada." });
                  }
                  return success;
                }}
              />
            )}
          </div>
        </main>

        {/* Mobile Navigation (Fixed block format) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950 border-t border-zinc-800 pb-safe">
          <div className="flex items-center justify-around pt-2 pb-1 overflow-x-auto no-scrollbar">
            {navItems.map((item) => (
              <button
                key={item.view}
                onClick={() => setCurrentView(item.view)}
                className={`flex flex-col items-center justify-center gap-1 flex-1 h-12 transition-colors ${currentView === item.view
                  ? 'text-emerald-500'
                  : 'text-zinc-500'
                  }`}
              >
                <item.icon size={20} strokeWidth={currentView === item.view ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>




        {/* Modals */}
        {showQuickAdd && (
          <QuickAdd
            onClose={() => { setShowQuickAdd(false); setTransactionToEdit(null); }}
            onAdd={handleAddTransaction}
            onEdit={handleEditTransaction}
            onDelete={handleDeleteTransaction}
            initialData={transactionToEdit}
            allTransactions={allTransactions}
            onRecategorizeCategory={async (oldCat, type, newCat) => {
              const success = await recategorizeTransactions(oldCat, type, newCat);
              if (!success) {
                setGlobalAlert({ show: true, message: "Erro ao recategorizar transações da categoria apagada." });
              }
              return success;
            }}
          />
        )}

        <DeleteSeriesModal
          isOpen={showDeleteSeriesModal}
          onClose={() => setShowDeleteSeriesModal(false)}
          onDeleteOne={handleConfirmDeleteOne}
          onDeleteAll={handleConfirmDeleteSeries}
        />
      </div>
      <CustomDialog 
        isOpen={globalAlert.show}
        type="alert"
        title="Erro de Sistema"
        variant="danger"
        message={globalAlert.message}
        onConfirm={() => setGlobalAlert({ ...globalAlert, show: false })}
        onCancel={() => setGlobalAlert({ ...globalAlert, show: false })}
      />
      <CustomDialog
        isOpen={showSingleDeleteConfirm}
        type="confirm"
        title="Apagar Registro"
        message="Tem certeza que deseja apagar este lançamento? Esta ação não pode ser desfeita."
        variant="danger"
        onConfirm={handleConfirmSingleDelete}
        onCancel={() => setShowSingleDeleteConfirm(false)}
      />
      </TravelProvider>
    </CategoryProvider>
  );
};

export default App;
