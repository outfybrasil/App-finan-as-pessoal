import { useState, useEffect, useCallback } from 'react';
import { financeService } from '../services/financeService';
import { Transaction, Budget, Goal, TransactionType, Account } from '../types';

export const useFinance = (userId: string | undefined) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);

    const refreshData = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const [fetchedTransactions, fetchedBudgets, fetchedGoals, fetchedAccounts] = await Promise.all([
                financeService.getTransactions(),
                financeService.getBudgets(),
                financeService.getGoals(),
                financeService.getAccounts()
            ]);
            setTransactions(fetchedTransactions);
            setBudgets(fetchedBudgets);
            setGoals(fetchedGoals);
            setAccounts(fetchedAccounts);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const addTransaction = async (data: any) => {
        const result = await financeService.addTransaction(data);
        if (result) {
            setTransactions(prev => [...result, ...prev]);
            return true;
        }
        return false;
    };

    const updateTransaction = async (id: string, data: any) => {
        const result = await financeService.updateTransaction(id, data);
        if (result) {
            setTransactions(prev => prev.map(t => t.id === id ? result : t));
            return true;
        }
        return false;
    };

    const deleteTransaction = async (id: string) => {
        const success = await financeService.deleteTransaction(id);
        if (success) {
            setTransactions(prev => prev.filter(t => t.id !== id));
        }
        return success;
    };

    const addBudget = async (data: any) => {
        const result = await financeService.addBudget(data);
        if (result) {
            setBudgets(prev => [...prev, result]);
        }
    };

    const updateBudget = async (id: string, data: any) => {
        const result = await financeService.updateBudget(id, data);
        if (result) {
            setBudgets(prev => prev.map(b => b.id === id ? result : b));
        }
    };

    const deleteBudget = async (id: string) => {
        const success = await financeService.deleteBudget(id);
        if (success) {
            setBudgets(prev => prev.filter(b => b.id !== id));
        }
    };

    const addGoal = async (data: any) => {
        const result = await financeService.addGoal(data);
        if (result) {
            setGoals(prev => [...prev, result]);
        }
    };

    const updateGoal = async (id: string, data: any) => {
        const result = await financeService.updateGoal(id, data);
        if (result) {
            setGoals(prev => prev.map(g => g.id === id ? result : g));
        }
    };

    const deleteGoal = async (id: string) => {
        const success = await financeService.deleteGoal(id);
        if (success) {
            setGoals(prev => prev.filter(g => g.id !== id));
        }
    };

    const addAccount = async (data: any) => {
        await financeService.addAccount(data);
        refreshData(); // Simple refresh for now
    };

    const updateAccount = async (id: string, data: any) => {
        await financeService.updateAccount(id, data);
        refreshData();
    };

    const deleteAccount = async (id: string) => {
        await financeService.deleteAccount(id);
        refreshData();
    };

    return {
        transactions,
        setTransactions, // Allow manual updates if needed (e.g. optimistic UI)
        budgets,
        addBudget,
        updateBudget,
        deleteBudget,
        goals,
        loading,
        refreshData,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addGoal,
        updateGoal,
        deleteGoal,
        accounts,
        addAccount,
        updateAccount,
        deleteAccount,
        deleteMultipleTransactions: financeService.deleteMultipleTransactions
    };
};
