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
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
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

  // Group transactions by date
  const transactionsByDate = transactions.reduce((acc, t) => {
    const dateKey = t.date; // YYYY-MM-DD
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);

  // Selected Date Info
  const selectedTransactions = selectedDate ? (transactionsByDate[selectedDate] || []) : [];
  
  // Day Balance: Only count PAID transactions
  const selectedDayBalance = selectedTransactions.reduce((acc, t) => {
      const isPaid = t.isPaid !== false;
      if (!isPaid) return acc;
      return t.type === 'income' ? acc + t.amount : acc - t.amount;
  }, 0);

  return (
    <div className="space-y-6 pb-20 md:pb-0 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <CalendarIcon className="text-emerald-400" size={28} /> Calendário
        </h2>
        
        <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="px-4 flex items-center gap-2 font-medium text-slate-200 min-w-[140px] justify-center capitalize">
            {formatMonth(currentMonth)}
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-slate-800 rounded-2xl border border-slate-700 p-4 sm:p-6 flex flex-col">
           {/* Weekday Headers */}
           <div className="grid grid-cols-7 mb-4">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                 <div key={i} className={`text-center text-sm font-bold ${i === 0 || i === 6 ? 'text-slate-500' : 'text-slate-300'}`}>
                    {day}
                 </div>
              ))}
           </div>
           
           {/* Days Grid */}
           <div className="grid grid-cols-7 gap-1 sm:gap-2 flex-1 auto-rows-fr">
              {blanks.map((_, i) => (
                 <div key={`blank-${i}`} className="bg-transparent" />
              ))}
              {daysArray.map(day => {
                 // Construct Date Key YYYY-MM-DD ensuring leading zeros
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
                         relative rounded-xl p-1 sm:p-2 flex flex-col items-center justify-start h-[60px] sm:h-[80px] transition-all border
                         ${isSelected 
                            ? 'bg-slate-700 border-emerald-500 shadow-lg shadow-emerald-900/20' 
                            : 'bg-slate-900/50 border-slate-800 hover:bg-slate-750 hover:border-slate-600'
                         }
                         ${isToday && !isSelected ? 'ring-1 ring-emerald-500/50' : ''}
                       `}
                    >
                       <div className="flex items-center gap-1">
                           <span className={`text-sm font-medium ${isToday ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                              {day}
                           </span>
                           {hasPending && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Pendências" />}
                       </div>
                       
                       {/* Dots Indicators */}
                       <div className="mt-auto flex gap-1">
                          {hasIncome && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow shadow-emerald-500/50" />}
                          {hasExpense && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow shadow-rose-500/50" />}
                       </div>
                    </button>
                 );
              })}
           </div>
        </div>

        {/* Selected Date Details */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 flex flex-col h-full lg:h-auto lg:min-h-0 overflow-hidden">
             <div className="mb-4 pb-4 border-b border-slate-700">
                <h3 className="text-lg font-bold text-white capitalize">
                    {selectedDate 
                      ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) 
                      : 'Selecione um dia'}
                </h3>
                {selectedDate && (
                    <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-slate-400">Balanço do dia (Realizado)</span>
                        <span className={`font-bold ${privacyMode ? 'blur-sm select-none bg-slate-700/50 text-transparent rounded px-1' : (selectedDayBalance >= 0 ? 'text-emerald-400' : 'text-rose-400')}`}>
                            {selectedDayBalance >= 0 ? '+' : ''} R$ {Math.abs(selectedDayBalance).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </span>
                    </div>
                )}
             </div>

             <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {selectedTransactions.length > 0 ? (
                    selectedTransactions.map(t => {
                        const isPaid = t.isPaid !== false;
                        return (
                        <div 
                            key={t.id}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors group text-left ${
                                isPaid ? 'bg-slate-900/50 hover:bg-slate-700/50 border-slate-700/50' : 'bg-slate-900/30 hover:bg-slate-800 border-slate-800'
                            }`}
                        >
                            <div 
                                onClick={() => onEditTransaction(t)}
                                className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer"
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'} ${!isPaid ? 'opacity-50 grayscale' : ''}`}>
                                    {t.type === 'income' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-sm font-medium truncate group-hover:text-white flex items-center gap-2 ${isPaid ? 'text-slate-200' : 'text-slate-500'}`}>
                                        {t.description}
                                        <Edit2 size={10} className="opacity-0 group-hover:opacity-100 text-slate-500" />
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">{t.category}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold whitespace-nowrap ${privacyMode ? 'blur-sm select-none bg-slate-800 text-transparent rounded px-1' : (t.type === 'income' ? 'text-emerald-400' : 'text-slate-300')} ${!isPaid ? 'opacity-50' : ''}`}>
                                    {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </span>
                                {onToggleStatus && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onToggleStatus(t); }}
                                        className={`p-1.5 rounded-md transition-colors ${
                                            isPaid 
                                            ? 'text-emerald-500 hover:bg-emerald-500/10' 
                                            : 'text-slate-500 hover:text-emerald-400 hover:bg-slate-700'
                                        }`}
                                    >
                                        {isPaid ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                                    </button>
                                )}
                            </div>
                        </div>
                    )})
                ) : (
                    <div className="text-center py-10 text-slate-500">
                        <p>Nenhuma movimentação neste dia.</p>
                        {selectedDate && (
                            <p className="text-xs mt-1">Toque no botão + para adicionar.</p>
                        )}
                    </div>
                )}
             </div>
        </div>
      </div>
    </div>
  );
};