import { useState } from 'react';
import { useFinanceStore } from '../store';
import { PiggyBank, ShieldCheck, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function SavingsView() {
  const { accounts, hideValues } = useFinanceStore();
  const poupancaAccount = accounts.find(a => a.name.toLowerCase() === 'poupança');
  const totalBalance = poupancaAccount ? poupancaAccount.balance : accounts.reduce((sum, acc) => sum + acc.balance, 0);
  
  const [cdiRate] = useState(10.75);
  const savedAmount = totalBalance;

  const monthlyRate = Math.pow(1 + cdiRate / 100, 1 / 12) - 1;

  const getYield = (months: number) => {
    return savedAmount * (Math.pow(1 + monthlyRate, months) - 1);
  };

  const getIRTax = (months: number) => {
    if (months <= 6) return 0.225;
    return 0.20;
  };

  const formatVal = (num: number) => {
    if (hideValues) return '••••••';
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const chartData = [];
  let currentCompounded = savedAmount;
  for (let m = 1; m <= 12; m++) {
    const yieldAmount = currentCompounded * monthlyRate;
    const tax = yieldAmount * getIRTax(m);
    const netYield = yieldAmount - tax;
    currentCompounded += netYield;
    
    chartData.push({
      name: `${m}º Mês`,
      Saldo: Math.round(currentCompounded * 100) / 100,
      Rendimento: Math.round((currentCompounded - savedAmount) * 100) / 100
    });
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#16161d] border border-white/[0.1] p-3 rounded-xl shadow-xl font-sans text-xs">
          <p className="text-zinc-400 font-mono mb-1">{label}</p>
          <p className="text-white font-medium flex justify-between gap-6 mb-1">
            <span>Saldo:</span>
            <span className="font-bold font-mono tabular-nums text-emerald-400">
              {formatVal(payload[0].value)}
            </span>
          </p>
          <p className="text-zinc-400 flex justify-between gap-6">
            <span>Rendimento Líquido:</span>
            <span className="font-mono tabular-nums text-white">
              {formatVal(payload[1] ? payload[1].value : (payload[0].value - savedAmount))}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      
      {/* Emergency Reserve Card */}
      <div className="bg-[#0f0f13] border border-white/[0.08] rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
            <PiggyBank size={20} />
          </div>
          <div>
            <p className="text-zinc-400 text-xs font-mono uppercase tracking-wider mb-0.5">Total Guardado</p>
            <h2 className="text-3xl font-bold font-mono tabular-nums text-white tracking-tight">
              {formatVal(savedAmount)}
            </h2>
          </div>
        </div>
      </div>

      {/* Projection Yield Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#0f0f13] border border-white/[0.08] hover:border-white/[0.16] rounded-2xl p-5 transition duration-150">
          <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1">Em 1 Mês</p>
          <h4 className="text-xl font-bold font-mono tabular-nums text-emerald-400">
            + {formatVal(getYield(1))}
          </h4>
          <p className="text-[11px] text-zinc-500 mt-2 font-mono">Rendimento estimado</p>
        </div>

        <div className="bg-[#0f0f13] border border-white/[0.08] hover:border-white/[0.16] rounded-2xl p-5 transition duration-150">
          <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1">Em 3 Meses</p>
          <h4 className="text-xl font-bold font-mono tabular-nums text-emerald-400">
            + {formatVal(getYield(3))}
          </h4>
          <p className="text-[11px] text-zinc-500 mt-2 font-mono">Rendimento estimado</p>
        </div>

        <div className="bg-[#0f0f13] border border-white/[0.08] hover:border-white/[0.16] rounded-2xl p-5 transition duration-150">
          <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1">Em 1 Ano</p>
          <h4 className="text-xl font-bold font-mono tabular-nums text-emerald-400">
            + {formatVal(getYield(12))}
          </h4>
          <p className="text-[11px] text-zinc-500 mt-2 font-mono">Rendimento estimado</p>
        </div>
      </div>

      {/* Info Badge */}
      <div className="bg-[#0f0f13] border border-white/[0.08] rounded-2xl p-4 flex items-start gap-3.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
          <ShieldCheck size={16} />
        </div>
        <div className="text-xs">
          <h4 className="text-white font-bold mb-0.5">Rendimento 100% CDI</h4>
          <p className="text-zinc-400 leading-relaxed">
            Seu saldo guardado rende 100% do CDI com liquidez diária e recolhimento automático de imposto de renda.
          </p>
        </div>
      </div>

      {/* Growth Simulation Chart */}
      <div className="bg-[#0f0f13] border border-white/[0.08] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Projeção em 12 Meses</h3>
          </div>
          <span className="text-[10px] text-zinc-400 bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded font-mono">100% CDI</span>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="name" 
                stroke="#71717a" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                fontFamily="JetBrains Mono"
              />
              <YAxis 
                stroke="#71717a" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                fontFamily="JetBrains Mono"
                tickFormatter={(v) => `R$ ${v}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="Saldo" 
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorSaldo)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
