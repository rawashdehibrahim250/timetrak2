import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { summarizeText } from '../lib/ai';

interface TimeEntry {
  id: string;
  created_at: string;
  description: string;
  description_summary?: string;
  start_time: string;
  end_time: string;
  duration: number;
  user_id: string;
  user_email?: string;
}

interface User {
  id: string;
  email: string;
}

interface DateRange {
  start: string;
  end: string;
}

interface UseTimeEntriesProps {
  isAdmin: boolean;
  userId: string | undefined;
  selectedUser: string;
  dateRange: DateRange;
}

export const useTimeEntries = ({ isAdmin, userId, selectedUser, dateRange }: UseTimeEntriesProps) => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [cacheKey, setCacheKey] = useState('');

  // Create a cache key based on filters
  useEffect(() => {
    const key = `${isAdmin ? 'admin' : 'user'}-${selectedUser || userId}-${dateRange.start}-${dateRange.end}`;
    setCacheKey(key);
  }, [isAdmin, userId, selectedUser, dateRange]);

  // Check if we have cached data
  useEffect(() => {
    const cachedData = sessionStorage.getItem(`timeEntries-${cacheKey}`);
    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        // Only use cache if it's less than 5 minutes old
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setEntries(data);
          return;
        }
      } catch (e) {
        // Invalid cache, will fetch fresh data
      }
    }
    
    // No valid cache, fetch data
    fetchTimeEntries();
  }, [cacheKey]);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    
    try {
      // Instead of using admin.listUsers which requires admin privileges,
      // we'll get users from time entries
      const { data, error } = await supabase
        .from('time_entries')
        .select('user_id')
        .distinct();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // For each unique user_id, get the email
        const userPromises = data.map(async (item) => {
          const { data: emailData } = await supabase
            .rpc('get_user_email', { user_id: item.user_id });
          
          return {
            id: item.user_id,
            email: emailData || 'Unknown'
          };
        });
        
        const resolvedUsers = await Promise.all(userPromises);
        setUsers(resolvedUsers.filter(user => user.email !== 'Unknown'));
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
    }
  }, [isAdmin]);

  const fetchTimeEntries = useCallback(async () => {
    setLoading(true);
    try {
      // First, fetch the time entries
      let query = supabase
        .from('time_entries')
        .select('*')
        .order('start_time', { ascending: false });

      if (!isAdmin) {
        query = query.eq('user_id', userId);
      } else if (selectedUser) {
        query = query.eq('user_id', selectedUser);
      }

      if (dateRange.start) {
        query = query.gte('start_time', dateRange.start);
      }
      if (dateRange.end) {
        query = query.lte('start_time', dateRange.end);
      }

      const { data, error } = await query;

      if (error) throw error;

      // If we have entries, fetch user emails for each entry
      if (data && data.length > 0) {
        const entriesWithEmails = await Promise.all(
          data.map(async (entry) => {
            // For each entry, call the function to get the user email
            const { data: emailData, error: emailError } = await supabase
              .rpc('get_user_email', { user_id: entry.user_id });
            
            if (emailError) {
              console.error('Error fetching email:', emailError);
              return { ...entry, user_email: 'Unknown' };
            }
            
            // Generate summaries for long descriptions
            let entrySummary = entry.description_summary;
            if (!entrySummary && entry.description && entry.description.length > 200) {
              try {
                entrySummary = await summarizeText(entry.description);
              } catch (e) {
                console.error('Error generating summary:', e);
              }
            }
            
            return { 
              ...entry, 
              user_email: emailData || 'Unknown',
              description_summary: entrySummary
            };
          })
        );
        
        // Cache the results
        sessionStorage.setItem(`timeEntries-${cacheKey}`, JSON.stringify({
          data: entriesWithEmails,
          timestamp: Date.now()
        }));
        
        setEntries(entriesWithEmails);
      } else {
        // Cache empty results too
        sessionStorage.setItem(`timeEntries-${cacheKey}`, JSON.stringify({
          data: data || [],
          timestamp: Date.now()
        }));
        
        setEntries(data || []);
      }
    } catch (error: any) {
      toast.error('Error fetching time entries');
      console.error('Error fetching time entries:', error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, userId, selectedUser, dateRange, cacheKey]);

  const addTimeEntry = useCallback(async (description: string, startTime: string, endTime: string) => {
    setLoading(true);
    try {
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);

      if (endDate <= startDate) {
        throw new Error('End time must be after start time');
      }
      
      // Generate summary for long descriptions
      let description_summary = null;
      if (description.length > 200) {
        try {
          description_summary = await summarizeText(description);
        } catch (e) {
          console.error('Error generating summary:', e);
        }
      }

      const { error } = await supabase.from('time_entries').insert([
        {
          description,
          description_summary,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          user_id: userId,
        },
      ]);

      if (error) throw error;

      toast.success('Time entry added successfully');
      // Clear cache to force refresh
      sessionStorage.removeItem(`timeEntries-${cacheKey}`);
      await fetchTimeEntries();
      return true;
    } catch (error: any) {
      toast.error(
      )
    }
  }
  )
}