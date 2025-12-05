import React, { useState, useEffect } from 'react';
import { View, Transaction, Budget, Goal, TransactionType } from './types';
import { LayoutDashboard, Plus, PieChart, BarChart3, Sparkles, Database } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { QuickAdd } from './components/QuickAdd';
import { BudgetGoals } from './components/BudgetGoals';
import { Insights } from './components/Insights';
import { Reports } from './components/Reports';
import { financeService } from './services/financeService';
import { supabase } from './lib/supabaseClient';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Date Filter State
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  // State for editing
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);

  // Helper para gerar IDs simples
  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  // Carregar dados iniciais
  useEffect(() => {
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
  }, []);

  // Filter transactions when date or list changes
  useEffect(() => {
    const filtered = allTransactions.filter(t => {
      const tDate = new Date(t.date);
      // Ajuste de fuso horário simples para garantir que a comparação de mês funcione
      // (Considerando que a data do banco vem YYYY-MM-DD e o Date object assume UTC as vezes)
      // Vamos comparar ano e mes
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
      currentInstallment: number = 1 // Novo parâmetro
  ) => {
    
    // Prepare transaction objects
    const newTransactions: Omit<Transaction, 'id'>[] = [];
    // Gerar um Group ID se for uma série (mais de 1 parcela ou recorrente)
    const groupId = (installments > 1 || isRecurring) ? `grp_${generateId()}` : undefined;

    // Lógica 1: Parcelamento (Apenas Despesas, divide o valor)
    if (type === 'expense' && installments > 1) {
        const installmentValue = amount / installments;
        const startDate = new Date(date);

        let monthOffset = 0;

        for (let i = currentInstallment; i <= installments; i++) {
            const currentDate = new Date(startDate);
            currentDate.setMonth(startDate.getMonth() + monthOffset);
            
            newTransactions.push({
                groupId,
                amount: parseFloat(installmentValue.toFixed(2)),
                category,
                description: `${description} (${i}/${installments})`,
                date: currentDate.toISOString().split('T')[0],
                type,
                isRecurring: false
            });
            monthOffset++;
        }
    } 
    // Lógica 2: Recorrência Fixa (Receita ou Despesa, repete valor integral por 12 meses)
    else if (isRecurring) {
        const startDate = new Date(date);
        const RECURRENCE_HORIZON = 12; // Gera automaticamente para 1 ano

        for (let i = 0; i < RECURRENCE_HORIZON; i++) {
            const currentDate = new Date(startDate);
            currentDate.setMonth(startDate.getMonth() + i);
            
            newTransactions.push({
                groupId,
                amount: amount, // Valor integral
                category,
                description: description, // Descrição limpa
                date: currentDate.toISOString().split('T')[0],
                type,
                isRecurring: true // Marcado visualmente como fixo
            });
        }
    }
    // Lógica 3: Transação Única
    else {
        newTransactions.push({
            amount,
            category,
            description,
            date,
            type,
            isRecurring
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
      // Local fallback
      const localAdded = newTransactions.map((t, i) => ({ ...t, id: generateId() + i } as Transaction));
      setAllTransactions(prev => [...localAdded, ...prev]);
    }
  };

  const handleEditTransaction = async (id: string, updates: any, updateSeries: boolean = false) => {
      // 1. Identificar transações a serem atualizadas
      let transactionsToUpdate: {id: string, data: any}[] = [];

      if (!updateSeries) {
          // Atualização simples (apenas 1)
          transactionsToUpdate.push({ id, data: updates });
      } else {
          // Atualização em lote
          const original = allTransactions.find(t => t.id === id);
          if (!original) return;

          // Encontrar irmãs
          let siblings: Transaction[] = [];

          if (original.groupId) {
              // Se tiver ID de grupo, é fácil
              siblings = allTransactions.filter(t => t.groupId === original.groupId);
          } else {
              // Heurística para dados legados (sem groupId):
              // Mesma categoria, mesmo tipo, descrição similar
              const cleanDesc = original.description.replace(/\s\(\d+\/\d+\)$/, '').replace(/\s\(Parcela \d+\)$/, '').trim();
              siblings = allTransactions.filter(t => 
                 t.type === original.type && 
                 t.category === original.category && 
                 t.description.includes(cleanDesc)
              );
          }

          // Preparar updates para cada irmã
          siblings.forEach(sibling => {
             // Preservar a numeração da parcela se existir na descrição original da irmã
             let newDescription = updates.description; // Descrição base vinda do form
             
             const matchSplit = sibling.description.match(/\s\(\d+\/\d+\)$/);
             const matchParcela = sibling.description.match(/\s\(Parcela \d+\)$/);
             
             if (matchSplit) {
                 newDescription += matchSplit[0]; // Reanexa " (1/10)"
             } else if (matchParcela) {
                 newDescription += matchParcela[0]; // Reanexa " (Parcela 1)"
             }

             // Não alteramos a DATA das outras parcelas, apenas Valor, Categoria, Descrição, Tipo
             const siblingUpdates = {
                 ...updates,
                 description: newDescription,
                 date: sibling.id === id ? updates.date : sibling.date // Mantém a data original das outras, altera só a atual se solicitado
             };

             transactionsToUpdate.push({ id: sibling.id, data: siblingUpdates });
          });
      }

      // 2. Executar Updates
      if (supabase) {
          // Nota: Idealmente faríamos um batch update ou stored procedure, mas faremos loop aqui por simplicidade
          const promises = transactionsToUpdate.map(t => financeService.updateTransaction(t.id, t.data));
          const results = await Promise.all(promises);
          
          if (results.some(r => r !== null)) {
              // Atualiza estado local com os resultados
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

  // --- Goal Handlers ---

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

  const navItems = [
    { view: View.DASHBOARD, label: 'Início', icon: LayoutDashboard },
    { view: View.BUDGETS, label: 'Metas', icon: PieChart },
    { view: View.REPORTS, label: 'Relatórios', icon: BarChart3 },
    { view: View.INSIGHTS, label: 'Fluxo AI', icon: Sparkles },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl"></div>
          <p>Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-900 p-6 fixed h-full z-10">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <span className="font-bold text-white text-lg">F</span>
          </div>
          <span className="font-bold text-xl tracking-tight">Fluxo</span>
        </div>
        
        <nav className="space-y-2 flex-1">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => setCurrentView(item.view)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentView === item.view 
                  ? 'bg-emerald-500/10 text-emerald-500 font-medium' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        {!supabase && (
           <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-200">
             <div className="flex items-center gap-2 mb-1 font-bold">
               <Database size={14}/> Modo Local
             </div>
             Configure as chaves do Supabase para sincronizar.
           </div>
        )}

        <button 
          onClick={() => { setTransactionToEdit(null); setShowQuickAdd(true); }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-medium transition-colors mt-auto"
        >
          <Plus size={20} />
          Registrar
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-6 overflow-y-auto min-h-screen">
        <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
          {/* Empty State Helper (Only if absolutely no transactions ever) */}
          {allTransactions.length === 0 && !loading && (
             <div className="mb-8 p-6 bg-slate-800/50 border border-slate-800 rounded-2xl text-center">
                <h3 className="text-white font-bold text-lg mb-2">Tudo pronto para começar!</h3>
                <p className="text-slate-400 mb-4">Você não tem transações registradas. Adicione a primeira para ver o painel ganhar vida.</p>
                <button 
                  onClick={() => { setTransactionToEdit(null); setShowQuickAdd(true); }}
                  className="text-emerald-400 font-medium hover:underline"
                >
                  + Adicionar Transação
                </button>
             </div>
          )}

          {currentView === View.DASHBOARD && (
            <Dashboard 
                transactions={filteredTransactions} 
                budgets={budgets} 
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
                onEditTransaction={openEditModal}
            />
          )}
          {currentView === View.BUDGETS && (
            <BudgetGoals 
                budgets={budgets} 
                goals={goals} 
                transactions={allTransactions} // Passando TODAS as transações para a IA analisar
                onAddGoal={handleAddGoal}
                onUpdateGoal={handleUpdateGoal}
                onDeleteGoal={handleDeleteGoal}
            />
          )}
          {currentView === View.REPORTS && <Reports transactions={allTransactions} />}
          {currentView === View.INSIGHTS && <Insights transactions={filteredTransactions} budgets={budgets} goals={goals} />}
        </div>
      </main>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 px-6 py-4 flex justify-between items-center z-40 safe-area-pb">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => setCurrentView(item.view)}
            className={`flex flex-col items-center gap-1 ${
              currentView === item.view ? 'text-emerald-500' : 'text-slate-500'
            }`}
          >
            <item.icon size={24} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Mobile Floating Action Button (FAB) */}
      <button 
        onClick={() => { setTransactionToEdit(null); setShowQuickAdd(true); }}
        className="md:hidden fixed bottom-20 right-6 w-14 h-14 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/30 flex items-center justify-center text-white z-40 active:scale-95 transition-transform"
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