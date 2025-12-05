import React from 'react';
import { Button } from './Button';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mb-4 text-rose-500">
            <AlertTriangle size={24} />
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            {message}
          </p>

          <div className="flex gap-3 w-full">
            <Button 
              variant="secondary" 
              fullWidth 
              onClick={onCancel}
            >
              Cancelar
            </Button>
            <Button 
              variant="danger" 
              fullWidth 
              onClick={onConfirm}
            >
              Sim, Excluir
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};