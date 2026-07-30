import { X } from 'lucide-react';
import { Transaction } from '../types';
import { useDialogAccessibility } from '../hooks/useDialogAccessibility';

interface Props {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onConfirm: (deleteOption: 'only-this' | 'this-and-future' | 'all-group') => void;
}

export default function ConfirmDeleteModal({ isOpen, transaction, onClose, onConfirm }: Props) {
  const dialogRef = useDialogAccessibility(isOpen, onClose);
  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        aria-describedby="confirm-delete-description"
        tabIndex={-1}
        className="w-full max-w-sm glass-card rounded-2xl p-6 shadow-2xl relative flex flex-col"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="confirm-delete-title" className="text-lg font-bold text-white font-display">Confirmar Exclusão</h2>
          <button onClick={onClose} aria-label="Fechar confirmação" className="min-h-11 min-w-11 p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 transition">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        
        <div id="confirm-delete-description" className="mb-6 text-sm text-gray-300">
          {transaction.isInstallment ? (
            <p>Este lançamento faz parte de um parcelamento. Selecione como deseja excluir:</p>
          ) : (
            <p>Tem certeza que deseja excluir este lançamento?</p>
          )}
        </div>

        <div className="space-y-3">
          {transaction.isInstallment ? (
            <>
              <button
                onClick={() => onConfirm('all-group')}
                className="w-full py-4 bg-pink-accent/10 text-pink-accent hover:bg-pink-accent/20 border border-pink-accent/20 rounded-2xl font-bold font-display transition shrink-0"
              >
                EXCLUIR TODO O GRUPO
              </button>
              <button
                onClick={() => onConfirm('only-this')}
                className="w-full py-4 bg-white/5 text-white hover:bg-white/10 rounded-2xl font-bold font-display transition shrink-0"
              >
                EXCLUIR APENAS ESTE
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onConfirm('only-this')}
                className="w-full py-4 bg-pink-accent/10 text-pink-accent hover:bg-pink-accent/20 border border-pink-accent/20 rounded-2xl font-bold font-display transition shrink-0"
              >
                SIM, EXCLUIR
              </button>
              <button
                onClick={onClose}
                className="w-full py-4 bg-white/5 text-white hover:bg-white/10 rounded-2xl font-bold font-display transition shrink-0"
              >
                CANCELAR
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
