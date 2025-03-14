import React, { useMemo } from 'react';
import { Users, Award, Clock, Calendar } from 'lucide-react';

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

interface UserSummaryProps {
  entries: TimeEntry[];
}

const UserSummary: React.FC<UserSummaryProps> = ({ entries }) => {
  const userSummaries = useMemo(() => {
    const summaries: Record<string, {
      userId: string,
      email: string,
      totalHours: number,
      entryCount: number,
      lastActive: string
    }> = {};
    
    entries.forEach(entry => {
      if (!entry.user_email) return;
      
      if (!summaries[entry.user_id]) {
        summaries[entry.user_id] = {
          userId: entry.user_id,
          email: entry.user_email,
          totalHours: 0,
          entryCount: 0,
          lastActive: entry.start_time
        };
      }
      
      summaries[entry.user_id].totalHours += entry.duration;
      summaries[entry.user_id].entryCount += 1;
      
      // Update last active if this entry is more recent
      const entryDate = new Date(entry.start_time);
      const currentLastActive = new Date(summaries[entry.user_id].lastActive);
      if (entryDate > currentLastActive) {
        summaries[entry.user_id].lastActive = entry.start_time;
      }
    });
    
    return Object.values(summaries).sort((a, b) => b.totalHours - a.totalHours);
  }, [entries]);

  const formatDuration = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (userSummaries.length === 0) {
    return (
      <div className="card p-4 md:p-6 mb-6 md:mb-8 animate-fade-in">
        <div className="flex items-center mb-4">
          <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-secondary-100 text-secondary-700 mr-2 md:mr-3">
            <Users className="h-4 w-4 md:h-5 md:w-5" />
          </div>
          <h2 className="text-lg md:text-xl font-semibold text-neutral-900">User Summary</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 md:py-10 text-center">
          <div className="bg-neutral-100 rounded-full p-3 md:p-4 mb-4">
            <Users className="h-6 w-6 md:h-8 md:w-8 text-neutral-400" />
          </div>
          <p className="text-neutral-500 mb-2">No time entries found for any users</p>
          <p className="text-xs md:text-sm text-neutral-400">Time entries will appear here once users start tracking their time</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4 md:p-6 mb-6 md:mb-8 animate-fade-in">
      <div className="flex items-center mb-4 md:mb-5">
        <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-secondary-100 text-secondary-700 mr-2 md:mr-3">
          <Users className="h-4 w-4 md:h-5 md:w-5" />
        </div>
        <h2 className="text-lg md:text-xl font-semibold text-neutral-900">User Summary</h2>
      </div>
      
      {/* Desktop table view */}
      <div className="hidden sm:block responsive-table-container">
        <table className="responsive-table divide-y divide-neutral-200">
          <thead>
            <tr>
              <th scope="col" className="table-header">
                <div className="flex items-center">
                  <Users className="h-3.5 w-3.5 mr-1.5 text-neutral-500" />
                  User
                </div>
              </th>
              <th scope="col" className="table-header">
                <div className="flex items-center">
                  <Clock className="h-3.5 w-3.5 mr-1.5 text-neutral-500" />
                  Total Hours
                </div>
              </th>
              <th scope="col" className="table-header">
                <div className="flex items-center">
                  <Award className="h-3.5 w-3.5 mr-1.5 text-neutral-500" />
                  Entries
                </div>
              </th>
              <th scope="col" className="table-header">
                <div className="flex items-center">
                  <Calendar className="h-3.5 w-3.5 mr-1.5 text-neutral-500" />
                  Last Active
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {userSummaries.map((user, index) => (
              <tr 
                key={user.userId}
                className={`hover:bg-neutral-50 transition-colors ${index === 0 ? 'bg-primary-50/30' : ''}`}
              >
                <td className="table-cell-main">
                  <div className="flex items-center">
                    {index === 0 && (
                      <span className="inline-flex mr-2 items-center justify-center h-5 w-5 rounded-full bg-primary-100">
                        <Award className="h-3 w-3 text-primary-700" />
                      </span>
                    )}
                    {user.email}
                  </div>
                </td>
                <td className="table-cell font-medium text-neutral-700">
                  {formatDuration(user.totalHours)}
                </td>
                <td className="table-cell">
                  {user.entryCount}
                </td>
                <td className="table-cell">
                  {formatDate(user.lastActive)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Mobile card view */}
      <div className="sm:hidden">
        <div className="space-y-3">
          {userSummaries.map((user, index) => (
            <div 
              key={user.userId}
              className={`p-3 rounded-lg border border-neutral-200 ${index === 0 ? 'bg-primary-50/30' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  {index === 0 && (
                    <span className="inline-flex mr-2 items-center justify-center h-5 w-5 rounded-full bg-primary-100">
                      <Award className="h-3 w-3 text-primary-700" />
                    </span>
                  )}
                  <span className="font-medium text-neutral-900 truncate max-w-[180px]">{user.email}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-neutral-50 p-2 rounded">
                  <div className="text-neutral-500 mb-1 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Hours
                  </div>
                  <div className="font-medium text-neutral-700">
                    {formatDuration(user.totalHours)}
                  </div>
                </div>
                
                <div className="bg-neutral-50 p-2 rounded">
                  <div className="text-neutral-500 mb-1 flex items-center">
                    <Award className="h-3 w-3 mr-1" />
                    Entries
                  </div>
                  <div className="font-medium text-neutral-700">
                    {user.entryCount}
                  </div>
                </div>
              </div>
              
              <div className="mt-2 text-xs text-neutral-500 flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                Last active: {formatDate(user.lastActive)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserSummary;