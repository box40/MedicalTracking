import React, { useState, useRef } from 'react';
import { Pill as PillIcon, Eye, EyeOff, Upload } from 'lucide-react';
import { apiLogin, apiRegister, setToken, apiSaveData } from '../services/api';
import { saveUserData } from '../services/storage';
import { UserData } from '../types';

interface LoginProps {
  onLogin: (email: string, userData?: UserData) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<UserData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const fn = mode === 'login' ? apiLogin : apiRegister;
      const { token, email: serverEmail } = await fn(email.trim(), password);
      setToken(token);

      const { apiGetData } = await import('../services/api');
      let userData = await apiGetData();

      // If a backup was loaded, push it to the server
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

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center mb-4">
            <PillIcon className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">MedTrack AI</h1>
          <p className="text-slate-500 mt-2">Your intelligent medication diary</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex rounded-lg overflow-hidden border border-slate-200 mb-6">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-medium transition ${mode === 'login' ? 'bg-teal-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-medium transition ${mode === 'register' ? 'bg-teal-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              required
              autoComplete="email"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password {mode === 'register' && <span className="text-slate-400 font-normal">(min. 6 characters)</span>}
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                id="password"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full px-4 py-3 pr-12 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {pendingBackup && (
            <div className="text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-4 py-2">
              Backup loaded from <strong>{pendingBackup.email}</strong> — it will be imported after you sign in.
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 mb-3">Have a backup file from a previous session?</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center text-sm text-slate-500 hover:text-teal-600 transition border border-slate-200 px-4 py-2 rounded-lg hover:border-teal-500 hover:bg-slate-50"
          >
            <Upload size={16} className="mr-2" />
            Import Backup File
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};
