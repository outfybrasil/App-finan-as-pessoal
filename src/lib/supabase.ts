import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Transaction, Account, Category, MarketItem } from '../types';
import { getEffectiveStatus, getLocalIsoDate } from './finance';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export const normalizeSupabaseUrl = (url: string): string =>
  url.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');

export const getSupabaseConfig = (): SupabaseConfig => {
  const envUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || '');
  const envAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (envUrl && envAnonKey) {
    return { url: envUrl, anonKey: envAnonKey };
  }

  const savedConfig = localStorage.getItem('supabase_config');
  if (savedConfig) {
    try {
      const parsed = JSON.parse(savedConfig) as Partial<SupabaseConfig>;
      return {
        url: normalizeSupabaseUrl(parsed.url || ''),
        anonKey: (parsed.anonKey || '').trim(),
      };
    } catch {
      localStorage.removeItem('supabase_config');
    }
  }

  return {
    url: envUrl,
    anonKey: envAnonKey,
  };
};

export const saveSupabaseConfig = (config: SupabaseConfig) => {
  localStorage.setItem('supabase_config', JSON.stringify({
    url: normalizeSupabaseUrl(config.url),
    anonKey: config.anonKey.trim(),
  }));
};

let currentConfig = getSupabaseConfig();
let supabase: SupabaseClient | null = null;
export let isSupabaseConfigured = false;

export const initSupabase = (config: SupabaseConfig) => {
  currentConfig = config;
  if (config.url && config.anonKey) {
    let cleanUrl = config.url;
    if (cleanUrl.endsWith('/rest/v1/')) {
      cleanUrl = cleanUrl.substring(0, cleanUrl.length - 9);
    } else if (cleanUrl.endsWith('/rest/v1')) {
      cleanUrl = cleanUrl.substring(0, cleanUrl.length - 8);
    }
    supabase = createClient(cleanUrl, config.anonKey);
    isSupabaseConfigured = true;
  } else {
    supabase = null;
    isSupabaseConfigured = false;
  }
};

// Initialize on load
initSupabase(currentConfig);

let activeUserEmail: string | null = null;

// Initialize activeUserEmail on load if a session exists in Zustand storage
try {
  const savedState = localStorage.getItem('finance-v3-storage');
  if (savedState) {
    const parsed = JSON.parse(savedState);
    if (parsed.state && parsed.state.user && parsed.state.user.email) {
      activeUserEmail = parsed.state.user.email.toLowerCase().trim();
    }
  }
} catch (e) {
  console.error('Failed to pre-hydrate activeUserEmail from Zustand storage', e);
}

export const setUserEmail = (email: string | null) => {
  activeUserEmail = email ? email.toLowerCase().trim() : null;
};

const prefixId = (id: string): string => {
  if (!activeUserEmail) return id;
  if (activeUserEmail === 'luisgustavoarrudalanconi@gmail.com') {
    return id; // No prefix for Luis to keep his legacy data intact and clean!
  }
  const prefix = `${activeUserEmail}:`;
  if (id.startsWith(prefix)) return id;
  return `${prefix}${id}`;
};

const unprefixId = (id: string): string => {
  if (!activeUserEmail) return id;
  if (activeUserEmail === 'luisgustavoarrudalanconi@gmail.com') {
    return id; // Luis has no prefix
  }
  const prefix = `${activeUserEmail}:`;
  if (id.startsWith(prefix)) {
    return id.substring(prefix.length);
  }
  return id;
};

const getAccountColor = (name: string, id: string): string => {
  const savedColors = localStorage.getItem('account_colors');
  if (savedColors) {
    const colors = JSON.parse(savedColors);
    if (colors[id]) return colors[id];
  }
  return '#820ad1';
};

const saveAccountColor = (id: string, name: string, color: string) => {
  const savedColors = localStorage.getItem('account_colors');
  const colors = savedColors ? JSON.parse(savedColors) : {};
  colors[id] = color;
  localStorage.setItem('account_colors', JSON.stringify(colors));
};

const serializeTransaction = (t: Transaction) => {
  return {
    id: prefixId(t.id),
    description: t.description,
    amount: Number(t.amount),
    type: t.type,
    category: t.category,
    sub_category: t.subCategory || null,
    account_id: prefixId(t.accountId),
    date: t.date,
    status: t.status,
    is_fixed: !!t.isFixed,
    is_installment: !!t.isInstallment,
    installment_info: t.installmentInfo ? JSON.stringify(t.installmentInfo) : null,
    payment_date: t.paymentDate || null,
    kind: t.kind || 'transaction',
    credit_card_id: t.creditCardId ? prefixId(t.creditCardId) : null,
    invoice_id: t.invoiceId || null,
  };
};

const deserializeTransaction = (doc: any): Transaction => {
  let installmentInfo = undefined;
  const rawInstallmentInfo = doc.installmentInfo || doc.installment_info;
  if (rawInstallmentInfo) {
    try {
      installmentInfo = typeof rawInstallmentInfo === 'string' ? JSON.parse(rawInstallmentInfo) : rawInstallmentInfo;
    } catch (e) {
      console.warn('Failed to parse installmentInfo', rawInstallmentInfo);
    }
  }

  const date = doc.date || getLocalIsoDate();
  const rawStatus = doc.status;
  const status: Transaction['status'] =
    rawStatus === 'completed' || rawStatus === 'pending' || rawStatus === 'scheduled'
      ? rawStatus
      : getEffectiveStatus('scheduled', date);

  return {
    id: unprefixId(doc.id),
    description: doc.description || '',
    amount: doc.amount != null ? Number(doc.amount) : 0,
    type: doc.type || 'expense',
    category: doc.category || '',
    subCategory: doc.subCategory || doc.sub_category || '',
    accountId: unprefixId(doc.accountId || doc.account_id || ''),
    date,
    status,
    isFixed: doc.isFixed != null ? !!doc.isFixed : !!doc.is_fixed,
    isInstallment: doc.isInstallment != null ? !!doc.isInstallment : !!doc.is_installment,
    installmentInfo,
    paymentDate: doc.paymentDate || doc.payment_date || undefined,
    kind: doc.kind || undefined,
    creditCardId: doc.creditCardId || doc.credit_card_id ? unprefixId(doc.creditCardId || doc.credit_card_id) : undefined,
    invoiceId: doc.invoiceId || doc.invoice_id || undefined,
  };
};

export const supabaseService = {
  // --- USERS ---
  async getUserByEmail(email: string): Promise<any | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const { data, error } = await supabase.from('app_users').select('*').eq('email', email.toLowerCase().trim()).single();
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('Error fetching user:', error);
        return null;
      }
      return data;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  async createUser(email: string, name: string, passwordHash: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const { error } = await supabase.from('app_users').insert({
        email: email.toLowerCase().trim(),
        name,
        password_hash: passwordHash
      });
      if (error) {
        console.error('Error creating user:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  async updateUserPassword(email: string, passwordHash: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const { error } = await supabase.from('app_users').update({
        password_hash: passwordHash
      }).eq('email', email.toLowerCase().trim());
      if (error) {
        console.error('Error updating password:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  // --- ACCOUNTS ---
  async getAccounts(): Promise<Account[]> {
    if (!isSupabaseConfigured || !supabase || !activeUserEmail) return [];
    try {
      const { data, error } = await supabase.from('accounts').select('*').limit(5000);
      if (error) throw error;

      const filtered = (data || []).filter(doc => {
        const id = doc.id || '';
        if (id.startsWith(`${activeUserEmail}:`)) return true;
        if (activeUserEmail === 'luisgustavoarrudalanconi@gmail.com' && !id.includes(':')) return true;
        return false;
      });

      return filtered.map(doc => ({
        id: unprefixId(doc.id),
        name: doc.name || 'Conta sem nome',
        balance: doc.balance != null ? Number(doc.balance) : 0,
        color: getAccountColor(doc.name, unprefixId(doc.id)),
        type: doc.type || 'checking',
        bank: doc.bank || doc.bank_name || '',
        creditLimit: doc.creditLimit != null ? Number(doc.creditLimit) : (doc.credit_limit != null ? Number(doc.credit_limit) : 0),
        closingDay: doc.closingDay != null ? Number(doc.closingDay) : (doc.closing_day != null ? Number(doc.closing_day) : 0),
        dueDay: doc.dueDay != null ? Number(doc.dueDay) : (doc.due_day != null ? Number(doc.due_day) : 0),
        paymentAccountId: doc.paymentAccountId || doc.payment_account_id ? unprefixId(doc.paymentAccountId || doc.payment_account_id) : undefined,
        minimumPaymentRate: doc.minimumPaymentRate != null ? Number(doc.minimumPaymentRate) : (doc.minimum_payment_rate != null ? Number(doc.minimum_payment_rate) : undefined),
        userId: doc.userId || doc.user_id || '',
      }));
    } catch (e) {
      console.error('Supabase: Erro ao listar contas', e);
      throw e;
    }
  },

  async saveAccount(acc: Account): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase || !activeUserEmail) return false;
    const cleanId = unprefixId(acc.id);
    if (acc.color) saveAccountColor(cleanId, acc.name, acc.color);
    
    const data: any = { 
       id: prefixId(acc.id),
       name: acc.name, 
       balance: Number(acc.balance),
       type: acc.type || 'checking',
       user_id: activeUserEmail
    };
    
    if (acc.creditLimit !== undefined) {
      data.credit_limit = Number(acc.creditLimit);
    }
    if (acc.closingDay !== undefined) {
      data.closing_day = Number(acc.closingDay);
    }
    if (acc.dueDay !== undefined) {
      data.due_day = Number(acc.dueDay);
    }
    if (acc.paymentAccountId) {
      data.payment_account_id = prefixId(acc.paymentAccountId);
    }
    if (acc.minimumPaymentRate !== undefined) {
      data.minimum_payment_rate = Number(acc.minimumPaymentRate);
    }
    
    try {
      const { error } = await supabase.from('accounts').upsert(data, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Supabase: Erro ao salvar conta', e);
      return false;
    }
  },

  async deleteAccount(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase || !activeUserEmail) return false;
    try {
      const { error } = await supabase.from('accounts').delete().eq('id', prefixId(id));
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Supabase: Erro ao excluir conta', e);
      return false;
    }
  },

  // --- CATEGORIES ---
  async getCategories(): Promise<Category[]> {
    if (!isSupabaseConfigured || !supabase || !activeUserEmail) return [];
    try {
      const { data, error } = await supabase.from('categories').select('*').limit(5000);
      if (error) throw error;

      const filtered = (data || []).filter(doc => {
        const id = doc.id || '';
        if (id.startsWith(`${activeUserEmail}:`)) return true;
        if (activeUserEmail === 'luisgustavoarrudalanconi@gmail.com' && !id.includes(':')) return true;
        return false;
      });

      return filtered.map(doc => ({
        id: unprefixId(doc.id),
        name: doc.name || '',
        type: doc.type || 'expense',
        isSystem: doc.isSystem != null ? !!doc.isSystem : (doc.is_system != null ? !!doc.is_system : false),
        iconName: doc.iconName || doc.icon_name || 'PlusCircle',
      }));
    } catch (e) {
      console.error('Supabase: Erro ao listar categorias', e);
      throw e;
    }
  },

  async saveCategory(cat: Category): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase || !activeUserEmail) return false;
    const data = {
      id: prefixId(cat.id),
      name: cat.name,
      type: cat.type,
      is_system: !!cat.isSystem,
      icon_name: cat.iconName,
    };
    try {
      const { error } = await supabase.from('categories').upsert(data, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Supabase: Erro ao salvar categoria', e);
      return false;
    }
  },

  async deleteCategory(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase || !activeUserEmail) return false;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', prefixId(id));
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Supabase: Erro ao excluir categoria', e);
      return false;
    }
  },

  // --- TRANSACTIONS ---
  async getTransactions(): Promise<Transaction[]> {
    if (!isSupabaseConfigured || !supabase || !activeUserEmail) return [];
    try {
      const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false }).limit(5000);
      if (error) throw error;

      const filtered = (data || []).filter(doc => {
        const id = doc.id || '';
        if (id.startsWith(`${activeUserEmail}:`)) return true;
        if (activeUserEmail === 'luisgustavoarrudalanconi@gmail.com' && !id.includes(':')) return true;
        return false;
      });

      return filtered.map(deserializeTransaction);
    } catch (e) {
      console.error('Supabase: Erro ao listar transações', e);
      throw e;
    }
  },

  async saveTransaction(t: Transaction): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase || !activeUserEmail) return false;
    const data = serializeTransaction(t);
    try {
      const { error } = await supabase.from('transactions').upsert(data, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Supabase: Erro ao salvar transação', e);
      return false;
    }
  },

  async deleteTransaction(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase || !activeUserEmail) return false;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', prefixId(id));
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Supabase: Erro ao excluir transação', e);
      return false;
    }
  },

  // --- MARKET ITEMS ---
  async getMarketItems(): Promise<MarketItem[]> {
    if (!isSupabaseConfigured || !supabase || !activeUserEmail) return [];
    try {
      const { data, error } = await supabase.from('market_items').select('*').limit(5000);
      if (error) throw error;

      const filtered = (data || []).filter(doc => {
        const id = doc.id || '';
        if (id.startsWith(`${activeUserEmail}:`)) return true;
        if (activeUserEmail === 'luisgustavoarrudalanconi@gmail.com' && !id.includes(':')) return true;
        return false;
      });

      return filtered.map(doc => ({
        id: unprefixId(doc.id),
        name: doc.name || '',
        estimatedPrice: doc.estimatedPrice != null ? Number(doc.estimatedPrice) : (doc.estimated_price != null ? Number(doc.estimated_price) : 0),
        quantity: doc.quantity != null ? Number(doc.quantity) : 0,
        inCart: doc.inCart != null ? !!doc.inCart : (doc.in_cart != null ? !!doc.in_cart : false),
        listId: doc.list_id || 'default',
        category: doc.category || undefined,
        store: doc.store || undefined,
        order: doc.item_order == null ? undefined : Number(doc.item_order),
        lastPurchasedPrice: doc.last_purchased_price == null ? undefined : Number(doc.last_purchased_price),
      }));
    } catch (e) {
      console.error('Supabase: Erro ao listar itens de mercado', e);
      throw e;
    }
  },

  async saveMarketItem(item: MarketItem): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase || !activeUserEmail) return false;
    const data = {
      id: prefixId(item.id),
      name: item.name,
      estimated_price: Number(item.estimatedPrice),
      quantity: Number(item.quantity),
      in_cart: !!item.inCart,
      list_id: item.listId || 'default',
      category: item.category || null,
      store: item.store || null,
      item_order: item.order ?? null,
      last_purchased_price: item.lastPurchasedPrice ?? null,
    };
    try {
      const { error } = await supabase.from('market_items').upsert(data, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Supabase: Erro ao salvar item de mercado', e);
      return false;
    }
  },

  async deleteMarketItem(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase || !activeUserEmail) return false;
    try {
      const { error } = await supabase.from('market_items').delete().eq('id', prefixId(id));
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Supabase: Erro ao excluir item de mercado', e);
      return false;
    }
  },

  async clearMarketList(ids: string[]): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase || !activeUserEmail || ids.length === 0) return false;
    const prefixedIds = ids.map(id => prefixId(id));
    try {
      const { error } = await supabase.from('market_items').delete().in('id', prefixedIds);
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Supabase: Erro ao limpar lista de mercado', e);
      return false;
    }
  }
};
