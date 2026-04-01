import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Type, Mail, Save, AlertTriangle, Check } from 'lucide-react';
import { UserData } from '../types';

interface SettingsProps {
  user: UserData;
  onUpdateEmail: (newEmail: string) => void;
  onUpdateFontSize: (size: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, onUpdateEmail, onUpdateFontSize }) => {
  const [email, setEmail] = useState(user.email);
  const [fontSize, setFontSize] = useState(user.settings?.fontSize || '1.25rem');
  const [customVal, setCustomVal] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
      // Sync local state if user settings change externally
      if (user.settings?.fontSize) {
          setFontSize(user.settings.fontSize);
          
          // If the current font size is not one of the presets, populate custom box
          if (!['1.25rem', '1.75rem', '2.25rem'].includes(user.settings.fontSize)) {
              setCustomVal(user.settings.fontSize.replace('rem', ''));
          } else {
              setCustomVal('');
          }
      }
  }, [user.settings?.fontSize]);

  const handleEmailSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email !== user.email) {
      if (window.confirm("Changing your email will migrate your data to the new email address. Are you sure?")) {
        onUpdateEmail(email);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      }
    }
  };

  const handlePresetChange = (size: string) => {
    setFontSize(size);
    setCustomVal('');
    onUpdateFontSize(size);
  };

  const handleCustomChange = (val: string) => {
      setCustomVal(val);
      if (val && !isNaN(parseFloat(val))) {
          const newSize = `${val}rem`;
          setFontSize(newSize);
          onUpdateFontSize(newSize);
      }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center space-x-2">
          <SettingsIcon className="text-slate-600" size={20} />
          <h3 className="font-bold text-lg text-slate-800">Application Settings</h3>
        </div>
        
        <div className="p-6 space-y-8">
          
          {/* Font Size Section */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 mb-2">
                <Type className="text-teal-600" size={20} />
                <h4 className="font-semibold text-slate-800">Base Font Size</h4>
             </div>
             <p className="text-slate-500 text-sm mb-4">
                 Adjust the base scale of the application. This will resize all text including reports and diaries.
             </p>
             
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button 
                  onClick={() => handlePresetChange('1.25rem')}
                  className={`p-4 rounded-xl border-2 transition text-center relative ${fontSize === '1.25rem' ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  {fontSize === '1.25rem' && <div className="absolute top-2 right-2 text-teal-600"><Check size={16}/></div>}
                  <span className="text-xl block mb-1 font-medium">Standard</span>
                  <span className="text-xs text-slate-400">1.25 rem</span>
                </button>
                <button 
                  onClick={() => handlePresetChange('1.75rem')}
                  className={`p-4 rounded-xl border-2 transition text-center relative ${fontSize === '1.75rem' ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  {fontSize === '1.75rem' && <div className="absolute top-2 right-2 text-teal-600"><Check size={16}/></div>}
                  <span className="text-3xl block mb-1 font-medium">Large</span>
                  <span className="text-xs text-slate-400">1.75 rem</span>
                </button>
                <button 
                  onClick={() => handlePresetChange('2.25rem')}
                  className={`p-4 rounded-xl border-2 transition text-center relative ${fontSize === '2.25rem' ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  {fontSize === '2.25rem' && <div className="absolute top-2 right-2 text-teal-600"><Check size={16}/></div>}
                  <span className="text-4xl block mb-1 font-medium">Extra Large</span>
                  <span className="text-xs text-slate-400">2.25 rem</span>
                </button>
             </div>

             <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                 <label className="block text-sm font-semibold text-slate-600 mb-2">Custom Value (rem)</label>
                 <div className="flex items-center gap-2">
                     <input 
                        type="number" 
                        step="0.1"
                        min="0.5"
                        max="5.0"
                        value={customVal}
                        onChange={(e) => handleCustomChange(e.target.value)}
                        placeholder="e.g. 1.5"
                        className="w-32 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                     />
                     <span className="text-slate-500 font-medium">rem</span>
                 </div>
                 <p className="text-xs text-slate-400 mt-2">Enter a number to set a custom root font size.</p>
             </div>
          </div>

          <hr className="border-slate-100" />

          {/* Email Section */}
          <form onSubmit={handleEmailSave} className="space-y-4">
             <div className="flex items-center gap-2 mb-2">
                <Mail className="text-indigo-600" size={20} />
                <h4 className="font-semibold text-slate-800">Account Email</h4>
             </div>
             <p className="text-slate-500 text-sm mb-4">
               Update the email address associated with your logs. 
               <span className="flex items-center gap-1 text-orange-500 mt-1">
                 <AlertTriangle size={12} />
                 <span>Warning: This changes your login credential.</span>
               </span>
             </p>

             <div className="flex gap-2">
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button 
                  type="submit"
                  disabled={email === user.email}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                >
                  <Save size={18} />
                  Save
                </button>
             </div>
             {isSaved && <p className="text-green-600 text-sm font-medium animate-pulse">Email updated successfully!</p>}
          </form>

        </div>
      </div>
    </div>
  );
};
