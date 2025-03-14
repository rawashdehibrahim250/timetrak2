import React, { useMemo } from 'react';
import { ArrowLeft, BarChart2, Download } from 'lucide-react';
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

interface DetailedAverageViewProps {
  entries: TimeEntry[];
  onBack: () => void;
  isAdmin: boolean;
}

export default function DetailedAverageView({ entries, onBack, isAdmin }: DetailedAverageViewProps) {
  // Calculate daily averages
  const dailyAverages = useMemo(() => {
    const dayMap: Record<string, { total: number, count: number }> = {};
    
    entries.forEach(entry => {
      const date = new Date(entry.start_time).toLocaleDateString();
      
      if (!dayMap[date]) {
        dayMap[date] = { total: 0, count: 0 };
      }
      
      dayMap[date].total += entry.duration;
      dayMap[date].count += 1;
    });
    
    return Object.entries(dayMap).map(([date, data]) => ({
      date,
      average: data.total / data.count,
      total: data.total,
      entries: data.count
    }));
  }, [entries]);
  
  // Calculate overall average
  const overallAverage = useMemo(() => {
    if (dailyAverages.length === 0) return 0;
    
    const totalHours = dailyAverages.reduce((sum, day) => sum + day.total, 0);
    return totalHours / dailyAverages.length;
  }, [dailyAverages]);
  
  // Calculate average entry duration
  const averageEntryDuration = useMemo(() => {
    if (entries.length === 0) return 0;
    
    const totalDuration = entries.reduce((sum, entry) => sum + entry.duration, 0);
    return totalDuration / entries.length;
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
          <BarChart2 className="h-6 w-6 mr-2 text-green-600" />
          Daily Average Analysis
        </h2>
        <button className="ml-auto flex items-center px-3 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors">
          <Download className="h-4 w-4 mr-1" />
          Export Report
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-green-50 rounded-lg p-5">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Daily Average</h3>
          <div className="text-4xl font-bold text-green-700">{overallAverage.toFixed(1)}h</div>
          <p className="text-sm text-gray-600 mt-2">Average hours per day</p>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-5">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Average Entry Duration</h3>
          <div className="text-4xl font-bold text-blue-700">{averageEntryDuration.toFixed(1)}h</div>
          <p className="text-sm text-gray-600 mt-2">Average duration per time entry</p>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-5">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Consistency Score</h3>
          <div className="text-4xl font-bold text-purple-700">
            {Math.min(100, Math.round((dailyAverages.length / 30) * 100))}%
          </div>
          <p className="text-sm text-gray-600 mt-2">Based on regular time tracking</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Daily Average Trend</h3>
          <div className="h-64">
            <TimeChart 
              entries={entries} 
              title="Daily Average Hours" 
              isAdmin={isAdmin} 
            />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Daily Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Hours
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entries
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Average
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dailyAverages.slice(0, 10).map((day, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {day.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {day.total.toFixed(1)}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {day.entries}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {day.average.toFixed(1)}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 