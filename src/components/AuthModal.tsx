import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck,
  Smartphone,
  KeyRound
} from 'lucide-react';
import { AIOrb } from './AIOrb';
import { AuraLogo } from './aura/AuraLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (userData: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'emailOtp' | 'mobileOtp'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const endpoint = mode === 'login'
      ? '/api/auth/login' 
      : mode === 'register' 
      ? '/api/auth/register' 
      : mode === 'forgot' ? '/api/auth/forgot-password' : mode === 'emailOtp' ? '/api/auth/email-otp' : '/api/auth/mobile-otp';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });

      const contentType = res.headers.get('content-type') || '';
      const data = (res.ok && contentType.includes('application/json')) 
        ? await res.json() 
        : (contentType.includes('application/json') ? await res.json() : null);

      if (res.ok && data) {
        if (mode === 'forgot') {
          setMessage(data.message || 'Password reset requested.');
        } else {
          onLoginSuccess(data.user);
          onClose();
        }
      } else {
        setMessage((data && data.error) || 'Authentication failed');
      }
    } catch (err: any) {
      setMessage('Network error communicating with authentication gateway.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderAction = (endpoint: string) => {
    setIsLoading(true);
    setMessage(null);
    window.location.assign(`${endpoint}?returnTo=/?auth=success`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#03050b]/95 px-4 py-6 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-1/4 h-80 w-80 rounded-full bg-cyan-500/[0.06] blur-[110px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-indigo-500/[0.07] blur-[130px]" />
      </div>

      <div className="relative w-full max-w-[880px] overflow-hidden rounded-[32px] border border-white/[0.07] bg-[#090c14]/90 shadow-[0_40px_140px_rgba(0,0,0,0.7)]">
        <button onClick={onClose} aria-label="Close"
          className="absolute right-5 top-5 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.035] text-slate-500 transition hover:bg-white/[0.08] hover:text-white">
          <X className="h-4 w-4" />
        </button>

        <div className="grid min-h-[570px] md:grid-cols-[1fr_1.05fr]">
          <section className="relative hidden overflow-hidden border-r border-white/[0.06] px-10 py-10 md:flex md:flex-col">
            <div className="relative z-10">
              <AuraLogo size={46} />
              <div className="mt-14">
                <div className="mb-4 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.9)]" />
                  <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-cyan-300/80">AURA AI</span>
                </div>
                <h2 className="text-[38px] font-semibold leading-[1.08] tracking-[-0.03em] text-white">
                  Intelligence,<br />made personal.
                </h2>
                <p className="mt-5 max-w-[285px] text-sm leading-6 text-slate-500">
                  Talk naturally. Build, create and get real work done with AURA.
                </p>
              </div>
            </div>

            <div className="relative mt-auto flex items-center justify-center py-4">
              <div className="absolute h-56 w-56 rounded-full border border-cyan-400/[0.08] animate-pulse" />
              <div className="absolute h-72 w-72 rounded-full border border-indigo-400/[0.05]" />
              <AIOrb state="IDLE" size="md" showLabel={false} />
            </div>

            <div className="relative z-10 mt-6 flex items-center gap-2 text-[10px] text-slate-600">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-400/60" />
              <span>Private, account-based access</span>
            </div>
          </section>

          <section className="flex flex-col justify-between px-6 py-9 sm:px-12">
            <div>
              <div className="mb-10 md:hidden">
                <AuraLogo size={42} />
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-600">Welcome</span>
                <h3 className="mt-2 text-[28px] font-semibold tracking-[-0.02em] text-white">
                  {mode === 'login' ? 'Continue to AURA.'
                    : mode === 'register' ? 'Create your AURA.'
                    : mode === 'forgot' ? 'Reset your password.'
                    : mode === 'emailOtp' ? 'Verify your email.'
                    : 'Verify your mobile.'}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {mode === 'login'
                    ? 'Sign in to continue where you left off.'
                    : mode === 'register'
                    ? 'Create your personal AI workspace.'
                    : 'Complete the secure verification step.'}
                </p>
              </div>

              {message && (
                <div className="mt-6 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.05] px-4 py-3 text-xs leading-5 text-cyan-200">
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                {mode === 'register' && (
                  <div>
                    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-600" />
                      <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
                        className="h-11 w-full rounded-xl border border-white/[0.07] bg-white/[0.025] pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-400/40 focus:bg-white/[0.04]" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-600" />
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                      className="h-11 w-full rounded-xl border border-white/[0.07] bg-white/[0.025] pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-400/40 focus:bg-white/[0.04]" />
                  </div>
                </div>

                {mode !== 'forgot' && mode !== 'emailOtp' && mode !== 'mobileOtp' && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Password</label>
                      {mode === 'login' && (
                        <button type="button" onClick={() => setMode('forgot')} className="text-[11px] text-slate-500 transition hover:text-cyan-300">
                          Forgot?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-600" />
                      <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password"
                        className="h-11 w-full rounded-xl border border-white/[0.07] bg-white/[0.025] pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-400/40 focus:bg-white/[0.04]" />
                    </div>
                  </div>
                )}

                <button type="submit" disabled={isLoading}
                  className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 text-sm font-semibold text-[#031017] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60">
                  <span>{isLoading ? 'Please wait…'
                    : mode === 'login' ? 'Continue'
                    : mode === 'register' ? 'Create account'
                    : mode === 'forgot' ? 'Send reset link'
                    : 'Continue'}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </form>

              {mode === 'login' && (
                <>
                  <div className="my-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/[0.06]" />
                    <span className="text-[9px] uppercase tracking-[0.25em] text-slate-700">or</span>
                    <div className="h-px flex-1 bg-white/[0.06]" />
                  </div>

                  <button type="button" onClick={() => handleProviderAction('/api/auth/google')} disabled={isLoading}
                    className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-white/[0.09] bg-white/[0.025] text-sm font-medium text-slate-200 transition hover:border-white/[0.18] hover:bg-white/[0.055] disabled:opacity-60">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
  <path fill="#4285F4" d="M21.35 12.27c0-.71-.06-1.39-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.44h3.14c1.84-1.69 2.91-4.18 2.91-7.21Z"/>
  <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.35l-3.14-2.44c-.87.58-1.98.93-3.31.93-2.55 0-4.71-1.72-5.49-4.04H3.27v2.52A9.75 9.75 0 0 0 12 21.75Z"/>
  <path fill="#FBBC05" d="M6.51 13.85A5.86 5.86 0 0 1 6.2 12c0-.64.11-1.26.31-1.85V7.63H3.27A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.06 1.02 4.37l3.24-2.52Z"/>
  <path fill="#EA4335" d="M12 6.11c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.16 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.73 5.38l3.24 2.52C7.29 7.83 9.45 6.11 12 6.11Z"/>
</svg>
                    <span>Continue with Google</span>
                  </button>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setMode('mobileOtp')}
                      className="h-10 rounded-xl border border-white/[0.06] bg-transparent text-xs text-slate-500 transition hover:border-white/[0.12] hover:text-slate-300">
                      Mobile OTP
                    </button>
                    <button type="button" onClick={() => setMode('emailOtp')}
                      className="h-10 rounded-xl border border-white/[0.06] bg-transparent text-xs text-slate-500 transition hover:border-white/[0.12] hover:text-slate-300">
                      Email OTP
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="mt-9 border-t border-white/[0.06] pt-5 text-center text-xs text-slate-600">
              {mode === 'login' ? (
                <p>New to AURA? <button onClick={() => setMode('register')} className="ml-1 text-slate-300 transition hover:text-cyan-300">Create an account</button></p>
              ) : (
                <p>Already have an account? <button onClick={() => setMode('login')} className="ml-1 text-slate-300 transition hover:text-cyan-300">Sign in</button></p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
