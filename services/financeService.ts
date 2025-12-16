import { supabase } from '../lib/supabaseClient';
import { Transaction, Budget, Goal } from '../types';

// Helper to map DB snake_case columns to application camelCase properties
const mapTransactionFromDb = (item: any): Transaction => ({
  ...item,
  amount: Number(item.amount), // Garante que é número para evitar erros de cálculo
  groupId: item.group_id ?? item.groupId, // Tenta snake_case primeiro, fallback para camelCase
  isRecurring: item.is_recurring ?? item.isRecurring,
  isPaid: item.is_paid ?? item.isPaid ?? true, 
  account: item.account ?? 'Carteira', // Default para Carteira se null
});

// Helper to map application properties to DB snake_case columns
const mapTransactionToDb = (item: any) => {
  const { groupId, isRecurring, isPaid, account, id, ...rest } = item;
  
  // Cria objeto com chaves em snake_case para o banco
  const payload: any = { ...rest };
  
  // Apenas adiciona ao payload se não for undefined
  if (groupId !== undefined) payload.group_id = groupId;
  if (isRecurring !== undefined) payload.is_recurring = isRecurring;
  if (isPaid !== undefined) payload.is_paid = isPaid;
  if (account !== undefined) payload.account = account;

  return payload;
};

export const financeService = {
  async getTransactions(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
      
    if (error) {
        console.error('Error fetching transactions:', JSON.stringify(error, null, 2));
        return [];
    }
    return (data || []).map(mapTransactionFromDb);
  },

  async addTransaction(transactions: Omit<Transaction, 'id'>[]): Promise<Transaction[] | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        console.error("User not authenticated");
        return null;
    }

    const payload = transactions.map(t => ({
        ...mapTransactionToDb(t),
        user_id: user.id
    }));

    const { data, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select();
      
    if (error) {
        console.error('Error adding transaction:', JSON.stringify(error, null, 2));
        return null;
    }
    return (data || []).map(mapTransactionFromDb);
  },

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
    const { error: errAuth } = await supabase.auth.getUser();
    if (errAuth) return null;

    const dbUpdates = mapTransactionToDb(updates);

    const { data, error } = await supabase
      .from('transactions')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
         console.error('Error updating transaction:', JSON.stringify(error, null, 2));
         return null;
    }
    return mapTransactionFromDb(data);
  },

  async deleteTransaction(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
    
    if (error) {
        console.error('Error deleting transaction:', JSON.stringify(error, null, 2));
        return false;
    }
    return true;
  },

  async getBudgets(): Promise<Budget[]> {
     const { data, error } = await supabase.from('budgets').select('*');
     if (error) {
         console.error('Error fetching budgets:', JSON.stringify(error, null, 2));
         return [];
     }
     return data || [];
  },

  async getGoals(): Promise<Goal[]> {
      const { data, error } = await supabase.from('goals').select('*');
      if (error) {
          console.error('Error fetching goals:', JSON.stringify(error, null, 2));
          return [];
      }
      return data || [];
  },

  async addGoal(goal: Omit<Goal, 'id'>): Promise<Goal | null> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const payload = { ...goal, user_id: user.id };

      const { data, error } = await supabase.from('goals').insert(payload).select().single();
      if (error) {
          console.error('Error adding goal:', JSON.stringify(error, null, 2));
          return null;
      }
      return data;
  },

  async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal | null> {
      const { data, error } = await supabase.from('goals').update(updates).eq('id', id).select().single();
      if (error) {
          console.error('Error updating goal:', JSON.stringify(error, null, 2));
          return null;
      }
      return data;
  },

  async deleteGoal(id: string): Promise<boolean> {
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) {
          console.error('Error deleting goal:', JSON.stringify(error, null, 2));
          return false;
      }
      return !error;
  }
};