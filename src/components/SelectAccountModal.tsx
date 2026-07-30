import { useState, useEffect } from 'react';
import { X, Check, CreditCard } from 'lucide-react';
import { useFinanceStore } from '../store';
import { Transaction } from '../types';
import { getLocalIsoDate } from '../lib/finance';
import { useDialogAccessibility } from '../hooks/useDialogAccessibility';

interface Props {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onConfirm: (data: { accountId: string, amountPaid: number, paymentDate: string, intendedStatus?: 'completed' | 'scheduled' }) => void;
}

export default function SelectAccountModal({ isOpen, transaction, onClose, onConfirm }: Props) {
  const dialogRef = useDialogAccessibility(isOpen, onClose);
  const { accounts } = useFinanceStore();
  const [selected, setSelected] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentDate, setPaymentDate] = useState('');

  useEffect(() => {
    if (transaction && isOpen) {
      setSelected(transaction.accountId || '');
      setAmountPaid(transaction.amount.toString());
      setPaymentDate(getLocalIsoDate());
    }
  }, [transaction, isOpen]);

  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-dialog-title"
        tabIndex={-1}
        className="w-full max-w-sm glass-card rounded-2xl p-6 shadow-2xl relative flex flex-col max-h-[90vh]"
      >
        
        <div className="flex justify-between items-center mb-6">
          <h2 id="payment-dialog-title" className="text-lg font-bold text-white font-display">Confirmar Pagamento</h2>
          <button onClick={onClose} aria-label="Fechar pagamento" className="min-h-11 min-w-11 p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 transition">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto pr-1 flex-1 mb-6 space-y-5 custom-scrollbar">
          
          <div>
            <label htmlFor="payment-amount" className="block text-xs text-gray-400 mb-1.5 font-mono uppercase tracking-wider">Valor Pago</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
              <input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full pl-10 pr-4 py-3.5 glass-input focus:ring-0 rounded-2xl text-sm text-white outline-none transition font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="payment-date" className="block text-xs text-gray-400 mb-1.5 font-mono uppercase tracking-wider">Data do Pagamento</label>
            <input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-4 py-3.5 glass-input focus:ring-0 rounded-2xl text-sm text-white outline-none transition font-medium"
              required
            />
          </div>

          <div>
            <span id="payment-account-label" className="block text-xs text-gray-400 mb-2 font-mono uppercase tracking-wider">Conta de {transaction.type === 'expense' ? 'Saída' : 'Entrada'}</span>
            <div className="space-y-2" role="group" aria-labelledby="payment-account-label">
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => setSelected(acc.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all border ${
                    selected === acc.id 
                      ? 'bg-indigo-500/10 border-indigo-500/30' 
                      : 'bg-dark-bg border-dark-border hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: acc.color }}>
                      {acc.type === 'credit' ? <CreditCard size={14} /> : (acc.bank ? acc.bank.substring(0, 2).toUpperCase() : acc.name.charAt(0))}
                    </div>
                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-white">{acc.name}</span>
                        {acc.bank && (
                          <span className="text-[8px] font-bold font-mono px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
                            {acc.bank}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {acc.type === 'credit' 
                          ? `Cartão de Crédito ${acc.dueDay ? `• Venc. dia ${acc.dueDay}` : ''}` 
                          : 'Conta Bancária'}
                      </span>
                    </div>
                  </div>
                  {selected === acc.id && <Check size={18} className="text-indigo-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              if (selected && amountPaid && paymentDate) {
                onConfirm({
                  accountId: selected,
                  amountPaid: Number(amountPaid),
                  paymentDate: paymentDate,
                  intendedStatus: 'scheduled'
                });
              }
            }}
            disabled={!selected || !amountPaid || !paymentDate}
            className="flex-1 py-4 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border border-blue-500/20 rounded-2xl font-bold font-display disabled:opacity-50 transition shrink-0"
          >
            AGENDAR
          </button>
          <button
            onClick={() => {
              if (selected && amountPaid && paymentDate) {
                onConfirm({
                  accountId: selected,
                  amountPaid: Number(amountPaid),
                  paymentDate: paymentDate,
                  intendedStatus: 'completed'
                });
              }
            }}
            disabled={!selected || !amountPaid || !paymentDate}
            className="flex-1 py-4 bg-emerald-accent text-black rounded-2xl font-bold font-display disabled:opacity-50 transition shrink-0"
          >
            CONFIRMAR
          </button>
        </div>
      </div>
    </div>
  );
}
