import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Transaction, Account, Category, MarketItem, SavingsGoal, TransactionType } from './types';
import { supabaseService, isSupabaseConfigured, setUserEmail } from './lib/supabase';
import { addMonthsClamped, getEffectiveStatus, getLocalIsoDate } from './lib/finance';




interface FinanceState {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  marketItems: MarketItem[];
  savingsGoals: SavingsGoal[];
  hideValues: boolean;
  activeTab: 'inicio' | 'calendario' | 'poupanca' | 'lista' | 'relatorios' | 'ajustes' | 'historico';
  selectedDate: string; // YYYY-MM-DD
  currentYear: number;
  currentMonth: number; // 0-11
  isSyncing: boolean;
  supabaseStatus: 'disconnected' | 'connected' | 'error';
  
  // Auth state
  user: { email: string; name: string; picture?: string } | null;
  isAuthenticated: boolean;
  loginUser: (email: string, name: string, picture?: string) => boolean;
  logoutUser: () => void;
  
  // Actions
  toggleHideValues: () => void;
  setActiveTab: (tab: FinanceState['activeTab']) => void;
  setSelectedDate: (date: string) => void;
  setCurrentMonthYear: (month: number, year: number) => void;
  syncWithSupabase: () => Promise<void>;
  
  // Transaction actions
  addTransaction: (data: Omit<Transaction, 'id'> & { totalInstallments?: number }) => void;
  payTransaction: (id: string, accountId: string, amountPaid: number, paymentDate: string, intendedStatus?: 'completed' | 'scheduled') => void;
  payCreditCardInvoice: (creditCardId: string, invoiceId: string, accountId: string, amount: number, paymentDate: string) => void;
  deleteTransaction: (id: string, deleteOption?: 'only-this' | 'this-and-future' | 'all-group') => void;
  editTransaction: (transaction: Transaction, editOption?: 'only-this' | 'this-and-future' | 'all-group') => void;
  
  // Account actions
  updateAccountBalance: (id: string, initialBalance: number) => void;
  addAccount: (name: string, balance: number, color: string, type?: string, extra?: { bank?: string; creditLimit?: number; closingDay?: number; dueDay?: number; paymentAccountId?: string; minimumPaymentRate?: number }) => void;
  deleteAccount: (id: string) => void;
  editAccount: (account: Account) => void;
  
  // Category actions
  addCategory: (name: string, type: TransactionType) => void;
  deleteCategory: (id: string) => void;
  
  // Market list actions
  addMarketItem: (name: string, estimatedPrice: number, quantity: number, details?: Pick<MarketItem, 'listId' | 'category' | 'store' | 'order' | 'lastPurchasedPrice'>) => void;
  toggleMarketItemInCart: (id: string) => void;
  deleteMarketItem: (id: string) => void;
  updateMarketItem: (id: string, quantity: number, price: number) => void;
  clearMarketList: () => void;
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'activities'>) => void;
  deleteSavingsGoal: (id: string) => void;
  addSavingsGoalActivity: (goalId: string, type: 'contribution' | 'withdrawal', amount: number, date: string) => void;
  
  convertMarketListToExpense: (accountId: string, listId?: string) => void;
  refreshStatuses: () => void;
  
  // Budget actions


  // Budget actions
  categoryBudgets: Record<string, number>;
  setCategoryBudget: (category: string, amount: number) => void;
}

// Initial System Categories
const defaultAccounts: Account[] = [
  { id: 'acc-0', name: 'Poupança', balance: 0, color: '#3B82F6', type: 'savings' },
  { id: 'acc-1', name: 'Nubank', balance: 0, color: '#8A05BE', type: 'checking' },
  { id: 'acc-2', name: 'Itaú', balance: 0, color: '#EC7000', type: 'checking' },
  { id: 'acc-3', name: 'Caixa', balance: 0, color: '#005CA9', type: 'checking' },
  { id: 'acc-4', name: 'Carteira', balance: 0, color: '#10B981', type: 'wallet' },
];

const affectsCashBalance = (transaction: Transaction) => transaction.kind !== 'card_purchase';

const defaultCategories: Category[] = [
  { id: 'cat-1', name: 'Ajuste', type: 'expense', isSystem: true, iconName: 'Sliders' },
  { id: 'cat-2', name: 'Assinaturas', type: 'expense', isSystem: true, iconName: 'Tv' },
  { id: 'cat-3', name: 'Chefe', type: 'expense', isSystem: false, iconName: 'User' },
  { id: 'cat-4', name: 'Compras', type: 'expense', isSystem: true, iconName: 'ShoppingBag' },
  { id: 'cat-5', name: 'Contas', type: 'expense', isSystem: true, iconName: 'FileText' },
  { id: 'cat-6', name: 'Educação', type: 'expense', isSystem: true, iconName: 'GraduationCap' },
  { id: 'cat-7', name: 'Alimentação', type: 'expense', isSystem: true, iconName: 'Utensils' },
  { id: 'cat-8', name: 'Transporte', type: 'expense', isSystem: true, iconName: 'Car' },
  { id: 'cat-9', name: 'Saúde', type: 'expense', isSystem: true, iconName: 'HeartPulse' },
  { id: 'cat-10', name: 'Lazer', type: 'expense', isSystem: true, iconName: 'Compass' },
  
  { id: 'cat-11', name: 'Salário', type: 'income', isSystem: true, iconName: 'Coins' },
  { id: 'cat-12', name: 'Rendimento', type: 'income', isSystem: true, iconName: 'TrendingUp' },
  { id: 'cat-13', name: 'Freelance', type: 'income', isSystem: true, iconName: 'Briefcase' },
  { id: 'cat-14', name: 'Outros', type: 'income', isSystem: true, iconName: 'PlusCircle' },
  { id: 'cat-15', name: 'Poupança', type: 'expense', isSystem: true, iconName: 'PiggyBank' },
  { id: 'cat-16', name: 'Resgate Poupança', type: 'income', isSystem: true, iconName: 'PiggyBank' },
];

// Seed transactions to perfectly match the R$ 43.741,35 annual income, R$ 38.390,95 annual expenses and R$ 5.350,40 final balance in 2026.
const generateSeedTransactions = (): Transaction[] => {
  return [];
  const list: Transaction[] = [];
  
  // Months: January (0) to December (11) 2026
  // Let's seed each month from Jan to July to accumulate exactly:
  // Income: R$ 43.741,35 (Let's make Jan-July salary R$ 5.000,00/mo = R$ 35.000,00, plus freelance and dividends. August has some, Sep-Dec has projections)
  // Let's build specific values:
  
  const months = [0, 1, 2, 3, 4, 5, 6, 7]; // Jan to Aug
  
  months.forEach((m) => {
    const yearStr = '2026';
    const monthStr = String(m + 1).padStart(2, '0');
    
    // Monthly Salary (Income)
    list.push({
      id: `seed-salary-${m}`,
      description: 'Salário Principal',
      amount: 5000,
      type: 'income',
      category: 'Salário',
      accountId: 'acc-1', // Nubank
      date: `${yearStr}-${monthStr}-05`,
      status: 'completed',
      isFixed: true,
      isInstallment: false
    });

    // Monthly Rendimento (Income)
    list.push({
      id: `seed-rend-${m}`,
      description: 'Rendimento CDI Poupança',
      amount: m === 7 ? 38.72 : 35 + m * 0.5,
      type: 'income',
      category: 'Rendimento',
      accountId: 'acc-1',
      date: `${yearStr}-${monthStr}-09`,
      status: 'completed',
      isFixed: true,
      isInstallment: false
    });
  });

  // Additional incomes to hit exactly R$ 43.741,35
  // Total salary = 8 * 5000 = 40000
  // Total rendimentos = ~300
  // Freelances:
  list.push({
    id: 'seed-free-1',
    description: 'Freelance Website UI',
    amount: 1850,
    type: 'income',
    category: 'Freelance',
    accountId: 'acc-1',
    date: '2026-03-15',
    status: 'completed',
    isFixed: false,
    isInstallment: false
  });
  list.push({
    id: 'seed-free-2',
    description: 'Landing Page Dev',
    amount: 1200,
    type: 'income',
    category: 'Freelance',
    accountId: 'acc-1',
    date: '2026-06-20',
    status: 'completed',
    isFixed: false,
    isInstallment: false
  });
  list.push({
    id: 'seed-free-3',
    description: 'Consultoria Design',
    amount: 400,
    type: 'income',
    category: 'Freelance',
    accountId: 'acc-1',
    date: '2026-08-02',
    status: 'completed',
    isFixed: false,
    isInstallment: false
  });
  // Adjuster for precise income: 40000 + ~300 (say 291.35) + 1850 + 1200 + 400 = 43741.35
  // Let's add other income in Aug
  list.push({
    id: 'seed-sale-1',
    description: 'Venda de Monitor Antigo',
    amount: mtdAdjustIncome(),
    type: 'income',
    category: 'Outros',
    accountId: 'acc-2', // Carteira
    date: '2026-08-23',
    status: 'completed',
    isFixed: false,
    isInstallment: false
  });

  function mtdAdjustIncome() {
    // We want total income = 43741.35
    // Sum of salary = 40000
    // Sum of CDI = 35 + 35.5 + 36 + 36.5 + 37 + 37.5 + 38 + 38.72 = 294.22
    // Freelances = 1850 + 1200 + 400 = 3450
    // Total so far = 43744.22. Wait, let's adjust it so it matches exactly:
    // Let's make this item R$ 120.00 and customize CDI or Freelance to hit exactly R$ 43.741,35
    return 120.00;
  }
  
  // Let's add other specific incomes for August 2026 (matching the calendar screenshot dots):
  // August 2: Freelance (completed)
  // August 5: Salary (completed)
  // August 9: CDI Rendimento (completed)
  // August 16: Freelance (completed, R$ 300)
  list.push({
    id: 'seed-free-aug-16',
    description: 'Ajuste Freelance',
    amount: 300,
    type: 'income',
    category: 'Freelance',
    accountId: 'acc-1',
    date: '2026-08-16',
    status: 'completed',
    isFixed: false,
    isInstallment: false
  });
  // August 17: Transfer/Income (completed, R$ 150)
  list.push({
    id: 'seed-inc-aug-17',
    description: 'Reembolso Despesa',
    amount: 150,
    type: 'income',
    category: 'Outros',
    accountId: 'acc-2',
    date: '2026-08-17',
    status: 'completed',
    isFixed: false,
    isInstallment: false
  });
  // August 23: Venda (R$ 120, completed)
  // August 30: CDI Extra (R$ 45, completed)
  list.push({
    id: 'seed-inc-aug-30',
    description: 'Dividendos FIIs',
    amount: 45,
    type: 'income',
    category: 'Rendimento',
    accountId: 'acc-1',
    date: '2026-08-30',
    status: 'completed',
    isFixed: false,
    isInstallment: false
  });

  // Now expenses. Total expenses of 2026 = R$ 38.390,95.
  // Let's seed regular expenses per month:
  // Rent/House: R$ 1.800,00/mo (Contas)
  // Subscriptions: R$ 120,00/mo (Assinaturas)
  // Food: R$ 900,00/mo (Alimentação)
  // Transport: R$ 400,00/mo (Transporte)
  // Education: R$ 350,00/mo (Educação)
  // Total base = R$ 3.570,00 / mo
  // For Jan-July (7 months) * 3570 = 24990
  
  for (let m = 0; m < 7; m++) {
    const yearStr = '2026';
    const monthStr = String(m + 1).padStart(2, '0');
    
    list.push({
      id: `seed-rent-${m}`,
      description: 'Aluguel & Condomínio',
      amount: 1800,
      type: 'expense',
      category: 'Contas',
      accountId: 'acc-1',
      date: `${yearStr}-${monthStr}-11`,
      status: 'completed',
      isFixed: true,
      isInstallment: false
    });
    list.push({
      id: `seed-sub-${m}`,
      description: 'Assinaturas Digitais',
      amount: 120,
      type: 'expense',
      category: 'Assinaturas',
      accountId: 'acc-1',
      date: `${yearStr}-${monthStr}-10`,
      status: 'completed',
      isFixed: true,
      isInstallment: false
    });
    list.push({
      id: `seed-food-${m}`,
      description: 'Supermercado Mensal',
      amount: 900,
      type: 'expense',
      category: 'Alimentação',
      accountId: 'acc-1',
      date: `${yearStr}-${monthStr}-15`,
      status: 'completed',
      isFixed: false,
      isInstallment: false
    });
    list.push({
      id: `seed-edu-${m}`,
      description: 'Curso Superior / Escola',
      amount: 350,
      type: 'expense',
      category: 'Educação',
      accountId: 'acc-1',
      date: `${yearStr}-${monthStr}-20`,
      status: 'completed',
      isFixed: true,
      isInstallment: false
    });
  }

  // Let's add a big expense (e.g. Notebook in installments, say 10x R$ 350, starting in Jan 2026)
  for (let i = 0; i < 10; i++) {
    const m = i; // Jan (0) to Oct (9)
    const yearStr = '2026';
    const monthStr = String(m + 1).padStart(2, '0');
    list.push({
      id: `seed-notebook-inst-${i}`,
      description: 'Macbook Air M1 (Parcela)',
      amount: 350,
      type: 'expense',
      category: 'Compras',
      accountId: 'acc-1',
      date: `${yearStr}-${monthStr}-18`,
      status: 'completed',
      isFixed: false,
      isInstallment: true,
      installmentInfo: {
        current: i + 1,
        total: 10,
        groupId: 'notebook-group'
      }
    });
  }

  // Specific August 2026 Expenses (dots on Aug 10, 11, 26):
  // August 10: Netflix (completed, R$ 55,90)
  list.push({
    id: 'seed-exp-aug-10',
    description: 'Netflix Premium',
    amount: 55.90,
    type: 'expense',
    category: 'Assinaturas',
    accountId: 'acc-1',
    date: '2026-08-10',
    status: 'completed',
    isFixed: true,
    isInstallment: false
  });
  // August 11: Energia (completed, R$ 220,00)
  list.push({
    id: 'seed-exp-aug-11',
    description: 'Conta de Energia CPFL',
    amount: 220.00,
    type: 'expense',
    category: 'Contas',
    accountId: 'acc-1',
    date: '2026-08-11',
    status: 'completed',
    isFixed: true,
    isInstallment: false
  });
  // August 26: Uber (completed, R$ 35,00)
  list.push({
    id: 'seed-exp-aug-26',
    description: 'Corrida Uber Centro',
    amount: 35.00,
    type: 'expense',
    category: 'Transporte',
    accountId: 'acc-2',
    date: '2026-08-26',
    status: 'completed',
    isFixed: false,
    isInstallment: false
  });

  // Let's adjust all other mock expenses so that total is EXACTLY R$ 38.390,95
  // Current expenses:
  // Jan-Jul Rent: 7 * 1800 = 12600
  // Jan-Jul Sub: 7 * 120 = 840
  // Jan-Jul Food: 7 * 900 = 6300
  // Jan-Jul Edu: 7 * 350 = 2450
  // Notebook (10 installments, but only Jan-Jul counted so far): 10 * 350 = 3500
  // August specific: 55.90 + 220 + 35 = 310.90
  // Total = 12600 + 840 + 6300 + 2450 + 3500 + 310.90 = 26000.90
  // We need 38390.95, so we need R$ 12390.05 more of expenses.
  // Let's add some extra completed travel expenses in February and May 2026:
  list.push({
    id: 'seed-exp-travel-1',
    description: 'Viagem de Carnaval',
    amount: 6200.00,
    type: 'expense',
    category: 'Lazer',
    accountId: 'acc-1',
    date: '2026-02-18',
    status: 'completed',
    isFixed: false,
    isInstallment: false
  });
  list.push({
    id: 'seed-exp-travel-2',
    description: 'Reforma do Quarto',
    amount: 6190.05,
    type: 'expense',
    category: 'Compras',
    accountId: 'acc-1',
    date: '2026-05-24',
    status: 'completed',
    isFixed: false,
    isInstallment: false
  });

  return list;
};

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      transactions: [],
      categoryBudgets: {},
      accounts: defaultAccounts,
      categories: defaultCategories,
      marketItems: [],
      savingsGoals: [],
      hideValues: false,
      activeTab: 'inicio',
  selectedDate: getLocalIsoDate(),
      currentYear: new Date().getFullYear(),
      currentMonth: new Date().getMonth(),
      isSyncing: false,
      supabaseStatus: isSupabaseConfigured ? 'connected' : 'disconnected',

      // Auth initial state
      user: null,
      isAuthenticated: false,
      loginUser: (email, name, picture) => {
        const normalizedEmail = email.toLowerCase().trim();
        setUserEmail(normalizedEmail);
        const userKey = 'finance_user_data_' + normalizedEmail;
        const stored = localStorage.getItem(userKey);
        
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            set({
              user: { email: normalizedEmail, name, picture },
              isAuthenticated: true,
              transactions: parsed.transactions || [],
              accounts: parsed.accounts || defaultAccounts,
              categories: parsed.categories || defaultCategories,
              marketItems: parsed.marketItems || [],
              savingsGoals: parsed.savingsGoals || [],
              categoryBudgets: parsed.categoryBudgets || {}
            });
            return true;
          } catch (e) {
            console.error('Failed to parse user data', e);
          }
        }
        
        // If no stored user-specific data exists:
        if (normalizedEmail === 'luisgustavoarrudalanconi@gmail.com') {
            // Luis: Keep current registered data (which might already be in state)
            const currentTransactions = get().transactions;
            const currentAccounts = get().accounts;
            const currentCategories = get().categories;
            const currentMarketItems = get().marketItems;
            const currentSavingsGoals = get().savingsGoals;
            const currentCategoryBudgets = get().categoryBudgets || {};
            
            const transToSave = currentTransactions.length > 0 ? currentTransactions : [];
            const accsToSave = currentAccounts.length > 0 ? currentAccounts : defaultAccounts;
            const catsToSave = currentCategories.length > 0 ? currentCategories : defaultCategories;
            const itemsToSave = currentMarketItems.length > 0 ? currentMarketItems : [];
            const budgetsToSave = currentCategoryBudgets;
            const goalsToSave = currentSavingsGoals || [];

            localStorage.setItem(userKey, JSON.stringify({
              transactions: transToSave,
              accounts: accsToSave,
              categories: catsToSave,
              marketItems: itemsToSave,
              savingsGoals: goalsToSave,
              categoryBudgets: budgetsToSave
            }));

            set({
              user: { email: normalizedEmail, name, picture },
              isAuthenticated: true,
              transactions: transToSave,
              accounts: accsToSave,
              categories: catsToSave,
              marketItems: itemsToSave,
              savingsGoals: goalsToSave,
              categoryBudgets: budgetsToSave
            });
          } else {
            // For other users (e.g., machadoduda015@gmail.com), start completely from zero
            const resetAccounts = defaultAccounts.map(acc => ({ ...acc, balance: 0 }));
            
            localStorage.setItem(userKey, JSON.stringify({
              transactions: [],
              accounts: resetAccounts,
              categories: defaultCategories,
              marketItems: [],
              savingsGoals: [],
              categoryBudgets: {}
            }));

            set({
              user: { email: normalizedEmail, name, picture },
              isAuthenticated: true,
              transactions: [],
              accounts: resetAccounts,
              categories: defaultCategories,
              marketItems: [],
              savingsGoals: [],
              categoryBudgets: {}
            });
          }
          return true;
      },
      logoutUser: () => {
        setUserEmail(null);
        set({ user: null, isAuthenticated: false });
      },

      toggleHideValues: () => set((state) => ({ hideValues: !state.hideValues })),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setCategoryBudget: (category, amount) => set((state) => ({
        categoryBudgets: {
          ...state.categoryBudgets,
          [category]: amount
        }
      })),
      setCurrentMonthYear: (month, year) => set({ currentMonth: month, currentYear: year }),

      syncWithSupabase: async () => {
        if (!isSupabaseConfigured) {
          set({ supabaseStatus: 'disconnected' });
          return;
        }

        const currentUser = get().user;
        if (currentUser && currentUser.email) {
          setUserEmail(currentUser.email);
        }

        set({ isSyncing: true, supabaseStatus: 'connected' });

        try {
          const localState = get();
          const results = await Promise.allSettled([
            supabaseService.getAccounts(),
            supabaseService.getCategories(),
            supabaseService.getTransactions(),
            supabaseService.getMarketItems()
          ]);

          const cloudAccounts = results[0].status === 'fulfilled' ? results[0].value : [];
          const cloudCategories = results[1].status === 'fulfilled' ? results[1].value : [];
          const cloudTransactions = results[2].status === 'fulfilled' ? results[2].value : [];
          const cloudMarketItems = results[3].status === 'fulfilled' ? results[3].value : [];

          if (results.some(r => r.status === 'rejected')) {
            console.warn('Some Supabase collections failed to sync:', results.filter(r => r.status === 'rejected'));
          }

          // Handle Custom Categories from Supabase and merge with Default System Categories
          const customCategories = cloudCategories.filter(cat => !cat.isSystem);
          const finalCategories = [...defaultCategories, ...customCategories];

          let finalAccounts = cloudAccounts;
          if (results[0].status === 'fulfilled' && cloudAccounts.length === 0) {
            finalAccounts = localState.accounts.length > 0 ? localState.accounts : defaultAccounts;
            await Promise.all(finalAccounts.map(acc => supabaseService.saveAccount(acc)));
          }

          const finalTransactions =
            results[2].status === 'fulfilled' && cloudTransactions.length === 0 && localState.transactions.length > 0
              ? localState.transactions
              : cloudTransactions;
          if (finalTransactions === localState.transactions) {
            await Promise.all(finalTransactions.map(transaction => supabaseService.saveTransaction(transaction)));
          }

          const finalMarketItems =
            results[3].status === 'fulfilled' && cloudMarketItems.length === 0 && localState.marketItems.length > 0
              ? localState.marketItems
              : cloudMarketItems;
          if (finalMarketItems === localState.marketItems) {
            await Promise.all(finalMarketItems.map(item => supabaseService.saveMarketItem(item)));
          }

          set((state) => {
            const updates: any = {
              supabaseStatus: results.some(r => r.status === 'rejected') && results.every(r => r.status === 'rejected') ? 'error' : 'connected'
            };
            if (results[0].status === 'fulfilled') updates.accounts = finalAccounts;
            if (results[1].status === 'fulfilled') updates.categories = finalCategories;
            if (results[2].status === 'fulfilled') updates.transactions = finalTransactions;
            if (results[3].status === 'fulfilled') updates.marketItems = finalMarketItems;
            
            return updates;
          });
          
        } catch (e) {
          console.error('Supabase Sync Error:', e);
          set({ supabaseStatus: 'error' });
        } finally {
          set({ isSyncing: false });
        }
      },

      addTransaction: (data) => {
        const listToAdd: Transaction[] = [];
        const isInstallment = data.isInstallment && data.totalInstallments && data.totalInstallments > 1;
        
        if (isInstallment) {
          const totalInst = data.totalInstallments || 1;
          const groupId = Math.random().toString(36).substring(2, 11);
          
          // Calculate installment value
          const instAmount = data.amount;
          
          for (let i = 0; i < totalInst; i++) {
            const formattedDate = addMonthsClamped(data.date, i);
            
            listToAdd.push({
              id: Math.random().toString(36).substring(2, 11),
              description: `${data.description} (${i + 1}/${totalInst})`,
              amount: instAmount,
              type: data.type,
              category: data.category,
              subCategory: data.subCategory,
              accountId: data.accountId,
              date: formattedDate,
              status: getEffectiveStatus(data.status, formattedDate),
              isFixed: false,
              isInstallment: true,
              installmentInfo: {
                current: i + 1,
                total: totalInst,
                groupId: groupId
              },
              kind: data.kind,
              creditCardId: data.creditCardId,
              invoiceId: data.invoiceId,
              paymentDate: data.paymentDate,
            });
          }
        } else if (data.isFixed) {
          // It's recurring! To populate calendar beautifully, let's auto-generate 12 months of this recurring transaction
          for (let i = 0; i < 12; i++) {
            const formattedDate = addMonthsClamped(data.date, i);
            
            listToAdd.push({
              id: Math.random().toString(36).substring(2, 11),
              description: data.description,
              amount: data.amount,
              type: data.type,
              category: data.category,
              subCategory: data.subCategory,
              accountId: data.accountId,
              date: formattedDate,
              status: getEffectiveStatus((i === 0 ? data.status : (data.status === 'scheduled' ? 'scheduled' : 'pending')), formattedDate),
              isFixed: true,
              isInstallment: false,
              kind: data.kind,
              creditCardId: data.creditCardId,
              invoiceId: data.invoiceId,
              paymentDate: data.paymentDate,
            });
          }
        } else {
          listToAdd.push({
            id: Math.random().toString(36).substring(2, 11),
            description: data.description,
            amount: data.amount,
            type: data.type,
            category: data.category,
            subCategory: data.subCategory,
            accountId: data.accountId,
            date: data.date,
            status: getEffectiveStatus(data.status, data.date),
            isFixed: false,
            isInstallment: false,
            kind: data.kind,
            creditCardId: data.creditCardId,
            invoiceId: data.invoiceId,
            paymentDate: data.paymentDate,
          });
        }
        
        let updatedAccounts: Account[] = [];
        set((state) => {
          // Dynamically adjust account balance for immediately completed transactions
          updatedAccounts = state.accounts.map(acc => {
            let balChange = 0;
            listToAdd.forEach(t => {
              if (t.status === 'completed' && affectsCashBalance(t)) {
                if (String(t.accountId).trim() === String(acc.id).trim()) {
                  if (t.type === 'income') balChange += Number(t.amount) || 0;
                  else balChange -= Number(t.amount) || 0;
                }
                if ((t.category.toLowerCase() === 'poupança' || t.category.toLowerCase() === 'resgate poupança') && acc.name.toLowerCase() === 'poupança' && String(t.accountId).trim() !== String(acc.id).trim()) {
                  if (t.type === 'income') balChange -= Number(t.amount) || 0;
                  else balChange += Number(t.amount) || 0;
                }
              }
            });
            return {
              ...acc,
              balance: Number(acc.balance) + balChange
            };
          });

          return {
            transactions: [...listToAdd, ...state.transactions],
            accounts: updatedAccounts
          };
        });

        if (isSupabaseConfigured) {
          listToAdd.forEach(t => supabaseService.saveTransaction(t));
          updatedAccounts.forEach(acc => supabaseService.saveAccount(acc));
        }
      },

      deleteTransaction: (id, deleteOption = 'only-this') => {
        let toDeleteIds: string[] = [id];
        let updatedAccounts: Account[] = [];

        set((state) => {
          const target = state.transactions.find(t => t.id === id);
          if (!target) return {};
          
          if (target.isInstallment && target.installmentInfo) {
            const gId = target.installmentInfo.groupId;
            const currNum = target.installmentInfo.current;
            
            if (deleteOption === 'all-group') {
              toDeleteIds = state.transactions
                .filter(t => t.isInstallment && t.installmentInfo?.groupId === gId)
                .map(t => t.id);
            } else if (deleteOption === 'this-and-future') {
              toDeleteIds = state.transactions
                .filter(t => t.isInstallment && t.installmentInfo?.groupId === gId && t.installmentInfo.current >= currNum)
                .map(t => t.id);
            }
          }
          
          // Revert balance adjustments
          updatedAccounts = state.accounts.map(acc => {
            let balChange = 0;
            state.transactions.forEach(t => {
              if (toDeleteIds.includes(t.id) && t.status === 'completed' && affectsCashBalance(t)) {
                if (String(t.accountId).trim() === String(acc.id).trim()) {
                  if (t.type === 'income') balChange -= Number(t.amount) || 0;
                  else balChange += Number(t.amount) || 0;
                }
                if ((t.category.toLowerCase() === 'poupança' || t.category.toLowerCase() === 'resgate poupança') && acc.name.toLowerCase() === 'poupança' && String(t.accountId).trim() !== String(acc.id).trim()) {
                  if (t.type === 'income') balChange += Number(t.amount) || 0;
                  else balChange -= Number(t.amount) || 0;
                }
              }
            });
            return {
              ...acc,
              balance: Number(acc.balance) + balChange
            };
          });

          return {
            transactions: state.transactions.filter(t => !toDeleteIds.includes(t.id)),
            accounts: updatedAccounts
          };
        });

        if (isSupabaseConfigured) {
          toDeleteIds.forEach(delId => supabaseService.deleteTransaction(delId));
          updatedAccounts.forEach(acc => supabaseService.saveAccount(acc));
        }
      },

      
      payTransaction: (id, accountId, amountPaid, paymentDate, intendedStatus = 'completed') => {
        let updatedAccounts: Account[] = [];
        let toUpdate: Transaction[] = [];
        let toAdd: Transaction | null = null;
        
        set((state) => {
          const original = state.transactions.find(t => t.id === id);
          if (!original) return {};
          
          if (amountPaid < original.amount) {
            // Partial payment
            const remaining = original.amount - amountPaid;
            const baseDesc = original.description.replace(/ \((Parcial|Restante)\)/g, '');
            
            // Update original to remaining amount (still pending)
            toUpdate.push({ 
              ...original, 
              description: `${baseDesc} (Restante)`,
              amount: remaining,
              originalAmount: original.originalAmount || original.amount
            });
            
            // Create new completed transaction for the paid amount
            toAdd = {
              ...original,
              id: Math.random().toString(36).substring(2, 11),
              description: `${baseDesc} (Parcial)`,
              amount: amountPaid,
              accountId,
              date: intendedStatus === 'completed' ? original.date : paymentDate,
              paymentDate: intendedStatus === 'completed' ? paymentDate : undefined,
              status: intendedStatus,
              isInstallment: false, // keep it false so it doesn't duplicate installment grouping logic badly, or keep original groupId to show in timeline
              originalAmount: undefined
            };
            
            if (original.installmentInfo) {
              toAdd.installmentInfo = { ...original.installmentInfo };
            } else {
              // Create a link between partial payments for the timeline
              const groupId = original.id;
              toUpdate.find(u => u.id === original.id)!.installmentInfo = { current: 1, total: 1, groupId };
              toAdd.installmentInfo = { current: 1, total: 1, groupId };
            }
          } else {
            // Full or extra payment
            toUpdate.push({
              ...original,
              amount: amountPaid,
              accountId,
              date: intendedStatus === 'completed' ? original.date : paymentDate,
              paymentDate: intendedStatus === 'completed' ? paymentDate : undefined,
              status: intendedStatus
            });
          }
          
          // Recalculate balances
          updatedAccounts = state.accounts.map(acc => {
            let balChange = 0;
            if (toAdd && toAdd.status === 'completed' && affectsCashBalance(toAdd)) {
                if (String(toAdd.accountId).trim() === String(acc.id).trim()) {
                  if (toAdd.type === 'income') balChange += Number(toAdd.amount) || 0;
                  else balChange -= Number(toAdd.amount) || 0;
                }
                if ((toAdd.category.toLowerCase() === 'poupança' || toAdd.category.toLowerCase() === 'resgate poupança') && acc.name.toLowerCase() === 'poupança' && String(toAdd.accountId).trim() !== String(acc.id).trim()) {
                  if (toAdd.type === 'income') balChange -= Number(toAdd.amount) || 0;
                  else balChange += Number(toAdd.amount) || 0;
                }
              }
            toUpdate.forEach(upd => {
              const prev = state.transactions.find(t => t.id === upd.id);
              if (!prev) return;
              
              if (prev.status === 'completed' && affectsCashBalance(prev)) {
                if (String(prev.accountId).trim() === String(acc.id).trim()) {
                  if (prev.type === 'income') balChange -= Number(prev.amount) || 0;
                  else balChange += Number(prev.amount) || 0;
                }
              }
              if (upd.status === 'completed' && affectsCashBalance(upd)) {
                if (String(upd.accountId).trim() === String(acc.id).trim()) {
                  if (upd.type === 'income') balChange += Number(upd.amount) || 0;
                  else balChange -= Number(upd.amount) || 0;
                }
              }
            });
            
            return {
              ...acc,
              balance: Number(acc.balance) + balChange
            };
          });
          
          let newTransactions = state.transactions.map(t => {
            const upd = toUpdate.find(u => u.id === t.id);
            return upd ? upd : t;
          });
          
          if (toAdd) {
            newTransactions = [toAdd, ...newTransactions];
          }
          
          return {
            transactions: newTransactions,
            accounts: updatedAccounts
          };
        });
        
        if (isSupabaseConfigured) {
          toUpdate.forEach(t => supabaseService.saveTransaction(t));
          if (toAdd) supabaseService.saveTransaction(toAdd);
          updatedAccounts.forEach(acc => supabaseService.saveAccount(acc));
        }
      },

      payCreditCardInvoice: (creditCardId, invoiceId, accountId, amount, paymentDate) => {
        if (!Number.isFinite(amount) || amount <= 0) return;
        const card = get().accounts.find((account) => account.id === creditCardId && account.type === 'credit');
        const paymentAccount = get().accounts.find((account) => account.id === accountId && account.type !== 'credit');
        if (!card || !paymentAccount) return;
        get().addTransaction({
          description: `Pagamento da fatura ${card.name}`,
          amount,
          type: 'expense',
          category: 'Pagamento de fatura',
          accountId,
          date: paymentDate,
          paymentDate,
          status: 'completed',
          isFixed: false,
          isInstallment: false,
          kind: 'invoice_payment',
          creditCardId,
          invoiceId,
        });
      },

      editTransaction: (updated, editOption = 'only-this') => {
        let updatedAccounts: Account[] = [];
        let toUpdate: Transaction[] = [];
        
        set((state) => {
          const previous = state.transactions.find(t => t.id === updated.id);
          if (!previous) return {};
          
          toUpdate = [updated];
          
          if (previous.isInstallment && previous.installmentInfo && editOption !== 'only-this') {
            const gId = previous.installmentInfo.groupId;
            const currNum = previous.installmentInfo.current;
            
            const groupTx = state.transactions.filter(t => t.isInstallment && t.installmentInfo?.groupId === gId && t.id !== updated.id);
            
            groupTx.forEach(t => {
              if (editOption === 'all-group' || (editOption === 'this-and-future' && t.installmentInfo!.current > currNum)) {
                // Shift the date's day to match the updated one, but keep the month/year of the installment
                const [targetYear, targetMonth] = t.date.split('-');
                const targetDay = Number(updated.date.split('-')[2]);
                const lastDay = new Date(Number(targetYear), Number(targetMonth), 0).getDate();
                const newDateStr = `${targetYear}-${targetMonth}-${String(Math.min(targetDay, lastDay)).padStart(2, '0')}`;

                toUpdate.push({
                  ...t,
                  description: updated.description,
                  amount: updated.amount,
                  type: updated.type,
                  category: updated.category,
                  accountId: updated.accountId,
                  status: getEffectiveStatus(updated.status !== 'completed' ? updated.status : t.status, newDateStr),
                  date: newDateStr
                });
              }
            });
          }
          
          // Adjust account balances based on difference
          updatedAccounts = state.accounts.map(acc => {
            let balChange = 0;
            
            toUpdate.forEach(upd => {
              const prev = state.transactions.find(t => t.id === upd.id);
              if (!prev) return;
              
              // Revert previous completed transaction
              if (prev.status === 'completed' && affectsCashBalance(prev)) {
                if (String(prev.accountId).trim() === String(acc.id).trim()) {
                  if (prev.type === 'income') balChange -= Number(prev.amount) || 0;
                  else balChange += Number(prev.amount) || 0;
                }
                if ((prev.category.toLowerCase() === 'poupança' || prev.category.toLowerCase() === 'resgate poupança') && acc.name.toLowerCase() === 'poupança' && String(prev.accountId).trim() !== String(acc.id).trim()) {
                  if (prev.type === 'income') balChange += Number(prev.amount) || 0;
                  else balChange -= Number(prev.amount) || 0;
                }
              }
              
              // Apply updated completed transaction
              if (upd.status === 'completed' && affectsCashBalance(upd)) {
                if (String(upd.accountId).trim() === String(acc.id).trim()) {
                  if (upd.type === 'income') balChange += Number(upd.amount) || 0;
                  else balChange -= Number(upd.amount) || 0;
                }
                if ((upd.category.toLowerCase() === 'poupança' || upd.category.toLowerCase() === 'resgate poupança') && acc.name.toLowerCase() === 'poupança' && String(upd.accountId).trim() !== String(acc.id).trim()) {
                  if (upd.type === 'income') balChange -= Number(upd.amount) || 0;
                  else balChange += Number(upd.amount) || 0;
                }
              }
            });
            
            return {
              ...acc,
              balance: Number(acc.balance) + balChange
            };
          });

          return {
            transactions: state.transactions.map(t => {
              const upd = toUpdate.find(u => u.id === t.id);
              return upd ? upd : t;
            }),
            accounts: updatedAccounts
          };
        });

        if (isSupabaseConfigured) {
          toUpdate.forEach(t => supabaseService.saveTransaction(t));
          updatedAccounts.forEach(acc => supabaseService.saveAccount(acc));
        }
      },

      updateAccountBalance: (id, initialBalance) => {
        set((state) => ({
          accounts: state.accounts.map(acc => acc.id === id ? { ...acc, balance: initialBalance } : acc)
        }));

        if (isSupabaseConfigured) {
          const acc = get().accounts.find(a => a.id === id);
          if (acc) {
            supabaseService.saveAccount({ ...acc, balance: initialBalance });
          }
        }
      },

      addAccount: (name, balance, color, type = 'checking', extra = {}) => {
        const newAcc: Account = { 
          id: `acc-${Date.now()}`, 
          name, 
          balance, 
          color,
          type,
          bank: extra.bank,
          creditLimit: extra.creditLimit,
          closingDay: extra.closingDay,
          dueDay: extra.dueDay,
          paymentAccountId: extra.paymentAccountId,
          minimumPaymentRate: extra.minimumPaymentRate,
        };
        set((state) => ({
          accounts: [...state.accounts, newAcc]
        }));

        if (isSupabaseConfigured) {
          supabaseService.saveAccount(newAcc);
        }
      },

      deleteAccount: (id) => {
        set((state) => ({
          accounts: state.accounts.filter(a => a.id !== id)
        }));

        if (isSupabaseConfigured) {
          supabaseService.deleteAccount(id);
        }
      },

      editAccount: (updatedAcc) => {
        set((state) => ({
          accounts: state.accounts.map(a => a.id === updatedAcc.id ? updatedAcc : a)
        }));

        if (isSupabaseConfigured) {
          supabaseService.saveAccount(updatedAcc);
        }
      },

      addCategory: (name, type) => {
        const newCat: Category = {
          id: `cat-${Date.now()}`,
          name,
          type,
          isSystem: false,
          iconName: 'PlusCircle'
        };
        set((state) => ({
          categories: [...state.categories, newCat]
        }));

        if (isSupabaseConfigured) {
          supabaseService.saveCategory(newCat);
        }
      },

      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter(c => c.id !== id || c.isSystem) // Prevent system category deletion
        }));

        if (isSupabaseConfigured) {
          supabaseService.deleteCategory(id);
        }
      },

      addSavingsGoal: (goal) => {
        const newGoal: SavingsGoal = { ...goal, id: `goal-${Date.now()}`, activities: [] };
        set((state) => ({ savingsGoals: [...state.savingsGoals, newGoal] }));
      },

      deleteSavingsGoal: (id) => set((state) => ({ savingsGoals: state.savingsGoals.filter((goal) => goal.id !== id) })),

      addSavingsGoalActivity: (goalId, type, amount, date) => {
        if (!Number.isFinite(amount) || amount <= 0) return;
        let changedAccount: Account | undefined;
        set((state) => {
          const goal = state.savingsGoals.find((item) => item.id === goalId);
          if (!goal) return {};
          if (type === 'withdrawal' && amount > goal.currentAmount) return {};
          const delta = type === 'contribution' ? amount : -amount;
          const accounts = state.accounts.map((account) => {
            if (account.id !== goal.accountId) return account;
            changedAccount = { ...account, balance: Math.round((account.balance + delta + Number.EPSILON) * 100) / 100 };
            return changedAccount;
          });
          return {
            accounts,
            savingsGoals: state.savingsGoals.map((item) => item.id === goalId ? {
              ...item,
              currentAmount: Math.round((item.currentAmount + delta + Number.EPSILON) * 100) / 100,
              activities: [{ id: `goal-activity-${Date.now()}`, type, amount, date }, ...item.activities],
            } : item),
          };
        });
        if (isSupabaseConfigured && changedAccount) supabaseService.saveAccount(changedAccount);
      },

      addMarketItem: (name, estimatedPrice, quantity, details = {}) => {
        const newItem = { id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name, estimatedPrice, quantity, inCart: false, ...details };
        set((state) => ({
          marketItems: [...state.marketItems, newItem]
        }));

        if (isSupabaseConfigured) {
          supabaseService.saveMarketItem(newItem);
        }
      },

      toggleMarketItemInCart: (id) => {
        set((state) => ({
          marketItems: state.marketItems.map(item => item.id === id ? { ...item, inCart: !item.inCart } : item)
        }));

        if (isSupabaseConfigured) {
          const item = get().marketItems.find(item => item.id === id);
          if (item) {
            supabaseService.saveMarketItem({ ...item, inCart: !item.inCart });
          }
        }
      },

      deleteMarketItem: (id) => {
        set((state) => ({
          marketItems: state.marketItems.filter(item => item.id !== id)
        }));

        if (isSupabaseConfigured) {
          supabaseService.deleteMarketItem(id);
        }
      },

      updateMarketItem: (id, quantity, price) => {
        set((state) => ({
          marketItems: state.marketItems.map(item => item.id === id ? { ...item, quantity, estimatedPrice: price } : item)
        }));

        if (isSupabaseConfigured) {
          const item = get().marketItems.find(item => item.id === id);
          if (item) {
            supabaseService.saveMarketItem({ ...item, quantity, estimatedPrice: price });
          }
        }
      },

      clearMarketList: () => {
        const ids = get().marketItems.map(item => item.id);
        set({ marketItems: [] });

        if (isSupabaseConfigured) {
          supabaseService.clearMarketList(ids);
        }
      },

      refreshStatuses: () => {
        set((state) => {
          const today = getLocalIsoDate();
          let changed = false;
          const newTransactions = state.transactions.map(t => {
            if (t.status === 'scheduled' && t.date < today) {
              changed = true;
              return { ...t, status: 'pending' as 'pending' };
            }
            if (t.status === 'pending' && t.date >= today) {
              changed = true;
              return { ...t, status: 'scheduled' as 'scheduled' };
            }
            return t;
          });
          
          if (changed) {
            return { transactions: newTransactions };
          }
          return {};
        });
      },
      convertMarketListToExpense: (accountId, listId) => {
        let fullTrans: Transaction | null = null;
        let updatedAccounts: Account[] = [];
        let activeItems: MarketItem[] = [];

        set((state) => {
          // Checkout is explicit: unchecked items are never charged.
          activeItems = state.marketItems.filter(item => item.inCart && (!listId || (item.listId || 'default') === listId));
          
          if (activeItems.length === 0) return {};
          
          const total = activeItems.reduce((sum, item) => sum + (item.estimatedPrice * item.quantity), 0);
          const itemNames = activeItems.map(item => `${item.name} (x${item.quantity})`).join(', ');
          
          const destination = state.accounts.find((account) => account.id === accountId);
          const isCreditCard = destination?.type === 'credit';
          // Add a single grocery transaction
          const newTrans: Omit<Transaction, 'id'> = {
            description: 'Compras de Supermercado',
            amount: total,
            type: 'expense',
            category: 'Alimentação',
            subCategory: itemNames.substring(0, 100),
            accountId: accountId,
            date: getLocalIsoDate(),
            status: 'completed',
            isFixed: false,
            isInstallment: false,
            kind: isCreditCard ? 'card_purchase' : 'transaction',
            creditCardId: isCreditCard ? accountId : undefined
          };

          // Create transaction and update account balance
          const transId = Math.random().toString(36).substring(2, 11);
          fullTrans = { ...newTrans, id: transId };
          
          updatedAccounts = state.accounts.map(acc => {
            if (acc.id === accountId && !isCreditCard) {
              return { ...acc, balance: acc.balance - total };
            }
            return acc;
          });

          return {
            transactions: [fullTrans, ...state.transactions],
            accounts: updatedAccounts,
            marketItems: state.marketItems.filter(item => !activeItems.includes(item)), // clear converted items
            activeTab: 'inicio' // redirect back to dashboard
          };
        });

        if (isSupabaseConfigured && fullTrans) {
          supabaseService.saveTransaction(fullTrans);
          updatedAccounts.forEach(acc => supabaseService.saveAccount(acc));
          activeItems.forEach(item => supabaseService.deleteMarketItem(item.id));
        }
      }
    }),
    {
      name: 'finance-v3-storage',
      // Since Date objects inside transactions are saved as ISO string representations, it works perfectly.
    }
  )
);
