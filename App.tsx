import React, { useState, useEffect } from 'react';
import { LayoutDashboard, BriefcaseMedical, Bot, Plus, LogOut, Download, BarChart3, Settings as SettingsIcon, AlertTriangle } from 'lucide-react';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { PillCabinet } from './components/PillCabinet';
import { LogModal } from './components/LogModal';
import { AIAssistant } from './components/AIAssistant';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { loadUserData, saveUserData, getLastSessionEmail, clearSession, deleteUserData } from './services/storage';
import { UserData, AppTab, LogEntry, Pill } from './types';

function App() {
  const [user, setUser] = useState<UserData | null>(() => {
    const lastEmail = getLastSessionEmail();
    if (lastEmail) {
      return loadUserData(lastEmail);
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [isExampleMode, setIsExampleMode] = useState(false);
  const [originalUser, setOriginalUser] = useState<UserData | null>(null);

  // Apply Font Size Global Scaling
  useEffect(() => {
    // Default to 1.25rem if not set
    const size = user?.settings?.fontSize || '1.25rem';
    document.documentElement.style.fontSize = size;
  }, [user?.settings?.fontSize]);

  const handleLogin = (email: string) => {
    const data = loadUserData(email);
    setUser(data);
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
    setActiveTab(AppTab.DASHBOARD);
    // Reset font size on logout optionally, or keep preference. Keeping it is better UX usually.
  };

  const handleExportData = () => {
    if (!user) return;
    const dataStr = JSON.stringify(user, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `medtrack_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generic updater for User Data
  const updateUserData = (newData: Partial<UserData>) => {
    if (!user) return;
    const updated = { ...user, ...newData };
    setUser(updated);
    saveUserData(updated);
  };

  const handleUpdatePills = (pills: Pill[]) => {
    updateUserData({ pills });
  };

  const handleUpdateFontSize = (newSize: string) => {
    if(!user) return;
    updateUserData({ settings: { ...user.settings, fontSize: newSize } });
  };

  const handleUpdateEmail = (newEmail: string) => {
    if (!user || isExampleMode) return;
    const oldEmail = user.email;
    const updatedUser = { ...user, email: newEmail };
    
    // 1. Save new data under new key
    saveUserData(updatedUser);
    
    // 2. Remove old data
    deleteUserData(oldEmail);

    // 3. Update State
    setUser(updatedUser);
  };

  const handleImportData = (importedData: UserData, isPermanent: boolean) => {
    if (isPermanent) {
      if (window.confirm("This will overwrite your current data with the imported file. Are you sure?")) {
        // Ensure the email matches the current user or migrate it
        const updatedData = { ...importedData, email: user?.email || importedData.email };
        setUser(updatedData);
        saveUserData(updatedData);
        setIsExampleMode(false);
        setOriginalUser(null);
      }
    } else {
      // Example Mode
      setOriginalUser(user);
      setUser(importedData);
      setIsExampleMode(true);
      setActiveTab(AppTab.DASHBOARD);
    }
  };

  const handleExitExampleMode = () => {
    if (originalUser) {
      setUser(originalUser);
      setOriginalUser(null);
    }
    setIsExampleMode(false);
  };

  const handleSaveLog = (entry: LogEntry) => {
    if (!user) return;
    
    // Create a fresh copy of the logs array
    let newLogs = [...user.logs];
    const existingIndex = newLogs.findIndex(l => l.id === entry.id);
    
    if (existingIndex >= 0) {
      newLogs[existingIndex] = entry; // Update existing
    } else {
      newLogs.push(entry); // Create new
    }
    
    updateUserData({ logs: newLogs });
  };

  const handleDeleteLog = (id: string) => {
    if (!user) return;
    
    // Explicit confirmation
    if (window.confirm("Are you sure you want to delete this entry?")) {
        // Create new object derived from current state
        const newLogs = user.logs.filter(log => log.id !== id);
        const updatedUser = { ...user, logs: newLogs };
        
        // Update State
        setUser(updatedUser);
        
        // Update Storage
        saveUserData(updatedUser);
        
        // Reset Modal State (in case deletion happened from modal)
        setIsLogModalOpen(false);
        setEditingLog(null);
    }
  };

  const openLogModal = (entry?: LogEntry) => {
    setEditingLog(entry || null);
    setIsLogModalOpen(true);
  };

  const closeLogModal = () => {
    setIsLogModalOpen(false);
    setTimeout(() => setEditingLog(null), 300);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-24 md:pb-0">
      {/* Top Navigation */}
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">M</div>
            <span className="font-bold text-xl tracking-tight text-slate-800">MedTrack AI</span>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-4">
             {isExampleMode && (
               <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold border border-amber-200 flex items-center gap-1">
                 <AlertTriangle size={12} />
                 Example Mode
                 <button 
                   onClick={handleExitExampleMode}
                   className="ml-2 underline hover:text-amber-900"
                 >
                   Exit
                 </button>
               </div>
             )}
             <div className="hidden md:block text-sm text-slate-500 mr-2">{user.email}</div>
             
             <button 
                onClick={handleExportData} 
                className="text-slate-500 hover:text-teal-600 transition flex items-center gap-1 px-3 py-1 rounded-md hover:bg-slate-100"
                title="Backup Data"
             >
               <Download size={18} />
               <span className="hidden sm:inline text-sm font-medium">Backup</span>
             </button>

             <div className="h-6 w-px bg-slate-200 mx-1"></div>

             <button onClick={handleLogout} className="text-slate-400 hover:text-slate-700 transition p-1" title="Logout">
               <LogOut size={20} />
             </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-8 pl-4 md:pl-24">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 capitalize">
                {activeTab === AppTab.DASHBOARD && 'Your Diary'}
                {activeTab === AppTab.CABINET && 'Medication Cabinet'}
                {activeTab === AppTab.ASSISTANT && 'AI Assistant'}
                {activeTab === AppTab.REPORTS && 'Reports & Analytics'}
                {activeTab === AppTab.SETTINGS && 'Settings'}
            </h1>
            
            {activeTab === AppTab.DASHBOARD && (
                <button 
                  onClick={() => openLogModal()} 
                  className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-full font-medium shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5 flex items-center gap-2"
                >
                    <Plus size={20} />
                    <span className="hidden sm:inline">Log Now</span>
                </button>
            )}
        </div>

        {activeTab === AppTab.DASHBOARD && (
          <Dashboard 
            logs={user.logs} 
            pills={user.pills} 
            onEditLog={openLogModal}
            onDeleteLog={handleDeleteLog}
          />
        )}

        {activeTab === AppTab.CABINET && (
          <PillCabinet 
            pills={user.pills} 
            onUpdatePills={handleUpdatePills} 
          />
        )}

        {activeTab === AppTab.ASSISTANT && (
          <div className="max-w-3xl mx-auto">
             <AIAssistant 
                logs={user.logs} 
                pills={user.pills} 
                onAddLog={handleSaveLog} 
             />
          </div>
        )}

        {activeTab === AppTab.REPORTS && (
          <div className="max-w-4xl mx-auto">
             <Reports 
                logs={user.logs} 
                pills={user.pills} 
             />
          </div>
        )}

        {activeTab === AppTab.SETTINGS && (
           <div className="max-w-4xl mx-auto">
              <Settings 
                user={user}
                onUpdateEmail={handleUpdateEmail}
                onUpdateFontSize={handleUpdateFontSize}
                onImportData={handleImportData}
                isExampleMode={isExampleMode}
              />
           </div>
        )}
      </main>

      {/* Floating Log Button (Mobile Only) */}
      {activeTab === AppTab.DASHBOARD && (
        <button 
          onClick={() => openLogModal()}
          className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center z-20"
        >
          <Plus size={28} />
        </button>
      )}

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 md:hidden z-30 pb-safe">
        <div className="flex justify-around items-center h-16">
          <button 
            onClick={() => setActiveTab(AppTab.DASHBOARD)} 
            className={`flex flex-col items-center p-2 ${activeTab === AppTab.DASHBOARD ? 'text-teal-600' : 'text-slate-400'}`}
          >
            <LayoutDashboard size={24} />
            <span className="text-[10px] font-medium mt-1">Diary</span>
          </button>
          <button 
            onClick={() => setActiveTab(AppTab.CABINET)} 
            className={`flex flex-col items-center p-2 ${activeTab === AppTab.CABINET ? 'text-teal-600' : 'text-slate-400'}`}
          >
            <BriefcaseMedical size={24} />
            <span className="text-[10px] font-medium mt-1">Cabinet</span>
          </button>
          <button 
            onClick={() => setActiveTab(AppTab.REPORTS)} 
            className={`flex flex-col items-center p-2 ${activeTab === AppTab.REPORTS ? 'text-teal-600' : 'text-slate-400'}`}
          >
            <BarChart3 size={24} />
            <span className="text-[10px] font-medium mt-1">Reports</span>
          </button>
          <button 
            onClick={() => setActiveTab(AppTab.SETTINGS)} 
            className={`flex flex-col items-center p-2 ${activeTab === AppTab.SETTINGS ? 'text-teal-600' : 'text-slate-400'}`}
          >
            <SettingsIcon size={24} />
            <span className="text-[10px] font-medium mt-1">Settings</span>
          </button>
        </div>
      </nav>

      {/* Desktop Tabs */}
      <div className="hidden md:flex fixed left-0 top-16 bottom-0 w-20 flex-col items-center py-8 bg-white border-r border-slate-200 z-0">
          <button 
            onClick={() => setActiveTab(AppTab.DASHBOARD)} 
            className={`mb-8 p-3 rounded-xl transition ${activeTab === AppTab.DASHBOARD ? 'bg-teal-50 text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
            title="Diary"
          >
            <LayoutDashboard size={28} />
          </button>
          <button 
            onClick={() => setActiveTab(AppTab.CABINET)} 
            className={`mb-8 p-3 rounded-xl transition ${activeTab === AppTab.CABINET ? 'bg-teal-50 text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
            title="Cabinet"
          >
            <BriefcaseMedical size={28} />
          </button>
          <button 
            onClick={() => setActiveTab(AppTab.REPORTS)} 
            className={`mb-8 p-3 rounded-xl transition ${activeTab === AppTab.REPORTS ? 'bg-teal-50 text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
            title="Reports"
          >
            <BarChart3 size={28} />
          </button>
          <button 
            onClick={() => setActiveTab(AppTab.ASSISTANT)} 
            className={`mb-8 p-3 rounded-xl transition ${activeTab === AppTab.ASSISTANT ? 'bg-teal-50 text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
            title="AI Assistant"
          >
            <Bot size={28} />
          </button>
           <button 
            onClick={() => setActiveTab(AppTab.SETTINGS)} 
            className={`mb-8 p-3 rounded-xl transition ${activeTab === AppTab.SETTINGS ? 'bg-teal-50 text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
            title="Settings"
          >
            <SettingsIcon size={28} />
          </button>
      </div>

      <LogModal 
        isOpen={isLogModalOpen} 
        onClose={closeLogModal} 
        onSave={handleSaveLog}
        onDelete={handleDeleteLog}
        availablePills={user.pills}
        initialEntry={editingLog}
      />
    </div>
  );
}

export default App;