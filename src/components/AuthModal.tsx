import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck,
  Chrome,
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

  const handleProviderAction = async (endpoint: string) => {
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, phone: email }) });
      const data = await res.json().catch(() => null);
      setMessage(data?.message || data?.error || 'Authentication provider setup is required.');
    } catch {
      setMessage('Authentication gateway is unavailable.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl rounded-3xl bg-slate-950 border border-white/10 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left Visual Branding Panel */}
        <div className="hidden md:flex flex-col justify-between p-8 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-950 border-r border-white/5 relative overflow-hidden">
          <div className="relative z-10">
            <div className="mb-4"><AuraLogo size={38} /></div>
            <p className="text-xs text-slate-400 leading-relaxed">
              YOUR LIVING AI UNIVERSE
            </p>
          </div>

          <div className="relative z-10 my-8 flex justify-center">
            <AIOrb state="IDLE" size="md" showLabel={false} />
          </div>

          <div className="relative z-10 space-y-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Secure server-side sessions</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>AURA Intelligence Core</span>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">
              {mode === 'login' ? 'Welcome back to AURA' : mode === 'register' ? 'Create your AURA account' : mode === 'forgot' ? 'Reset password' : mode === 'emailOtp' ? 'Email OTP' : 'Mobile OTP'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Your projects, memory, permissions, and quota stay tied to your account.
            </p>

            {message && (
              <div className="mt-3 p-2.5 rounded-xl bg-cyan-950/50 border border-cyan-500/40 text-xs text-cyan-300">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              {mode === 'register' && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase">Your Name</label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase">Work Email</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {mode !== 'forgot' && mode !== 'emailOtp' && mode !== 'mobileOtp' && (
                <div>
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase">Password</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-[10px] text-cyan-400 hover:underline"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-90 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition"
              >
                <span>{isLoading ? 'Checking...' : mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-800 pt-3">
              <button type="button" onClick={() => handleProviderAction('/api/auth/google')} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-2 py-2 text-[11px] font-semibold text-slate-200 hover:border-cyan-400/50"><Chrome className="h-3.5 w-3.5" /> Google</button>
              <button type="button" onClick={() => setMode('mobileOtp')} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-2 py-2 text-[11px] font-semibold text-slate-200 hover:border-cyan-400/50"><Smartphone className="h-3.5 w-3.5" /> Mobile OTP</button>
              <button type="button" onClick={() => setMode('emailOtp')} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-2 py-2 text-[11px] font-semibold text-slate-200 hover:border-cyan-400/50"><KeyRound className="h-3.5 w-3.5" /> Email OTP</button>
            </div>
          </div>

          <div className="mt-4 pt-3 text-center text-xs text-slate-400">
            {mode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button onClick={() => setMode('register')} className="text-cyan-400 font-semibold hover:underline">
                  Create Account
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="text-cyan-400 font-semibold hover:underline">
                  Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
