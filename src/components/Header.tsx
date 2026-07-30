import { useFinanceStore } from '../store';
import { Eye, EyeOff, Plus, Download, Trash2 } from 'lucide-react';

interface HeaderProps {
  onOpenNewTransaction: () => void;
}

export default function Header({ onOpenNewTransaction }: HeaderProps) {
  const {
    activeTab,
    hideValues,
    toggleHideValues,
    marketItems,
    clearMarketList,
    transactions,
    accounts,
    categories,
    categoryBudgets,
    user,
  } = useFinanceStore();

  const handleExportData = () => {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      user: user ? { email: user.email, name: user.name } : null,
      data: { transactions, accounts, categories, marketItems, categoryBudgets },
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const dataUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = dataUrl;
    downloadAnchor.download = `minhas_financas_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(dataUrl);
  };

  const handleClearAll = () => {
    if (confirm("Deseja realmente apagar todos os dados e restaurar as configurações padrão?")) {
      const appKeys = Object.keys(localStorage).filter(
        (key) => key.startsWith('finance_') || key.startsWith('finance-') || key === 'account_colors'
      );
      appKeys.forEach((key) => localStorage.removeItem(key));
      window.location.reload();
    }
  };

  const renderHeaderContent = () => {
    switch (activeTab) {
      case 'inicio':
        return (
          <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-4">
            <div>
              <h1 className="text-2xl font-bold font-display tracking-tight text-white">Visão Geral</h1>
              <p className="text-zinc-400 text-xs mt-0.5">Resumo financeiro e controle de caixa do mês.</p>
            </div>
            
            <div className="flex items-center gap-2 self-end md:self-center">
              <button 
                onClick={toggleHideValues}
                className="p-2.5 bg-[#16161d] border border-white/[0.08] rounded-xl text-zinc-400 hover:text-white hover:border-white/20 transition duration-150 active:scale-[0.97]"
                title={hideValues ? "Mostrar Valores" : "Ocultar Valores"}
              >
                {hideValues ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              
              <button 
                onClick={handleExportData}
                className="p-2.5 bg-[#16161d] border border-white/[0.08] rounded-xl text-zinc-400 hover:text-white hover:border-white/20 transition duration-150 active:scale-[0.97]"
                title="Exportar Backup"
              >
                <Download size={16} />
              </button>

              <button 
                onClick={onOpenNewTransaction}
                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-3.5 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition duration-150 active:scale-[0.97] font-display shadow-sm"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Nova Transação</span>
              </button>
            </div>
          </div>
        );

      case 'historico':
        return (
          <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-4">
            <div>
              <h1 className="text-2xl font-bold font-display tracking-tight text-white">Histórico</h1>
              <p className="text-zinc-400 text-xs mt-0.5">Registro detalhado de todas as movimentações</p>
            </div>
            
            <div className="flex items-center gap-2 self-end md:self-center">
              <button 
                onClick={toggleHideValues}
                className="p-2.5 bg-[#16161d] border border-white/[0.08] rounded-xl text-zinc-400 hover:text-white hover:border-white/20 transition duration-150 active:scale-[0.97]"
                title={hideValues ? "Mostrar Valores" : "Ocultar Valores"}
              >
                {hideValues ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              
              <button 
                onClick={onOpenNewTransaction}
                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-3.5 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition duration-150 active:scale-[0.97] font-display shadow-sm"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Nova Transação</span>
              </button>
            </div>
          </div>
        );

      case 'calendario':
        return (
          <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-4">
            <div>
              <h1 className="text-2xl font-bold font-display tracking-tight text-white">Calendário Financeiro</h1>
              <p className="text-zinc-400 text-xs mt-0.5">Visualização cronológica por datas e vencimentos</p>
            </div>
            
            <div className="flex items-center gap-2 self-end md:self-center">
              <button 
                onClick={toggleHideValues}
                className="p-2.5 bg-[#16161d] border border-white/[0.08] rounded-xl text-zinc-400 hover:text-white hover:border-white/20 transition duration-150 active:scale-[0.97]"
              >
                {hideValues ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              
              <button 
                onClick={onOpenNewTransaction}
                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-3.5 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition duration-150 active:scale-[0.97] font-display shadow-sm"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Nova Transação</span>
              </button>
            </div>
          </div>
        );

      case 'poupanca':
        return (
          <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-4">
            <div>
              <h1 className="text-2xl font-bold font-display tracking-tight text-white">Poupança & Investimentos</h1>
              <p className="text-zinc-400 text-xs mt-0.5">Acompanhamento da reserva de emergência e rendimentos</p>
            </div>
            
            <div className="flex items-center gap-2 self-end md:self-center">
              <button 
                onClick={toggleHideValues}
                className="p-2.5 bg-[#16161d] border border-white/[0.08] rounded-xl text-zinc-400 hover:text-white hover:border-white/20 transition duration-150 active:scale-[0.97]"
              >
                {hideValues ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        );

      case 'lista':
        return (
          <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-4">
            <div>
              <h1 className="text-2xl font-bold font-display tracking-tight text-white">Lista de Mercado</h1>
              <p className="text-zinc-400 text-xs mt-0.5">Organização de compras e controle de preços</p>
            </div>
            
            {marketItems.length > 0 && (
              <div className="flex items-center gap-2 self-end md:self-center">
                <button 
                  onClick={clearMarketList}
                  className="px-3 py-1.5 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-1.5 transition duration-150 active:scale-[0.97] font-medium"
                >
                  <Trash2 size={13} />
                  <span>Limpar Lista</span>
                </button>
              </div>
            )}
          </div>
        );

      case 'relatorios':
        return (
          <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-4">
            <div>
              <h1 className="text-2xl font-bold font-display tracking-tight text-white">Relatórios & Análise</h1>
              <p className="text-zinc-400 text-xs mt-0.5">Balanço anual e comparativo por categoria</p>
            </div>
            
            <div className="flex items-center gap-2 self-end md:self-center">
              <button 
                onClick={toggleHideValues}
                className="p-2.5 bg-[#16161d] border border-white/[0.08] rounded-xl text-zinc-400 hover:text-white hover:border-white/20 transition duration-150 active:scale-[0.97]"
              >
                {hideValues ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        );

      case 'ajustes':
        return (
          <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-4">
            <div>
              <h1 className="text-2xl font-bold font-display tracking-tight text-white">Configurações do App</h1>
              <p className="text-zinc-400 text-xs mt-0.5">Gestão de contas, categorias e dados locais</p>
            </div>
            
            <div className="flex items-center gap-2 self-end md:self-center">
              <button 
                onClick={handleClearAll}
                className="px-3 py-1.5 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-1.5 transition duration-150 active:scale-[0.97] font-medium"
                title="Apaga todas as modificações"
              >
                <Trash2 size={13} />
                <span>Resetar Dados</span>
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <header className="w-full border-b border-white/[0.08] bg-[#070709]/90 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {renderHeaderContent()}
      </div>
    </header>
  );
}
