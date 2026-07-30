import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2 } from 'lucide-react';
import { useFinanceStore } from '../store';
import ReactMarkdown from 'react-markdown';

export default function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: 'Olá! Sou seu assistente de gestão financeira. Como posso ajudar na análise do seu caixa hoje?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const { transactions, accounts, categories, currentMonth, currentYear, categoryBudgets } = useFinanceStore();

  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = message;
    setMessage('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessage,
          context: {
            currentMonth: currentMonth + 1,
            currentYear,
            accounts: accounts.map(a => ({ name: a.name, balance: a.balance })),
            categoryBudgets,
            categories: categories.map(c => ({ name: c.name, type: c.type })),
            transactions: transactions.slice(0, 50).map(t => ({
              description: t.description,
              amount: t.amount,
              type: t.type,
              category: t.category,
              date: t.date,
              status: t.status
            })),
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha na resposta do servidor');
      }

      const data = await response.json();
      setChatHistory(prev => [...prev, { role: 'ai', text: data.text || 'Ocorreu um erro ao processar a resposta.' }]);
    } catch (error: any) {
      console.error(error);
      setChatHistory(prev => [...prev, { role: 'ai', text: error.message || 'Não foi possível conectar ao assistente no momento.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 md:bottom-8 right-6 w-12 h-12 bg-[#0f0f13] border border-white/[0.16] hover:border-emerald-500/50 text-emerald-400 rounded-2xl flex items-center justify-center shadow-xl transition duration-150 active:scale-[0.96] z-50"
        title="Assistente Financeiro"
      >
        <Bot size={22} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 md:bottom-8 right-6 w-[90vw] sm:w-[380px] h-[520px] bg-[#0f0f13] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.08] bg-[#16161d]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Bot size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-sm font-display text-white">Assistente Financeiro</h3>
            <p className="text-[10px] text-zinc-400 font-mono">Conectado ao seu caixa</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1.5 hover:bg-white/[0.06] rounded-xl text-zinc-400 hover:text-white transition"
        >
          <X size={18} />
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {chatHistory.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col max-w-[88%] ${msg.role === 'user' ? 'self-end items-end ml-auto' : 'self-start items-start'}`}
          >
            <div
              className={`p-3 rounded-xl text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-emerald-500 text-zinc-950 font-medium rounded-br-none'
                  : 'bg-[#16161d] text-zinc-200 border border-white/[0.08] rounded-bl-none'
              }`}
            >
              {msg.role === 'ai' ? (
                <div className="markdown-body prose prose-invert prose-xs max-w-none">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="self-start max-w-[88%] p-3 bg-[#16161d] text-zinc-300 rounded-xl rounded-bl-none border border-white/[0.08] flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            <span className="text-xs text-zinc-400">Analisando dados...</span>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-white/[0.08] bg-[#16161d]">
        <div className="relative flex items-center">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite sua dúvida financeira..."
            className="w-full bg-[#0f0f13] border border-white/[0.08] rounded-xl py-2.5 pl-3 pr-10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            className="absolute right-2 p-1.5 text-emerald-400 hover:text-emerald-300 disabled:text-zinc-600 transition"
          >
            <Send size={15} />
          </button>
        </div>
      </form>
    </div>
  );
}
