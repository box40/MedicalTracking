import React, { useState, useRef, useEffect } from 'react';
import { Pill as PillIcon, Eye, EyeOff, Upload, Mail } from 'lucide-react';
import { apiLogin, apiRegister, setToken, apiSaveData, apiForgotPassword, apiResetPassword, apiGetProviders } from '../services/api';
import { saveUserData } from '../services/storage';
import { UserData } from '../types';

interface LoginProps {
  onLogin: (email: string, userData?: UserData) => void;
  resetToken?: string;
  oauthError?: string;
}

type Screen = 'login' | 'forgot' | 'reset';

export const Login: React.FC<LoginProps> = ({ onLogin, resetToken, oauthError }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [screen, setScreen] = useState<Screen>(resetToken ? 'reset' : 'login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(oauthError ? 'Social sign-in failed. Please try again or use email/password.' : '');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<UserData | null>(null);

  const [providers, setProviders] = useState({ google: false, apple: false, yahoo: false });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiGetProviders().then(setProviders).catch(() => {});
  }, []);

  // ── Backup file import ──────────────────────────────────────────────────────

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.email && Array.isArray(json.logs)) {
          setPendingBackup(json);
          setEmail(json.email);
          setError('');
          setInfo('Backup loaded — sign in to import it.');
        } else {
          setError('Invalid backup file. Please upload a valid MedTrack backup.');
        }
      } catch {
        setError('Could not read backup file.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // ── Sign in / Register ──────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setInfo('');
    setLoading(true);
    try {
      const fn = mode === 'login' ? apiLogin : apiRegister;
      const { token, email: serverEmail } = await fn(email.trim(), password);
      setToken(token);
      const { apiGetData } = await import('../services/api');
      let userData = await apiGetData();
      if (pendingBackup) {
        const merged: UserData = { ...pendingBackup, email: serverEmail };
        await apiSaveData(merged);
        userData = merged;
      }
      saveUserData(userData);
      onLogin(serverEmail, userData);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password ─────────────────────────────────────────────────────────

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setInfo('');
    setLoading(true);
    try {
      const res = await apiForgotPassword(email.trim());
      if (res.resetLink) {
        // Dev / no-SMTP mode: show link directly
        setInfo(`No email server configured. Share this reset link with the user:\n${res.resetLink}`);
      } else {
        setInfo(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // ── Reset password ──────────────────────────────────────────────────────────

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setInfo('');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    try {
      const { token, email: serverEmail } = await apiResetPassword(resetToken!, password);
      setToken(token);
      const { apiGetData } = await import('../services/api');
      const userData = await apiGetData();
      saveUserData(userData);
      onLogin(serverEmail, userData);
    } catch (err: any) {
      setError(err.message || 'This reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render helpers ──────────────────────────────────────────────────────────

  const SocialButton = ({ provider, label, icon }: { provider: string; label: string; icon: React.ReactNode }) => (
    <a
      href={`/api/auth/${provider}`}
      className="flex items-center justify-center gap-2 w-full border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 font-medium py-2.5 px-4 rounded-lg transition text-sm"
    >
      {icon}
      {label}
    </a>
  );

  const anySocial = providers.google || providers.apple || providers.yahoo;

  // ── Reset password screen ───────────────────────────────────────────────────

  if (screen === 'reset') {
    return (
      <Shell>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Set a new password</h2>
        <p className="text-sm text-slate-500 mb-6">Choose a new password for your account.</p>
        <form onSubmit={handleReset} className="space-y-4">
          <PasswordField label="New Password" value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw(v => !v)} autoComplete="new-password" />
          <PasswordField label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword} show={showPw} onToggle={() => setShowPw(v => !v)} autoComplete="new-password" />
          <Feedback error={error} info={info} />
          <SubmitBtn loading={loading} label="Update Password" />
        </form>
      </Shell>
    );
  }

  // ── Forgot password screen ──────────────────────────────────────────────────

  if (screen === 'forgot') {
    return (
      <Shell>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Reset your password</h2>
        <p className="text-sm text-slate-500 mb-6">Enter your email and we'll send a reset link.</p>
        <form onSubmit={handleForgot} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition" />
          </div>
          <Feedback error={error} info={info} />
          <SubmitBtn loading={loading} label="Send Reset Link" />
        </form>
        <button onClick={() => { setScreen('login'); setError(''); setInfo(''); }}
          className="mt-4 w-full text-sm text-slate-500 hover:text-teal-600 transition text-center">
          ← Back to Sign In
        </button>
      </Shell>
    );
  }

  // ── Main login / register screen ────────────────────────────────────────────

  return (
    <Shell>
      {/* Mode toggle */}
      <div className="flex rounded-lg overflow-hidden border border-slate-200 mb-6">
        {(['login', 'register'] as const).map(m => (
          <button key={m} type="button" onClick={() => { setMode(m); setError(''); setInfo(''); }}
            className={`flex-1 py-2.5 text-sm font-medium transition ${mode === m ? 'bg-teal-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
            {m === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
          <input type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition" />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-slate-700">
              Password {mode === 'register' && <span className="text-slate-400 font-normal">(min. 6 characters)</span>}
            </label>
            {mode === 'login' && (
              <button type="button" onClick={() => { setScreen('forgot'); setError(''); setInfo(''); }}
                className="text-xs text-teal-600 hover:underline">Forgot password?</button>
            )}
          </div>
          <PasswordField value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw(v => !v)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </div>

        {pendingBackup && (
          <div className="text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-4 py-2">
            Backup loaded from <strong>{pendingBackup.email}</strong> — will be imported after sign in.
          </div>
        )}

        <Feedback error={error} info={info} />
        <SubmitBtn loading={loading} label={mode === 'login' ? 'Sign In' : 'Create Account'} />
      </form>

      {/* Social login */}
      {anySocial && (
        <div className="mt-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">or continue with</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <div className="space-y-2">
            {providers.google && (
              <SocialButton provider="google" label="Sign in with Google"
                icon={<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>}
              />
            )}
            {providers.apple && (
              <SocialButton provider="apple" label="Sign in with Apple"
                icon={<svg width="18" height="18" viewBox="0 0 814 1000"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-150.3-93.8c-51.8-65.8-94.8-168-94.8-265.5C0 414.5 88.5 310 213 310c63.3 0 116.2 42.8 155.5 42.8 37.4 0 96-45.5 168.1-45.5 32.5 0 108.2 8.6 160.1 69.9zm-71.4-207.7c30.5-36.2 52.7-86.5 52.7-136.8 0-7.1-.6-14.3-1.9-20.1-49.7 1.9-109.5 33.1-145.9 75.5-27.2 31.2-53.6 81.6-53.6 132.6 0 7.7 1.3 15.4 1.9 17.9 3.2.6 8.4 1.3 13.6 1.3 45.1 0 102.8-29.9 133.2-70.4z"/></svg>}
              />
            )}
            {providers.yahoo && (
              <SocialButton provider="yahoo" label="Sign in with Yahoo"
                icon={<Mail size={18} className="text-purple-600" />}
              />
            )}
          </div>
        </div>
      )}

      {/* Backup import */}
      <div className="mt-6 pt-5 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-400 mb-3">Have a backup file from a previous session?</p>
        <button type="button" onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center text-sm text-slate-500 hover:text-teal-600 transition border border-slate-200 px-4 py-2 rounded-lg hover:border-teal-500 hover:bg-slate-50">
          <Upload size={16} className="mr-2" />
          Import Backup File
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" className="hidden" />
      </div>
    </Shell>
  );
};

// ── Small shared sub-components ───────────────────────────────────────────────

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center mb-4">
          <PillIcon className="text-white w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800">MedTrack AI</h1>
        <p className="text-slate-500 mt-2">Your intelligent medication diary</p>
      </div>
      {children}
    </div>
  </div>
);

const PasswordField: React.FC<{
  label?: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete?: string;
}> = ({ label, value, onChange, show, onToggle, autoComplete }) => (
  <div>
    {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
    <div className="relative">
      <input type={show ? 'text' : 'password'} required autoComplete={autoComplete}
        placeholder="••••••••" value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-3 pr-12 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition" />
      <button type="button" onClick={onToggle} tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  </div>
);

const Feedback: React.FC<{ error: string; info: string }> = ({ error, info }) => (
  <>
    {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 whitespace-pre-wrap">{error}</p>}
    {info  && <p className="text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-4 py-2 whitespace-pre-wrap">{info}</p>}
  </>
);

const SubmitBtn: React.FC<{ loading: boolean; label: string }> = ({ loading, label }) => (
  <button type="submit" disabled={loading}
    className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
    {loading ? 'Please wait…' : label}
  </button>
);
