import React from 'react';
import { X, Trash2, Layers } from 'lucide-react';
import { Button } from './Button';

interface DeleteSeriesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDeleteOne: () => void;
    onDeleteAll: () => void;
}

export const DeleteSeriesModal: React.FC<DeleteSeriesModalProps> = ({
    isOpen,
    onClose,
    onDeleteOne,
    onDeleteAll
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="glass-card border-white/10 rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h3 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
                        <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500">
                            <Trash2 size={24} />
                        </div>
                        Excluir Repetição
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-all hover:bg-white/5 rounded-xl">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-10 space-y-6">
                    <p className="text-sm font-bold text-slate-500 leading-relaxed text-center">
                        Esta transação faz parte de uma série. Como deseja prosseguir com a exclusão?
                    </p>

                    <div className="space-y-4">
                        <button
                            onClick={onDeleteOne}
                            className="w-full flex items-center gap-4 p-5 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-white/20 transition-all group active:scale-[0.98]"
                        >
                            <div className="bg-white/5 p-3 rounded-2xl group-hover:bg-white/10 transition-colors">
                                <Trash2 size={24} className="text-slate-400 group-hover:text-white" />
                            </div>
                            <div className="text-left">
                                <p className="font-black text-white text-sm tracking-tight">Apenas esta</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Exclui somente hoje</p>
                            </div>
                        </button>

                        <button
                            onClick={onDeleteAll}
                            className="w-full flex items-center gap-4 p-5 rounded-3xl bg-rose-500/5 border border-rose-500/10 hover:border-rose-500/50 transition-all group active:scale-[0.98]"
                        >
                            <div className="bg-rose-500/10 p-3 rounded-2xl group-hover:bg-rose-500/20 transition-colors">
                                <Layers size={24} className="text-rose-500" />
                            </div>
                            <div className="text-left">
                                <p className="font-black text-rose-400 text-sm tracking-tight">Esta e as próximas</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Série completa</p>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="p-8 bg-black/20 flex justify-center">
                    <button 
                        onClick={onClose}
                        className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-white transition-colors"
                    >
                        Cancelar Operação
                    </button>
                </div>
            </div>
        </div>
    );
};
