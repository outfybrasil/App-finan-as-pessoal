import React, { useState } from 'react';
import { Transaction } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, TrendingUp, TrendingDown, Edit2, CheckCircle2, Clock } from 'lucide-react';

interface CalendarViewProps {
  transactions: Transaction[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onEditTransaction: (t: Transaction) => void;
  onToggleStatus?: (t: Transaction) => void;
  privacyMode: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  transactions,
  currentMonth,
  onMonthChange,
  onEditTransaction,
  onToggleStatus,
  privacyMode
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().split('T')[0]);

  // Navigation handlers
  const prevMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    onMonthChange(newDate);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
    setSelectedDate(null);
  };

  const formatMonth = (date: Date) => {
    const str = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Calendar Logic
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    return { days, firstDay };
  };

  const { days, firstDay } = getDaysInMonth(currentMonth);
  const blanks = Array(firstDay).fill(null);
  const daysArray = Array.from({ length: days }, (_, i) => i + 1);

  const filteredTransactions = transactions.filter(t => t.category !== 'Ajuste');

  const transactionsByDate = filteredTransactions.reduce((acc, t) => {
    const dateKey = t.date; // YYYY-MM-DD
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const selectedTransactions = selectedDate ? (transactionsByDate[selectedDate] || []) : [];
  
  const selectedDayBalance = selectedTransactions.reduce((acc, t) => {
      const isPaid = t.isPaid !== false;
      if (!isPaid) return acc;
      return t.type === 'income' ? acc + t.amount : acc - t.amount;
  }, 0);

  const privacyClass = privacyMode ? "blur-sm select-none" : "";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 h-full flex flex-col">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
              <CalendarIcon size={32} />
            </div>
            Calendário
          </h1>
          <p className="text-slate-500 font-bold mt-2 ml-16">Histórico visual das suas movimentações</p>
        </div>
        
        <div className="flex items-center glass p-1.5 rounded-2xl border-white/5 shadow-xl">
          <button onClick={prevMonth} className="p-3 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all active:scale-90">
            <ChevronLeft size={24} />
          </button>
          <div className="px-8 flex items-center gap-3 font-black text-xl text-white min-w-[180px] justify-center capitalize tracking-tighter">
            {formatMonth(currentMonth)}
          </div>
          <button onClick={nextMonth} className="p-3 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all active:scale-90">
            <ChevronRight size={24} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 glass-card rounded-[2.5rem] border-white/10 p-6 sm:p-8 flex flex-col shadow-2xl overflow-hidden min-h-[500px]">
           {/* Weekday Headers */}
           <div className="grid grid-cols-7 mb-8">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, i) => (
                 <div key={i} className={`text-center text-[10px] font-black uppercase tracking-[0.2em] ${i === 0 || i === 6 ? 'text-slate-600' : 'text-slate-500'}`}>
                    {day}
                 </div>
              ))}
           </div>
           
           {/* Days Grid */}
           <div className="grid grid-cols-7 gap-2 sm:gap-3 flex-1 auto-rows-fr">
              {blanks.map((_, i) => (
                 <div key={`blank-${i}`} className="bg-transparent" />
              ))}
              {daysArray.map(day => {
                 const year = currentMonth.getFullYear();
                 const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
                 const dayStr = String(day).padStart(2, '0');
                 const dateKey = `${year}-${month}-${dayStr}`;
                 
                 const dayTransactions = transactionsByDate[dateKey] || [];
                 const hasIncome = dayTransactions.some(t => t.type === 'income');
                 const hasExpense = dayTransactions.some(t => t.type === 'expense');
                 const hasPending = dayTransactions.some(t => t.isPaid === false);
                 
                 const isSelected = selectedDate === dateKey;
                 const isToday = dateKey === new Date().toISOString().split('T')[0];

                 return (
                    <button
                       key={day}
                       onClick={() => setSelectedDate(dateKey)}
                       className={`
                         relative rounded-2xl p-2 sm:p-3 flex flex-col items-center justify-start h-full transition-all border group
                         ${isSelected 
                            ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10 scale-[1.05] z-10' 
                            : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] hover:border-white/20'
                         }
                         ${isToday && !isSelected ? 'ring-2 ring-emerald-500/30' : ''}
                       `}
                    >
                       <div className="flex items-start justify-between w-full">
                           <span className={`text-sm font-black tracking-tight ${isToday ? 'text-emerald-400' : (isSelected ? 'text-white' : 'text-slate-400')}`}>
                              {day}
                           </span>
                           {hasPending && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />}
                       </div>
                       
                       {/* Indicator Dots */}
                       <div className="mt-auto flex gap-1 justify-center">
                          {hasIncome && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                          {hasExpense && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />}
                       </div>
                    </button>
                 );
              })}
           </div>
        </div>

        {/* Selected Date Details */}
        <div className="glass-card rounded-[2.5rem] border-white/10 p-8 flex flex-col max-h-[700px] lg:max-h-none overflow-hidden shadow-2xl">
             <div className="mb-8 pb-6 border-b border-white/5 bg-transparent">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Detalhes do Dia</p>
                  <CalendarIcon size={16} className="text-slate-600" />
                </div>
                <h3 className="text-2xl font-black text-white capitalize tracking-tight">
                    {selectedDate 
                      ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) 
                      : 'Selecione um dia'}
                </h3>
                {selectedDate && (
                    <div className="flex justify-between items-center mt-6 p-4 bg-white/5 rounded-2xl border border-white/5">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saldo Realizado</span>
                        <span className={`text-lg font-black tracking-tighter ${privacyClass} ${selectedDayBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {selectedDayBalance >= 0 ? '+' : ''} R$ {Math.abs(selectedDayBalance).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </span>
                    </div>
                )}
             </div>

             <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {selectedTransactions.length > 0 ? (
                    selectedTransactions.map(t => {
                        const isPaid = t.isPaid !== false;
                        return (
                        <div 
                            key={t.id}
                            className={`w-full flex items-center justify-between p-4 rounded-3xl border transition-all active:scale-[0.98] group ${
                                isPaid ? 'bg-white/[0.03] border-white/5 hover:border-white/10' : 'bg-slate-900/30 border-dashed border-white/10 opacity-70'
                            }`}
                        >
                            <div 
                                onClick={() => onEditTransaction(t)}
                                className="flex items-center gap-4 overflow-hidden flex-1 cursor-pointer"
                            >
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                    {t.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-sm font-black truncate flex items-center gap-2 tracking-tight ${isPaid ? 'text-white' : 'text-slate-500'}`}>
                                        {t.description}
                                        <Edit2 size={12} className="opacity-0 group-hover:opacity-100 text-slate-500 transition-opacity" />
                                    </p>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">{t.category}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <span className={`text-sm font-black whitespace-nowrap tracking-tight ${privacyClass} ${t.type === 'income' ? 'text-emerald-400' : 'text-white'} ${!isPaid ? 'opacity-50' : ''}`}>
                                    {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </span>
                                {onToggleStatus && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onToggleStatus(t); }}
                                        className={`p-2 rounded-xl transition-all ${
                                            isPaid 
                                            ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white shadow-lg shadow-emerald-500/10' 
                                            : 'bg-slate-800 text-slate-500 hover:text-emerald-400'
                                        }`}
                                        title={isPaid ? "Marcar como pendente" : "Marcar como pago"}
                                    >
                                        {isPaid ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                                    </button>
                                )}
                            </div>
                        </div>
                    )})
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-600 opacity-50">
                        <CalendarIcon size={48} className="mb-4" />
                        <p className="font-black text-xs uppercase tracking-widest text-center">Nenhuma movimentação<br/>neste período</p>
                    </div>
                )}
             </div>
        </div>
      </div>
    </div>
  );
};