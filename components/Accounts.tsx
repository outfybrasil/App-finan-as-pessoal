import React, { useState } from 'react';
import { Account, AccountType } from '../types';
import { Plus, CreditCard, Wallet, Landmark, TrendingUp, Calendar, Trash2, Edit3, MoreVertical, X, Check, ArrowRight, AlertCircle } from 'lucide-react';

interface AccountsProps {
    accounts: Account[];
    onAddAccount: (account: Omit<Account, 'id'>) => Promise<void>;
    onUpdateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
    onDeleteAccount: (id: string) => Promise<void>;
}

export const Accounts: React.FC<AccountsProps> = ({ accounts, onAddAccount, onUpdateAccount, onDeleteAccount }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Account>>({
        name: '',
        type: 'checking',
        balance: 0,
        creditLimit: 0,
        closingDay: 1,
        dueDay: 10
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        if (editingId) {
            await onUpdateAccount(editingId, formData);
        } else {
            await onAddAccount(formData as Omit<Account, 'id'>);
        }
        resetForm();
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData({
            name: '',
            type: 'checking',
            balance: 0,
            creditLimit: 0,
            closingDay: 1,
            dueDay: 10
        });
    };

    const handleEdit = (account: Account) => {
        setEditingId(account.id);
        setFormData(account);
        setShowForm(true);
    };

    const calculateCardUsage = (account: Account) => {
        if (account.type !== 'credit_card' || !account.creditLimit) return 0;
        return (Math.abs(account.balance) / account.creditLimit) * 100;
    };

    const getTypeIcon = (type: AccountType) => {
        switch (type) {
            case 'credit_card': return <CreditCard size={28} />;
            case 'investment': return <TrendingUp size={28} />;
            case 'cash': return <Wallet size={28} />;
            default: return <Landmark size={28} />;
        }
    };

    const getTypeColor = (type: AccountType) => {
        switch (type) {
            case 'credit_card': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
            case 'investment': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
            case 'cash': return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
            default: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
        }
    };

    return (
        <div className="space-y-10 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
                        <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-white">
                            <Landmark size={32} />
                        </div>
                        Minhas Contas
                    </h1>
                    <p className="text-slate-500 font-bold mt-2 ml-16">Gerencie sua liquidez e cartões de crédito</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-[1.5rem] flex items-center gap-3 transition-all shadow-2xl shadow-emerald-500/20 active:scale-95 font-black text-xs uppercase tracking-widest"
                >
                    <Plus size={22} />
                    Adicionar Carteira
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {accounts.map(account => {
                    const usage = calculateCardUsage(account);
                    return (
                    <div key={account.id} className="glass-card border-white/5 rounded-[2.5rem] p-8 relative group hover:border-white/20 transition-all shadow-xl hover:shadow-[0_0_40px_rgba(0,0,0,0.3)] hover:-translate-y-1">
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-4">
                                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center border shadow-inner ${getTypeColor(account.type)}`}>
                                    {getTypeIcon(account.type)}
                                </div>
                                <div>
                                    <h3 className="font-black text-xl text-white tracking-tight truncate max-w-[150px]">{account.name}</h3>
                                    <span className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-500 leading-none">
                                        {account.type === 'credit_card' ? 'Crédito' :
                                            account.type === 'investment' ? 'Investimento' :
                                                account.type === 'cash' ? 'Dinheiro' : 'Conta Corrente'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEdit(account)}
                                    className="p-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                >
                                    <Edit3 size={18} />
                                </button>
                                <button
                                    onClick={() => onDeleteAccount(account.id)}
                                    className="p-3 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Saldo em Reais</p>
                                <div className="flex items-baseline justify-between">
                                    <p className={`text-3xl font-black tracking-tighter ${account.balance >= 0 ? 'text-white' : 'text-rose-400'}`}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.balance)}
                                    </p>
                                    <ArrowRight size={20} className="text-slate-800" />
                                </div>
                            </div>

                            {account.type === 'credit_card' && account.creditLimit && (
                                <div className="space-y-4">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        <span>Limite Usado</span>
                                        <span className="text-slate-300">{Math.round(usage)}%</span>
                                    </div>
                                    <div className="h-4 w-full bg-black/20 rounded-full border border-white/5 p-1">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 shadow-lg ${usage > 85 ? 'bg-rose-500' :
                                                    usage > 60 ? 'bg-amber-400' : 'bg-emerald-500'
                                                }`}
                                            style={{ width: `${Math.min(usage, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between gap-4 text-[10px] font-black uppercase tracking-widest text-slate-600">
                                        <div className="flex items-center gap-1">
                                            <Calendar size={12} className="text-slate-700" /> Fecha: {account.closingDay}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar size={12} className="text-slate-700" /> Vence: {account.dueDay}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )})}
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in duration-300 overflow-y-auto">
                    <div className="glass-card border-white/10 rounded-[3rem] w-full max-w-lg shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center p-10 border-b border-white/5 bg-white/5">
                            <h3 className="text-3xl font-black text-white tracking-tighter">
                                {editingId ? 'Editar Detalhes' : 'Criar Nova Conta'}
                            </h3>
                            <button onClick={resetForm} className="p-2 text-slate-500 hover:text-white transition-all hover:bg-white/5 rounded-2xl">
                                <X size={32} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 space-y-10">
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Identificação</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-white/[0.03] border-2 border-white/5 rounded-[1.5rem] px-6 py-5 text-white font-bold text-lg focus:border-emerald-500 focus:bg-white/[0.05] outline-none transition-all placeholder:text-slate-800"
                                    placeholder="Ex: Nubank Principal"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Modalidade da Conta</label>
                                <select
                                    value={formData.type || 'checking'}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as AccountType })}
                                    className="w-full bg-white/[0.03] border-2 border-white/5 rounded-[1.5rem] px-6 py-5 text-white font-bold text-lg focus:border-emerald-500 focus:bg-white/[0.05] outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="checking" className="bg-slate-900">🏦 Conta Corrente / Poupança</option>
                                    <option value="credit_card" className="bg-slate-900">💳 Cartão de Crédito</option>
                                    <option value="investment" className="bg-slate-900">📈 Investimento / Broker</option>
                                    <option value="cash" className="bg-slate-900">💵 Dinheiro Vivo</option>
                                </select>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Saldo em Conta</label>
                                <div className="relative group">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 font-black text-xl group-focus-within:text-emerald-500 transition-colors">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.balance || 0}
                                        onChange={e => setFormData({ ...formData, balance: parseFloat(e.target.value) })}
                                        className="w-full bg-white/[0.03] border-2 border-white/5 rounded-[1.5rem] px-6 py-5 pl-16 text-3xl text-white font-black tracking-tighter focus:border-emerald-500 focus:bg-white/[0.05] shadow-inner"
                                    />
                                </div>
                            </div>

                            {formData.type === 'credit_card' && (
                                <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                                    <div className="space-y-4">
                                        <label className="block text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] ml-2">Limite Total do Cartão</label>
                                        <div className="relative group">
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 font-black text-xl group-focus-within:text-amber-400 transition-colors">R$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.creditLimit || 0}
                                                onChange={e => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) })}
                                                className="w-full bg-white/[0.03] border-2 border-white/5 rounded-[1.5rem] px-6 py-5 pl-16 text-3xl text-white font-black tracking-tighter focus:border-amber-400 focus:bg-white/[0.05]"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest ml-2">Dia Fechamento</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="31"
                                                value={formData.closingDay || 1}
                                                onChange={e => setFormData({ ...formData, closingDay: parseInt(e.target.value) })}
                                                className="w-full bg-white/5 border-2 border-white/5 rounded-2xl px-6 py-4 text-white font-black focus:border-white/20 outline-none text-center"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest ml-2">Dia Vencimento</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="31"
                                                value={formData.dueDay || 10}
                                                onChange={e => setFormData({ ...formData, dueDay: parseInt(e.target.value) })}
                                                className="w-full bg-white/5 border-2 border-white/5 rounded-2xl px-6 py-4 text-white font-black focus:border-white/20 outline-none text-center"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs uppercase tracking-[0.2em] py-6 rounded-[1.5rem] transition-all shadow-2xl shadow-emerald-500/30 active:scale-[0.98] mt-6"
                            >
                                {editingId ? 'Salvar Alterações' : 'Finalizar Lançamento'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
