import React, { useState } from 'react';
import { account } from '../lib/appwrite';
import { ID } from 'appwrite';
import { Button } from './Button';
import { Wallet, Mail, Lock, Loader2, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        await account.create(ID.unique(), email, password);
        await account.createEmailPasswordSession(email, password);
        setMessage('Conta criada com sucesso! Você está logado.');
        window.location.reload();
      } else {
        await account.createEmailPasswordSession(email, password);
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-[30%] right-[10%] w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[80px]" />
      </div>

      <div className="glass-card border-white/10 p-10 sm:p-14 rounded-[3rem] shadow-2xl w-full max-w-lg relative z-10 animate-in fade-in zoom-in-95 duration-700 shadow-[0_0_80px_rgba(0,0,0,0.5)]">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-[2rem] mb-8 shadow-2xl shadow-emerald-500/40 border-4 border-white/20 animate-bounce-slow">
            <Wallet className="text-white w-12 h-12" />
          </div>
          <h1 className="text-5xl font-black text-white mb-3 tracking-tighter">Fluxo</h1>
          <p className="text-slate-400 font-bold tracking-tight text-lg">Gestão financeira pessoal <span className="text-emerald-400">premium</span>.</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Endereço de E-mail</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors">
                <Mail size={22} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@exemplo.com"
                className="w-full bg-white/[0.03] border-2 border-white/5 rounded-[1.5rem] px-6 py-5 pl-14 text-white font-bold focus:border-emerald-500 focus:bg-white/[0.05] outline-none transition-all placeholder:text-slate-700"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Senha Segura</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors">
                <Lock size={22} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/[0.03] border-2 border-white/5 rounded-[1.5rem] px-6 py-5 pl-14 pr-14 text-white font-bold focus:border-emerald-500 focus:bg-white/[0.05] outline-none transition-all placeholder:text-slate-700"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors p-2"
              >
                {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-sm font-bold animate-in slide-in-from-top-2">
              <AlertCircle size={20} className="shrink-0" />
              {error}
            </div>
          )}

          {message && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400 text-sm font-bold animate-in slide-in-from-top-2">
              <AlertCircle size={20} className="shrink-0" />
              {message}
            </div>
          )}

          <button 
            disabled={loading} 
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white rounded-[1.5rem] py-5 font-black text-sm uppercase tracking-[0.2em] transition-all shadow-2xl shadow-emerald-500/20 active:scale-[0.98] group mt-4 overflow-hidden relative"
          >
            {loading ? (
              <Loader2 className="animate-spin mx-auto" size={24} />
            ) : (
              <span className="flex items-center justify-center gap-3">
                {isSignUp ? 'Criar Conta' : 'Entrar na Plataforma'}
                <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
              </span>
            )}
          </button>
        </form>

        <div className="mt-10 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setMessage(null);
            }}
            className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-emerald-400 transition-colors py-2 px-4"
          >
            {isSignUp
              ? 'Já possui uma conta? Realizar Login'
              : 'Novo por aqui? Criar conta agora'}
          </button>
        </div>
      </div>
      
      {/* Subtle bottom text */}
      <div className="absolute bottom-8 left-0 w-full text-center">
        <p className="text-slate-700 font-bold text-[10px] uppercase tracking-[0.3em]">Ambiente Seguro & Criptografado</p>
      </div>
    </div>
  );
};