import { useState } from 'react';
import SelectAccountModal from './SelectAccountModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { useFinanceStore } from '../store';
import { ChevronLeft, ChevronRight, Edit3, Trash2, Calendar as CalendarIcon, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { Transaction } from '../types';

interface CalendarViewProps {
  onEditTransaction: (t: Transaction) => void;
  onOpenNewTransactionWithDate: (dateStr: string) => void;
}

export default function CalendarView({ onEditTransaction, onOpenNewTransactionWithDate }: CalendarViewProps) {
  const { 
    transactions, 
    accounts, 
    hideValues,
    currentMonth, 
    currentYear, 
    setCurrentMonthYear, 
    selectedDate, 
    setSelectedDate,
    deleteTransaction,
    editTransaction,
    payTransaction
  } = useFinanceStore();

  const monthsNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const daysOfWeek = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

  // Shifters for Month Navigator
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonthYear(11, currentYear - 1);
    } else {
      setCurrentMonthYear(currentMonth - 1, currentYear);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonthYear(0, currentYear + 1);
    } else {
      setCurrentMonthYear(currentMonth + 1, currentYear);
    }
  };

  // Helper to format currency
  const formatVal = (num: number) => {
    if (hideValues) return '••••••';
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Generate calendar days for selected Month and Year
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay(); // 0 is Sunday, 1 is Monday...
  };

  const totalDays = getDaysInMonth(currentMonth, currentYear);
  const startDayOffset = getFirstDayOfMonth(currentMonth, currentYear);

  // Generate grid array (empty padding cells + actual day cells)
  const calendarCells = [];
  for (let i = 0; i < startDayOffset; i++) {
    calendarCells.push({ type: 'empty', key: `empty-${i}` });
  }
  for (let day = 1; day <= totalDays; day++) {
    const paddedMonth = String(currentMonth + 1).padStart(2, '0');
    const paddedDay = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${paddedMonth}-${paddedDay}`;
    calendarCells.push({
      type: 'day',
      day,
      dateStr,
      key: `day-${day}`
    });
  }

  // Get selected day transactions
  const selectedDayTransactions = transactions.filter(t => t.date === selectedDate);

  // Helper: check transactions for a specific date and return indicators
  const getDateIndicators = (dateStr: string) => {
    const dayTrans = transactions.filter(t => t.date === dateStr);
    
    return {
      hasIncome: dayTrans.some(t => t.type === 'income'),
      hasExpense: dayTrans.some(t => t.type === 'expense'),
      hasSpecial: dayTrans.some(t => t.isFixed || t.isInstallment)
    };
  };

  // Quick actions
  const [transactionToComplete, setTransactionToComplete] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  
  const handleToggleStatus = (t: Transaction) => {
    if (t.status === 'pending' || t.status === 'scheduled') {
      setTransactionToComplete(t);
    } else {
      editTransaction({
        ...t,
        status: 'pending'
      });
    }
  };

  const handleConfirmPaymentAccount = (data: { accountId: string, amountPaid: number, paymentDate: string, intendedStatus?: 'completed' | 'scheduled' }) => {
    if (transactionToComplete) {
      payTransaction(transactionToComplete.id, data.accountId, data.amountPaid, data.paymentDate, data.intendedStatus);
      setTransactionToComplete(null);
    }
  };

  const handleDelete = (t: Transaction) => {
    setTransactionToDelete(t);
  };

  const handleConfirmDelete = (option: 'only-this' | 'this-and-future' | 'all-group') => {
    if (transactionToDelete) {
      deleteTransaction(transactionToDelete.id, option);
      setTransactionToDelete(null);
    }
  };

  const getFormattedSelectedDay = () => {
    const dateParts = selectedDate.split('-');
    if (dateParts.length !== 3) return '';
    const day = parseInt(dateParts[2]);
    const month = parseInt(dateParts[1]) - 1;
    const year = parseInt(dateParts[0]);
    return `${day} de ${monthsNames[month]} de ${year}`;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      
      {/* Month Navigator */}
      <div className="flex items-center justify-between glass-card p-2.5 rounded-2xl">
        <button 
          onClick={handlePrevMonth}
          className="p-2 hover:bg-dark-bg rounded-xl text-gray-400 hover:text-white transition"
        >
          <ChevronLeft size={20} />
        </button>
        
        <span className="font-display font-bold text-white text-base">
          {monthsNames[currentMonth]} de {currentYear}
        </span>
        
        <button 
          onClick={handleNextMonth}
          className="p-2 hover:bg-dark-bg rounded-xl text-gray-400 hover:text-white transition"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Calendar Grid Container */}
      <div className="glass-card rounded-[24px] sm:rounded-[28px] p-3 sm:p-5 shadow-xl">
        {/* Day Header */}
        <div className="grid grid-cols-7 gap-1 text-center mb-4">
          {daysOfWeek.map(day => (
            <span key={day} className="text-[10px] font-mono text-gray-500 font-bold tracking-wider py-1">
              {day}
            </span>
          ))}
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarCells.map((cell) => {
            if (cell.type === 'empty') {
              return <div key={cell.key} className="aspect-square"></div>;
            }

            const { dateStr, day } = cell;
            const isSelected = selectedDate === dateStr;
            
            // Get dots/indicators
            const { hasIncome, hasExpense, hasSpecial } = getDateIndicators(dateStr || '');

            return (
              <button
                key={cell.key}
                onClick={() => setSelectedDate(dateStr || '')}
                className={`aspect-square rounded-xl sm:rounded-2xl flex flex-col items-center justify-between p-0.5 xs:p-1 sm:p-1.5 transition relative select-none outline-none ${
                  isSelected 
                    ? 'bg-emerald-accent text-black font-extrabold shadow-lg shadow-emerald-accent/15' 
                    : 'glass-card-interactive text-gray-400 hover:text-white'
                }`}
              >
                {/* Special highlight for today's physical date */}
                <span className="text-xs font-mono font-bold leading-none mt-1">
                  {day}
                </span>

                {/* Dot indicators */}
                <div className="flex gap-0.5 sm:gap-1 justify-center items-center h-2 mb-0.5">
                  {hasSpecial && (
                    <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${isSelected ? 'bg-black' : 'bg-amber-500'}`}></span>
                  )}
                  {hasIncome && (
                    <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${isSelected ? 'bg-black/60' : 'bg-emerald-accent'}`}></span>
                  )}
                  {hasExpense && (
                    <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${isSelected ? 'bg-black/40' : 'bg-pink-accent'}`}></span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Transactions Detail list */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest font-mono">Detalhes do Dia</h3>
            <p className="text-xs text-gray-500 mt-0.5">{getFormattedSelectedDay()}</p>
          </div>
          
          <button
            onClick={() => onOpenNewTransactionWithDate(selectedDate)}
            className="px-3 py-1.5 bg-emerald-accent/10 hover:bg-emerald-accent/15 border border-emerald-accent/15 text-emerald-accent rounded-xl text-xs flex items-center gap-1 font-display transition"
          >
            <Plus size={12} strokeWidth={2.5} />
            <span>Lançar hoje</span>
          </button>
        </div>

        {selectedDayTransactions.length === 0 ? (
          <div className="glass-card border-dashed rounded-3xl py-10 px-6 text-center">
            <CalendarIcon size={28} className="text-gray-700 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Nenhum lançamento cadastrado para este dia.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {selectedDayTransactions.map(t => {
              const account = accounts.find(a => a.id === t.accountId);
              const isExpense = t.type === 'expense';
              const isCompleted = t.status === 'completed';

              return (
                <div 
                  key={t.id}
                  className="glass-card-interactive rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 sm:mt-0 ${
                      isExpense 
                        ? 'bg-pink-accent/5 text-pink-accent border-pink-accent/10' 
                        : 'bg-emerald-accent/5 text-emerald-accent border-emerald-accent/10'
                    }`}>
                      {isExpense ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-white tracking-tight">{t.description}</h4>
                        {t.isFixed && (
                          <span className="text-[9px] font-mono bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded-md border border-indigo-500/15">Fixo</span>
                        )}
                        {t.isInstallment && t.installmentInfo && (
                          <span className="text-[9px] font-mono bg-pink-accent/10 text-pink-accent px-1.5 py-0.5 rounded-md border border-pink-accent/15">
                            {t.installmentInfo.current}/{t.installmentInfo.total}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-gray-500 font-display">{t.category}</span>
                        {account && (
                          <>
                            <span className="text-gray-600 text-[10px]">•</span>
                            <span 
                              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md"
                              style={{ color: account.color, backgroundColor: `${account.color}12` }}
                            >
                              {account.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-white/5 pt-3 sm:border-t-0 sm:pt-0">
                    <div className="text-left sm:text-right flex flex-col items-start sm:items-end">
                      {t.originalAmount && t.originalAmount !== t.amount && (
                        <span className="text-[10px] text-gray-500 line-through mb-0.5" title={`Valor original: ${formatVal(t.originalAmount)}`}>
                          {formatVal(t.originalAmount)}
                        </span>
                      )}
                      <p className={`text-sm font-black font-display ${isExpense ? 'text-pink-accent' : 'text-emerald-accent'}`}>
                        {isExpense ? '-' : '+'} {formatVal(t.amount)}
                      </p>
                      
                      <button 
                        onClick={() => handleToggleStatus(t)}
                        className={`text-[9px] font-mono font-bold mt-0.5 px-1.5 py-0.5 rounded-md transition ${
                          t.status === 'completed'
                            ? 'bg-emerald-accent/10 text-emerald-accent border border-emerald-accent/15'
                            : t.status === 'scheduled'
                              ? 'bg-blue-500/10 text-blue-500 border border-blue-500/15'
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/15'
                        }`}
                        title="Alternar situação"
                      >
                        {t.status === 'completed' ? 'PAGO' : t.status === 'scheduled' ? 'AGENDADO' : 'PENDENTE'}
                      </button>
                    </div>

                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEditTransaction(t)}
                        className="p-2 hover:bg-dark-bg text-gray-400 hover:text-white rounded-lg transition"
                        title="Editar"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="p-2 hover:bg-dark-bg text-gray-400 hover:text-pink-accent rounded-lg transition"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    
      <ConfirmDeleteModal
        isOpen={!!transactionToDelete}
        transaction={transactionToDelete}
        onClose={() => setTransactionToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      <SelectAccountModal
        isOpen={!!transactionToComplete}
        transaction={transactionToComplete}
        onClose={() => setTransactionToComplete(null)}
        onConfirm={handleConfirmPaymentAccount}
      />
    </div>
  );
}
