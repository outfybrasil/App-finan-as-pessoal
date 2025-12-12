import React, { useState, useEffect } from 'react';
import { View, Transaction, Budget, Goal, TransactionType } from './types';
import { LayoutDashboard, Plus, PieChart, BarChart3, Sparkles, Database, ShoppingCart, Calendar as CalendarIcon, Eye, EyeOff, LogOut } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { QuickAdd } from './components/QuickAdd';
import { BudgetGoals } from './components/BudgetGoals';
import { Insights } from './components/Insights';
import { Reports } from './components/Reports';
import { ShoppingList } from './components/ShoppingList';
import { CalendarView } from './components/CalendarView';
import { financeService } from './services/financeService';
import { supabase } from './lib/supabaseClient';
import { Auth } from './components/Auth';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [privacyMode, setPrivacyMode] = useState(false);
  
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [fetchedTransactions, fetchedBudgets, fetchedGoals] = await Promise.all([
          financeService.getTransactions(),
          financeService.getBudgets(),
          financeService.getGoals()
        ]);
        
        setAllTransactions(fetchedTransactions);
        setBudgets(fetchedBudgets);
        setGoals(fetchedGoals);
      } catch (error) {
        console.error("Falha ao carregar dados", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [session]);

  useEffect(() => {
    const filtered = allTransactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getUTCMonth() === currentMonth.getMonth() && 
             tDate.getUTCFullYear() === currentMonth.getFullYear();
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
      currentInstallment: number = 1,
      isPaid: boolean = true
  ) => {
    
    const newTransactions: Omit<Transaction, 'id'>[] = [];
    const groupId = (installments > 1 || isRecurring) ? `grp_${generateId()}` : undefined;

    if (type === 'expense' && installments > 1) {
        const installmentValue = amount / installments;
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
                description: `${description} (${i}/${installments})`,
                date: currentDate.toISOString().split('T')[0],
                type,
                isRecurring: false,
                isPaid: isThisInstallmentPaid
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
                description: description,
                date: currentDate.toISOString().split('T')[0],
                type,
                isRecurring: true,
                isPaid: isThisItemPaid
            });
        }
    }
    else {
        newTransactions.push({
            amount,
            category,
            description,
            date,
            type,
            isRecurring,
            isPaid
        });
    }

    if (supabase) {
      const added = await financeService.addTransaction(newTransactions);
      if (added) {
        setAllTransactions(prev => [...added, ...prev]);
      } else {
        alert("Erro ao salvar no Supabase.");
      }
    } else {
      const localAdded = newTransactions.map((t, i) => ({ ...t, id: generateId() + i } as Transaction));
      setAllTransactions(prev => [...localAdded, ...prev]);
    }
  };

  const handleEditTransaction = async (id: string, updates: any, updateSeries: boolean = false) => {
      let transactionsToUpdate: {id: string, data: any}[] = [];

      if (!updateSeries) {
          transactionsToUpdate.push({ id, data: updates });
      } else {
          const original = allTransactions.find(t => t.id === id);
          if (!original) return;

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
                 isPaid: sibling.id === id ? updates.isPaid : sibling.isPaid
             };

             transactionsToUpdate.push({ id: sibling.id, data: siblingUpdates });
          });
      }

      if (supabase) {
          const promises = transactionsToUpdate.map(t => financeService.updateTransaction(t.id, t.data));
          const results = await Promise.all(promises);
          
          if (results.some(r => r !== null)) {
              setAllTransactions(prev => {
                  const newMap = new Map<string, Transaction>(prev.map(t => [t.id, t] as [string, Transaction]));
                  results.forEach(updated => {
                      if (updated) newMap.set(updated.id, updated);
                  });
                  return Array.from(newMap.values()).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              });
          }
      } else {
          setAllTransactions(prev => {
              const newMap = new Map<string, Transaction>(prev.map(t => [t.id, t] as [string, Transaction]));
              transactionsToUpdate.forEach(item => {
                  const existing = newMap.get(item.id);
                  if (existing) {
                      newMap.set(item.id, { ...existing, ...item.data });
                  }
              });
              return Array.from(newMap.values()).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          });
      }
      
      setTransactionToEdit(null);
  };

  const handleToggleStatus = async (t: Transaction) => {
     const newStatus = !t.isPaid;
     
     setAllTransactions(prev => prev.map(item => 
        item.id === t.id ? { ...item, isPaid: newStatus } : item
     ));

     if (supabase) {
         await financeService.updateTransaction(t.id, { isPaid: newStatus });
     }
  };

  const handleDeleteTransaction = async (id: string) => {
      if(supabase) {
          const success = await financeService.deleteTransaction(id);
          if(success) {
              setAllTransactions(prev => prev.filter(t => t.id !== id));
          } else {
              alert("Erro ao deletar.");
          }
      } else {
          setAllTransactions(prev => prev.filter(t => t.id !== id));
      }
  };

  const handleAddGoal = async (goalData: Omit<Goal, 'id'>) => {
    if(supabase) {
        const newGoal = await financeService.addGoal(goalData);
        if(newGoal) {
            setGoals(prev => [...prev, newGoal]);
        }
    } else {
        const newGoal = { ...goalData, id: Date.now().toString() };
        setGoals(prev => [...prev, newGoal]);
    }
  };

  const handleUpdateGoal = async (id: string, updates: Partial<Goal>) => {
      if(supabase) {
          const updatedGoal = await financeService.updateGoal(id, updates);
          if(updatedGoal) {
              setGoals(prev => prev.map(g => g.id === id ? updatedGoal : g));
          }
      } else {
          setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
      }
  };

  const handleDeleteGoal = async (id: string) => {
      if(supabase) {
          const success = await financeService.deleteGoal(id);
          if(success) {
              setGoals(prev => prev.filter(g => g.id !== id));
          }
      } else {
          setGoals(prev => prev.filter(g => g.id !== id));
      }
  };

  const openEditModal = (t: Transaction) => {
      setTransactionToEdit(t);
      setShowQuickAdd(true);
  };

  const handleFinishShopping = (total: number) => {
      const preFill: any = {
          amount: total,
          category: 'Mercado',
          description: 'Compras de Mercado (Lista)',
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
    { view: View.SHOPPING_LIST, label: 'Lista', icon: ShoppingCart },
    { view: View.BUDGETS, label: 'Metas', icon: PieChart },
    { view: View.REPORTS, label: 'Relatórios', icon: BarChart3 },
    { view: View.INSIGHTS, label: 'Assistente', icon: Sparkles },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-slate-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  if (loading) {
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-900/50 backdrop-blur-sm p-6 fixed h-full z-20">
        <div className="flex items-center gap-3 mb-10 pl-2">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="font-bold text-white text-lg">F</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-white">Fluxo</span>
        </div>
        
        <nav className="space-y-1.5 flex-1">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => setCurrentView(item.view)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                currentView === item.view 
                  ? 'bg-emerald-500/10 text-emerald-400 font-medium' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <item.icon size={20} className={currentView === item.view ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-4">
            <button 
                onClick={() => setPrivacyMode(!privacyMode)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
                {privacyMode ? <EyeOff size={20} /> : <Eye size={20} />}
                {privacyMode ? 'Mostrar Valores' : 'Ocultar Valores'}
            </button>

            {!supabase && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-200">
                <div className="flex items-center gap-2 mb-1 font-bold">
                <Database size={14}/> Modo Local
                </div>
                Configure as chaves do Supabase.
            </div>
            )}

            <button 
              onClick={() => supabase.auth.signOut()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all"
            >
              <LogOut size={20} />
              Sair
            </button>

            <button 
            onClick={() => { setTransactionToEdit(null); setShowQuickAdd(true); }}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-3.5 px-4 flex items-center justify-center gap-2 font-medium transition-all shadow-lg shadow-emerald-500/20 w-full hover:shadow-emerald-500/30 hover:-translate-y-0.5"
            >
            <Plus size={20} />
            Registrar
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto min-h-screen relative bg-slate-950">
        {/* Decorative Background Elements */}
        <div className="fixed top-0 left-64 right-0 h-64 bg-emerald-900/5 blur-3xl pointer-events-none" />

        {/* Mobile Header with Logout */}
        <div className="md:hidden flex justify-between items-center mb-6 sticky top-0 bg-slate-950/90 backdrop-blur-md z-30 py-4 -mx-4 px-4 border-b border-slate-800/50">
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="font-bold text-white text-lg">F</span>
              </div>
              <span className="font-bold text-lg tracking-tight text-white">Fluxo</span>
           </div>
           <button 
              onClick={() => supabase.auth.signOut()}
              className="p-2 bg-slate-900 rounded-lg text-rose-400 border border-slate-800 hover:bg-slate-800"
              title="Sair"
           >
              <LogOut size={20} />
           </button>
        </div>

        <div className="max-w-6xl mx-auto animate-in fade-in duration-500 relative z-10">
          
          {currentView === View.DASHBOARD && (
            <Dashboard 
                transactions={filteredTransactions} 
                budgets={budgets} 
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
                onEditTransaction={openEditModal}
                onToggleStatus={handleToggleStatus}
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
          {currentView === View.BUDGETS && (
            <BudgetGoals 
                budgets={budgets} 
                goals={goals} 
                transactions={allTransactions} 
                onAddGoal={handleAddGoal}
                onUpdateGoal={handleUpdateGoal}
                onDeleteGoal={handleDeleteGoal}
                privacyMode={privacyMode}
            />
          )}
          {currentView === View.REPORTS && <Reports transactions={allTransactions} />}
          {currentView === View.INSIGHTS && <Insights transactions={filteredTransactions} budgets={budgets} goals={goals} />}
        </div>
      </main>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 px-2 py-3 flex justify-between items-center z-40 safe-area-pb shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => setCurrentView(item.view)}
            className={`flex flex-col items-center gap-1 min-w-[50px] p-1 rounded-lg transition-colors ${
              currentView === item.view ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            <item.icon size={24} strokeWidth={currentView === item.view ? 2.5 : 2} />
            <span className={`text-[10px] font-medium ${currentView === item.view ? 'opacity-100' : 'opacity-70'}`}>{item.label}</span>
          </button>
        ))}
         <button
            onClick={() => setPrivacyMode(!privacyMode)}
            className="flex flex-col items-center gap-1 min-w-[50px] p-1 text-slate-500 active:text-white"
          >
            {privacyMode ? <EyeOff size={24} /> : <Eye size={24} />}
            <span className="text-[10px] font-medium opacity-70">Privacidade</span>
          </button>
      </div>

      {/* Mobile Floating Action Button (FAB) */}
      <button 
        onClick={() => { setTransactionToEdit(null); setShowQuickAdd(true); }}
        className="md:hidden fixed bottom-20 right-6 w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full shadow-lg shadow-emerald-500/40 flex items-center justify-center text-white z-40 active:scale-95 transition-transform"
      >
        <Plus size={28} />
      </button>

      {/* Modals */}
      {showQuickAdd && (
        <QuickAdd 
          onClose={() => { setShowQuickAdd(false); setTransactionToEdit(null); }} 
          onAdd={handleAddTransaction} 
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransaction}
          initialData={transactionToEdit}
        />
      )}
    </div>
  );
};

export default App;