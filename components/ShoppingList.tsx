import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2, Check, X, Calculator, ShoppingBag, AlertCircle, Save, ArrowRight, CheckCircle2, HelpCircle, Edit2 } from 'lucide-react';
import { Button } from './Button';
import { CustomDialog } from './CustomDialog';
import { triggerHaptic } from '../utils/haptics';

interface ShoppingItem {
  id: string;
  name: string;
  estimatedPrice: number;
  quantity: number;
  completed: boolean;
}

interface ShoppingListProps {
  onFinishShopping: (total: number, itemsSummary: string) => void;
}

export const ShoppingList: React.FC<ShoppingListProps> = ({ onFinishShopping }) => {
  const [items, setItems] = useState<ShoppingItem[]>(() => {
    const saved = localStorage.getItem('shopping_list_items');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Product Catalog & Autocomplete
  const [productCatalog, setProductCatalog] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('shopping_product_catalog');
    return saved ? JSON.parse(saved) : {};
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Inline Price Editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemPrice, setEditingItemPrice] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('shopping_list_items', JSON.stringify(items));
  }, [items]);

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName) return;

    triggerHaptic('light');
    const item: ShoppingItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItemName.trim(),
      estimatedPrice: parseFloat(newItemPrice) || 0,
      quantity: parseInt(newItemQty) || 1,
      completed: false
    };

    setItems([item, ...items]);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemQty('1');
  };

  const toggleItem = (id: string) => {
    triggerHaptic('medium');
    setItems(items.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const removeItem = (id: string) => {
    triggerHaptic('heavy');
    setItems(items.filter(item => item.id !== id));
  };

  const totalEstimated = items.reduce((acc, item) => acc + (item.estimatedPrice * item.quantity), 0);
  const completedItems = items.filter(i => i.completed).length;

  const saveEditingPrice = (id: string) => {
    const val = parseFloat(editingItemPrice.replace(',', '.'));
    if (!isNaN(val)) {
      triggerHaptic('light');
      setItems(items.map(item => item.id === id ? { ...item, estimatedPrice: val } : item));
    }
    setEditingItemId(null);
  };

  const handleFinish = () => {
    if (totalEstimated === 0) return;
    triggerHaptic('heavy');
    
    // Create a summary of the items for the transaction description
    const itemsSummary = items
      .filter(i => i.completed || items.length < 5) // Prioritize completed or show all if few
      .map(i => i.name)
      .slice(0, 5)
      .join(', ') + (items.length > 5 ? '...' : '');

    // Atualiza o catálogo de produtos com os preços
    const newCatalog = { ...productCatalog };
    items.forEach(item => {
      newCatalog[item.name] = item.estimatedPrice;
    });
    setProductCatalog(newCatalog);
    localStorage.setItem('shopping_product_catalog', JSON.stringify(newCatalog));

    onFinishShopping(totalEstimated, itemsSummary);
    
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      // Optional: Clear list after finishing? 
      // User might want to keep it until they actually save the transaction.
      // We'll let the user decide.
    }, 3000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full group-hover:bg-emerald-500/30 transition-all duration-500" />
            <div className="relative p-5 bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-white/10 text-emerald-400 shadow-2xl group-hover:scale-105 transition-transform duration-500">
              <ShoppingCart size={40} className="stroke-[1.5]" />
            </div>
            {items.length > 0 && (
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 text-black font-black text-xs rounded-full flex items-center justify-center border-4 border-slate-950 shadow-lg animate-bounce">
                {items.length}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none">
              Lista <span className="text-emerald-500">Mercado</span>
            </h1>
            <p className="text-slate-500 font-bold mt-2 tracking-wide uppercase text-[10px]">Gestão inteligente de mantimentos</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="glass-card px-8 py-5 rounded-[2rem] border-white/5 flex items-center gap-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-emerald-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:rotate-12 transition-transform">
              <Calculator size={24} />
            </div>
            <div className="relative">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Total Estimado</p>
              <p className="text-2xl font-black text-white tracking-tighter">
                R$ <span className="text-emerald-400">{totalEstimated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Adicionar Item */}
        <div className="lg:col-span-4 lg:sticky lg:top-32">
          <button 
            onClick={() => setShowForm(!showForm)}
            className="md:hidden w-full mb-4 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400"
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? 'Fechar Formulário' : 'Adicionar Novo Item'}
          </button>

          <div className={`${showForm ? 'block' : 'hidden md:block'} glass-card p-10 rounded-[3rem] border-white/10 relative overflow-hidden group`}>
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
              <Plus size={120} />
            </div>
            
            <h3 className="text-xl font-black text-white mb-8 uppercase tracking-widest flex items-center gap-4">
              <div className="w-2 h-8 bg-emerald-500 rounded-full" />
              Novo Item
            </h3>

            <form onSubmit={addItem} className="space-y-8">
              <div className="space-y-3 relative">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">O que comprar?</label>
                <div className="relative">
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => {
                      setNewItemName(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Ex: Café em pó"
                    className="w-full bg-slate-950/50 border border-white/5 rounded-3xl px-6 py-5 text-white font-bold placeholder:text-slate-700 outline-none focus:border-emerald-500/50 focus:bg-slate-950 transition-all text-lg shadow-inner"
                  />
                  <ShoppingBag className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-800" size={20} />
                </div>
                
                {/* Suggestions Dropdown */}
                {showSuggestions && newItemName && Object.keys(productCatalog).filter(k => k.toLowerCase().includes(newItemName.toLowerCase())).length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-[calc(100%+0.5rem)] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
                    {Object.keys(productCatalog)
                      .filter(k => k.toLowerCase().includes(newItemName.toLowerCase()))
                      .map(name => (
                        <div 
                          key={name}
                          className="px-6 py-4 hover:bg-emerald-500/10 cursor-pointer flex justify-between items-center transition-colors border-b border-white/5 last:border-0"
                          onClick={() => {
                            setNewItemName(name);
                            setNewItemPrice(productCatalog[name].toString());
                            setNewItemQty('1');
                            setShowSuggestions(false);
                          }}
                        >
                          <span className="font-bold text-slate-200 text-sm tracking-wide">{name}</span>
                          <span className="text-xs font-black text-emerald-500/70 tracking-widest">R$ {productCatalog[name].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Qtd</label>
                  <input
                    type="number"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(e.target.value)}
                    min="1"
                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-emerald-500/50 transition-all text-center"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Preço Un.</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-xs">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-6 pl-10 py-4 text-white font-bold outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                fullWidth 
                size="lg"
                className="rounded-[2rem] py-5 font-black text-sm uppercase tracking-[0.2em] bg-gradient-to-tr from-emerald-500 to-teal-400 text-black shadow-2xl shadow-emerald-500/20 hover:-translate-y-1 active:scale-95 transition-all"
              >
                Incluir na Lista
              </Button>
            </form>
          </div>
        </div>

        {/* Lista de Itens */}
        <div className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <p className="text-xs font-black text-white uppercase tracking-widest">
                {items.length} <span className="text-slate-600">Produtos</span>
              </p>
              <div className="w-1 h-1 bg-slate-800 rounded-full" />
              <p className="text-xs font-black text-emerald-500 uppercase tracking-widest">
                {completedItems} <span className="text-emerald-500/40">No Carrinho</span>
              </p>
            </div>
            
            {items.length > 0 && (
              <button 
                onClick={() => setShowClearConfirm(true)}
                className="text-[10px] font-black text-slate-600 hover:text-rose-500 uppercase tracking-[0.2em] flex items-center gap-2 transition-colors group"
              >
                <Trash2 size={14} className="group-hover:rotate-12 transition-transform" />
                Limpar Memória
              </button>
            )}
          </div>

          <div className="space-y-4 min-h-[400px]">
            {items.length === 0 ? (
              <div className="glass-card p-20 rounded-[4rem] flex flex-col items-center justify-center text-center border-dashed border-2 border-white/5 group">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-slate-500/10 blur-3xl rounded-full scale-150 group-hover:bg-emerald-500/10 transition-all duration-700" />
                  <div className="relative w-24 h-24 rounded-full bg-slate-900 flex items-center justify-center text-slate-700 group-hover:text-emerald-500/50 group-hover:scale-110 transition-all duration-700">
                    <ShoppingBag size={48} className="stroke-[1]" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-white mb-3 tracking-tighter">Geladeira Vazia!</h3>
                <p className="text-slate-500 font-bold max-w-[240px] leading-relaxed">Sua lista está limpa. Comece a planejar sua próxima ida ao mercado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {items.map((item) => (
                  <div 
                    key={item.id}
                    className={`group relative overflow-hidden transition-all duration-500 transform hover:scale-[1.01] active:scale-[0.99]
                      ${item.completed 
                        ? 'opacity-40 grayscale-[0.5]' 
                        : 'animate-in fade-in slide-in-from-right-4'}`}
                  >
                    <div className={`p-5 rounded-[2rem] border transition-all duration-500 flex items-center justify-between gap-6
                      ${item.completed 
                        ? 'bg-slate-900/20 border-white/5' 
                        : 'bg-slate-900/40 border-white/10 hover:border-emerald-500/30'}`}>
                      
                      <div className="flex items-center gap-6 flex-1">
                        <button
                          onClick={() => toggleItem(item.id)}
                          className={`group/btn w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 relative overflow-hidden
                            ${item.completed 
                              ? 'bg-emerald-500 border-emerald-500 text-black' 
                              : 'bg-slate-950 border-white/5 text-transparent hover:border-emerald-500/50 hover:text-emerald-500/30'}`}
                        >
                          <Check size={24} className={`relative z-10 transition-transform duration-500 ${item.completed ? 'scale-100 rotate-0' : 'scale-0 rotate-12'}`} />
                        </button>
                        
                        <div className="min-w-0">
                          <h4 className={`text-xl font-bold tracking-tight transition-all duration-500 ${item.completed ? 'text-slate-600 line-through decoration-emerald-500/50 decoration-2' : 'text-white'}`}>
                            {item.name}
                          </h4>
                          <div className="flex items-center gap-3 mt-1.5 font-black uppercase text-[10px] tracking-widest text-slate-500">
                            <span className="bg-white/5 px-2 py-0.5 rounded-lg">{item.quantity} un</span>
                            <div className="w-1 h-1 bg-slate-800 rounded-full" />
                            <span>R$ {item.estimatedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          {editingItemId === item.id ? (
                            <div className="flex items-center gap-2 bg-slate-950/50 p-1.5 rounded-xl border border-emerald-500/50 shadow-inner">
                              <span className="text-xs text-emerald-500/50 font-black ml-2">R$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={editingItemPrice}
                                onChange={(e) => setEditingItemPrice(e.target.value)}
                                className="w-20 bg-transparent text-right text-emerald-400 font-black outline-none placeholder:text-slate-700"
                                autoFocus
                                onBlur={() => saveEditingPrice(item.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditingPrice(item.id);
                                  if (e.key === 'Escape') setEditingItemId(null);
                                }}
                              />
                            </div>
                          ) : (
                            <div 
                              className="group/price flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95"
                              onClick={() => {
                                if(item.completed) return; // Prevent editing if marked as done
                                setEditingItemId(item.id);
                                setEditingItemPrice(item.estimatedPrice.toString());
                              }}
                            >
                              <p className={`text-xl font-black transition-all ${item.completed ? 'text-slate-600' : 'text-white'} ${!item.completed && 'group-hover/price:text-emerald-400'}`}>
                                R$ {(item.estimatedPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                              <div className={`p-1.5 rounded-lg transition-colors ${item.completed ? 'text-transparent' : 'text-slate-600 group-hover/price:bg-emerald-500/10 group-hover/price:text-emerald-500'}`}>
                                <Edit2 size={14} className={item.completed ? 'opacity-0' : 'opacity-0 group-hover/price:opacity-100'} />
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-3 bg-rose-500/10 rounded-2xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="relative mt-12 animate-in zoom-in duration-700">
              <div className="absolute inset-0 bg-emerald-500/20 blur-3xl opacity-20" />
              <div className="relative glass-card p-10 rounded-[3.5rem] border-white/10 bg-gradient-to-br from-emerald-500/10 via-slate-900/80 to-slate-900 shadow-2xl">
                <div className="flex flex-col md:flex-row items-center gap-8 mb-10">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500 flex items-center justify-center text-black shadow-2xl shadow-emerald-500/50 rotate-3 group-hover:rotate-0 transition-transform">
                    <ShoppingCart size={32} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl font-black text-white">Pronto para Comprar?</h3>
                    <p className="text-[10px] font-black text-emerald-500/70 uppercase tracking-[0.3em] mt-1">Transforme esta lista em um lançamento mensal</p>
                  </div>
                  <div className="text-center md:text-right px-8 py-4 bg-slate-950/50 rounded-3xl border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Final</p>
                    <p className="text-3xl font-black text-white tracking-tighter">
                      R$ <span className="text-emerald-400">{totalEstimated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-900/50 rounded-3xl p-5 border border-white/5 flex gap-4 items-start group hover:border-amber-500/30 transition-colors">
                    <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500 group-hover:scale-110 transition-transform">
                      <AlertCircle size={20} />
                    </div>
                    <p className="text-xs font-bold text-slate-400 leading-relaxed">
                      Lançamento automático na categoria <span className="text-amber-500 font-black">Mercado</span> com data de hoje.
                    </p>
                  </div>
                  <div className="bg-slate-900/50 rounded-3xl p-5 border border-white/5 flex gap-4 items-start group hover:border-emerald-500/30 transition-colors">
                    <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 group-hover:scale-110 transition-transform">
                      <Save size={20} />
                    </div>
                    <p className="text-xs font-bold text-slate-400 leading-relaxed">
                      A lista será salva no seu histórico e você poderá revisar no QuickAdd.
                    </p>
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute inset-0 bg-emerald-400 blur-xl opacity-0 group-hover:opacity-20 transition-opacity" />
                  <Button 
                    fullWidth 
                    size="lg"
                    onClick={handleFinish}
                    disabled={totalEstimated === 0 || showSuccess}
                    className={`relative rounded-[2rem] py-6 font-black text-lg uppercase tracking-[0.25em] transition-all
                      ${showSuccess 
                        ? 'bg-white text-black scale-[0.98]' 
                        : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-2xl shadow-emerald-500/30 hover:-translate-y-1 active:scale-95'}`}
                  >
                    {showSuccess ? (
                      <span className="flex items-center gap-3 animate-in zoom-in">
                        <CheckCircle2 size={24} /> Criando Lançamento...
                      </span>
                    ) : (
                      <span className="flex items-center gap-3">
                        Concluir Compras <ArrowRight size={24} />
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Custom Confirm Dialog */}
      <CustomDialog
        isOpen={showClearConfirm}
        type="confirm"
        title="Limpar Lista"
        message="Deseja realmente apagar todos os itens da sua lista de mercado? Esta ação não pode ser desfeita."
        variant="danger"
        onConfirm={() => {
          triggerHaptic('heavy');
          setItems([]);
          setShowClearConfirm(false);
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};