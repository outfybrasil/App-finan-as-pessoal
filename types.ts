export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  groupId?: string; // Identificador para agrupar parcelas/recorrências da mesma série
  amount: number;
  category: string;
  date: string; // ISO string YYYY-MM-DD
  description: string;
  type: TransactionType;
  isRecurring?: boolean; // Para identificar despesas fixas visualmente
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

export enum View {
  DASHBOARD = 'dashboard',
  QUICK_ADD = 'quick_add',
  BUDGETS = 'budgets',
  REPORTS = 'reports',
  INSIGHTS = 'insights'
}