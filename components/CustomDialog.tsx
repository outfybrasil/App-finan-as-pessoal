import React, { useState, useEffect } from 'react';
import { AlertTriangle, Info, HelpCircle, X, ChevronRight } from 'lucide-react';

interface CustomDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'alert' | 'confirm' | 'prompt';
  defaultValue?: string;
  placeholder?: string;
  onConfirm: (value?: string) => void;
  onCancel: () => void;
  variant?: 'primary' | 'danger' | 'warning';
}

export const CustomDialog: React.FC<CustomDialogProps> = ({
  isOpen,
  title,
  message,
  type,
  defaultValue = '',
  placeholder = '',
  onConfirm,
  onCancel,
  variant = 'primary'
}) => {
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(type === 'prompt' ? inputValue : undefined);
  };

  const colors = {
    primary: {
      bg: 'bg-emerald-500',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      shade: 'bg-emerald-500/10'
    },
    danger: {
      bg: 'bg-rose-500',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      shade: 'bg-rose-500/10'
    },
    warning: {
      bg: 'bg-amber-500',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      shade: 'bg-amber-500/10'
    }
  };

  const currentColors = colors[variant];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-slate-800 rounded-sm w-full max-w-sm shadow-[20px_20px_0px_0px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Decorator */}
        <div className={`h-1 w-full ${currentColors.bg}`} />
        
        <div className="p-8">
          <div className="flex items-start gap-5 mb-8">
            <div className={`p-3 rounded-sm ${currentColors.shade} border ${currentColors.border}`}>
              {type === 'alert' && <Info size={24} className={currentColors.text} />}
              {type === 'confirm' && <HelpCircle size={24} className={currentColors.text} />}
              {type === 'prompt' && <AlertTriangle size={24} className={currentColors.text} />}
            </div>
            
            <div className="flex-1 pt-1">
              <h3 className="text-lg font-black text-white uppercase tracking-tighter leading-none mb-3">
                {title}
              </h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          {type === 'prompt' && (
            <div className="mb-8">
              <input
                autoFocus
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-3 text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              />
            </div>
          )}

          <div className="flex gap-3">
            {(type === 'confirm' || type === 'prompt') && (
              <button
                onClick={onCancel}
                className="flex-1 border border-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-300 font-black text-[10px] uppercase tracking-[0.2em] py-4 transition-all active:translate-y-px"
              >
                CANCELAR
              </button>
            )}
            <button
              onClick={handleConfirm}
              className={`flex-1 ${currentColors.bg} hover:brightness-110 text-slate-950 font-black text-[10px] uppercase tracking-[0.2em] py-4 flex items-center justify-center gap-2 transition-all active:translate-y-px`}
            >
              {type === 'confirm' ? 'CONFIRMAR' : 'OK'}
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
        
        {/* Footer Decorator */}
        <div className="px-8 py-3 bg-slate-950/50 border-t border-slate-800/50 flex justify-between items-center">
          <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">System.Dialog.v1</span>
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-slate-700" />
            <div className="w-1 h-1 bg-slate-800" />
            <div className="w-1 h-1 bg-slate-900" />
          </div>
        </div>
      </div>
    </div>
  );
};
