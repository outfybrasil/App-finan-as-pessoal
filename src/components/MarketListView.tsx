import { useState, FormEvent } from 'react';
import { useFinanceStore } from '../store';
import { Plus, Trash2, ShoppingBag, ShoppingCart, Check, Calculator } from 'lucide-react';
import { MarketItem } from '../types';

export default function MarketListView() {
  const { 
    marketItems, 
    accounts,
    addMarketItem, 
    toggleMarketItemInCart, 
    deleteMarketItem, 
    updateMarketItem,
    convertMarketListToExpense 
  } = useFinanceStore();

  const [isAdding, setIsAdding] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');

  const handleAddItem = (e: FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const price = parseFloat(newItemPrice.replace(/\./g, '').replace(',', '.')) || 0;
    addMarketItem(newItemName.trim(), price, newItemQty);
    
    setNewItemName('');
    setNewItemPrice('');
    setNewItemQty(1);
    setIsAdding(false);
  };

  const totalItems = marketItems.length;
  const itemsInCart = marketItems.filter(i => i.inCart).length;
  
  const itemsToSum = itemsInCart > 0 ? marketItems.filter(i => i.inCart) : marketItems;
  const totalEstimated = itemsToSum.reduce((sum, item) => sum + (item.estimatedPrice * item.quantity), 0);

  const incrementQty = (item: MarketItem) => {
    updateMarketItem(item.id, item.quantity + 1, item.estimatedPrice);
  };

  const decrementQty = (item: MarketItem) => {
    if (item.quantity > 1) {
      updateMarketItem(item.id, item.quantity - 1, item.estimatedPrice);
    }
  };

  const handlePriceChange = (id: string, qty: number, priceStr: string) => {
    const digits = priceStr.replace(/\D/g, '');
    const price = digits ? (parseInt(digits, 10) / 100) : 0;
    updateMarketItem(id, qty, price);
  };

  const handleFinalizeCheckout = () => {
    if (!selectedAccountId) return;
    convertMarketListToExpense(selectedAccountId);
    setIsCheckoutOpen(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      
      {/* Total Estimated Card */}
      <div className="bg-[#0f0f13] border border-white/[0.08] rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
            <Calculator size={20} />
          </div>
          <div>
            <p className="text-zinc-400 text-xs font-mono uppercase tracking-wider mb-0.5">
              Total Estimado {itemsInCart > 0 ? '(No Carrinho)' : '(Lista Completa)'}
            </p>
            <h2 className="text-3xl font-bold font-mono tabular-nums text-white tracking-tight">
              R$ {totalEstimated.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>
        </div>
      </div>

      {/* Button to show inline add form */}
      {!isAdding ? (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full py-3.5 bg-[#0f0f13] border border-dashed border-white/[0.16] hover:border-emerald-500/50 rounded-2xl text-emerald-400 hover:text-emerald-300 transition duration-150 active:scale-[0.98] flex items-center justify-center gap-2 text-xs font-semibold font-display"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>ADICIONAR ITEM NA LISTA</span>
        </button>
      ) : (
        <form onSubmit={handleAddItem} className="bg-[#0f0f13] border border-white/[0.08] rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Novo Item de Mercado</h4>
            <button 
              type="button" 
              onClick={() => setIsAdding(false)}
              className="text-zinc-400 hover:text-white text-xs"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="market-product" className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Produto</label>
              <input
                id="market-product"
                type="text"
                placeholder="Ex: Leite, Café, Frutas..."
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full glass-input px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-emerald-400"
                required
                autoFocus
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="market-price" className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Preço Est. (R$)</label>
                <input
                  id="market-price"
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={newItemPrice}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    if (!digits) {
                      setNewItemPrice('');
                    } else {
                      const num = parseInt(digits, 10) / 100;
                      setNewItemPrice(num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                    }
                  }}
                  className="w-full glass-input px-3 py-2 text-xs font-mono text-white placeholder-zinc-600 focus:border-emerald-400"
                />
              </div>
              <div>
                <span id="market-quantity-label" className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Qtd</span>
                <div className="flex items-center glass-input h-[44px] px-1" role="group" aria-labelledby="market-quantity-label">
                  <button 
                    type="button"
                    aria-label="Diminuir quantidade"
                    onClick={() => setNewItemQty(Math.max(1, newItemQty - 1))}
                    className="w-11 h-11 text-zinc-400 hover:text-white flex items-center justify-center text-xs"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center text-xs font-mono text-white font-bold">{newItemQty}</span>
                  <button 
                    type="button"
                    aria-label="Aumentar quantidade"
                    onClick={() => setNewItemQty(newItemQty + 1)}
                    className="w-11 h-11 text-zinc-400 hover:text-white flex items-center justify-center text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold font-display rounded-xl text-xs transition duration-150 active:scale-[0.98]"
              >
                Adicionar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Stats header */}
      <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400 uppercase tracking-wider px-1">
        <span>{totalItems} Produtos na lista</span>
        <span>{itemsInCart} No Carrinho</span>
      </div>

      {/* Main Items list */}
      {marketItems.length === 0 ? (
        <div className="bg-[#0f0f13] border border-white/[0.08] rounded-2xl py-12 px-6 text-center flex flex-col items-center justify-center">
          <ShoppingBag size={28} className="text-zinc-600 mb-2" />
          <h3 className="text-sm font-bold text-white">Lista de Mercado Vazia</h3>
          <p className="text-xs text-zinc-400 mt-1">Adicione itens para planejar suas compras de supermercado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {marketItems.map(item => (
            <div 
              key={item.id}
              className={`rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition border ${
                item.inCart 
                  ? 'border-emerald-500/20 bg-emerald-500/5' 
                  : 'border-white/[0.08] bg-[#0f0f13] hover:border-white/[0.16]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => toggleMarketItemInCart(item.id)}
                  className={`w-5 h-5 rounded-md flex items-center justify-center transition shrink-0 border ${
                    item.inCart
                      ? 'bg-emerald-500 border-emerald-500 text-zinc-950'
                      : 'border-white/[0.2] bg-transparent text-transparent hover:border-white/40'
                  }`}
                >
                  <Check size={12} strokeWidth={3} />
                </button>

                <div className="min-w-0">
                  <h4 className={`text-xs font-semibold tracking-tight truncate ${
                    item.inCart ? 'line-through text-zinc-500' : 'text-white'
                  }`}>
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-zinc-400 font-mono">
                    <span>Qtd: {item.quantity}</span>
                    <span>•</span>
                    <span>Uni: R$ {item.estimatedPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 border-t border-white/[0.04] pt-2 sm:border-t-0 sm:pt-0">
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-[#16161d] border border-white/[0.08] rounded-md h-[26px] px-0.5">
                    <button 
                      onClick={() => decrementQty(item)}
                      className="w-4 h-4 text-zinc-400 hover:text-white flex items-center justify-center text-xs"
                    >
                      -
                    </button>
                    <span className="w-5 text-center text-[10px] font-mono font-bold text-white">{item.quantity}</span>
                    <button 
                      onClick={() => incrementQty(item)}
                      className="w-4 h-4 text-zinc-400 hover:text-white flex items-center justify-center text-xs"
                    >
                      +
                    </button>
                  </div>

                  <div className="relative w-16">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={item.estimatedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      onChange={(e) => handlePriceChange(item.id, item.quantity, e.target.value)}
                      className="w-full bg-[#16161d] border border-white/[0.08] rounded-md px-1 py-0.5 text-center text-[10px] font-mono text-white outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                <p className={`text-xs font-mono tabular-nums font-bold w-16 text-right ${item.inCart ? 'text-emerald-400' : 'text-white'}`}>
                  R$ {(item.estimatedPrice * item.quantity).toFixed(2)}
                </p>

                <button
                  onClick={() => {
                    if (window.confirm("Deseja remover este item?")) {
                      deleteMarketItem(item.id);
                    }
                  }}
                  className="p-1 text-zinc-500 hover:text-rose-400 transition"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}

          <div className="pt-3">
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold font-display rounded-2xl text-xs tracking-wide transition duration-150 active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
            >
              <ShoppingCart size={15} strokeWidth={2.5} />
              <span>FINALIZAR E CONVERTER EM DESPESA</span>
            </button>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[#0f0f13] border border-white/[0.08] rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-display">Finalizar Compras</h4>
            
            <p className="text-xs text-zinc-300 leading-relaxed">
              Lançar a compra de mercado de <strong className="text-white font-mono tabular-nums">R$ {totalEstimated.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong> nas despesas mensais. Escolha a conta:
            </p>

            <div className="space-y-2">
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => setSelectedAccountId(acc.id)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition ${
                    selectedAccountId === acc.id
                      ? 'border-emerald-500 bg-emerald-500/10 text-white'
                      : 'border-white/[0.08] bg-[#16161d] text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: acc.color }} />
                    <span className="text-xs font-semibold">{acc.name}</span>
                  </div>
                  <span className="text-xs font-mono tabular-nums">
                    R$ {acc.balance.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-2 text-xs font-display pt-2">
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="flex-1 py-2.5 bg-[#16161d] border border-white/[0.08] text-zinc-400 font-semibold rounded-xl hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleFinalizeCheckout}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition duration-150 active:scale-[0.98]"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
