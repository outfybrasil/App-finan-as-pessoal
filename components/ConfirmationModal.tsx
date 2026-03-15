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
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="glass-card border-white/10 rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-rose-500/10 rounded-[1.5rem] flex items-center justify-center mb-6 text-rose-500 shadow-lg shadow-rose-500/5 border border-rose-500/20">
            <AlertTriangle size={32} className="animate-pulse" />
          </div>
          
          <h3 className="text-2xl font-black text-white mb-3 tracking-tight uppercase">{title}</h3>
          <p className="text-slate-500 font-bold text-sm mb-8 leading-relaxed px-2">
            {message}
          </p>

          <div className="flex gap-4 w-full">
            <button 
              onClick={onCancel}
              className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl py-4 font-black text-xs uppercase tracking-widest transition-all border border-white/5 active:scale-95"
            >
              Agora Não
            </button>
            <button 
              onClick={onConfirm}
              className="flex-1 bg-rose-500 hover:bg-rose-400 text-white rounded-2xl py-4 font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-rose-500/20 active:scale-95"
            >
              Sim, Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};