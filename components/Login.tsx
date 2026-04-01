import React, { useState, useRef } from 'react';
import { Pill as PillIcon, Upload } from 'lucide-react';
import { saveUserData } from '../services/storage';

interface LoginProps {
  onLogin: (email: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim().length > 3) {
      onLogin(email.trim());
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.email && Array.isArray(json.logs)) {
           // Save to storage
           saveUserData(json);
           // Trigger login with the imported email
           onLogin(json.email);
        } else {
           alert("Invalid backup file. Please upload a valid MedTrack backup.");
        }
      } catch (err) {
        alert("Error reading backup file.");
      }
    };
    reader.readAsText(file);
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            Access My Diary
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100">
           <div className="text-center">
             <p className="text-xs text-slate-400 mb-3">Lost data due to a refresh? Import your backup:</p>
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
    </div>
  );
};
