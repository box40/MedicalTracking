import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Minus, Plus, Trash2, Check } from 'lucide-react';
import { Pill, LogEntry, PillTaken } from '../types';
import { generateId } from '../services/storage';

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: LogEntry) => void;
  onDelete: (id: string) => void;
  availablePills: Pill[];
  initialEntry?: LogEntry | null;
}

export const LogModal: React.FC<LogModalProps> = ({ isOpen, onClose, onSave, onDelete, availablePills, initialEntry }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [selectedPills, setSelectedPills] = useState<PillTaken[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialEntry) {
        // Use local time components explicitly to prevent UTC shifting
        const d = new Date(initialEntry.timestamp);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setDate(`${year}-${month}-${day}`);
        
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        setTime(`${hours}:${mins}`);
        
        // Deep copy the pillsTaken array
        if (initialEntry.pillsTaken) {
          setSelectedPills(initialEntry.pillsTaken.map(p => ({ ...p })));
        } else if (initialEntry.pillIds) {
          setSelectedPills(initialEntry.pillIds.map(id => ({ pillId: id, quantity: 1 })));
        } else {
          setSelectedPills([]);
        }
        
        setNotes(initialEntry.notes || '');
      } else {
        // Default to now (Local Time)
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        setDate(`${year}-${month}-${day}`);
        
        const hours = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        setTime(`${hours}:${mins}`);
        
        setSelectedPills([]);
        setNotes('');
      }
    }
  }, [isOpen, initialEntry]);

  if (!isOpen) return null;

  const handleUpdateQuantity = (id: string, delta: number) => {
    const existingIndex = selectedPills.findIndex(p => p.pillId === id);
    const newPills = selectedPills.map(p => ({ ...p }));
    
    if (existingIndex >= 0) {
      const newQty = Math.max(0, newPills[existingIndex].quantity + delta);
      if (newQty === 0) {
        newPills.splice(existingIndex, 1);
      } else {
        newPills[existingIndex].quantity = newQty;
      }
      setSelectedPills(newPills);
    } else if (delta > 0) {
      if (selectedPills.length < 5) {
        newPills.push({ pillId: id, quantity: delta });
        setSelectedPills(newPills);
      }
    }
  };

  const handleSubmit = () => {
    if (selectedPills.length === 0) {
      alert("Please select at least one pill.");
      return;
    }

    // CRITICAL FIX: Explicitly parse date components to avoid Timezone issues.
    // Creating a date from string "YYYY-MM-DDTHH:MM" can sometimes be interpreted 
    // strangely by different browsers or if formatting is slightly off.
    // We strictly use Local Time here.
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);

    // Note: Month is 0-indexed in JS Date constructor (0 = Jan, 11 = Dec)
    const timestamp = new Date(year, month - 1, day, hours, minutes).getTime();
    
    const entry: LogEntry = {
      id: initialEntry?.id || generateId(),
      timestamp,
      pillsTaken: selectedPills,
      pillIds: selectedPills.map(p => p.pillId),
      notes
    };

    onSave(entry);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
          <h3 className="font-bold text-lg">{initialEntry ? 'Edit Entry' : 'Log Medication'}</h3>
          <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded transition">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Pills (Max 5)</label>
              <span className="text-xs text-teal-600">{selectedPills.length}/5 distinct items</span>
            </div>
            <div className="grid grid-cols-1 gap-2 p-1">
              {availablePills.map(pill => {
                const selection = selectedPills.find(p => p.pillId === pill.id);
                const quantity = selection ? selection.quantity : 0;
                
                return (
                  <div
                    key={pill.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition ${
                      quantity > 0
                        ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500' 
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center flex-1 min-w-0">
                        <div className="w-3 h-3 rounded-full mr-3 shrink-0" style={{ backgroundColor: pill.color }}></div>
                        <span className={`text-sm font-medium truncate ${quantity > 0 ? 'text-teal-900' : 'text-slate-700'}`}>
                            {pill.name}
                        </span>
                    </div>

                    <div className="flex items-center space-x-3 ml-4">
                        {quantity > 0 ? (
                             <div className="flex items-center bg-white rounded-md border border-teal-200 shadow-sm">
                                <button 
                                    onClick={() => handleUpdateQuantity(pill.id, -0.5)}
                                    className="p-1.5 text-teal-700 hover:bg-teal-100 rounded-l-md transition"
                                >
                                    <Minus size={14} />
                                </button>
                                <span className="w-8 text-center text-sm font-bold text-teal-800">{quantity}</span>
                                <button 
                                    onClick={() => handleUpdateQuantity(pill.id, 0.5)}
                                    className="p-1.5 text-teal-700 hover:bg-teal-100 rounded-r-md transition"
                                >
                                    <Plus size={14} />
                                </button>
                             </div>
                        ) : (
                             <button
                                onClick={() => handleUpdateQuantity(pill.id, 1)}
                                disabled={selectedPills.length >= 5}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs font-semibold uppercase tracking-wide transition disabled:opacity-50"
                             >
                                Add
                             </button>
                        )}
                    </div>
                  </div>
                );
              })}
              {availablePills.length === 0 && (
                <div className="text-center text-sm text-slate-500 py-4 border border-dashed border-slate-300 rounded-lg">
                  No pills configured. Go to Cabinet first.
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm h-20 focus:ring-2 focus:ring-teal-500 outline-none resize-none"
              placeholder="How are you feeling?"
            />
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 flex justify-between shrink-0">
           <div>
              {initialEntry && (
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onDelete(initialEntry.id);
                    }}
                    className="flex items-center text-red-500 hover:text-red-700 text-sm font-medium transition"
                  >
                    <Trash2 size={16} className="mr-1" />
                    Delete
                  </button>
              )}
           </div>
           <div className="flex">
              <button onClick={onClose} className="mr-3 px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium">Cancel</button>
              <button 
                onClick={handleSubmit} 
                disabled={availablePills.length === 0}
                className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center"
              >
                {initialEntry ? (
                    <>
                        <Check size={16} className="mr-1" />
                        Update Entry
                    </>
                ) : 'Save Entry'}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};