import React from 'react';
import { Plane, MapPin, X, Check, Globe, Info } from 'lucide-react';
import { useTravelMode } from '../context/TravelContext';
import { triggerHaptic } from '../utils/haptics';

export const TravelModeSettings: React.FC = () => {
    const { isTravelModeActive, toggleTravelMode, travelEventName, setTravelEventName } = useTravelMode();

    return (
        <div className={`relative overflow-hidden p-8 rounded-[2.5rem] border transition-all duration-700 ease-in-out
            ${isTravelModeActive
                ? 'bg-blue-900/10 border-blue-500/40 shadow-[0_0_50px_rgba(59,130,246,0.1)]'
                : 'bg-slate-900/40 border-white/5 hover:border-white/10'}`}>
            
            {/* Background Map Animation or Effect */}
            {isTravelModeActive && (
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <Globe size={300} className="absolute -right-20 -bottom-20 text-blue-500 animate-spin-slow" />
                </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-5">
                    <div className={`p-5 rounded-[1.5rem] transition-all duration-500 
                        ${isTravelModeActive 
                            ? 'bg-blue-500 text-white shadow-[0_10px_25px_rgba(59,130,246,0.5)] scale-110 rotate-6' 
                            : 'bg-slate-800 text-slate-500 shadow-inner'}`}>
                        <Plane size={32} />
                    </div>
                    <div className="text-center sm:text-left">
                        <h3 className="text-2xl font-black text-white tracking-tight">Modo Viagem</h3>
                        <p className="text-slate-500 text-sm font-medium mt-1 leading-relaxed max-w-[200px]">
                            Simplifique seus lançamentos internacionais e nacionais.
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => { triggerHaptic('medium'); toggleTravelMode(); }}
                    className={`group relative w-20 h-10 rounded-full transition-all duration-500 flex items-center p-1.5
                        ${isTravelModeActive ? 'bg-blue-500' : 'bg-slate-700'}`}
                >
                    <div className={`w-7 h-7 bg-white rounded-full shadow-2xl transform transition-all duration-500 flex items-center justify-center
                        ${isTravelModeActive ? 'translate-x-10 scale-110' : 'translate-x-0'}`}>
                        {isTravelModeActive && <Check size={14} className="text-blue-500" />}
                    </div>
                </button>
            </div>

            {isTravelModeActive && (
                <div className="mt-10 pt-8 border-t border-blue-500/20 animate-in slide-in-from-top-4 fade-in duration-700 relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <Info size={14} className="text-blue-400" />
                        <label className="text-xs font-black text-blue-300 uppercase tracking-[0.2em]">
                            Destino Atual / Evento
                        </label>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 group">
                            <div className="absolute inset-0 bg-blue-500/10 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                            <MapPin size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" />
                            <input
                                type="text"
                                value={travelEventName}
                                onChange={(e) => setTravelEventName(e.target.value)}
                                placeholder="Para onde vamos?"
                                className="w-full bg-blue-950/40 border-2 border-blue-500/20 rounded-2xl py-4 pl-12 pr-6 text-white text-lg font-bold placeholder-blue-400/30 focus:outline-none focus:border-blue-500/50 transition-all"
                            />
                        </div>
                        
                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center">
                            < Globe size={24} className="text-blue-400 animate-pulse" />
                        </div>
                    </div>
                    
                    <div className="mt-6 flex items-start gap-3 bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                        <p className="text-xs text-blue-300 font-medium leading-relaxed">
                            Ativado! Todas as novas despesas serão automaticamente categorizadas como <span className="text-white font-bold">"Viagem"</span> e marcadas com <span className="text-white font-bold">"{travelEventName || 'Evento'}"</span>.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
