import React, { useEffect, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

type AuthMode = 'signin' | 'signup' | 'recovery';

interface AuthPageProps {
  onAuthenticated: () => void;
}

const friendlyAuthError = (message: string) => {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (normalized.includes('email not confirmed')) return 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.';
  if (normalized.includes('user already registered')) return 'Este e-mail já possui uma conta. Tente entrar.';
  if (normalized.includes('password')) return 'A senha precisa atender aos requisitos de segurança do Supabase.';
  if (normalized.includes('rate limit')) return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
  if (normalized.includes('invalid email')) return 'Digite um e-mail válido.';
  return message || 'Não foi possível concluir a operação.';
};

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) return;

    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    if (type === 'recovery') {
      setMode('recovery');
      setRecoveryReady(true);
      setMessage('Digite uma nova senha para sua conta.');
    }
  }, []);

  const resetFeedback = () => {
    setError('');
    setMessage('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    resetFeedback();
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
        onAuthenticated();
        return;
      }

      if (mode === 'signup') {
        if (!name.trim()) {
          setError('Digite seu nome.');
          return;
        }
        if (password.length < 6) {
          setError('A senha precisa ter pelo menos 6 caracteres.');
          return;
        }
        if (password !== confirmPassword) {
          setError('As senhas não coincidem.');
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { name: name.trim() },
            emailRedirectTo: window.location.origin,
          },
        });

        if (signUpError) throw signUpError;

        if (data.session) {
          setMessage('Conta criada com sucesso.');
          onAuthenticated();
        } else {
          setMessage('Conta criada. Enviamos um e-mail para confirmar seu endereço de e-mail.');
          setPassword('');
          setConfirmPassword('');
        }
        return;
      }

      if (!recoveryReady) {
        await sendRecoveryEmail();
        return;
      }

      if (password.length < 6) {
        setError('A senha precisa ter pelo menos 6 caracteres.');
        return;
      }

      const { error: resetError } = await supabase.auth.updateUser({ password });
      if (resetError) throw resetError;
      setMessage('Senha alterada com sucesso. Agora você já pode entrar.');
      setMode('signin');
      setRecoveryReady(false);
      setPassword('');
      setConfirmPassword('');
    } catch (authError) {
      setError(friendlyAuthError(authError instanceof Error ? authError.message : ''));
    } finally {
      setLoading(false);
    }
  };

  const sendRecoveryEmail = async () => {
    if (!supabase) return;
    if (!email.trim()) {
      setError('Digite seu e-mail para receber o link de recuperação.');
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    if (resetError) throw resetError;
    setMessage('Enviamos um link de recuperação para seu e-mail.');
  };

  const title = mode === 'signup' ? 'Criar conta' : mode === 'recovery' ? 'Nova senha' : 'Entrar';
  const subtitle = mode === 'signup'
    ? 'Crie sua conta para preparar o Constância para a sincronização.'
    : mode === 'recovery'
      ? 'Escolha uma nova senha para continuar.'
      : 'Entre na sua conta do Constância.';

  return (
    <main className="min-h-screen bg-surface-bg text-gray-100 flex items-center justify-center px-4 py-8 safe-top-content">
      <div className="w-full max-w-sm">
        <div className="text-center mb-7">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-subtle border border-brand-border flex items-center justify-center text-brand shadow-lg shadow-brand/10">
            <Sparkles size={25} />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Constância</h1>
          <p className="text-xs text-gray-500 mt-1">Seu espaço para manter o foco.</p>
        </div>

        <section className="bg-surface-card border border-surface-border rounded-3xl p-5 shadow-2xl shadow-black/20">
          {mode !== 'recovery' && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-surface-bg rounded-xl mb-5">
              <button
                type="button"
                onClick={() => { setMode('signin'); resetFeedback(); }}
                className={`py-2.5 rounded-lg text-xs font-semibold transition-colors ${mode === 'signin' ? 'bg-brand text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); resetFeedback(); }}
                className={`py-2.5 rounded-lg text-xs font-semibold transition-colors ${mode === 'signup' ? 'bg-brand text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Criar conta
              </button>
            </div>
          )}

          <div className="mb-5">
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{subtitle}</p>
          </div>

          {message && (
            <div className="mb-4 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-xs flex gap-2 items-start">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <label className="block">
                <span className="label-base">Nome</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="input-base"
                  placeholder="Seu nome"
                  autoComplete="name"
                />
              </label>
            )}

            <label className="block">
              <span className="label-base">E-mail</span>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="input-base pl-9"
                  placeholder="voce@email.com"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            {(mode !== 'recovery' || recoveryReady) && (
              <label className="block">
                <span className="label-base">Senha</span>
                <div className="relative">
                  <LockKeyhole size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="input-base pl-9 pr-10"
                    placeholder="Sua senha"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
            )}

            {mode === 'signup' && (
              <label className="block">
                <span className="label-base">Confirmar senha</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="input-base"
                  placeholder="Digite a senha novamente"
                  autoComplete="new-password"
                  required
                />
              </label>
            )}

            {mode === 'recovery' && (
              <p className="text-[11px] text-gray-600 leading-relaxed">{recoveryReady ? 'Defina uma nova senha para sua conta.' : 'Enviaremos um link para o seu e-mail. Abra o link para criar uma nova senha.'}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full button-primary disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Aguarde...' : mode === 'signup' ? 'Criar conta' : mode === 'recovery' ? (recoveryReady ? 'Salvar nova senha' : 'Enviar link') : 'Entrar'}
            </button>
          </form>

          {mode === 'signin' && (
            <button type="button" onClick={() => { setMode('recovery'); resetFeedback(); }} className="w-full mt-4 text-xs text-gray-500 hover:text-brand transition-colors">
              Esqueci minha senha
            </button>
          )}

          {mode === 'recovery' && (
            <button type="button" onClick={() => { setMode('signin'); resetFeedback(); }} className="w-full mt-4 text-xs text-gray-500 hover:text-brand transition-colors">
              Voltar para entrar
            </button>
          )}
        </section>

        <p className="text-center text-[10px] text-gray-700 mt-5">Seus dados continuam locais nesta fase. A sincronização em nuvem será ativada na próxima etapa.</p>
      </div>
    </main>
  );
};
