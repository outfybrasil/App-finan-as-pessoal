export type TransactionType = 'income' | 'expense';

export interface InstallmentInfo {
  current: number;
  total: number;
  groupId: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  subCategory?: string;
  accountId: string;
  date: string; // ISO date string (YYYY-MM-DD or full ISO)
  status: 'pending' | 'completed' | 'scheduled';
  paymentDate?: string;
  isFixed: boolean;
  isInstallment: boolean;
  installmentInfo?: InstallmentInfo;
  originalAmount?: number;
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  color: string;
  type?: string;
  bank?: string; // e.g. 'Nubank', 'Itaú', 'Bradesco', 'Santander', 'Caixa', 'Banco do Brasil', 'Inter', 'C6 Bank', 'BTG Pactual', 'XP', 'Outro'
  creditLimit?: number;
  closingDay?: number;
  dueDay?: number;
  userId?: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  isSystem: boolean;
  iconName: string; // lucide icon name reference
}

export interface MarketItem {
  id: string;
  name: string;
  estimatedPrice: number;
  quantity: number;
  inCart: boolean;
}
