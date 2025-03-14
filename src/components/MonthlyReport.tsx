import React, { useMemo } from 'react';
import { Clock, TrendingUp, Calendar, CheckCircle } from 'lucide-react';

interface TimeEntry {
  id: string;
  created_at: string;
  description: string;
  start_time: string;
  end_time: string;
  duration: number;
  user_id: string;
  user_email?: string;
}

interface MonthlyReportProps {
  entries: TimeEntry[];
  isAdmin: boolean;
}

const MonthlyReport: React.FC<MonthlyReportProps> = ({ entries, isAdmin }) => {
  const last30DaysEntries = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return entries.filter(entry => {
      const entryDate = new Date(entry.start_time);
      return entryDate >= thirtyDaysAgo;
    });
  }, [entries]);

  const totalHours = useMemo(() => {
    return last30DaysEntries.reduce((total, entry) => total + entry.duration, 0);
  }, [last30DaysEntries]);

  const averageHoursPerDay = useMemo(() => {
    if (last30DaysEntries.length === 0) return 0;
    
    // Group by day to count unique days worked
    const uniqueDays = new Set(
      last30DaysEntries.map(entry => 
        new Date(entry.start_time).toLocaleDateString()
      )
    );
    
    return uniqueDays.size > 0 ? totalHours / uniqueDays.size : 0;
  }, [last30DaysEntries, totalHours]);

  const mostFrequentTask = useMemo(() => {
    if (last30DaysEntries.length === 0) return 'No tasks';
    
    const taskCounts: Record<string, { count: number, duration: number }> = {};
    
    last30DaysEntries.forEach(entry => {
      if (!taskCounts[entry.description]) {
        taskCounts[entry.description] = { count: 0, duration: 0 };
      }
      taskCounts[entry.description].count += 1;
      taskCounts[entry.description].duration += entry.duration;
    });
    
    let mostFrequent = { description: '', count: 0, duration: 0 };
    
    Object.entries(taskCounts).forEach(([description, data]) => {
      if (data.count > mostFrequent.count) {
        mostFrequent = { description, count: data.count, duration: data.duration };
      }
    });
    
    return mostFrequent.description || 'No tasks';
  }, [last30DaysEntries]);

  const formatDuration = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  return (
    <div className="card p-4 md:p-6 mb-6 md:mb-8 animate-fade-in">
      <div className="flex items-center mb-4 md:mb-5">
        <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary-100 text-primary-700 mr-2 md:mr-3">
          <Clock className="h-4 w-4 md:h-5 md:w-5" />
        </div>
        <h2 className="text-lg md:text-xl font-semibold text-neutral-900">Last 30 Days Report</h2>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
        <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-none p-4 md:p-5 hover:translate-y-[-2px] transition-transform duration-300">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-primary-700 mb-1">Total Hours</p>
              <p className="text-xl md:text-2xl font-bold text-primary-900">{formatDuration(totalHours)}</p>
            </div>
            <div className="p-2 bg-white bg-opacity-50 rounded-lg">
              <Clock className="h-4 w-4 md:h-5 md:w-5 text-primary-700" />
            </div>
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-secondary-50 to-secondary-100 border-none p-4 md:p-5 hover:translate-y-[-2px] transition-transform duration-300">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-secondary-700 mb-1">Avg. Hours/Day Worked</p>
              <p className="text-xl md:text-2xl font-bold text-secondary-900">{formatDuration(averageHoursPerDay)}</p>
            </div>
            <div className="p-2 bg-white bg-opacity-50 rounded-lg">
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-secondary-700" />
            </div>
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-neutral-50 to-neutral-100 border-none p-4 md:p-5 hover:translate-y-[-2px] transition-transform duration-300">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-neutral-700 mb-1">Most Frequent Task</p>
              <p className="text-base md:text-xl font-bold text-neutral-900 truncate max-w-[120px] md:max-w-[200px]">{mostFrequentTask}</p>
            </div>
            <div className="p-2 bg-white bg-opacity-50 rounded-lg">
              <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-neutral-700" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 md:mt-5 flex items-center text-xs md:text-sm text-neutral-500">
        <Calendar className="h-3 w-3 md:h-4 md:w-4 mr-1.5" />
        <span>Based on {last30DaysEntries.length} time entries in the last 30 days</span>
      </div>
    </div>
  );
};

export default MonthlyReport;