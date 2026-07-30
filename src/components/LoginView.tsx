import { useState, FormEvent, useEffect } from 'react';
import { useFinanceStore } from '../store';
import { AlertCircle, ArrowRight, ShieldCheck, Wallet, CheckCircle2, Loader2, Mail, Key, Lock, Eye, EyeOff, Undo2, HelpCircle } from 'lucide-react';
import { supabaseService, isSupabaseConfigured } from '../lib/supabase';

// Fallback master reset code in case they ever forget their passwords
const MASTER_RESET_CODE = 'AdminFinance2026!';

export default function LoginView() {
  const { loginUser } = useFinanceStore();
  
  // State variables
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  
  const [step, setStep] = useState<'email' | 'password' | 'create_password' | 'recover_password'>('email');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Handle Email verification
  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail.includes('@')) {
      setError('Por favor, insira um endereço de e-mail válido.');
      setIsLoading(false);
      return;
    }

    if (isSupabaseConfigured) {
      const user = await supabaseService.getUserByEmail(normalizedEmail);
      if (user) {
        setStep('password');
      } else {
        setStep('create_password');
      }
    } else {
      // Check if password exists in local storage fallback
      const storedPassword = localStorage.getItem(`finance_pwd_${normalizedEmail}`);
      if (storedPassword) {
        setStep('password');
      } else {
        setStep('create_password');
      }
    }
    setIsLoading(false);
  };

  // Step 2: Handle password sign in
  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    const normalizedEmail = email.toLowerCase().trim();
    let isCorrect = false;
    let name = normalizedEmail.split('@')[0];

    if (isSupabaseConfigured) {
      const user = await supabaseService.getUserByEmail(normalizedEmail);
      if (user && user.password_hash === password) {
        isCorrect = true;
        name = user.name || name;
      }
    } else {
      const storedPassword = localStorage.getItem(`finance_pwd_${normalizedEmail}`);
      if (password === storedPassword) {
        isCorrect = true;
      }
    }

    if (isCorrect) {
      const success = loginUser(normalizedEmail, name, undefined);
      if (success) {
        setSuccessMsg(`Bem-vindo de volta, ${name}! Redirecionando...`);
      } else {
        setError('Erro interno ao iniciar sessão.');
      }
    } else {
      setError('Senha incorreta. Por favor, tente novamente.');
    }
    setIsLoading(false);
  };

  // Step 3: Handle password creation
  const handleCreatePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('A senha deve conter pelo menos uma letra maiúscula.');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('A senha deve conter pelo menos um número.');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      setError('A senha deve conter pelo menos um caractere especial.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setIsLoading(true);
    const normalizedEmail = email.toLowerCase().trim();
    const name = normalizedEmail.split('@')[0];
    
    if (isSupabaseConfigured) {
      const created = await supabaseService.createUser(normalizedEmail, name, password);
      if (!created) {
        setError('Erro ao criar usuário no banco de dados.');
        setIsLoading(false);
        return;
      }
    } else {
      // Save password locally
      localStorage.setItem(`finance_pwd_${normalizedEmail}`, password);
    }
    
    const success = loginUser(normalizedEmail, name, undefined);
    
    if (success) {
      setSuccessMsg(`Senha cadastrada com sucesso! Bem-vindo, ${name}.`);
    } else {
      setError('Erro ao iniciar sessão.');
    }
    setIsLoading(false);
  };

  // Step 4: Handle password recovery / reset
  const handleRecoverPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (recoveryCode !== MASTER_RESET_CODE) {
      setError('Código de recuperação inválido.');
      return;
    }

    if (password.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('A nova senha deve conter pelo menos uma letra maiúscula.');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('A nova senha deve conter pelo menos um número.');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      setError('A nova senha deve conter pelo menos um caractere especial.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setIsLoading(true);
    const normalizedEmail = email.toLowerCase().trim();
    const name = normalizedEmail.split('@')[0];
    
    if (isSupabaseConfigured) {
      const updated = await supabaseService.updateUserPassword(normalizedEmail, password);
      if (!updated) {
        setError('Erro ao redefinir a senha no banco de dados.');
        setIsLoading(false);
        return;
      }
    } else {
      // Reset and save new password locally
      localStorage.setItem(`finance_pwd_${normalizedEmail}`, password);
    }
    
    const success = loginUser(normalizedEmail, name, undefined);
    
    if (success) {
      setSuccessMsg(`Sua senha foi redefinida com sucesso! Bem-vindo, ${name}.`);
    } else {
      setError('Erro ao iniciar sessão com a nova senha.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0a0a0a] via-[#121212] to-[#1a1a1a] relative overflow-hidden">
      {/* Background abstract decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-accent/5 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>

      <div className="w-full max-w-md glass-card rounded-[32px] p-8 relative border border-white/5 shadow-2xl z-10 space-y-8 animate-fade-in">
        {/* App Logo & Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-accent/10 border border-emerald-accent/20 rounded-2xl flex items-center justify-center text-emerald-accent mx-auto shadow-inner">
            <Wallet size={32} />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black font-display tracking-tight text-white">Minhas finanças</h1>
            <p className="text-xs text-gray-400 font-medium">Controle financeiro de alto nível</p>
          </div>
        </div>

        {/* Security Warning Message */}
        <div className="bg-emerald-accent/5 border border-emerald-accent/10 rounded-2xl p-4 flex gap-3 text-left">
          <ShieldCheck size={18} className="text-emerald-accent shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed text-gray-400">
            <span className="font-bold text-white block mb-0.5">Acesso Exclusivo & Seguro</span>
            Apenas e-mails autorizados que definirem sua senha pessoal segura podem acessar as tabelas financeiras deste sistema.
          </div>
        </div>

        {/* Dynamic Alerts */}
        {error && (
          <div role="alert" aria-live="assertive" className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-4 flex gap-3 text-left text-xs animate-shake">
            <AlertCircle size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div role="status" aria-live="polite" className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl p-4 flex gap-3 text-left text-xs animate-fade-in">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: EMAIL REQUEST */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-5 text-left">
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold">
                Identifique-se com seu E-mail Autorizado
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  id="login-email"
                  type="email"
                  required
                  placeholder="Seu e-mail (ex: luisgustavo...)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#161616] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-accent/50 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-emerald-accent text-black hover:bg-emerald-accent-hover font-bold py-3 px-4 rounded-xl text-xs transition duration-200 cursor-pointer shadow-md"
            >
              <span>Continuar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: PASSWORD ENTRY */}
        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-5 text-left">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-emerald-accent uppercase tracking-widest font-bold">
                E-mail Verificado
              </span>
              <p className="text-sm font-semibold text-white">{email}</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="login-password" className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold block">
                Digite sua Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoFocus
                  placeholder="Sua senha secreta"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#161616] border border-white/10 rounded-xl py-3 pl-10 pr-10 text-xs text-white focus:outline-none focus:border-emerald-accent/50 transition-colors"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-emerald-accent text-black hover:bg-emerald-accent-hover font-bold py-3 px-4 rounded-xl text-xs transition duration-200 cursor-pointer shadow-md"
            >
              <Key className="w-4 h-4" />
              <span>Entrar no Sistema</span>
            </button>

            <div className="flex justify-between items-center text-[11px] pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setPassword('');
                  setError(null);
                }}
                className="text-gray-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Undo2 size={12} />
                <span>Usar outro e-mail</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('recover_password');
                  setPassword('');
                  setConfirmPassword('');
                  setError(null);
                }}
                className="text-gray-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <HelpCircle size={12} />
                <span>Esqueceu a senha?</span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: CREATE PASSWORD */}
        {step === 'create_password' && (
          <form onSubmit={handleCreatePasswordSubmit} className="space-y-5 text-left">
            <div className="p-4 bg-emerald-accent/[0.03] border border-emerald-accent/10 rounded-2xl space-y-2">
              <p className="text-[10px] font-mono text-emerald-accent uppercase tracking-widest font-bold">
                Primeiro Acesso Registrado!
              </p>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Nenhuma senha local está cadastrada para o e-mail <strong className="text-white font-semibold">{email}</strong> neste dispositivo. Crie uma senha pessoal segura agora:
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="create-password" className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold block">
                  Defina sua Nova Senha (mín. 8 carac., Maiús., Nro e Espec.)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <input
                    id="create-password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Sua nova senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#161616] border border-white/10 rounded-xl py-3 pl-10 pr-10 text-xs text-white focus:outline-none focus:border-emerald-accent/50 transition-colors"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="create-password-confirmation" className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold block">
                  Confirme sua Nova Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <input
                    id="create-password-confirmation"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Digite novamente a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#161616] border border-white/10 rounded-xl py-3 pl-10 pr-10 text-xs text-white focus:outline-none focus:border-emerald-accent/50 transition-colors"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-emerald-accent text-black hover:bg-emerald-accent-hover font-bold py-3 px-4 rounded-xl text-xs transition duration-200 cursor-pointer shadow-md"
            >
              <span>Salvar Senha & Acessar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('email');
                setPassword('');
                setConfirmPassword('');
                setError(null);
              }}
              className="text-gray-400 hover:text-white flex items-center gap-1 transition-colors text-[11px] cursor-pointer block text-center w-full pt-1"
            >
              <Undo2 size={12} className="inline mr-1" />
              <span>Voltar ao início</span>
            </button>
          </form>
        )}

        {/* STEP 4: RECOVER PASSWORD */}
        {step === 'recover_password' && (
          <form onSubmit={handleRecoverPasswordSubmit} className="space-y-5 text-left">
            <div className="p-4 bg-amber-500/[0.03] border border-amber-500/15 rounded-2xl space-y-2">
              <p className="text-[10px] font-mono text-amber-500 uppercase tracking-widest font-bold">
                Redefinição de Senha de Segurança
              </p>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Esqueceu a senha criada? Insira o código mestre do sistema (<span className="font-mono text-emerald-accent underline select-all">AdminFinance2026!</span>) para cadastrar uma nova senha:
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="recovery-code" className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold block">
                  Código Mestre de Recuperação
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <input
                    id="recovery-code"
                    type="text"
                    required
                    placeholder="Ex: AdminFinance2026!"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    className="w-full bg-[#161616] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-emerald-accent/50 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="recovery-password" className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold block">
                  Cadastre sua Nova Senha (mín. 8 carac., Maiús., Nro e Espec.)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <input
                    id="recovery-password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Nova senha secreta"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#161616] border border-white/10 rounded-xl py-3 pl-10 pr-10 text-xs text-white focus:outline-none focus:border-emerald-accent/50 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="recovery-password-confirmation" className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold block">
                  Confirme a Nova Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <input
                    id="recovery-password-confirmation"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Digite novamente a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#161616] border border-white/10 rounded-xl py-3 pl-10 pr-10 text-xs text-white focus:outline-none focus:border-emerald-accent/50 transition-colors"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-emerald-accent text-black hover:bg-emerald-accent-hover font-bold py-3 px-4 rounded-xl text-xs transition duration-200 cursor-pointer shadow-md"
            >
              <span>Redefinir Senha & Entrar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('password');
                setRecoveryCode('');
                setPassword('');
                setConfirmPassword('');
                setError(null);
              }}
              className="text-gray-400 hover:text-white flex items-center gap-1 transition-colors text-[11px] cursor-pointer block text-center w-full pt-1"
            >
              <Undo2 size={12} className="inline mr-1" />
              <span>Voltar ao Login</span>
            </button>
          </form>
        )}

        <div className="text-center">
          <p className="text-[9px] text-gray-600 font-mono">
            Ambiente seguro homologado Google AI Studio
          </p>
        </div>
      </div>
    </div>
  );
}
