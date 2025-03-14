import React, { useMemo, useState } from 'react';
import { ArrowLeft, FileText, Download, Search, ChevronDown, ChevronUp } from 'lucide-react';

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

interface DetailedEntriesViewProps {
  entries: TimeEntry[];
  onBack: () => void;
  isAdmin: boolean;
}

export default function DetailedEntriesView({ entries, onBack, isAdmin }: DetailedEntriesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'start_time' | 'duration' | 'description'>('start_time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Filter entries based on search term
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      return searchTerm === '' || 
        entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.user_email && entry.user_email.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  }, [entries, searchTerm]);
  
  // Sort entries
  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'start_time') {
        comparison = new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      } else if (sortField === 'duration') {
        comparison = a.duration - b.duration;
      } else if (sortField === 'description') {
        comparison = a.description.localeCompare(b.description);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredEntries, sortField, sortDirection]);
  
  // Calculate statistics
  const stats = useMemo(() => {
    const totalEntries = entries.length;
    const totalDuration = entries.reduce((sum, entry) => sum + entry.duration, 0);
    const avgDuration = totalEntries > 0 ? totalDuration / totalEntries : 0;
    
    // Get longest and shortest entries
    const sortedByDuration = [...entries].sort((a, b) => b.duration - a.duration);
    const longest = sortedByDuration.length > 0 ? sortedByDuration[0] : null;
    const shortest = sortedByDuration.length > 0 ? sortedByDuration[sortedByDuration.length - 1] : null;
    
    return {
      totalEntries,
      totalDuration,
      avgDuration,
      longest,
      shortest
    };
  }, [entries]);
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Format duration
  const formatDuration = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };
  
  // Handle sorting
  const handleSort = (field: 'start_time' | 'duration' | 'description') => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
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
          <FileText className="h-6 w-6 mr-2 text-purple-600" />
          Time Entries Analysis
        </h2>
        <button className="ml-auto flex items-center px-3 py-2 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition-colors">
          <Download className="h-4 w-4 mr-1" />
          Export Report
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-purple-50 rounded-lg p-5">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Total Entries</h3>
          <div className="text-4xl font-bold text-purple-700">{stats.totalEntries}</div>
          <p className="text-sm text-gray-600 mt-2">Time entries recorded</p>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-5">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Total Duration</h3>
          <div className="text-4xl font-bold text-blue-700">{stats.totalDuration.toFixed(1)}h</div>
          <p className="text-sm text-gray-600 mt-2">Total hours tracked</p>
        </div>
        
        <div className="bg-green-50 rounded-lg p-5">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Average Duration</h3>
          <div className="text-4xl font-bold text-green-700">{stats.avgDuration.toFixed(1)}h</div>
          <p className="text-sm text-gray-600 mt-2">Average time per entry</p>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-medium text-gray-800">Entry Details</h3>
          <div className="ml-auto relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search entries..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {isAdmin && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                )}
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('description')}
                >
                  <div className="flex items-center">
                    Description
                    {sortField === 'description' && (
                      sortDirection === 'asc' ? 
                      <ChevronUp className="h-4 w-4 ml-1" /> : 
                      <ChevronDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('start_time')}
                >
                  <div className="flex items-center">
                    Time
                    {sortField === 'start_time' && (
                      sortDirection === 'asc' ? 
                      <ChevronUp className="h-4 w-4 ml-1" /> : 
                      <ChevronDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('duration')}
                >
                  <div className="flex items-center">
                    Duration
                    {sortField === 'duration' && (
                      sortDirection === 'asc' ? 
                      <ChevronUp className="h-4 w-4 ml-1" /> : 
                      <ChevronDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedEntries.slice(0, 10).map((entry, index) => (
                <tr key={entry.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.user_email || 'Unknown'}
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {entry.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(entry.start_time)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatDuration(entry.duration)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {sortedEntries.length > 10 && (
          <div className="mt-4 text-center">
            <button className="text-purple-600 hover:text-purple-800 text-sm font-medium">
              View All {sortedEntries.length} Entries
            </button>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Longest Entry</h3>
          {stats.longest ? (
            <div>
              <p className="font-medium text-gray-900">{stats.longest.description}</p>
              <div className="mt-2 flex justify-between">
                <p className="text-sm text-gray-600">{formatDate(stats.longest.start_time)}</p>
                <p className="text-sm font-medium text-gray-900">{formatDuration(stats.longest.duration)}</p>
              </div>
              {isAdmin && stats.longest.user_email && (
                <p className="mt-2 text-xs text-gray-500">Logged by: {stats.longest.user_email}</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No entries available</p>
          )}
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Shortest Entry</h3>
          {stats.shortest ? (
            <div>
              <p className="font-medium text-gray-900">{stats.shortest.description}</p>
              <div className="mt-2 flex justify-between">
                <p className="text-sm text-gray-600">{formatDate(stats.shortest.start_time)}</p>
                <p className="text-sm font-medium text-gray-900">{formatDuration(stats.shortest.duration)}</p>
              </div>
              {isAdmin && stats.shortest.user_email && (
                <p className="mt-2 text-xs text-gray-500">Logged by: {stats.shortest.user_email}</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No entries available</p>
          )}
        </div>
      </div>
    </div>
  );
} 