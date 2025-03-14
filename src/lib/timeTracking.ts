import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';

interface TimeTrackingSession {
  description: string;
  project?: string;
  startTime: string;
  isTracking: boolean;
}

// Initialize with empty session
const initialSession: TimeTrackingSession = {
  description: '',
  project: undefined,
  startTime: '',
  isTracking: false
};

// Use localStorage to persist tracking state across page refreshes
const STORAGE_KEY = 'timetrack_active_session';

/**
 * Get the current tracking session from localStorage
 */
export const getTrackingSession = (): TimeTrackingSession => {
  const storedSession = localStorage.getItem(STORAGE_KEY);
  if (storedSession) {
    try {
      return JSON.parse(storedSession);
    } catch (e) {
      console.error('Error parsing stored session:', e);
      return { ...initialSession };
    }
  }
  return { ...initialSession };
};

/**
 * Save the current tracking session to localStorage
 */
export const saveTrackingSession = (session: TimeTrackingSession): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

/**
 * Clear the current tracking session from localStorage
 */
export const clearTrackingSession = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

/**
 * Start tracking time
 */
export const startTracking = (description: string, project?: string): TimeTrackingSession => {
  if (!description.trim()) {
    toast.error('Please enter a description');
    return getTrackingSession();
  }
  
  const session: TimeTrackingSession = {
    description,
    project,
    startTime: new Date().toISOString(),
    isTracking: true
  };
  
  saveTrackingSession(session);
  toast.success('Started tracking time');
  
  return session;
};

/**
 * Stop tracking time and save the entry
 */
export const stopTracking = async (): Promise<boolean> => {
  const session = getTrackingSession();
  
  if (!session.isTracking) {
    toast.error('No active tracking session');
    return false;
  }
  
  const endTime = new Date().toISOString();
  
  try {
    const { error } = await supabase.from('time_entries').insert({
      description: session.description,
      project: session.project,
      start_time: session.startTime,
      end_time: endTime
    });
    
    if (error) throw error;
    
    clearTrackingSession();
    toast.success('Time entry saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving time entry:', error);
    toast.error('Failed to save time entry');
    return false;
  }
};

/**
 * Check if there's an active tracking session
 */
export const isTracking = (): boolean => {
  return getTrackingSession().isTracking;
};

/**
 * Get the elapsed time of the current tracking session in seconds
 */
export const getElapsedTime = (): number => {
  const session = getTrackingSession();
  
  if (!session.isTracking) {
    return 0;
  }
  
  const startTime = new Date(session.startTime).getTime();
  const currentTime = new Date().getTime();
  
  return Math.floor((currentTime - startTime) / 1000);
};

/**
 * Format seconds into a human-readable duration (HH:MM:SS)
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].join(':');
};

/**
 * Get the current tracking session details for display
 */
export const getTrackingDetails = (): { description: string; project?: string; duration: string } => {
  const session = getTrackingSession();
  
  if (!session.isTracking) {
    return { description: '', duration: '00:00:00' };
  }
  
  return {
    description: session.description,
    project: session.project,
    duration: formatDuration(getElapsedTime())
  };
}; 