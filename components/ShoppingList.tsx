import React, { useState, useEffect } from 'react';
import { ShoppingItem } from '../types';
import { Button } from './Button';
import { Plus, Trash2, ShoppingCart, Check, Circle, DollarSign, Calculator } from 'lucide-react';

interface ShoppingListProps {
  onFinishShopping: (total: number) => void;
}

export const ShoppingList: React.FC<ShoppingListProps> = ({ onFinishShopping }) => {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('fluxo_shopping_list');
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar lista", e);
      }
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('fluxo_shopping_list', JSON.stringify(items));
  }, [items]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName) return;

    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      name: newItemName,
      estimatedPrice: parseFloat(newItemPrice) || 0,
      quantity: parseInt(newItemQty) || 1,
      checked: false
    };

    setItems(prev => [...prev, newItem]);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemQty('1');
  };

  const toggleCheck = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const clearList = () => {
    if (confirm('Deseja limpar toda a lista?')) {
      setItems([]);
    }
  };

  const totalEstimated = items.reduce((acc, item) => acc + (item.estimatedPrice * item.quantity), 0);
  const totalChecked = items.filter(i => i.checked).reduce((acc, item) => acc + (item.estimatedPrice * item.quantity), 0);
  const itemCount = items.length;
  const checkedCount = items.filter(i => i.checked).length;

  return (
    <div className="space-y-6 pb-24 md:pb-0 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-white flex items-center gap-2">
             <ShoppingCart className="text-emerald-400" size={28} /> Lista de Compras
           </h2>
           <p className="text-slate-400 text-sm mt-1">Planeje antes de comprar.</p>
        </div>
        {items.length > 0 && (
            <button 
                onClick={clearList}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium"
            >
                Limpar Lista
            </button>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleAddItem} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-lg">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Item (ex: Leite, Arroz)"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              required
            />
          </div>
          <div className="flex gap-3">
             <div className="w-20">
                <input
                type="number"
                value={newItemQty}
                onChange={(e) => setNewItemQty(e.target.value)}
                placeholder="Qtd"
                min="1"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none text-center"
                />
             </div>
             <div className="w-28 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">R$</span>
                <input
                type="number"
                step="0.01"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                placeholder="0,00"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 pl-7 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
             </div>
             <Button type="submit" className="shrink-0 aspect-square flex items-center justify-center p-0 w-[50px]">
                <Plus size={24} />
             </Button>
          </div>
        </div>
      </form>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
                <ShoppingCart size={48} className="mb-4 opacity-20" />
                <p>Sua lista está vazia.</p>
                <p className="text-xs">Adicione itens acima para começar a calcular.</p>
            </div>
        ) : (
            items.map(item => (
                <div 
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group ${
                      item.checked 
                      ? 'bg-slate-900/50 border-slate-800 opacity-60' 
                      : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                  }`}
                >
                    <div className="flex items-center gap-4 overflow-hidden">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            item.checked 
                            ? 'bg-emerald-500 border-emerald-500 text-white' 
                            : 'border-slate-500 text-transparent'
                        }`}>
                            <Check size={14} strokeWidth={3} />
                        </div>
                        <div className="min-w-0">
                            <p className={`font-medium truncate ${item.checked ? 'text-slate-500 line-through' : 'text-white'}`}>
                                {item.name}
                            </p>
                            <p className="text-xs text-slate-400">
                                {item.quantity}x {item.estimatedPrice > 0 ? `R$ ${item.estimatedPrice.toFixed(2)}` : '-'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 shrink-0">
                        {item.estimatedPrice > 0 && (
                            <span className="font-bold text-emerald-400">
                                R$ {(item.estimatedPrice * item.quantity).toFixed(2)}
                            </span>
                        )}
                        <button 
                            onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                            className="p-2 text-slate-500 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-500/10"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            ))
        )}
      </div>

      {/* Footer Totals */}
      <div className="bg-slate-900 border-t border-slate-800 pt-4 -mx-6 px-6 md:mx-0 md:px-0 md:bg-transparent md:border-0 sticky bottom-0 md:relative">
         <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-xl">
             <div className="flex justify-between items-end mb-4">
                 <div>
                     <p className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Total Estimado</p>
                     <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-bold text-white">
                            R$ {totalEstimated.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </h3>
                        {checkedCount > 0 && (
                            <span className="text-xs text-slate-500">
                                (R$ {totalChecked.toLocaleString('pt-BR', {minimumFractionDigits: 2})} no carrinho)
                            </span>
                        )}
                     </div>
                 </div>
                 <div className="text-right hidden sm:block">
                     <p className="text-slate-400 text-xs">Itens</p>
                     <p className="text-white font-bold">{checkedCount}/{itemCount}</p>
                 </div>
             </div>
             
             <Button 
                fullWidth 
                size="lg"
                onClick={() => onFinishShopping(totalEstimated)}
                disabled={totalEstimated === 0}
                className="flex items-center gap-2 justify-center shadow-lg shadow-emerald-500/20"
             >
                 <Calculator size={20} />
                 Finalizar Compra
             </Button>
         </div>
      </div>
    </div>
  );
};