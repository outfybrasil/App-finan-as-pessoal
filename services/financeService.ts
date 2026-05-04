import { databases, account, APPWRITE_DATABASE_ID } from '../lib/appwrite';
import { ID, Query } from 'appwrite';
import { Transaction, Budget, Goal, Account } from '../types';

const TRANSACTIONS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_TRANSACTIONS_COLLECTION_ID;
const BUDGETS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_BUDGETS_COLLECTION_ID;
const GOALS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_GOALS_COLLECTION_ID;
const ACCOUNTS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_ACCOUNTS_COLLECTION_ID;

// Helper to map Appwrite document to application object
const mapDocumentToTransaction = (doc: any): Transaction => ({
  id: doc.$id,
  amount: doc.amount,
  category: doc.category,
  account: doc.account,
  date: doc.date,
  description: doc.description,
  type: doc.type,
  groupId: doc.group_id,
  isRecurring: doc.is_recurring,
  isPaid: doc.is_paid,
  isPriority: doc.is_priority,
  paymentMethod: doc.payment_method,
  attachmentId: doc.attachment_id,
  tags: doc.tags,
  splits: doc.splits ? JSON.parse(doc.splits) : undefined,
  destinationAccount: doc.destination_account,
});

const mapDocumentToAccount = (doc: any): Account => ({
  id: doc.$id,
  name: doc.name,
  type: doc.type,
  balance: doc.balance,
  creditLimit: doc.credit_limit,
  closingDay: doc.closing_day,
  dueDay: doc.due_day,
});

export const financeService = {
  async getTransactions(): Promise<Transaction[]> {
    try {
      const { documents } = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        TRANSACTIONS_COLLECTION_ID,
        [
          Query.limit(2500) // Increase limit to prevent missing data
        ]
      );
      return documents.map(mapDocumentToTransaction);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  },

  async addTransaction(transactions: Omit<Transaction, 'id'>[]): Promise<Transaction[] | null> {
    try {
      const user = await account.get();
      if (!user) throw new Error('User not authenticated');

      const promises = transactions.map(t =>
        databases.createDocument(
          APPWRITE_DATABASE_ID,
          TRANSACTIONS_COLLECTION_ID,
          ID.unique(),
          {
            amount: t.amount,
            category: t.category,
            description: t.description,
            date: t.date,
            type: t.type,
            account: t.account,
            user_id: user.$id,
            group_id: t.groupId || null,
            is_recurring: t.isRecurring || false,
            is_paid: t.isPaid ?? true,
            is_priority: t.isPriority || false,
            payment_method: t.paymentMethod || 'money',
            attachment_id: t.attachmentId || null,
            tags: t.tags || [],
            splits: t.splits ? JSON.stringify(t.splits) : null,
            destination_account: t.destinationAccount || null,
          }
        )
      );

      const docs = await Promise.all(promises);
      return docs.map(mapDocumentToTransaction);
    } catch (error) {
      console.error('Error adding transaction:', error);
      return null;
    }
  },

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
    try {
      // Whitelist: montar payload apenas com campos válidos do Appwrite
      const payload: Record<string, any> = {};

      if (updates.amount !== undefined) payload.amount = updates.amount;
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.account !== undefined) payload.account = updates.account;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.date !== undefined) payload.date = updates.date;
      if (updates.type !== undefined) payload.type = updates.type;
      if (updates.isRecurring !== undefined) payload.is_recurring = updates.isRecurring;
      if (updates.isPaid !== undefined) payload.is_paid = updates.isPaid;
      if (updates.isPriority !== undefined) payload.is_priority = updates.isPriority;
      if (updates.paymentMethod !== undefined) payload.payment_method = updates.paymentMethod;
      if (updates.attachmentId !== undefined) payload.attachment_id = updates.attachmentId;
      if (updates.groupId !== undefined) payload.group_id = updates.groupId;
      if (updates.tags !== undefined) payload.tags = updates.tags;
      if (updates.splits !== undefined) payload.splits = updates.splits ? JSON.stringify(updates.splits) : null;
      if (updates.destinationAccount !== undefined) payload.destination_account = updates.destinationAccount;

      if (Object.keys(payload).length === 0) {
        console.warn('updateTransaction: nenhum campo válido para atualizar');
        return null;
      }

      const doc = await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        TRANSACTIONS_COLLECTION_ID,
        id,
        payload
      );
      return mapDocumentToTransaction(doc);
    } catch (error) {
      console.error('Erro ao atualizar transação:', error);
      return null;
    }
  },

  async deleteTransaction(id: string): Promise<boolean> {
    try {
      await databases.deleteDocument(
        APPWRITE_DATABASE_ID,
        TRANSACTIONS_COLLECTION_ID,
        id
      );
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return false;
    }
  },

  async deleteMultipleTransactions(ids: string[]): Promise<boolean> {
    try {
      const promises = ids.map(id =>
        databases.deleteDocument(
          APPWRITE_DATABASE_ID,
          TRANSACTIONS_COLLECTION_ID,
          id
        )
      );
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Error deleting multiple transactions:', error);
      return false;
    }
  },

  async updateMultipleTransactions(ids: string[], updates: Partial<Transaction>): Promise<boolean> {
    try {
      const payload: Record<string, any> = {};
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.type !== undefined) payload.type = updates.type;
      if (updates.isPaid !== undefined) payload.is_paid = updates.isPaid;
      if (updates.account !== undefined) payload.account = updates.account;

      const promises = ids.map(id =>
        databases.updateDocument(
          APPWRITE_DATABASE_ID,
          TRANSACTIONS_COLLECTION_ID,
          id,
          payload
        )
      );
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Error updating multiple transactions:', error);
      return false;
    }
  },

  async getBudgets(): Promise<Budget[]> {
    try {
      const { documents } = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        BUDGETS_COLLECTION_ID,
        [Query.limit(100)]
      );
      return documents.map((doc: any) => ({
        id: doc.$id,
        category: doc.category,
        limit: doc.limit,
        spent: doc.spent,
        cumulative: doc.cumulative
      }));
    } catch (error) {
      console.error('Error fetching budgets:', error);
      return [];
    }
  },

  async addBudget(budget: Omit<Budget, 'id'>): Promise<Budget | null> {
    try {
      const user = await account.get();
      const doc = await databases.createDocument(
        APPWRITE_DATABASE_ID,
        BUDGETS_COLLECTION_ID,
        ID.unique(),
        {
          category: budget.category,
          limit: budget.limit,
          spent: budget.spent,
          cumulative: budget.cumulative || false,
          user_id: user.$id
        }
      );
      return {
        id: doc.$id,
        category: doc.category,
        limit: doc.limit,
        spent: doc.spent,
        cumulative: doc.cumulative
      };
    } catch (error) {
      console.error('Error adding budget:', error);
      return null;
    }
  },

  async updateBudget(id: string, updates: Partial<Budget>): Promise<Budget | null> {
    try {
      const { id: _, ...payload } = updates as any;
      const doc = await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        BUDGETS_COLLECTION_ID,
        id,
        payload
      );
      return {
        id: doc.$id,
        category: doc.category,
        limit: doc.limit,
        spent: doc.spent,
        cumulative: doc.cumulative
      };
    } catch (error) {
      console.error('Error updating budget:', error);
      return null;
    }
  },

  async deleteBudget(id: string): Promise<boolean> {
    try {
      await databases.deleteDocument(
        APPWRITE_DATABASE_ID,
        BUDGETS_COLLECTION_ID,
        id
      );
      return true;
    } catch (error) {
      console.error('Error deleting budget:', error);
      return false;
    }
  },

  async getGoals(): Promise<Goal[]> {
    try {
      const { documents } = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        GOALS_COLLECTION_ID,
        [Query.limit(100)]
      );
      return documents.map((doc: any) => ({
        id: doc.$id,
        name: doc.name,
        targetAmount: doc.targetAmount,
        currentAmount: doc.currentAmount,
        deadline: doc.deadline,
        icon: doc.icon,
        status: doc.status
      }));
    } catch (error) {
      console.error('Error fetching goals:', error);
      return [];
    }
  },

  async addGoal(goal: Omit<Goal, 'id'>): Promise<Goal | null> {
    try {
      const user = await account.get();
      const doc = await databases.createDocument(
        APPWRITE_DATABASE_ID,
        GOALS_COLLECTION_ID,
        ID.unique(),
        {
          ...goal,
          user_id: user.$id
        }
      );
      return {
        id: doc.$id,
        name: doc.name,
        targetAmount: doc.targetAmount,
        currentAmount: doc.currentAmount,
        deadline: doc.deadline,
        icon: doc.icon,
        status: doc.status
      };
    } catch (error) {
      console.error('Error adding goal:', error);
      return null;
    }
  },

  async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal | null> {
    try {
      // Remove id from updates if present
      const { id: _, ...payload } = updates as any;

      const doc = await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        GOALS_COLLECTION_ID,
        id,
        payload
      );
      return {
        id: doc.$id,
        name: doc.name,
        targetAmount: doc.targetAmount,
        currentAmount: doc.currentAmount,
        deadline: doc.deadline,
        icon: doc.icon,
        status: doc.status
      };
    } catch (error) {
      console.error('Error updating goal:', error);
      return null;
    }
  },

  async deleteGoal(id: string): Promise<boolean> {
    try {
      await databases.deleteDocument(
        APPWRITE_DATABASE_ID,
        GOALS_COLLECTION_ID,
        id
      );
      return true;
    } catch (error) {
      console.error('Error deleting goal:', error);
      return false;
    }
  },

  // --- Account Methods ---

  async getAccounts(): Promise<Account[]> {
    try {
      const { documents } = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        ACCOUNTS_COLLECTION_ID,
        [Query.limit(100)]
      );
      return documents.map(mapDocumentToAccount);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      return [];
    }
  },

  async addAccount(newAccount: Omit<Account, 'id'>): Promise<Account | null> {
    try {
      const user = await account.get();
      const doc = await databases.createDocument(
        APPWRITE_DATABASE_ID,
        ACCOUNTS_COLLECTION_ID,
        ID.unique(),
        {
          name: newAccount.name,
          type: newAccount.type,
          balance: newAccount.balance,
          credit_limit: newAccount.creditLimit,
          closing_day: newAccount.closingDay,
          due_day: newAccount.dueDay,
          user_id: user.$id
        }
      );
      return mapDocumentToAccount(doc);
    } catch (error) {
      console.error('Error adding account:', error);
      return null;
    }
  },

  async updateAccount(id: string, updates: Partial<Account>): Promise<Account | null> {
    try {
      const payload: any = { ...updates };
      if (updates.creditLimit !== undefined) payload.credit_limit = updates.creditLimit;
      if (updates.closingDay !== undefined) payload.closing_day = updates.closingDay;
      if (updates.dueDay !== undefined) payload.due_day = updates.dueDay;

      delete payload.id;
      delete payload.creditLimit;
      delete payload.closingDay;
      delete payload.dueDay;

      const doc = await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        ACCOUNTS_COLLECTION_ID,
        id,
        payload
      );
      return mapDocumentToAccount(doc);
    } catch (error) {
      console.error('Error updating account:', error);
      return null;
    }
  },

  async deleteAccount(id: string): Promise<boolean> {
    try {
      await databases.deleteDocument(
        APPWRITE_DATABASE_ID,
        ACCOUNTS_COLLECTION_ID,
        id
      );
      return true;
    } catch (error) {
      console.error('Error deleting account:', error);
      return false;
    }
  }
};