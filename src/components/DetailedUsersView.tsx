import React, { useMemo } from 'react';
import { ArrowLeft, Users, Download, User } from 'lucide-react';
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

interface DetailedUsersViewProps {
  entries: TimeEntry[];
  users: { id: string; email: string }[];
  onBack: () => void;
}

export default function DetailedUsersView({ entries, users, onBack }: DetailedUsersViewProps) {
  // Calculate user statistics
  const userStats = useMemo(() => {
    const stats: Record<string, {
      userId: string,
      email: string,
      totalHours: number,
      entryCount: number,
      avgDuration: number,
      lastActive: string
    }> = {};
    
    entries.forEach(entry => {
      if (!stats[entry.user_id]) {
        const user = users.find(u => u.id === entry.user_id);
        stats[entry.user_id] = {
          userId: entry.user_id,
          email: user?.email || entry.user_email || 'Unknown',
          totalHours: 0,
          entryCount: 0,
          avgDuration: 0,
          lastActive: entry.start_time
        };
      }
      
      stats[entry.user_id].totalHours += entry.duration;
      stats[entry.user_id].entryCount += 1;
      
      // Update last active if this entry is more recent
      if (new Date(entry.start_time) > new Date(stats[entry.user_id].lastActive)) {
        stats[entry.user_id].lastActive = entry.start_time;
      }
    });
    
    // Calculate average duration
    Object.values(stats).forEach(user => {
      user.avgDuration = user.totalHours / user.entryCount;
    });
    
    return Object.values(stats).sort((a, b) => b.totalHours - a.totalHours);
  }, [entries, users]);
  
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
          <Users className="h-6 w-6 mr-2 text-orange-600" />
          User Activity Analysis
        </h2>
        <button className="ml-auto flex items-center px-3 py-2 bg-orange-50 text-orange-700 rounded-md hover:bg-orange-100 transition-colors">
          <Download className="h-4 w-4 mr-1" />
          Export Report
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-orange-50 rounded-lg p-5">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Active Users</h3>
          <div className="text-4xl font-bold text-orange-700">{userStats.length}</div>
          <p className="text-sm text-gray-600 mt-2">Users with time entries</p>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-5">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Total Hours</h3>
          <div className="text-4xl font-bold text-blue-700">
            {userStats.reduce((sum, user) => sum + user.totalHours, 0).toFixed(1)}h
          </div>
          <p className="text-sm text-gray-600 mt-2">Hours logged by all users</p>
        </div>
        
        <div className="bg-green-50 rounded-lg p-5">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Avg. Hours Per User</h3>
          <div className="text-4xl font-bold text-green-700">
            {userStats.length > 0 
              ? (userStats.reduce((sum, user) => sum + user.totalHours, 0) / userStats.length).toFixed(1) 
              : '0'}h
          </div>
          <p className="text-sm text-gray-600 mt-2">Average hours per user</p>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">User Activity</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Hours
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entries
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Duration
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {userStats.map((user, index) => (
                <tr key={user.userId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {user.totalHours.toFixed(1)}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.entryCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDuration(user.avgDuration)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.lastActive)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Hours by User</h3>
        <div className="h-64">
          <TimeChart 
            entries={entries} 
            title="Hours by User" 
            isAdmin={true} 
          />
        </div>
      </div>
    </div>
  );
} 