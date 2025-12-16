export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  groupId?: string; // Identificador para agrupar parcelas/recorrências da mesma série
  amount: number;
  category: string;
  account: string; // Nova propriedade para conta/banco
  date: string; // ISO string YYYY-MM-DD
  description: string;
  type: TransactionType;
  isRecurring?: boolean; // Para identificar despesas fixas visualmente
  isPaid?: boolean; // Status de pagamento (Pago/Recebido ou Pendente)
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  spent: number;
  cumulative: boolean; // Carry over support
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  type: 'opportunity' | 'warning' | 'debt' | 'info';
  actionPlan?: string[]; // Lista de passos práticos sugeridos pela IA
}

export interface ShoppingItem {
  id: string;
  name: string;
  estimatedPrice: number;
  quantity: number;
  checked: boolean;
}

export enum View {
  DASHBOARD = 'dashboard',
  QUICK_ADD = 'quick_add',
  BUDGETS = 'budgets',
  REPORTS = 'reports',
  INSIGHTS = 'insights',
  SHOPPING_LIST = 'shopping_list',
  CALENDAR = 'calendar'
}