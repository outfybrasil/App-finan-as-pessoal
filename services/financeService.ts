import { supabase } from '../lib/supabaseClient';
import { Transaction, Budget, Goal, TransactionType } from '../types';

export const financeService = {
  async getTransactions(): Promise<Transaction[]> {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Erro ao buscar transações:', error.message || error);
      return [];
    }
    
    return (data || []).map((t: any) => ({
      id: String(t.id), // Force string ID
      groupId: t.group_id, // Mapeia snake_case do banco (se existir)
      amount: Number(t.amount),
      category: t.category,
      date: t.date,
      description: t.description,
      type: t.type,
      isPaid: t.is_paid // Mapeia status de pagamento
    }));
  },

  async addTransaction(transaction: Omit<Transaction, 'id'> | Omit<Transaction, 'id'>[]): Promise<Transaction[] | null> {
    if (!supabase) return null;

    const rawPayload = Array.isArray(transaction) ? transaction : [transaction];
    
    // Sanitização e mapeamento para snake_case
    const payload = rawPayload.map(t => ({
        amount: t.amount,
        category: t.category,
        date: t.date,
        description: t.description,
        type: t.type,
        is_paid: t.isPaid
        // group_id: t.groupId 
    }));

    // Tenta inserir
    let result = await supabase
      .from('transactions')
      .insert(payload)
      .select();

    // Fallback: Se der erro de coluna inexistente, tenta inserir sem o campo is_paid
    if (result.error && (result.error.message.includes('is_paid') || result.error.message.includes('column "is_paid" of relation "transactions" does not exist'))) {
      console.warn('Coluna is_paid não detectada no Supabase. Salvando sem este campo. Execute "alter table transactions add column is_paid boolean default true;" no banco.');
      const fallbackPayload = payload.map(({ is_paid, ...rest }) => rest);
      result = await supabase
        .from('transactions')
        .insert(fallbackPayload)
        .select();
    }

    if (result.error) {
      console.error('Erro ao adicionar transação:', result.error.message || result.error);
      return null;
    }
    
    return (result.data || []).map((d: any) => ({
      id: String(d.id),
      groupId: d.group_id,
      amount: Number(d.amount),
      category: d.category,
      date: d.date,
      description: d.description,
      type: d.type,
      isPaid: d.is_paid
    }));
  },

  async updateTransaction(id: string, updates: Partial<Omit<Transaction, 'id'>>): Promise<Transaction | null> {
    if (!supabase) return null;

    // Sanitização e mapeamento
    const sanitizedUpdates: any = {};
    if (updates.amount !== undefined) sanitizedUpdates.amount = updates.amount;
    if (updates.category !== undefined) sanitizedUpdates.category = updates.category;
    if (updates.description !== undefined) sanitizedUpdates.description = updates.description;
    if (updates.date !== undefined) sanitizedUpdates.date = updates.date;
    if (updates.type !== undefined) sanitizedUpdates.type = updates.type;
    if (updates.isPaid !== undefined) sanitizedUpdates.is_paid = updates.isPaid;
    
    // REMOVIDO group_id update
    // if (updates.groupId !== undefined) sanitizedUpdates.group_id = updates.groupId;

    let result = await supabase
        .from('transactions')
        .update(sanitizedUpdates)
        .eq('id', id)
        .select()
        .single();

    // Fallback: Se der erro de coluna inexistente, tenta atualizar sem is_paid
    if (result.error && (result.error.message.includes('is_paid') || result.error.message.includes('column "is_paid" of relation "transactions" does not exist'))) {
         console.warn('Coluna is_paid não detectada no Supabase. Atualizando sem este campo.');
         delete sanitizedUpdates.is_paid;
         result = await supabase
            .from('transactions')
            .update(sanitizedUpdates)
            .eq('id', id)
            .select()
            .single();
    }

    if (result.error) {
        console.error('Erro ao atualizar transação:', result.error.message || result.error);
        return null;
    }

    const data = result.data;

    return {
        id: String(data.id),
        groupId: data.group_id,
        amount: Number(data.amount),
        category: data.category,
        date: data.date,
        description: data.description,
        type: data.type,
        isPaid: data.is_paid
    };
  },

  async deleteTransaction(id: string): Promise<boolean> {
      if (!supabase) return false;

      const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id);

      if (error) {
          console.error('Erro ao deletar:', error.message || error);
          return false;
      }
      return true;
  },

  async getBudgets(): Promise<Budget[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('budgets')
      .select('*');

    if (error) {
      console.error('Erro ao buscar orçamentos:', error.message || error);
      return [];
    }
    
    return (data || []).map((b: any) => ({
        id: String(b.id),
        category: b.category,
        limit: Number(b.limit),
        spent: Number(b.spent),
        cumulative: b.cumulative
    }));
  },

  async getGoals(): Promise<Goal[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('goals')
      .select('*');

    if (error) {
      console.error('Erro ao buscar metas:', error.message || error);
      return [];
    }
    
    return (data || []).map((g: any) => ({
        id: String(g.id),
        name: g.name,
        targetAmount: Number(g.target_amount),
        currentAmount: Number(g.current_amount),
        deadline: g.deadline
    }));
  },

  async addGoal(goal: Omit<Goal, 'id'>): Promise<Goal | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('goals')
      .insert([{
        name: goal.name,
        target_amount: goal.targetAmount,
        current_amount: goal.currentAmount,
        deadline: goal.deadline
      }])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar meta:', error.message || error);
      return null;
    }

    return {
        id: String(data.id),
        name: data.name,
        targetAmount: Number(data.target_amount),
        currentAmount: Number(data.current_amount),
        deadline: data.deadline
    };
  },

  async updateGoal(id: string, updates: Partial<Omit<Goal, 'id'>>): Promise<Goal | null> {
    if (!supabase) return null;

    // Mapeamento reverso para snake_case
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.deadline) dbUpdates.deadline = updates.deadline;
    if (updates.targetAmount !== undefined) dbUpdates.target_amount = updates.targetAmount;
    if (updates.currentAmount !== undefined) dbUpdates.current_amount = updates.currentAmount;

    const { data, error } = await supabase
      .from('goals')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar meta:', error.message || error);
      return null;
    }

    return {
        id: String(data.id),
        name: data.name,
        targetAmount: Number(data.target_amount),
        currentAmount: Number(data.current_amount),
        deadline: data.deadline
    };
  },

  async deleteGoal(id: string): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar meta:', error.message || error);
      return false;
    }
    return true;
  }
};