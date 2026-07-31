import { PushNotificationSettings } from "./PushNotificationSettings";
import { useState, FormEvent, ChangeEvent } from 'react';
import { useFinanceStore } from '../store';
import { Plus, Trash2, ShieldCheck, Tag, Info, Layers, Cloud, CloudOff, Database, RefreshCw, AlertCircle, CreditCard, ChevronDown, ChevronUp, Settings, LogOut, Edit3, Save, X } from 'lucide-react';
import { Account, TransactionType } from '../types';
import { saveSupabaseConfig as updateSupabaseConfig, getSupabaseConfig, isSupabaseConfigured, initSupabase } from '../lib/supabase';

const BANK_OPTIONS = [
  { name: 'Nubank', color: '#820ad1' },
  { name: 'Itaú', color: '#EC7000' },
  { name: 'Bradesco', color: '#CC092F' },
  { name: 'Santander', color: '#EC0000' },
  { name: 'Caixa', color: '#005CA9' },
  { name: 'Banco do Brasil', color: '#0038A8' },
  { name: 'Inter', color: '#FF7A00' },
  { name: 'C6 Bank', color: '#242424' },
  { name: 'BTG Pactual', color: '#001E62' },
  { name: 'XP', color: '#000000' },
  { name: 'Outro', color: '#6B7280' },
];

export default function SettingsView() {
  const { categories, transactions, accounts, addCategory, deleteCategory, addAccount, deleteAccount, editAccount, supabaseStatus, isSyncing, syncWithSupabase, user, logoutUser } = useFinanceStore();
  const [activeType, setActiveType] = useState<TransactionType>('expense');
  const [newCatName, setNewCatName] = useState('');

  // Account form states
  const [newAccName, setNewAccName] = useState('');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccColor, setNewAccColor] = useState('#820ad1');
  const [newAccType, setNewAccType] = useState('checking');
  const [newAccBank, setNewAccBank] = useState('Nubank');
  const [newAccCreditLimit, setNewAccCreditLimit] = useState('');
  const [newAccClosingDay, setNewAccClosingDay] = useState('');
  const [newAccDueDay, setNewAccDueDay] = useState('');
  const [newAccPaymentAccountId, setNewAccPaymentAccountId] = useState('');
  const [newAccMinimumRate, setNewAccMinimumRate] = useState('15');
  const [editingCard, setEditingCard] = useState<Account | null>(null);

  // Supabase configuration states
  const currentSupabaseConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentSupabaseConfig.url || '');
  const [anonKey, setAnonKey] = useState(currentSupabaseConfig.anonKey || '');
  
  
  
  
  

  const [showConfigForm, setShowConfigForm] = useState(!isSupabaseConfigured);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const [connectionSuccessMessage, setConnectionSuccessMessage] = useState('');

  const handleCreateCategory = (e: FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    // Check if category already exists
    const exists = categories.some(
      c => c.name.toLowerCase() === newCatName.trim().toLowerCase() && c.type === activeType
    );

    if (exists) {
      alert("Uma categoria com este nome já existe para esta modalidade.");
      return;
    }

    addCategory(newCatName.trim(), activeType);
    setNewCatName('');
  };

  const getTransactionCount = (catName: string, type: TransactionType) => {
    return transactions.filter(t => t.category === catName && t.type === type).length;
  };

  const handleDelete = (id: string, name: string) => {
    const count = getTransactionCount(name, activeType);
    if (count > 0) {
      alert(`A categoria "${name}" não pode ser excluída: existem ${count} lançamentos vinculados. Reatribua-os primeiro.`);
      return;
    } else {
      if (!confirm(`Deseja realmente deletar a categoria "${name}"?`)) {
        return;
      }
    }
    deleteCategory(id);
  };

  const handleDeleteAccount = (id: string, name: string) => {
    const accountTrans = transactions.filter(t => t.accountId === id);
    if (accountTrans.length > 0) {
      alert(`A conta "${name}" não pode ser excluída: existem ${accountTrans.length} lançamentos vinculados. Reatribua-os primeiro.`);
      return;
    } else {
      if (!confirm(`Deseja realmente excluir a conta "${name}"?`)) {
        return;
      }
    }
    deleteAccount(id);
  };

  const handleCreateAccount = (e: FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim() || !newAccBalance) return;

    const parsedBalance = parseFloat(newAccBalance.replace(/\./g, '').replace(',', '.'));
    if (isNaN(parsedBalance)) {
      alert("Por favor, insira um saldo inicial válido.");
      return;
    }

    const exists = accounts.some(a => a.name.toLowerCase() === newAccName.trim().toLowerCase());
    if (exists) {
      alert("Uma conta com este nome já existe.");
      return;
    }

    const extra: any = {};
    if (newAccType === 'credit') {
      if (!newAccClosingDay || !newAccDueDay) {
        alert('Informe fechamento e vencimento do cartão.');
        return;
      }
      extra.bank = newAccBank;
      if (newAccCreditLimit) extra.creditLimit = parseFloat(newAccCreditLimit.replace(/\./g, '').replace(',', '.'));
      if (newAccClosingDay) extra.closingDay = parseInt(newAccClosingDay);
      if (newAccDueDay) extra.dueDay = parseInt(newAccDueDay);
      if (newAccPaymentAccountId) extra.paymentAccountId = newAccPaymentAccountId;
      extra.minimumPaymentRate = Math.min(100, Math.max(0, Number(newAccMinimumRate) || 15)) / 100;
    } else {
      extra.bank = newAccBank;
    }

    addAccount(newAccName.trim(), parsedBalance, newAccColor, newAccType, extra);
    setNewAccName('');
    setNewAccBalance('');
    setNewAccColor('#820ad1');
    setNewAccType('checking');
    setNewAccBank('Nubank');
    setNewAccCreditLimit('');
    setNewAccClosingDay('');
    setNewAccDueDay('');
    setNewAccPaymentAccountId('');
    setNewAccMinimumRate('15');
  };

  const saveCardSettings = () => {
    if (!editingCard) return;
    if (!editingCard.closingDay || !editingCard.dueDay || editingCard.closingDay < 1 || editingCard.closingDay > 31 || editingCard.dueDay < 1 || editingCard.dueDay > 31) {
      alert('Fechamento e vencimento devem estar entre 1 e 31.');
      return;
    }
    editAccount(editingCard);
    setEditingCard(null);
  };

  const handleSaveSupabaseConfig = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      alert('Por favor, preencha os campos obrigatórios (URL e Anon Key)');
      return;
    }
    
    setConnectionSuccessMessage('');

    const newConfig = { url: url.trim(), anonKey: anonKey.trim() };
    updateSupabaseConfig(newConfig);
    initSupabase(newConfig);
    
    useFinanceStore.setState({ supabaseStatus: 'connected' });
    try {
      await syncWithSupabase();
      setConnectionSuccessMessage('Conectado e sincronizado com sucesso!');
      setShowConfigForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDisconnectSupabase = () => {
    if (confirm('Deseja realmente desconectar do Supabase? Seus dados voltarão a ser salvos apenas localmente.')) {
      const emptyConfig = { url: '', anonKey: '' };
      updateSupabaseConfig(emptyConfig);
      initSupabase(emptyConfig);
      useFinanceStore.setState({ supabaseStatus: 'disconnected' });
      setUrl('');
      setAnonKey('');
      setShowConfigForm(true);
      setConnectionSuccessMessage('');
    }
  };

  // Filtered categories to render
  const filteredCategories = categories.filter(c => c.type === activeType);

  const exportBackup = () => {
    const state = useFinanceStore.getState();
    const payload = { version: 1, exportedAt: new Date().toISOString(), transactions: state.transactions, accounts: state.accounts, categories: state.categories, marketItems: state.marketItems, savingsGoals: state.savingsGoals, categoryBudgets: state.categoryBudgets };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = `minhas-financas-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href);
  };

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.version !== 1 || !Array.isArray(data.transactions) || !Array.isArray(data.accounts) || !Array.isArray(data.categories)) throw new Error('Formato inválido');
      if (!confirm('Substituir os dados locais pelos dados deste backup?')) return;
      useFinanceStore.setState({ transactions: data.transactions, accounts: data.accounts, categories: data.categories, marketItems: data.marketItems || [], savingsGoals: data.savingsGoals || [], categoryBudgets: data.categoryBudgets || {} });
      alert('Backup importado com sucesso.');
    } catch { alert('Não foi possível importar: o arquivo não é um backup válido.'); }
    finally { event.target.value = ''; }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      
      {/* Active Session Card */}
      {user && (
        <div className="glass-card rounded-[24px] p-5 flex items-center justify-between border border-white/5">
          <div className="flex items-center gap-3.5">
            {user.picture ? (
              <img 
                src={user.picture} 
                alt={user.name} 
                className="w-12 h-12 rounded-full border border-white/10"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 bg-emerald-accent/10 border border-emerald-accent/20 rounded-full flex items-center justify-center text-emerald-accent text-lg font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-accent font-bold">Usuário Conectado</span>
              </div>
              <h4 className="text-sm font-bold text-white tracking-tight">{user.name}</h4>
              <p className="text-[10px] text-gray-400 font-mono leading-none mt-0.5">{user.email}</p>
            </div>
          </div>
          
          {showLogoutConfirm ? (
            <div className="flex items-center gap-1.5 animate-fade-in">
              <button
                onClick={() => {
                  logoutUser();
                  setShowLogoutConfirm(false);
                }}
                className="px-3.5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold tracking-wide transition flex items-center gap-1 cursor-pointer shadow-md"
              >
                <span>Confirmar Saída</span>
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-medium tracking-wide transition cursor-pointer border border-white/5"
              >
                <span>Cancelar</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold tracking-wide transition flex items-center gap-1.5 cursor-pointer border border-red-500/15"
            >
              <LogOut size={14} />
              <span>Sair</span>
            </button>
          )}
        </div>
      )}

      <section className="glass-card rounded-[24px] p-5" aria-labelledby="data-sync-title">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="data-sync-title" className="text-sm font-bold text-white">Dados e sincronização</h2><p className="mt-1 text-xs text-zinc-400">Estado: {supabaseStatus === 'connected' ? 'conectado' : supabaseStatus === 'error' ? 'erro de sincronização' : 'somente neste dispositivo'}{isSyncing ? ' · sincronizando…' : ''}</p></div><div className="flex gap-2"><button type="button" onClick={exportBackup} className="min-h-11 rounded-xl border border-white/[0.1] px-4 text-xs font-semibold text-white">Exportar backup</button><label className="flex min-h-11 cursor-pointer items-center rounded-xl border border-white/[0.1] px-4 text-xs font-semibold text-white">Importar backup<input type="file" accept="application/json" onChange={importBackup} className="sr-only" /></label></div></div>
      </section>
      
      {/* Category Type Toggles (DESPESAS / RECEITAS) */}
      <div className="grid grid-cols-2 gap-2.5 p-1 glass-card rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveType('expense')}
          className={`py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5 transition font-display ${
            activeType === 'expense'
              ? 'bg-pink-accent text-white shadow-lg shadow-pink-accent/15'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <span>DESPESAS</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveType('income')}
          className={`py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5 transition font-display ${
            activeType === 'income'
              ? 'bg-emerald-accent text-black shadow-lg shadow-emerald-accent/15'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <span>RECEITAS</span>
        </button>
      </div>

      {/* Form: Add Category */}
      <form onSubmit={handleCreateCategory} className="flex gap-2">
        <input
          type="text"
          placeholder="Criar nova categoria..."
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          className="flex-1 glass-input rounded-2xl px-4.5 py-3.5 text-sm text-white placeholder-gray-600 outline-none focus:border-gray-800 transition"
          required
        />
        <button
          type="submit"
          className="p-3.5 glass-card-interactive rounded-2xl text-gray-400 hover:text-white transition"
        >
          <Plus size={20} />
        </button>
      </form>

      {/* List Header */}
      <div className="flex justify-between items-center px-1">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">Suas Categorias Ativas</h3>
        <span className="text-[10px] font-mono text-gray-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full uppercase">
          {filteredCategories.length} Total
        </span>
      </div>

      {/* Categories Listing */}
      <div className="space-y-2.5">
        {filteredCategories.map(cat => {
          const transCount = getTransactionCount(cat.name, activeType);

          return (
            <div 
              key={cat.id}
              className="glass-card-interactive rounded-2xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5">
                {/* Category Circle Emblem */}
                <div className="w-10 h-10 bg-dark-bg border border-dark-border/60 rounded-xl flex items-center justify-center text-gray-500">
                  <Tag size={16} />
                </div>
                
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white tracking-tight">{cat.name}</h4>
                    {cat.isSystem && (
                      <span className="text-[8px] font-bold font-mono bg-[#1c1c1c] text-gray-500 border border-gray-800 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Sistema
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase tracking-wide">
                    {transCount} {transCount === 1 ? 'Lançamento' : 'Lançamentos'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              {!cat.isSystem && (
                <button
                  onClick={() => handleDelete(cat.id, cat.name)}
                  className="p-2 hover:bg-dark-bg text-gray-500 hover:text-pink-accent rounded-xl transition"
                  title="Excluir categoria"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Gestão de Contas */}
      <div className="glass-card rounded-[24px] p-5.5 space-y-4">
        <div className="flex items-center justify-between">
      <PushNotificationSettings />
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 flex items-center justify-center">
              <CreditCard size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Suas Contas Bancárias</h3>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase tracking-wide">
                {accounts.length} {accounts.length === 1 ? 'CONTA ATIVA' : 'CONTAS ATIVAS'}
              </p>
            </div>
          </div>
        </div>

        {/* List of current accounts */}
        {accounts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {accounts.map(acc => (
              <div key={acc.id} className="bg-white/5 border border-white/5 rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: acc.color }}>
                    {acc.type === 'credit' ? <CreditCard size={14} /> : (acc.bank ? acc.bank.substring(0, 2).toUpperCase() : acc.name.substring(0, 2).toUpperCase())}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white">{acc.name}</span>
                      {acc.bank && (
                        <span className="text-[8px] font-bold font-mono px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
                          {acc.bank}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-gray-400 font-medium">
                      {acc.type === 'credit' ? (
                        <>
                          Cartão de Crédito
                          {acc.dueDay ? ` • Venc. dia ${acc.dueDay}` : ''}
                          {acc.creditLimit ? ` • Limite: R$ ${acc.creditLimit.toLocaleString('pt-BR')}` : ''}
                        </>
                      ) : acc.type === 'savings' ? 'Poupança' : acc.type === 'wallet' ? 'Carteira' : 'Conta Corrente'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-gray-300">
                    {acc.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteAccount(acc.id, acc.name)}
                    className="p-1.5 text-gray-500 hover:text-pink-accent hover:bg-white/5 rounded-lg transition"
                    title="Excluir Conta"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-gray-500 border border-dashed border-white/10 rounded-2xl">
            Nenhuma conta cadastrada. Crie uma abaixo para iniciar!
          </div>
        )}

        {accounts.some((account) => account.type === 'credit') && (
          <div className="space-y-2 border-t border-white/[0.06] pt-4">
            <h4 className="text-xs font-semibold text-zinc-300">Configuração dos cartões</h4>
            {accounts.filter((account) => account.type === 'credit').map((card) => (
              <div key={card.id} className="rounded-xl border border-white/[0.08] bg-[#121217] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-xs font-semibold text-white">{card.name}</p><p className="mt-0.5 text-[11px] text-zinc-400">Fecha dia {card.closingDay || '—'} · vence dia {card.dueDay || '—'} · pagamento em {accounts.find((account) => account.id === card.paymentAccountId)?.name || 'não definida'}</p></div>
                  <button type="button" onClick={() => setEditingCard({ ...card, minimumPaymentRate: card.minimumPaymentRate ?? 0.15 })} className="min-h-11 min-w-11 rounded-xl text-zinc-400 transition hover:bg-white/[0.05] hover:text-white" aria-label={`Editar configurações de ${card.name}`}><Edit3 size={15} className="mx-auto" /></button>
                </div>
                {editingCard?.id === card.id && (
                  <div className="mt-3 grid gap-3 border-t border-white/[0.06] pt-3 sm:grid-cols-2 lg:grid-cols-5">
                    <label className="text-[11px] text-zinc-400">Limite<input type="number" min="0" step="0.01" value={editingCard.creditLimit || ''} onChange={(event) => setEditingCard({ ...editingCard, creditLimit: Number(event.target.value) })} className="mt-1 min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#16161d] px-3 font-mono text-white" /></label>
                    <label className="text-[11px] text-zinc-400">Fechamento<input type="number" min="1" max="31" value={editingCard.closingDay || ''} onChange={(event) => setEditingCard({ ...editingCard, closingDay: Number(event.target.value) })} className="mt-1 min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#16161d] px-3 font-mono text-white" /></label>
                    <label className="text-[11px] text-zinc-400">Vencimento<input type="number" min="1" max="31" value={editingCard.dueDay || ''} onChange={(event) => setEditingCard({ ...editingCard, dueDay: Number(event.target.value) })} className="mt-1 min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#16161d] px-3 font-mono text-white" /></label>
                    <label className="text-[11px] text-zinc-400">Conta de pagamento<select value={editingCard.paymentAccountId || ''} onChange={(event) => setEditingCard({ ...editingCard, paymentAccountId: event.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#16161d] px-3 text-white"><option value="">Não definida</option>{accounts.filter((account) => account.type !== 'credit').map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
                    <label className="text-[11px] text-zinc-400">Pagamento mínimo (%)<input type="number" min="0" max="100" value={Math.round((editingCard.minimumPaymentRate || 0) * 100)} onChange={(event) => setEditingCard({ ...editingCard, minimumPaymentRate: Number(event.target.value) / 100 })} className="mt-1 min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#16161d] px-3 font-mono text-white" /></label>
                    <div className="flex gap-2 sm:col-span-2 lg:col-span-5 lg:justify-end"><button type="button" onClick={() => setEditingCard(null)} className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-zinc-300 hover:bg-white/[0.05]"><X size={14} />Cancelar</button><button type="button" onClick={saveCardSettings} className="flex min-h-11 items-center gap-2 rounded-xl bg-[#10b981] px-4 text-xs font-bold text-[#07110e] hover:bg-[#34d399]"><Save size={14} />Salvar cartão</button></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Form: Add Account */}
        <form onSubmit={handleCreateAccount} className="space-y-3 pt-2 border-t border-white/5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">Nova Conta / Cartão</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select
              value={newAccType}
              onChange={(e) => {
                const val = e.target.value;
                setNewAccType(val);
                if (val === 'credit' && !newAccName) {
                  setNewAccName(`Cartão ${newAccBank}`);
                }
              }}
              className="glass-input rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-indigo-500 transition bg-dark-bg cursor-pointer"
            >
              <option value="checking" className="bg-dark-bg text-white">Conta Corrente</option>
              <option value="credit" className="bg-dark-bg text-white">Cartão de Crédito</option>
              <option value="wallet" className="bg-dark-bg text-white">Carteira / Dinheiro</option>
              <option value="savings" className="bg-dark-bg text-white">Poupança</option>
              <option value="reserve" className="bg-dark-bg text-white">Reserva</option>
              <option value="investment" className="bg-dark-bg text-white">Investimento</option>
            </select>

            <select
              value={newAccBank}
              onChange={(e) => {
                const bName = e.target.value;
                setNewAccBank(bName);
                const match = BANK_OPTIONS.find(b => b.name === bName);
                if (match) setNewAccColor(match.color);
                if (newAccType === 'credit' || !newAccName || newAccName.startsWith('Cartão ')) {
                  setNewAccName(newAccType === 'credit' ? `Cartão ${bName}` : bName);
                }
              }}
              className="glass-input rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-indigo-500 transition bg-dark-bg cursor-pointer"
            >
              {BANK_OPTIONS.map(b => (
                <option key={b.name} value={b.name} className="bg-dark-bg text-white">
                  {b.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Nome da Conta / Cartão"
              value={newAccName}
              onChange={(e) => setNewAccName(e.target.value)}
              className="glass-input rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 outline-none focus:border-indigo-500 transition"
              required
            />

            <input
              type="text"
              inputMode="numeric"
              placeholder="Saldo Inicial / Fatura (R$)"
              value={newAccBalance}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                if (!digits) {
                  setNewAccBalance('');
                } else {
                  const num = parseInt(digits, 10) / 100;
                  setNewAccBalance(num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                }
              }}
              className="glass-input rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 outline-none focus:border-indigo-500 transition"
              required
            />
          </div>

          {newAccType === 'credit' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
              <div>
                <label htmlFor="account-credit-limit" className="block text-[9px] font-bold text-gray-500 font-mono uppercase tracking-wider mb-1">Limite de Crédito Total (R$)</label>
                <input
                  id="account-credit-limit"
                  type="text"
                  inputMode="numeric"
                  placeholder="Limite do Cartão"
                  value={newAccCreditLimit}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    if (!digits) {
                      setNewAccCreditLimit('');
                    } else {
                      const num = parseInt(digits, 10) / 100;
                      setNewAccCreditLimit(num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                    }
                  }}
                  className="glass-input rounded-xl px-4 py-2.5 w-full text-xs text-white placeholder-gray-600 outline-none focus:border-indigo-500 transition"
                />
              </div>
              <div>
                <label htmlFor="account-closing-day" className="block text-[9px] font-bold text-gray-500 font-mono uppercase tracking-wider mb-1">Dia do Fechamento</label>
                <input
                  id="account-closing-day"
                  type="number"
                  placeholder="Ex: 5"
                  min="1"
                  max="31"
                  value={newAccClosingDay}
                  onChange={(e) => setNewAccClosingDay(e.target.value)}
                  className="glass-input rounded-xl px-4 py-2.5 w-full text-xs text-white placeholder-gray-600 outline-none focus:border-indigo-500 transition font-mono"
                />
              </div>
              <div>
                <label htmlFor="account-due-day" className="block text-[9px] font-bold text-gray-500 font-mono uppercase tracking-wider mb-1">Dia do Vencimento</label>
                <input
                  id="account-due-day"
                  type="number"
                  placeholder="Ex: 12"
                  min="1"
                  max="31"
                  value={newAccDueDay}
                  onChange={(e) => setNewAccDueDay(e.target.value)}
                  className="glass-input rounded-xl px-4 py-2.5 w-full text-xs text-white placeholder-gray-600 outline-none focus:border-indigo-500 transition font-mono"
                />
              </div>
              <div>
                <label htmlFor="account-payment-account" className="block text-[9px] font-bold text-gray-500 font-mono uppercase tracking-wider mb-1">Conta de pagamento</label>
                <select id="account-payment-account" value={newAccPaymentAccountId} onChange={(event) => setNewAccPaymentAccountId(event.target.value)} className="glass-input min-h-11 rounded-xl px-3 w-full text-xs text-white bg-dark-bg"><option value="">Escolher depois</option>{accounts.filter((account) => account.type !== 'credit').map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select>
              </div>
              <div>
                <label htmlFor="account-minimum-rate" className="block text-[9px] font-bold text-gray-500 font-mono uppercase tracking-wider mb-1">Pagamento mínimo (%)</label>
                <input id="account-minimum-rate" type="number" min="0" max="100" value={newAccMinimumRate} onChange={(event) => setNewAccMinimumRate(event.target.value)} className="glass-input min-h-11 rounded-xl px-3 w-full text-xs font-mono text-white" />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-mono uppercase">Cor:</span>
              <div className="flex gap-1.5">
                {['#820ad1', '#00C896', '#007AFF', '#fcf314', '#FF9500', '#FF3B30'].map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewAccColor(color)}
                    className={`w-5 h-5 rounded-full border transition-all ${
                      newAccColor === color ? 'border-white scale-110 ring-2 ring-indigo-500/20' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold tracking-wide transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/15 cursor-pointer"
            >
              <Plus size={14} />
              <span>Adicionar Conta</span>
            </button>
          </div>
        </form>
      </div>

      {/* Supabase Cloud Sync Section */}
      <div className="glass-card rounded-[24px] p-5.5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
              supabaseStatus === 'connected'
                ? 'bg-emerald-accent/5 text-emerald-accent border-emerald-accent/10'
                : supabaseStatus === 'error'
                ? 'bg-pink-accent/5 text-pink-accent border-pink-accent/10'
                : 'bg-white/5 text-gray-400 border-white/5'
            }`}>
              {supabaseStatus === 'connected' ? <Cloud size={18} className="text-emerald-accent" /> : <CloudOff size={18} className="text-gray-400" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Sincronização Cloud Supabase</h3>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase tracking-wide">
                STATUS: {supabaseStatus === 'connected' ? (
                  <span className="text-emerald-accent font-extrabold">CONECTADO</span>
                ) : supabaseStatus === 'error' ? (
                  <span className="text-pink-accent font-extrabold">ERRO DE CONEXÃO</span>
                ) : (
                  <span className="text-gray-400">DESCONECTADO (LOCAL ONLY)</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSupabaseConfigured && (
              <button
                onClick={() => setShowConfigForm(!showConfigForm)}
                className="p-2.5 rounded-xl glass-card-interactive text-gray-400 hover:text-white transition flex items-center gap-1.5"
                title="Editar Configurações"
              >
                <Settings size={14} />
              </button>
            )}
            
            {supabaseStatus === 'connected' && (
              <button
                onClick={() => syncWithSupabase()}
                disabled={isSyncing}
                className={`p-2.5 rounded-xl glass-card-interactive text-gray-400 hover:text-white transition flex items-center gap-1.5 ${
                  isSyncing ? 'opacity-50' : ''
                }`}
                title="Sincronizar dados agora"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              </button>
            )}
          </div>
        </div>

        {connectionSuccessMessage && (
          <div className="bg-emerald-accent/10 border border-emerald-accent/20 rounded-2xl p-3.5 text-xs text-emerald-accent font-medium">
            {connectionSuccessMessage}
          </div>
        )}

        {supabaseStatus === 'connected' && !showConfigForm && (
          <div className="bg-emerald-accent/5 border border-emerald-accent/10 rounded-2xl p-4 flex items-start gap-3">
            <Database size={16} className="text-emerald-accent shrink-0 mt-0.5" />
            <div className="space-y-1 w-full">
              <p className="text-xs font-bold text-white">Seu banco de dados está sincronizado na nuvem!</p>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Todas as suas transações, contas, categorias e lista de compras estão salvas no Supabase.
              </p>
              <div className="bg-black/20 rounded-xl p-3 mt-2 font-mono text-[9px] text-gray-500 break-all space-y-1">
                <p>URL: <span className="text-gray-400">{getSupabaseConfig().url}</span></p>
              </div>
              <div className="pt-3">
                <button
                  onClick={handleDisconnectSupabase}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-bold transition cursor-pointer"
                >
                  Desconectar
                </button>
              </div>
            </div>
          </div>
        )}

        {supabaseStatus === 'error' && !showConfigForm && (
          <div className="bg-pink-accent/5 border border-pink-accent/10 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-pink-accent shrink-0 mt-0.5" />
            <div className="space-y-1 w-full">
              <p className="text-xs font-bold text-white">Falha na conexão com o Supabase</p>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                O aplicativo não conseguiu se conectar ou encontrar as tabelas no Supabase.
              </p>
              <ol className="text-[10px] text-gray-400 leading-relaxed list-decimal pl-4 pt-1 space-y-1">
                <li>Verifique se sua URL e Anon Key estão corretos.</li>
                <li><strong>Tabelas Inexistentes:</strong> Certifique-se de que você rodou o script SQL para criar as tabelas <code className="font-mono bg-black/40 px-1 rounded text-[9px]">accounts, categories, transactions, market_items</code>.</li>
                <li><strong>Políticas (RLS):</strong> Confirme se o RLS está ativado e as políticas de acesso público (anon) foram criadas.</li>
              </ol>
              <div className="pt-3 flex gap-2 justify-end">
                <button
                  onClick={() => setShowConfigForm(true)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-[10px] font-bold transition cursor-pointer"
                >
                  Editar Credenciais
                </button>
                <button
                  onClick={() => syncWithSupabase()}
                  disabled={isSyncing}
                  className="px-3 py-1.5 rounded-lg bg-pink-accent/10 border border-pink-accent/20 hover:bg-pink-accent/20 text-white text-[10px] font-bold tracking-wide uppercase transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? 'Sincronizando...' : 'Tentar Novamente'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showConfigForm && (
          <form onSubmit={handleSaveSupabaseConfig} className="space-y-4 pt-2 border-t border-white/5">
            <div className="bg-white/5 border border-white/5 rounded-2xl p-3.5 flex items-start gap-2.5">
              <Info size={14} className="text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Preencha os campos abaixo com a URL e Anon Key do seu projeto Supabase.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="supabase-url" className="block text-[10px] font-bold font-mono text-gray-500 uppercase tracking-wider mb-1.5">SUPABASE URL *</label>
                <input
                  id="supabase-url"
                  type="url"
                  placeholder="https://xyz.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="glass-input rounded-xl px-4 py-3 w-full text-xs text-white placeholder-gray-600 outline-none focus:border-indigo-500 transition"
                  required
                />
              </div>

              <div>
                <label htmlFor="supabase-anon-key" className="block text-[10px] font-bold font-mono text-gray-500 uppercase tracking-wider mb-1.5">ANON KEY *</label>
                <input
                  id="supabase-anon-key"
                  type="text"
                  placeholder="eyJhb..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="glass-input rounded-xl px-4 py-3 w-full text-xs text-white placeholder-gray-600 outline-none focus:border-indigo-500 transition"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-1.5">
              {isSupabaseConfigured && (
                <button
                  type="button"
                  onClick={() => setShowConfigForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={isSyncing}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold tracking-wide transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/15 cursor-pointer"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Conectando...</span>
                  </>
                ) : (
                  <>
                    <Database size={14} />
                    <span>Salvar e Sincronizar</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

    </div>
  );
}
