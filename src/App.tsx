import { lazy, Suspense, useState, useEffect } from 'react';
import { useFinanceStore } from './store';
import Header from './components/Header';
import TransactionModal from './components/TransactionModal';
import DashboardView from './components/DashboardView';
import LoginView from './components/LoginView';
import { Wallet, Calendar, PiggyBank, ShoppingCart, BarChart3, Sliders, Loader2 } from 'lucide-react';
import { Transaction } from './types';

const CalendarView = lazy(() => import('./components/CalendarView'));
const SavingsView = lazy(() => import('./components/SavingsView'));
const MarketListView = lazy(() => import('./components/MarketListView'));
const ReportsView = lazy(() => import('./components/ReportsView'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const AIAssistantWidget = lazy(() => import('./components/AIAssistantWidget'));

export default function App() {
  const { 
    activeTab, 
    setActiveTab, 
    setSelectedDate, 
    syncWithSupabase, 
    isAuthenticated, 
    user,
    transactions,
    accounts,
    categories,
    marketItems,
    categoryBudgets,
    logoutUser,
    refreshStatuses
  } = useFinanceStore();
  useEffect(() => {
    refreshStatuses();
  }, [refreshStatuses]);

  useEffect(() => {
    if (isAuthenticated && user?.email) {
      const userKey = 'finance_user_data_' + user.email.toLowerCase().trim();
      localStorage.setItem(userKey, JSON.stringify({
        transactions,
        accounts,
        categories,
        marketItems,
        categoryBudgets
      }));
    }
  }, [isAuthenticated, user?.email, transactions, accounts, categories, marketItems, categoryBudgets]);

  useEffect(() => {
    if (isAuthenticated) {
      syncWithSupabase();
    }
  }, [syncWithSupabase, isAuthenticated]);

  // Modal controllers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [newTransactionDate, setNewTransactionDate] = useState<string>();

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const handleOpenNewTransaction = () => {
    setEditingTransaction(null);
    setNewTransactionDate(undefined);
    setIsModalOpen(true);
  };

  const handleOpenNewTransactionWithDate = (dateStr: string) => {
    setEditingTransaction(null);
    setSelectedDate(dateStr);
    setNewTransactionDate(dateStr);
    setIsModalOpen(true);
  };

  const handleEditTransaction = (t: Transaction) => {
    setEditingTransaction(t);
    setIsModalOpen(true);
  };

  // Nav item list for bottom bar
  const navItems = [
    { id: 'inicio' as const, label: 'Início', icon: Wallet },
    { id: 'calendario' as const, label: 'Calendário', icon: Calendar },
    { id: 'poupanca' as const, label: 'Poupança', icon: PiggyBank },
    { id: 'lista' as const, label: 'Lista', icon: ShoppingCart },
    { id: 'relatorios' as const, label: 'Relatórios', icon: BarChart3 },
    { id: 'ajustes' as const, label: 'Ajustes', icon: Sliders }
  ];

  // Render core views dynamically
  const renderActiveView = () => {
    switch (activeTab) {
      case 'inicio':
        return <DashboardView onEditTransaction={handleEditTransaction} />;
      case 'calendario':
        return (
          <CalendarView 
            onEditTransaction={handleEditTransaction} 
            onOpenNewTransactionWithDate={handleOpenNewTransactionWithDate}
          />
        );
      case 'poupanca':
        return <SavingsView />;
      case 'lista':
        return <MarketListView />;
      case 'relatorios':
        return <ReportsView />;
      case 'ajustes':
        return <SettingsView />;
      default:
        return <DashboardView onEditTransaction={handleEditTransaction} />;
    }
  };

  return (
    <div className="h-screen w-full bg-[#070709] text-zinc-100 font-sans flex overflow-hidden selection:bg-emerald-500/20 selection:text-emerald-400">
      
      {/* Desktop Sidebar (Hidden on mobile) */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0f0f13] border-r border-white/[0.08] p-6 z-40 h-full flex-shrink-0">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
            <Wallet size={18} />
          </div>
          <div>
            <h2 className="font-bold font-display tracking-tight text-white leading-tight text-base">Minhas Finanças</h2>
            <p className="text-[11px] text-zinc-400 font-mono tracking-wider truncate max-w-[130px]">{user?.name}</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 active:scale-[0.98] text-left ${
                  isActive 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm font-semibold' 
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Icon 
                  size={18} 
                  strokeWidth={isActive ? 2.25 : 1.75} 
                />
                <span className="text-sm font-display tracking-wide">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
        
        <div className="mt-auto pt-4 border-t border-white/[0.08] space-y-2">
          <button 
            onClick={() => {
              logoutUser();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition duration-150 active:scale-[0.98] border border-transparent"
          >
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden relative w-full bg-[#070709]">
        {/* Dynamic Navigation Header */}
        <Header onOpenNewTransaction={handleOpenNewTransaction} />

        {/* Main content wrapper */}
        <main className="flex-1 px-4 md:px-8 py-6 overflow-y-auto pb-28 md:pb-6 custom-scrollbar">
          <div className="max-w-4xl mx-auto w-full">
            <Suspense fallback={
              <div className="flex min-h-48 items-center justify-center" role="status" aria-label="Carregando seção">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" aria-hidden="true" />
              </div>
            }>
              {renderActiveView()}
            </Suspense>
          </div>
        </main>

        {/* High fidelity Fixed Bottom Navigation bar (Mobile only) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f0f13] border-t border-white/[0.08] px-4 py-2.5 z-40 rounded-t-2xl shadow-2xl flex justify-between items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 rounded-xl transition-all duration-150 active:scale-[0.96] ${
                  isActive 
                    ? 'text-emerald-400 font-semibold' 
                    : 'text-zinc-500 hover:text-zinc-300 font-medium'
                }`}
              >
                <Icon 
                  size={19} 
                  strokeWidth={isActive ? 2.25 : 1.75} 
                />
                <span className="text-[10px] tracking-wide leading-none select-none font-display">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Shared Transaction creation / editing modal */}
      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        editingTransaction={editingTransaction}
        initialDate={newTransactionDate}
      />

      <Suspense fallback={null}>
        <AIAssistantWidget />
      </Suspense>
    </div>
  );
}
