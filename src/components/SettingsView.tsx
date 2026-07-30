import { PushNotificationSettings } from "./PushNotificationSettings";
import { useState, FormEvent } from 'react';
import { useFinanceStore } from '../store';
import { Plus, Trash2, ShieldCheck, Tag, Info, Layers, Cloud, CloudOff, Database, RefreshCw, AlertCircle, CreditCard, ChevronDown, ChevronUp, Settings, LogOut } from 'lucide-react';
import { TransactionType } from '../types';
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
  const { categories, transactions, accounts, addCategory, deleteCategory, addAccount, deleteAccount, supabaseStatus, isSyncing, syncWithSupabase, user, logoutUser } = useFinanceStore();
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
      if (!confirm(`A categoria "${name}" possui ${count} lançamentos vinculados. Se deletar, as transações continuarão gravadas com esse nome, mas a categoria não aparecerá mais nos seletores. Deseja prosseguir?`)) {
        return;
      }
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
      if (!confirm(`A conta "${name}" possui ${accountTrans.length} lançamentos vinculados. Deseja realmente excluir esta conta?`)) {
        return;
      }
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
      extra.bank = newAccBank;
      if (newAccCreditLimit) extra.creditLimit = parseFloat(newAccCreditLimit.replace(/\./g, '').replace(',', '.'));
      if (newAccClosingDay) extra.closingDay = parseInt(newAccClosingDay);
      if (newAccDueDay) extra.dueDay = parseInt(newAccDueDay);
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
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
