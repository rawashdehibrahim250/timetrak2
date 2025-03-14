import React, { useMemo } from 'react';
import { ArrowLeft, Clock, Download } from 'lucide-react';
import TimeChart from './TimeChart';

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

interface DetailedHoursViewProps {
  entries: TimeEntry[];
  onBack: () => void;
  isAdmin: boolean;
}

export default function DetailedHoursView({ entries, onBack, isAdmin }: DetailedHoursViewProps) {
  // Calculate hours by day of week
  const hoursByDayOfWeek = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayTotals = days.map(day => ({ day, hours: 0 }));
    
    entries.forEach(entry => {
      const dayOfWeek = new Date(entry.start_time).getDay();
      dayTotals[dayOfWeek].hours += entry.duration;
    });
    
    return dayTotals;
  }, [entries]);
  
  // Calculate hours by time of day
  const hoursByTimeOfDay = useMemo(() => {
    const timeSlots = [
      { label: 'Morning (6am-12pm)', hours: 0 },
      { label: 'Afternoon (12pm-6pm)', hours: 0 },
      { label: 'Evening (6pm-12am)', hours: 0 },
      { label: 'Night (12am-6am)', hours: 0 }
    ];
    
    entries.forEach(entry => {
      const hour = new Date(entry.start_time).getHours();
      if (hour >= 6 && hour < 12) {
        timeSlots[0].hours += entry.duration;
      } else if (hour >= 12 && hour < 18) {
        timeSlots[1].hours += entry.duration;
      } else if (hour >= 18 && hour < 24) {
        timeSlots[2].hours += entry.duration;
      } else {
        timeSlots[3].hours += entry.duration;
      }
    });
    
    return timeSlots;
  }, [entries]);
  
  // Calculate total hours
  const totalHours = useMemo(() => {
    return entries.reduce((sum, entry) => sum + entry.duration, 0);
  }, [entries]);
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center mb-6">
        <button 
          onClick={onBack}
          className="mr-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <Clock className="h-6 w-6 mr-2 text-blue-600" />
          Detailed Hours Analysis
        </h2>
        <button className="ml-auto flex items-center px-3 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors">
          <Download className="h-4 w-4 mr-1" />
          Export Report
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-blue-50 rounded-lg p-5">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Total Hours</h3>
          <div className="text-4xl font-bold text-blue-700">{totalHours.toFixed(1)}</div>
          <p className="text-sm text-gray-600 mt-2">Hours logged across all entries</p>
        </div>
        
        <div className="bg-green-50 rounded-lg p-5">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Productivity Score</h3>
          <div className="text-4xl font-bold text-green-700">
            {Math.min(100, Math.round(totalHours / entries.length * 10))}%
          </div>
          <p className="text-sm text-gray-600 mt-2">Based on consistency and duration</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Hours by Day of Week</h3>
          <div className="h-64">
            <TimeChart 
              entries={entries} 
              title="Hours by Day of Week" 
              isAdmin={isAdmin} 
            />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Hours by Time of Day</h3>
          <div className="space-y-4">
            {hoursByTimeOfDay.map((slot, index) => (
              <div key={index} className="flex items-center">
                <div className="w-32 text-sm text-gray-600">{slot.label}</div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.min(100, (slot.hours / totalHours) * 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-16 text-right text-sm font-medium">
                  {slot.hours.toFixed(1)}h
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 