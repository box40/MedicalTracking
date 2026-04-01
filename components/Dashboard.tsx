import React, { useMemo } from 'react';
import { Edit2, Pill as PillIcon, Calendar as CalendarIcon, Activity, Trash2, ArrowRight } from 'lucide-react';
import { LogEntry, Pill, DailyAggregation } from '../types';

interface DashboardProps {
  logs: LogEntry[];
  pills: Pill[];
  onEditLog: (entry: LogEntry) => void;
  onDeleteLog: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ logs, pills, onEditLog, onDeleteLog }) => {
  const aggregatedData = useMemo(() => {
    const grouped: Record<string, DailyAggregation> = {};

    // Sort logs descending
    const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);

    sortedLogs.forEach(log => {
      const dateKey = new Date(log.timestamp).toLocaleDateString('en-CA'); // YYYY-MM-DD
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: dateKey,
          logs: [],
          totalIngredients: {}
        };
      }

      grouped[dateKey].logs.push(log);

      // Aggregate Ingredients
      if (log.pillsTaken) {
        log.pillsTaken.forEach(item => {
          const pill = pills.find(p => p.id === item.pillId);
          if (pill) {
            pill.ingredients.forEach(ing => {
              const current = grouped[dateKey].totalIngredients[ing.name] || 0;
              // Multiply dosage by quantity taken
              grouped[dateKey].totalIngredients[ing.name] = current + (ing.dosageMg * item.quantity);
            });
          }
        });
      }
    });

    return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
  }, [logs, pills]);

  const getPillDetails = (id: string) => pills.find(p => p.id === id);

  // Helper to safely format YYYY-MM-DD string to a Local Date String
  const formatHeaderDate = (dateStr: string) => {
    // Manually parse YYYY-MM-DD to ensure we treat it as LOCAL time, not UTC.
    // new Date("2025-12-09") creates UTC midnight, which displays as Dec 8th in US timezones.
    const [year, month, day] = dateStr.split('-').map(Number);
    const localDate = new Date(year, month - 1, day); 
    
    return localDate.toLocaleDateString(undefined, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
  };

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Activity size={64} className="mb-4 text-slate-300" />
        <h3 className="text-xl font-bold text-slate-600 mb-2">No logs recorded yet</h3>
        
        {pills.length === 0 ? (
           <p className="text-sm flex items-center gap-2">
             Go to Cabinet to set up your meds first.
           </p>
        ) : (
           <p className="text-sm">Click "Log Now" to start tracking.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {aggregatedData.map((day) => (
        <div key={day.date} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Day Header */}
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <CalendarIcon className="text-teal-600" size={20} />
              <h3 className="font-bold text-lg text-slate-800">
                {formatHeaderDate(day.date)}
              </h3>
            </div>
            <div className="text-xs text-slate-500 font-medium px-2 py-1 bg-slate-200 rounded">
              {day.logs.length} Entries
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Detailed Timeline */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Timeline</h4>
              {day.logs.map(log => (
                <div key={log.id} className="relative pl-6 border-l-2 border-slate-200 hover:border-teal-400 transition-colors group">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-200 group-hover:bg-teal-500 transition-colors"></div>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-mono text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {/* Buttons always visible */}
                    <div className="flex items-center space-x-2 bg-white pl-2 shrink-0 z-10">
                      <button 
                        type="button"
                        onClick={(e) => { 
                            e.preventDefault();
                            e.stopPropagation(); 
                            onEditLog(log); 
                        }}
                        className="text-slate-400 hover:text-teal-600 p-1.5 rounded-full hover:bg-teal-50 transition"
                        title="Edit Entry"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => { 
                            e.preventDefault();
                            e.stopPropagation(); 
                            onDeleteLog(log.id); 
                        }}
                        className="text-slate-400 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 transition"
                        title="Delete Entry"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-2">
                    {log.pillsTaken?.map((item, idx) => {
                      const pill = getPillDetails(item.pillId);
                      return pill ? (
                        <div key={`${log.id}-${idx}`} className="flex items-center space-x-1 bg-slate-100 px-2 py-1 rounded-full text-xs font-medium text-slate-700 border border-slate-200">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pill.color }}></div>
                          <span className="font-bold">{item.quantity}x</span>
                          <span>{pill.name}</span>
                        </div>
                      ) : (
                        <span key={idx} className="text-xs text-red-400">Unknown Pill</span>
                      );
                    })}
                  </div>
                  
                  {log.notes && (
                    <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100 inline-block">
                      "{log.notes}"
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Right: Ingredient Totals */}
            <div className="bg-slate-50 rounded-xl p-5 h-fit">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                <Activity size={14} className="mr-2" />
                Daily Intake Totals
              </h4>
              <div className="space-y-3">
                {Object.entries(day.totalIngredients).map(([name, total]) => (
                  <div key={name} className="flex justify-between items-center border-b border-slate-200 last:border-0 pb-2 last:pb-0">
                    <span className="text-sm font-medium text-slate-700">{name}</span>
                    <span className="text-sm font-bold text-teal-700">{total} mg</span>
                  </div>
                ))}
                {Object.keys(day.totalIngredients).length === 0 && (
                  <div className="text-sm text-slate-400 italic text-center">No ingredients tracked.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};