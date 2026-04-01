import React, { useState, useMemo, useEffect } from 'react';
import { Filter, PieChart, Activity, AlertCircle, Clock, CalendarDays, History, Search, TrendingUp, BarChart2, CheckCircle2, Circle } from 'lucide-react';
import { LogEntry, Pill } from '../types';

// --- Shared Types ---
interface ChartDataPoint {
  label: string; // Display label (e.g., date)
  timestamp: number; // For sorting/key
  [key: string]: any; // Series values
}

interface ChartSeries {
  key: string;
  color: string;
  label: string;
}

// --- Simple SVG Line Chart (For Drill Down) ---
const SimpleLineChart: React.FC<{ 
  data: ChartDataPoint[]; 
  series: ChartSeries[]; 
  height?: number; 
  title?: string;
  yAxisLabel?: string;
}> = ({ data, series, height = 240, title, yAxisLabel }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200 border-dashed" style={{ height }}>
        <p className="text-slate-400 text-sm">No data to chart</p>
      </div>
    );
  }

  // Layout constants
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const width = 800;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales safely
  const allValues = data.flatMap(d => series.map(s => {
      const val = d[s.key];
      return (typeof val === 'number' && !isNaN(val)) ? val : 0;
  }));
  
  const maxValue = Math.max(...allValues, 0) * 1.1; 
  const maxY = maxValue <= 0 ? 10 : maxValue;

  const getX = (index: number) => padding.left + (index / (data.length - 1 || 1)) * chartWidth;
  const getY = (value: number) => {
      const safeValue = (typeof value === 'number' && !isNaN(value)) ? value : 0;
      return padding.top + chartHeight - (safeValue / maxY) * chartHeight;
  };

  const generatePath = (key: string) => {
    return data.map((d, i) => 
      `${i === 0 ? 'M' : 'L'} ${getX(i)},${getY(d[key] as number)}`
    ).join(' ');
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      {title && <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><TrendingUp size={16}/> {title}</h4>}
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
             const y = padding.top + chartHeight - (tick * chartHeight);
             return (
               <g key={tick}>
                 <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                 <text x={padding.left - 8} y={y + 4} textAnchor="end" className="text-[10px] fill-slate-400">
                   {Math.round(tick * maxY)}
                 </text>
               </g>
             );
          })}
          
          {yAxisLabel && (
             <text x={10} y={padding.top - 10} className="text-[10px] fill-slate-500 font-bold">{yAxisLabel}</text>
          )}

          {/* Series Lines */}
          {series.map((s) => (
            <path
              key={s.key}
              d={generatePath(s.key)}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-sm transition-all duration-300"
              style={{ opacity: hoveredIndex !== null ? 0.3 : 1 }}
            />
          ))}
          
          {/* Hover Overlay Line */}
          {hoveredIndex !== null && series.map((s) => (
             <path
              key={`active-${s.key}`}
              d={generatePath(s.key)}
              fill="none"
              stroke={s.color}
              strokeWidth="3"
              className="transition-all duration-300"
            />
          ))}

          {/* Interactive Areas */}
          {data.map((d, i) => (
             <g key={i} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
                <rect 
                    x={getX(i) - (chartWidth / data.length / 2)} 
                    y={padding.top} 
                    width={chartWidth / data.length} 
                    height={chartHeight} 
                    fill="transparent" 
                    className="cursor-crosshair"
                />
                {(hoveredIndex === i || data.length < 15) && series.map(s => (
                   <circle 
                      key={s.key} 
                      cx={getX(i)} 
                      cy={getY(d[s.key] as number)} 
                      r={hoveredIndex === i ? 5 : 3} 
                      fill="white" 
                      stroke={s.color} 
                      strokeWidth="2" 
                   />
                ))}
                {(i % Math.ceil(data.length / 6) === 0 || i === data.length - 1) && (
                   <text x={getX(i)} y={height - 10} textAnchor="middle" className="text-[10px] fill-slate-400">
                      {d.label.split('-').slice(1).join('/')}
                   </text>
                )}
             </g>
          ))}
        </svg>

        {/* Tooltip */}
        {hoveredIndex !== null && (
           <div className="absolute top-0 right-0 bg-white/95 backdrop-blur shadow-lg border border-slate-200 rounded-lg p-3 text-xs z-10 pointer-events-none">
              <p className="font-bold text-slate-800 mb-1">{data[hoveredIndex].label}</p>
              {series.map(s => (
                 <div key={s.key} className="flex items-center gap-2 mb-0.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></div>
                    <span className="text-slate-500">{s.label}:</span>
                    <span className="font-mono font-bold">{Number(data[hoveredIndex][s.key] || 0).toFixed(1)}</span>
                 </div>
              ))}
           </div>
        )}
      </div>
    </div>
  );
};

// --- Simple SVG Stacked Bar Chart ---
const SimpleStackedBarChart: React.FC<{ 
  data: ChartDataPoint[]; 
  series: ChartSeries[]; 
  height?: number; 
  title?: string;
}> = ({ data, series, height = 280, title }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200 border-dashed" style={{ height }}>
        <p className="text-slate-400 text-sm">No data to chart</p>
      </div>
    );
  }

  const padding = { top: 30, right: 20, bottom: 30, left: 40 };
  const width = 800;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate Max Y (Total stack height)
  const maxStackHeight = Math.max(...data.map(d => {
    return series.reduce((acc, s) => acc + (Number(d[s.key]) || 0), 0);
  }), 0);
  
  const maxY = maxStackHeight <= 0 ? 5 : Math.ceil(maxStackHeight * 1.1); // 10% headroom

  const barWidthRaw = chartWidth / data.length;
  const barGap = barWidthRaw * 0.3; // 30% gap
  const barWidth = barWidthRaw - barGap;

  const getX = (index: number) => padding.left + (index * barWidthRaw) + (barGap / 2);

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-4">
       {title && <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><BarChart2 size={16}/> {title}</h4>}
       <div className="relative">
         <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
              const y = padding.top + chartHeight - (tick * chartHeight);
              return (
                <g key={tick}>
                  <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                  <text x={padding.left - 8} y={y + 4} textAnchor="end" className="text-[10px] fill-slate-400">
                    {Math.round(tick * maxY)}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {data.map((d, index) => {
               let currentY = padding.top + chartHeight;
               
               return (
                 <g key={index} onMouseEnter={() => setHoveredIndex(index)} onMouseLeave={() => setHoveredIndex(null)}>
                   {series.map(s => {
                     const val = Number(d[s.key]) || 0;
                     if (val === 0) return null;
                     
                     const barH = (val / maxY) * chartHeight;
                     currentY -= barH; // Stack upwards

                     return (
                        <rect
                          key={s.key}
                          x={getX(index)}
                          y={currentY}
                          width={barWidth}
                          height={barH}
                          fill={s.color}
                          opacity={hoveredIndex === index ? 0.9 : 0.85}
                          className="transition-opacity duration-200"
                        />
                     );
                   })}
                   
                   {/* Invisible hit rect for easier hovering */}
                   <rect 
                      x={getX(index) - (barGap/2)}
                      y={padding.top}
                      width={barWidthRaw}
                      height={chartHeight}
                      fill="transparent"
                   />

                   {/* X Axis Label */}
                   {(index % Math.ceil(data.length / 8) === 0 || index === data.length - 1) && (
                      <text x={getX(index) + barWidth/2} y={height - 10} textAnchor="middle" className="text-[10px] fill-slate-500">
                          {d.label.split('-').slice(1).join('/')}
                      </text>
                   )}
                 </g>
               );
            })}
         </svg>

         {/* Tooltip */}
         {hoveredIndex !== null && (
            <div className="absolute top-0 right-0 bg-white/95 backdrop-blur shadow-xl border border-slate-200 rounded-lg p-3 text-xs z-20 pointer-events-none min-w-[140px]">
               <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">{data[hoveredIndex].label}</p>
               {series.map(s => {
                  const val = Number(data[hoveredIndex][s.key]) || 0;
                  if (val === 0) return null;
                  return (
                    <div key={s.key} className="flex items-center justify-between gap-3 mb-1">
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></div>
                          <span className="text-slate-600 truncate max-w-[80px]">{s.label}</span>
                       </div>
                       <span className="font-mono font-bold text-slate-800">{val}</span>
                    </div>
                  );
               })}
               <div className="mt-2 pt-1 border-t border-slate-100 flex justify-between font-bold text-slate-800">
                  <span>Total</span>
                  <span>{series.reduce((acc, s) => acc + (Number(data[hoveredIndex][s.key]) || 0), 0)}</span>
               </div>
            </div>
         )}
       </div>
    </div>
  );
};


interface ReportsProps {
  logs: LogEntry[];
  pills: Pill[];
}

export const Reports: React.FC<ReportsProps> = ({ logs, pills }) => {
  // Helper: Get local date string YYYY-MM-DD
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Default to Last 7 Days
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return getLocalDateString(d);
  });
  
  const [endDate, setEndDate] = useState(() => getLocalDateString(new Date()));
  const [selectedPillId, setSelectedPillId] = useState<string>('all');
  
  // Track visibility of specific pills in the chart
  const [visiblePillIds, setVisiblePillIds] = useState<Set<string>>(new Set());

  const reportData = useMemo(() => {
    const [sy, sm, sd] = startDate.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    
    const [ey, em, ed] = endDate.split('-').map(Number);
    const end = new Date(ey, em - 1, ed, 23, 59, 59, 999);

    const daysDiff = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    const filteredLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate.getTime() >= start.getTime() && logDate.getTime() <= end.getTime();
    });

    // --- Aggregations ---
    const pillCounts: Record<string, number> = {};
    const ingredientTotals: Record<string, number> = {};
    const totalLogs = filteredLogs.length;

    const dailyDataMap = new Map<string, ChartDataPoint>();
    const foundPillIds = new Set<string>();

    // Initialize all days
    const loopDate = new Date(start);
    while (loopDate <= end) {
        const dateKey = getLocalDateString(loopDate);
        dailyDataMap.set(dateKey, { 
            label: dateKey, 
            timestamp: loopDate.getTime(),
            _totalSpecific: 0 
        });
        loopDate.setDate(loopDate.getDate() + 1);
    }

    // Drill down data
    const specificPillLogs: { log: LogEntry; quantity: number }[] = [];

    filteredLogs.forEach(log => {
      const dateKey = getLocalDateString(new Date(log.timestamp));
      const dayData = dailyDataMap.get(dateKey);

      if (log.pillsTaken) {
        log.pillsTaken.forEach(item => {
          const pill = pills.find(p => p.id === item.pillId);
          if (pill) {
            // Count Pills
            pillCounts[pill.name] = (pillCounts[pill.name] || 0) + item.quantity;
            foundPillIds.add(pill.id);

            // Add to daily data for Stacked Bar Chart
            if (dayData) {
               dayData[pill.id] = (dayData[pill.id] || 0) + item.quantity;
            }

            // Sum Ingredients
            pill.ingredients.forEach(ing => {
              ingredientTotals[ing.name] = (ingredientTotals[ing.name] || 0) + (ing.dosageMg * item.quantity);
              
              // Add to daily trend for ingredient (used in specific drill down trend)
              if (dayData) {
                  dayData[ing.name] = (dayData[ing.name] || 0) + (ing.dosageMg * item.quantity);
              }
            });

            // Drill down check
            if (pill.id === selectedPillId) {
                specificPillLogs.push({ log, quantity: item.quantity });
                if (dayData) {
                    dayData._totalSpecific = (dayData._totalSpecific || 0) + item.quantity;
                }
            }
          }
        });
      }
    });

    const trendData = Array.from(dailyDataMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    
    // Sort for display
    const sortedPills = Object.entries(pillCounts).sort((a, b) => b[1] - a[1]);
    const sortedIngredients = Object.entries(ingredientTotals).sort((a, b) => b[1] - a[1]);
    const sortedLogs = [...filteredLogs].sort((a, b) => b.timestamp - a.timestamp);
    const sortedSpecificLogs = specificPillLogs.sort((a, b) => b.log.timestamp - a.log.timestamp);
    const totalSpecificQuantity = specificPillLogs.reduce((acc, curr) => acc + curr.quantity, 0);

    // Filter Series for Stacked Bar Chart based on Visible Pill IDs
    const allAvailablePillsInContext = Array.from(foundPillIds).map(id => {
       const p = pills.find(px => px.id === id);
       return {
          key: id,
          label: p?.name || 'Unknown',
          color: p?.color || '#cbd5e1'
       };
    });

    return {
      totalLogs,
      sortedPills,
      sortedIngredients,
      sortedLogs,
      sortedSpecificLogs,
      totalSpecificQuantity,
      daysDiff,
      trendData,
      foundPillIds,
      allAvailablePillsInContext
    };
  }, [logs, pills, startDate, endDate, selectedPillId]);

  // Sync visible pill IDs state if it hasn't been initialized for this dataset
  useEffect(() => {
    if (visiblePillIds.size === 0 && reportData.foundPillIds.size > 0) {
      setVisiblePillIds(new Set(reportData.foundPillIds));
    }
  }, [reportData.foundPillIds]);

  const togglePillVisibility = (id: string) => {
    const next = new Set(visiblePillIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setVisiblePillIds(next);
  };

  const toggleAllPills = (visible: boolean) => {
    if (visible) {
      setVisiblePillIds(new Set(reportData.foundPillIds));
    } else {
      setVisiblePillIds(new Set());
    }
  };

  const handleQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    const daysToSubtract = Math.max(0, days - 1);
    start.setDate(end.getDate() - daysToSubtract);
    
    setEndDate(getLocalDateString(end));
    setStartDate(getLocalDateString(start));
  };

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
    const months = Math.floor(days / 30);
    return `${months} mo${months > 1 ? 's' : ''} ago`;
  };

  const formatLogDate = (timestamp: number) => {
      return new Date(timestamp).toLocaleString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
      });
  };

  // Only pass series that are currently checked
  const filteredBarSeries = reportData.allAvailablePillsInContext.filter(s => visiblePillIds.has(s.key));

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Controls */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
         <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4">
            <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">From</label>
                <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
            </div>
            <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">To</label>
                <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
            </div>
         </div>
         
         <div className="mb-4">
             <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quick Select Days</label>
             <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map(days => (
                    <button 
                        key={days}
                        onClick={() => handleQuickRange(days)} 
                        className="px-3 py-1.5 text-sm font-medium bg-slate-50 hover:bg-teal-50 text-slate-600 hover:text-teal-700 border border-slate-200 rounded-lg transition"
                    >
                        Last {days} {days === 1 ? 'Day' : 'Days'}
                    </button>
                ))}
                <div className="w-px bg-slate-200 mx-1 h-6 self-center"></div>
                <button onClick={() => handleQuickRange(7)} className="px-3 py-1.5 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition">Last 7</button>
                <button onClick={() => handleQuickRange(30)} className="px-3 py-1.5 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition">Last 30</button>
             </div>
         </div>

         <div className="text-xs text-slate-400 flex items-center pt-2 border-t border-slate-50">
            <Filter size={12} className="mr-1" />
            Showing data for {reportData.totalLogs} entries found in this range.
         </div>
      </div>

      {/* Main Stacked Bar Chart with Visibility Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6">
          <SimpleStackedBarChart 
              title="Daily Pill Intake Breakdown"
              data={reportData.trendData}
              series={filteredBarSeries}
          />
          
          {/* Pill Visibility Toggle Checkboxes */}
          {reportData.allAvailablePillsInContext.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-100">
               <div className="flex items-center justify-between mb-4">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Filter size={14} /> Filter Chart Pills
                  </label>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => toggleAllPills(true)} 
                      className="text-[10px] font-bold text-teal-600 hover:underline uppercase tracking-wide"
                    >
                      Show All
                    </button>
                    <button 
                      onClick={() => toggleAllPills(false)} 
                      className="text-[10px] font-bold text-slate-400 hover:underline uppercase tracking-wide"
                    >
                      Hide All
                    </button>
                  </div>
               </div>
               
               <div className="flex flex-wrap gap-2">
                  {reportData.allAvailablePillsInContext.map(s => {
                    const isVisible = visiblePillIds.has(s.key);
                    return (
                      <button
                        key={s.key}
                        onClick={() => togglePillVisibility(s.key)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 transition-all ${
                          isVisible 
                            ? 'bg-white border-slate-200 shadow-sm' 
                            : 'bg-slate-50 border-transparent opacity-60'
                        }`}
                      >
                        {isVisible ? (
                          <CheckCircle2 size={16} style={{ color: s.color }} />
                        ) : (
                          <Circle size={16} className="text-slate-300" />
                        )}
                        <span className={`text-xs font-semibold ${isVisible ? 'text-slate-800' : 'text-slate-400'}`}>
                          {s.label}
                        </span>
                        {isVisible && (
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></div>
                        )}
                      </button>
                    );
                  })}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-80 overflow-y-auto">
             <div className="flex items-center space-x-2 mb-6 pb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                <PieChart className="text-teal-600" size={20} />
                <h3 className="font-bold text-lg text-slate-800">Pill Counts</h3>
             </div>
             {reportData.sortedPills.length > 0 ? (
                 <div className="space-y-4">
                    {reportData.sortedPills.map(([name, count]) => (
                        <div key={name} className="flex items-center justify-between">
                            <span className="text-slate-700 font-medium">{name}</span>
                            <div className="flex items-center">
                                <div className="h-2 bg-slate-100 w-24 rounded-full mr-3 overflow-hidden">
                                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.min(100, (count / reportData.sortedPills[0][1]) * 100)}%` }}></div>
                                </div>
                                <span className="text-sm font-bold text-slate-900 w-8 text-right">{count}</span>
                            </div>
                        </div>
                    ))}
                 </div>
             ) : (
                <div className="text-center py-8 text-slate-400 flex flex-col items-center">
                    <AlertCircle size={32} className="mb-2 opacity-50" />
                    <p>No pills taken in this range.</p>
                </div>
             )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-80 overflow-y-auto">
             <div className="flex items-center space-x-2 mb-6 pb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                <Activity className="text-indigo-600" size={20} />
                <h3 className="font-bold text-lg text-slate-800">Total Ingredients</h3>
             </div>
             {reportData.sortedIngredients.length > 0 ? (
                 <div className="space-y-4">
                    {reportData.sortedIngredients.map(([name, total]) => (
                        <div key={name} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-1">
                            <span className="text-slate-700 font-medium mb-1 sm:mb-0">{name}</span>
                            <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">{total} mg</span>
                        </div>
                    ))}
                 </div>
             ) : (
                <div className="text-center py-8 text-slate-400 flex flex-col items-center">
                    <AlertCircle size={32} className="mb-2 opacity-50" />
                    <p>No ingredients tracked.</p>
                </div>
             )}
          </div>
      </div>

      {/* Specific Pill Drill-Down */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-2">
                    <Search className="text-purple-600" size={20} />
                    <h3 className="font-bold text-lg text-slate-800">Specific Pill Analysis</h3>
                </div>
                <select 
                    value={selectedPillId}
                    onChange={(e) => setSelectedPillId(e.target.value)}
                    className="px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none text-sm min-w-[200px]"
                >
                    <option value="all">Select a pill...</option>
                    {pills.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
              </div>
          </div>

          {selectedPillId !== 'all' ? (
              <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Total Qty</p>
                          <p className="text-2xl font-bold text-purple-700 mt-1">
                              {reportData.totalSpecificQuantity}
                          </p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Times Taken</p>
                          <p className="text-2xl font-bold text-slate-700 mt-1">
                              {reportData.sortedSpecificLogs.length}
                          </p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Avg / Dose</p>
                          <p className="text-2xl font-bold text-teal-600 mt-1">
                              {reportData.sortedSpecificLogs.length ? (reportData.totalSpecificQuantity / reportData.sortedSpecificLogs.length).toFixed(1) : 0}
                          </p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Avg / Day</p>
                          <p className="text-2xl font-bold text-indigo-600 mt-1">
                              {(reportData.totalSpecificQuantity / reportData.daysDiff).toFixed(1)}
                          </p>
                      </div>
                  </div>

                  {/* Specific Pill Usage Chart (Kept as Line for Trend Analysis) */}
                  <div className="mb-8">
                    <SimpleLineChart 
                        title={`Daily Quantity Trend: ${pills.find(p => p.id === selectedPillId)?.name}`}
                        yAxisLabel="Qty"
                        data={reportData.trendData}
                        height={200}
                        series={[{
                            key: '_totalSpecific',
                            label: 'Quantity',
                            color: '#9333ea' // Purple-600
                        }]}
                    />
                  </div>

                  <h4 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
                    <History size={16}/> Usage History
                  </h4>
                  {reportData.sortedSpecificLogs.length > 0 ? (
                    <div className="space-y-3">
                        {reportData.sortedSpecificLogs.map((item, idx) => (
                            <div key={`${item.log.id}-${idx}`} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:border-purple-200 transition">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                                    <span className="font-medium text-slate-800">{formatLogDate(item.log.timestamp)}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-slate-500">{getTimeAgo(item.log.timestamp)}</span>
                                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-md">{item.quantity}x</span>
                                </div>
                            </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">No usage found in selected date range.</p>
                  )}
              </div>
          ) : (
              <div className="p-8 text-center text-slate-400">
                  <p>Select a pill from the dropdown above to see detailed breakdown.</p>
              </div>
          )}
      </div>

      {/* Detailed Log History Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center space-x-2">
            <History className="text-slate-600" size={20} />
            <h3 className="font-bold text-lg text-slate-800">Full History</h3>
        </div>
        
        {reportData.sortedLogs.length > 0 ? (
            <div className="divide-y divide-slate-100">
                {reportData.sortedLogs.map(log => (
                    <div key={log.id} className="p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        {/* Left: Date and Time */}
                        <div className="flex items-start sm:items-center gap-3 min-w-[200px]">
                            <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                                <CalendarDays size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">{formatLogDate(log.timestamp)}</p>
                                <p className="text-xs text-teal-600 font-medium flex items-center mt-0.5">
                                    <Clock size={10} className="mr-1" />
                                    {getTimeAgo(log.timestamp)}
                                </p>
                            </div>
                        </div>

                        {/* Middle: Pills */}
                        <div className="flex-1">
                             <div className="flex flex-wrap gap-2">
                                {log.pillsTaken?.map((item, idx) => {
                                    const pill = pills.find(p => p.id === item.pillId);
                                    return (
                                        <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                            {item.quantity}x {pill ? pill.name : 'Unknown'}
                                        </span>
                                    );
                                })}
                             </div>
                             {log.notes && (
                                <p className="text-xs text-slate-400 italic mt-1 pl-1">"{log.notes}"</p>
                             )}
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="p-12 text-center text-slate-400">
                No detailed logs found for this period.
            </div>
        )}
      </div>
    </div>
  );
};