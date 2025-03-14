import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, Plus, Clock, Filter, Users, Calendar, Menu, X, Download, 
  BarChart2, PieChart, Settings, Edit, Trash2, ChevronDown, ChevronUp, 
  FileText, Search, RefreshCw, Clock8, FileSpreadsheet, File, Bell,
  MessageSquare, Play
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import TimeChart from '../components/TimeChart';
import MonthlyReport from '../components/MonthlyReport';
import UserSummary from '../components/UserSummary';
import UserWorkChart from '../components/UserWorkChart';
import DescriptionField from '../components/DescriptionField';
import { toast } from 'react-hot-toast';
import KpiCard from '../components/KpiCard';
import DateRangePicker from '../components/DateRangePicker';
import DetailedHoursView from '../components/DetailedHoursView';
import DetailedAverageView from '../components/DetailedAverageView';
import DetailedEntriesView from '../components/DetailedEntriesView';
import DetailedUsersView from '../components/DetailedUsersView';
import '../glassmorphism.css';
import '../appleBubbles.css';
import '../timelineStyles.css';
import '../neonCardStyles.css';
import '../tableStyles.css';
import '../typography.css';
import '../premiumEffects.css';
import { initGlassmorphismEffect } from '../glassmorphismEffect';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { Fade } from '@mui/material';
// Material UI components
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import Fab from '@mui/material/Fab';
import InputAdornment from '@mui/material/InputAdornment';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import TimeTracker from '../components/TimeTracker';
import ProjectSelector from '../components/ProjectSelector';
import { suggestProject } from '../lib/projectSuggestions';

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
  project?: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [users, setUsers] = useState<{ id: string; email: string }[]>([]);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'entries' | 'charts'>('entries');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'start_time' | 'duration' | 'user_email' | 'description' | 'project' | 'end_time'>('start_time');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(10);
  const [activeView, setActiveView] = useState<'dashboard' | 'hours' | 'average' | 'entries' | 'users'>('dashboard');
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [userInitial, setUserInitial] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [projects, setProjects] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('newest');
  const [activeTracking, setActiveTracking] = useState(false);

  useEffect(() => {
    fetchTimeEntries();
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, selectedUser, dateRange, selectedProject]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showExportOptions && !target.closest('.export-dropdown')) {
        setShowExportOptions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportOptions]);

  useEffect(() => {
    const cleanup = initGlassmorphismEffect();
    return cleanup;
  }, []);

  useEffect(() => {
    // Set page loaded after a small delay to trigger animations
    const timer = setTimeout(() => {
      setPageLoaded(true);
    }, 100);
    
    // Extract user initial from email
    if (user?.email) {
      setUserInitial(user.email.charAt(0).toUpperCase());
    }
    
    // Fetch projects
    fetchProjects();
    
    return () => clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    if (description && selectedProject === 'all') {
      const suggestedProject = suggestProject(description);
      if (suggestedProject) {
        // Don't automatically set the project, just keep the suggestion available
        // in the ProjectSelector component
      }
    }
  }, [description]);

  const fetchUsers = async () => {
    try {
      // First get all unique user_ids from time entries
      const { data: userIds, error: userIdsError } = await supabase
        .from('time_entries')
        .select('user_id')
        .order('user_id');
      
      if (userIdsError) throw userIdsError;
      
      if (userIds && userIds.length > 0) {
        // Filter to get unique user_ids
        const uniqueUserIds = Array.from(new Set(userIds.map(item => item.user_id)));
        
        // Get email for each user_id
        const userPromises = uniqueUserIds.map(async (userId) => {
          const { data: emailData } = await supabase
            .rpc('get_user_email', { user_id: userId });
          
          return {
            id: userId,
            email: emailData || 'Unknown'
          };
        });
        
        const resolvedUsers = await Promise.all(userPromises);
        setUsers(resolvedUsers.filter(user => user.email !== 'Unknown'));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchTimeEntries = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('time_entries')
        .select('*')
        .order('start_time', { ascending: false });

      if (!isAdmin) {
        query = query.eq('user_id', user?.id);
      } else if (selectedUser) {
        query = query.eq('user_id', selectedUser);
      }

      if (dateRange.start) {
        query = query.gte('start_time', dateRange.start);
      }
      if (dateRange.end) {
        query = query.lte('start_time', dateRange.end);
      }
      
      // Check if project column exists before applying filter
      const { data: columnData, error: columnError } = await supabase
        .rpc('get_columns_for_table', { table_name: 'time_entries' });
      
      const hasProjectColumn = !columnError && 
        columnData && 
        columnData.some((col: any) => col.column_name === 'project');
      
      // Add project filter only if the column exists
      if (hasProjectColumn && selectedProject && selectedProject !== 'all') {
        query = query.eq('project', selectedProject);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        const entriesWithEmails = await Promise.all(
          data.map(async (entry) => {
            const { data: emailData } = await supabase
              .rpc('get_user_email', { user_id: entry.user_id });
            
            return { 
              ...entry, 
              user_email: emailData || 'Unknown',
              // Ensure project property exists even if column doesn't
              project: entry.project || null
            };
          })
        );
        
        setEntries(entriesWithEmails);
      } else {
        setEntries([]);
      }
    } catch (error) {
      console.error('Error fetching time entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
  };

  const handleAddTimeEntryClick = () => {
    setDescription('');
    setStartTime('');
    setEndTime('');
    setShowAddForm(true);
  };

  const handleAddTimeEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description || !startTime || !endTime) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    
    try {
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);

      if (endDate <= startDate) {
        toast.error('End time must be after start time');
        setLoading(false);
        return;
      }
      
      // Remove the duration calculation and let the database handle it
      const { error } = await supabase.from('time_entries').insert({
        description,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        user_id: user?.id
        // duration field removed to let the database calculate it
      });
      
      if (error) throw error;
      
      toast.success('Time entry added successfully');
      setShowAddForm(false);
      fetchTimeEntries(); // Refresh the entries list
    } catch (error: any) {
      console.error('Error adding time entry:', error);
      toast.error(`Failed to add time entry: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditEntry = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setDescription(entry.description);
    setStartTime(formatDateForInput(entry.start_time));
    setEndTime(formatDateForInput(entry.end_time));
    setShowEditForm(true);
  };

  const handleUpdateTimeEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (!editingEntry) return;
      
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      
      if (endDate <= startDate) {
        toast.error('End time must be after start time');
        return;
      }
      
      // Remove duration calculation and let the database handle it
      const { error } = await supabase
        .from('time_entries')
        .update({
          description,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          // duration field removed to let the database calculate it
        })
        .eq('id', editingEntry.id);

      if (error) throw error;

      toast.success('Time entry updated successfully');
      setShowEditForm(false);
      setEditingEntry(null);
      setDescription('');
      setStartTime('');
      setEndTime('');
      fetchTimeEntries();
    } catch (error: any) {
      toast.error(`Failed to update time entry: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this time entry?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', entryId);
      
      if (error) throw error;
      
      toast.success('Time entry deleted successfully');
      fetchTimeEntries();
    } catch (error: any) {
      toast.error(`Failed to delete time entry: ${error.message}`);
    }
  };

  const handleGenerateExcelReport = async () => {
    if (isGeneratingReport) return;
    
    setIsGeneratingReport(true);
    toast.loading('Generating Excel report...', { id: 'excel-report' });
    
    try {
      const response = await fetch('https://ginkipafyokhwflkjpjy.functions.supabase.co/generate-admin-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.auth.getSession()}`
        },
        body: JSON.stringify({
          dateRange: dateRange.start && dateRange.end ? {
            start: dateRange.start,
            end: dateRange.end
          } : null
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }
      
      const data = await response.json();
      
      if (data.url) {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = data.url;
        link.setAttribute('download', 'time-entries-report.xlsx');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('Excel report generated successfully', { id: 'excel-report' });
      } else {
        throw new Error('No download URL returned');
      }
    } catch (error: any) {
      console.error('Error generating Excel report:', error);
      toast.error(`Failed to generate report: ${error.message}`, { id: 'excel-report' });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateLong = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDuration = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleDownloadExcel = async () => {
    try {
      // First check if the file exists
      const { data: fileData, error: fileError } = await supabase
        .storage
        .from('exports')
        .list('', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' }
        });
      
      if (fileError) {
        throw new Error(`Error checking file: ${fileError.message}`);
      }
      
      const fileExists = fileData?.some(file => file.name === 'time-entries.xlsx');
      
      if (!fileExists) {
        toast.error('Excel file does not exist yet. Create a time entry first to generate it.');
        return;
      }
      
      // Now try to download the file
      const { data, error } = await supabase
        .storage
        .from('exports')
        .download('time-entries.xlsx');
      
      if (error) {
        throw new Error(`Download error: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('No data received from storage');
      }
      
      // Create a download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'time-entries.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Excel file downloaded successfully');
    } catch (error: unknown) {
      console.error('Error downloading Excel file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to download Excel file: ${errorMessage}`);
    }
  };

  // Calculate KPI metrics
  const totalHours = useMemo(() => {
    return entries.reduce((sum, entry) => sum + entry.duration, 0);
  }, [entries]);

  const averageDailyHours = useMemo(() => {
    if (entries.length === 0) return 0;
    
    // Get unique dates from entries
    const uniqueDates = new Set(
      entries.map(entry => new Date(entry.start_time).toDateString())
    );
    
    return totalHours / uniqueDates.size;
  }, [entries, totalHours]);

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
      } else if (sortField === 'user_email') {
        comparison = (a.user_email || '').localeCompare(b.user_email || '');
      } else if (sortField === 'description') {
        comparison = a.description.localeCompare(b.description);
      } else if (sortField === 'project') {
        comparison = (a.project || '').localeCompare(b.project || '');
      } else if (sortField === 'end_time') {
        comparison = new Date(a.end_time).getTime() - new Date(b.end_time).getTime();
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredEntries, sortField, sortDirection]);

  // Paginate entries
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * entriesPerPage;
    return sortedEntries.slice(startIndex, startIndex + entriesPerPage);
  }, [sortedEntries, currentPage, entriesPerPage]);

  // Calculate total pages
  const totalPages = Math.ceil(sortedEntries.length / entriesPerPage);

  // Toggle entry selection
  const toggleEntrySelection = (id: string) => {
    setSelectedEntries(prev => 
      prev.includes(id) 
        ? prev.filter(entryId => entryId !== id)
        : [...prev, id]
    );
  };

  // Toggle select all entries
  const toggleSelectAll = () => {
    if (selectedEntries.length === paginatedEntries.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(paginatedEntries.map(entry => entry.id));
    }
  };

  // Handle sorting
  const handleSort = (field: 'start_time' | 'duration' | 'user_email' | 'description' | 'project' | 'end_time') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Helper function to get sort class for table headers
  const getSortClass = (field: string) => {
    if (sortField === field) {
      return sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc';
    }
    return 'sortable';
  };

  const handleViewHours = () => setActiveView('hours');
  const handleViewAverage = () => setActiveView('average');
  const handleViewEntries = () => setActiveView('entries');
  const handleViewUsers = () => setActiveView('users');
  const handleBackToDashboard = () => setActiveView('dashboard');

  const fetchProjects = async () => {
    try {
      // First check if the projects table exists
      const { data: tableExists, error: tableError } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true });
      
      if (tableError && tableError.code === '42P01') {
        // Table doesn't exist, fall back to old method
        console.log('Projects table does not exist, falling back to time_entries');
        
        // Check if the project column exists in time_entries
        const { data: columnData, error: columnError } = await supabase
          .rpc('get_columns_for_table', { table_name: 'time_entries' });
        
        if (columnError) {
          console.error('Error checking columns:', columnError);
          setProjects([]);
          return;
        }
        
        // Check if project column exists in the returned columns
        const hasProjectColumn = columnData && columnData.some((col: any) => col.column_name === 'project');
        
        if (!hasProjectColumn) {
          console.log('Project column does not exist in time_entries table');
          setProjects([]);
          return;
        }
        
        // If project column exists, fetch projects from time_entries
        const { data, error } = await supabase
          .from('time_entries')
          .select('project')
          .is('project', 'not.null');
        
        if (error) throw error;
        
        // Extract unique projects
        const uniqueProjects = Array.from(new Set(data.map(entry => entry.project).filter(Boolean)));
        setProjects(uniqueProjects);
      } else {
        // Projects table exists, use it
        const { data, error } = await supabase
          .from('projects')
          .select('name')
          .eq('is_active', true)
          .order('name');
        
        if (error) throw error;
        
        // Extract project names
        const projectNames = data.map(project => project.name);
        setProjects(projectNames);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to fetch projects');
      setProjects([]);
    }
  };
  
  const handleStartTracking = () => {
    setActiveTracking(true);
  };
  
  const handleStopTracking = () => {
    setActiveTracking(false);
    fetchTimeEntries(); // Refresh entries after stopping
  };
  
  const getProjectColor = (project?: string): string => {
    if (!project) return 'rgba(107, 114, 128, 0.8)'; // Default gray
    
    // Generate a consistent color based on the project name
    const hash = project.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    const colors = [
      'rgba(59, 130, 246, 0.8)', // Blue
      'rgba(16, 185, 129, 0.8)', // Green
      'rgba(245, 158, 11, 0.8)', // Orange
      'rgba(139, 92, 246, 0.8)', // Purple
      'rgba(236, 72, 153, 0.8)', // Pink
      'rgba(239, 68, 68, 0.8)', // Red
      'rgba(14, 165, 233, 0.8)', // Sky
      'rgba(20, 184, 166, 0.8)', // Teal
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };
  
  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const groupEntriesByDate = (entries: TimeEntry[]): Record<string, TimeEntry[]> => {
    return entries.reduce((groups, entry) => {
      const date = new Date(entry.start_time).toISOString().split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
      return groups;
    }, {} as Record<string, TimeEntry[]>);
  };
  
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  return (
    <ThemeProvider theme={createTheme()}>
      <Fade in={pageLoaded} timeout={300}>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <header className="glass-header sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
                  <Clock className="h-7 w-7 text-blue-600 premium-icon" />
                  <h1 className="ml-2 text-xl font-heading font-bold text-gray-900 tracking-tight">
                TimeTrack Pro
              </h1>
            </div>
            
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={() => navigate('/welcome')}
                    className="premium-button"
                    sx={{ 
                      color: '#3b82f6',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                      fontWeight: 600,
                      letterSpacing: '0.01em',
                      '&:hover': {
                        backgroundColor: 'rgba(59, 130, 246, 0.1)'
                      }
                    }}
                  >
                    Welcome Dashboard
                  </Button>
                  
                  <IconButton
                    className="reflection-effect"
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.7)',
                      border: '1px solid rgba(180, 180, 190, 0.3)',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
                      }
                    }}
                  >
                    <Bell size={20} className="text-gray-600 premium-icon" />
                  </IconButton>
                  
                  <Avatar 
                    sx={{ 
                      bgcolor: 'rgba(11, 147, 246, 0.85)',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(11, 147, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(11, 147, 246, 0.3)'
                      }
                    }}
                  onClick={handleSignOut}
                >
                    {userInitial}
                  </Avatar>
              </div>
            </div>
          </div>
      </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Time Tracker */}
            <TimeTracker
                description={description} 
              project={selectedProject !== 'all' ? selectedProject : undefined}
              onDescriptionChange={setDescription}
              onProjectChange={(project) => setSelectedProject(project || 'all')}
              onTrackingStarted={handleStartTracking}
              onTrackingStopped={handleStopTracking}
              customProjects={projects}
            />
            
            {/* Chat Input - Only show if not actively tracking */}
            {!activeTracking && (
              <div className="mb-6 scale-in">
                <Paper
                  className="premium-card brushed-metal"
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    mb: 2
                  }}
                >
                  <InputBase
                    sx={{ 
                      ml: 1, 
                      flex: 1,
                      backgroundColor: 'rgba(255, 255, 255, 0.6)',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      color: 'rgba(0, 0, 0, 0.7)',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                      fontSize: '0.95rem',
                      letterSpacing: '-0.006em',
                      transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.03)'
                      }
                    }}
                    placeholder="What would you like to track today?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    startAdornment={<MessageSquare className="h-5 w-5 text-gray-400 mr-2 premium-icon" />}
                  />
                  <Fab 
                    color="primary" 
                    aria-label="add" 
                    size="small" 
                    onClick={handleStartTracking}
                    className="premium-button primary"
                    sx={{ 
                      ml: 1,
                      backgroundColor: 'rgba(11, 147, 246, 0.85)',
                      color: 'white',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 2px 8px rgba(11, 147, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                      '&:hover': {
                        backgroundColor: 'rgba(11, 147, 246, 0.95)',
                        boxShadow: '0 4px 12px rgba(11, 147, 246, 0.3)',
                        transform: 'translateY(-1px) scale(1.05)'
                      }
                    }}
                  >
                    <Play className="premium-icon" />
                  </Fab>
                </Paper>
          </div>
        )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="premium-kpi-card blue reflection-effect">
                  <div className="kpi-icon premium-icon"><Clock className="h-5 w-5" /></div>
                  <div className="kpi-value">{totalHours.toFixed(1)}</div>
                  <div className="kpi-title">Total Hours</div>
            </div>
              </div>
              
              <div className="fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="premium-kpi-card purple reflection-effect">
                  <div className="kpi-icon premium-icon"><BarChart2 className="h-5 w-5" /></div>
                  <div className="kpi-value">{averageDailyHours.toFixed(1)}</div>
                  <div className="kpi-title">Avg Hours/Day</div>
              </div>
              </div>
              
              <div className="fade-in" style={{ animationDelay: '0.3s' }}>
                <div className="premium-kpi-card green reflection-effect">
                  <div className="kpi-icon premium-icon"><FileText className="h-5 w-5" /></div>
                  <div className="kpi-value">{entries.length}</div>
                  <div className="kpi-title">Total Entries</div>
            </div>
          </div>
              
              <div className="fade-in" style={{ animationDelay: '0.4s' }}>
                <div className="premium-kpi-card orange reflection-effect">
                  <div className="kpi-icon premium-icon"><Users className="h-5 w-5" /></div>
                  <div className="kpi-value">{users.length}</div>
                  <div className="kpi-title">Active Users</div>
                    </div>
                  </div>
                    </div>

            {/* Filters */}
            <div className="mb-6 fade-in" style={{ animationDelay: '0.5s' }}>
              <Paper
                className="premium-card brushed-metal"
                sx={{
                  p: 3,
                  mb: 4
                }}
              >
                <Typography 
                  variant="h6" 
                  component="h2" 
                  className="font-heading"
                  sx={{ 
                    fontWeight: 600, 
                    color: '#1f2937',
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    letterSpacing: '-0.005em'
                  }}
                >
                  <Filter className="h-5 w-5 text-blue-500 mr-2 premium-icon" />
                  Filters
                </Typography>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ProjectSelector
                    value={selectedProject}
                    onChange={setSelectedProject}
                    description={description}
                    customProjects={projects}
                    label="Project"
                    className="premium-select"
                  />
                  
                  <FormControl fullWidth>
                    <InputLabel id="date-range-label">Date Range</InputLabel>
                    <Select
                      labelId="date-range-label"
                      value={dateRange.start ? 'custom' : 'all_time'}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'today') {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          setDateRange({
                            start: today.toISOString(),
                            end: new Date().toISOString()
                          });
                        } else if (value === 'yesterday') {
                          const yesterday = new Date();
                          yesterday.setDate(yesterday.getDate() - 1);
                          yesterday.setHours(0, 0, 0, 0);
                          const yesterdayEnd = new Date();
                          yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
                          yesterdayEnd.setHours(23, 59, 59, 999);
                          setDateRange({
                            start: yesterday.toISOString(),
                            end: yesterdayEnd.toISOString()
                          });
                        } else if (value === 'this_week') {
                          const today = new Date();
                          const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
                          firstDay.setHours(0, 0, 0, 0);
                          setDateRange({
                            start: firstDay.toISOString(),
                            end: new Date().toISOString()
                          });
                        } else if (value === 'last_week') {
                          const today = new Date();
                          const firstDay = new Date(today.setDate(today.getDate() - today.getDay() - 7));
                          firstDay.setHours(0, 0, 0, 0);
                          const lastDay = new Date(today);
                          lastDay.setDate(lastDay.getDate() + 6);
                          lastDay.setHours(23, 59, 59, 999);
                          setDateRange({
                            start: firstDay.toISOString(),
                            end: lastDay.toISOString()
                          });
                        } else if (value === 'this_month') {
                          const today = new Date();
                          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                          setDateRange({
                            start: firstDay.toISOString(),
                            end: new Date().toISOString()
                          });
                        } else if (value === 'last_month') {
                          const today = new Date();
                          const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                          const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                          lastDay.setHours(23, 59, 59, 999);
                          setDateRange({
                            start: firstDay.toISOString(),
                            end: lastDay.toISOString()
                          });
                        } else if (value === 'all_time') {
                          setDateRange({
                            start: '',
                            end: ''
                          });
                        }
                      }}
                      label="Date Range"
                      className="premium-select"
                    >
                      <MenuItem value="today">Today</MenuItem>
                      <MenuItem value="yesterday">Yesterday</MenuItem>
                      <MenuItem value="this_week">This Week</MenuItem>
                      <MenuItem value="last_week">Last Week</MenuItem>
                      <MenuItem value="this_month">This Month</MenuItem>
                      <MenuItem value="last_month">Last Month</MenuItem>
                      <MenuItem value="all_time">All Time</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth>
                    <InputLabel id="sort-label">Sort By</InputLabel>
                    <Select
                      labelId="sort-label"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      label="Sort By"
                      className="premium-select"
                    >
                      <MenuItem value="newest">Newest First</MenuItem>
                      <MenuItem value="oldest">Oldest First</MenuItem>
                      <MenuItem value="longest">Longest Duration</MenuItem>
                      <MenuItem value="shortest">Shortest Duration</MenuItem>
                    </Select>
                  </FormControl>
                  </div>
              </Paper>
                </div>

            {/* Time Entries Table */}
            <div className="fade-in" style={{ animationDelay: '0.6s' }}>
              <Paper
                className="premium-card brushed-metal"
                sx={{
                  overflow: 'hidden',
                  mb: 4
                }}
              >
                <Typography 
                  variant="h6" 
                  component="h2" 
                  className="font-heading"
                  sx={{ 
                    fontWeight: 600, 
                    color: '#1f2937',
                    p: 3,
                    pb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    letterSpacing: '-0.005em'
                  }}
                >
                  <Clock className="h-5 w-5 text-blue-500 mr-2 premium-icon" />
                  Time Entries
                </Typography>
                
                {loading ? (
                  <div className="loading-spinner">
                    <div className="spinner"></div>
              </div>
            ) : (
              <>
                    <div className="modern-table-container">
                      <table className="modern-table">
                    <thead>
                      <tr>
                            <th className="w-1/4 cursor-pointer" onClick={() => handleSort('description')}>
                              Description
                              {sortField === 'description' && (
                                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                          </th>
                            <th className="w-1/6 cursor-pointer" onClick={() => handleSort('project')}>
                              Project
                              {sortField === 'project' && (
                                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                        </th>
                            <th className="w-1/6 cursor-pointer" onClick={() => handleSort('start_time')}>
                          Start Time
                              {sortField === 'start_time' && (
                                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                        </th>
                            <th className="w-1/6 cursor-pointer" onClick={() => handleSort('end_time')}>
                          End Time
                              {sortField === 'end_time' && (
                                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                        </th>
                            <th className="w-1/6 cursor-pointer" onClick={() => handleSort('duration')}>
                          Duration
                              {sortField === 'duration' && (
                                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                        </th>
                            <th className="w-1/12">Actions</th>
                      </tr>
                    </thead>
                        <tbody>
                          {paginatedEntries.map((entry) => (
                            <tr key={entry.id}>
                              <td>{entry.description}</td>
                              <td>
                                <Chip 
                                  label={entry.project || 'No Project'} 
                                  size="small"
                                  sx={{ 
                                    backgroundColor: getProjectColor(entry.project),
                                    color: '#fff',
                                    fontWeight: 600,
                                    borderRadius: '6px',
                                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                                    letterSpacing: '0.01em',
                                    border: `1px solid ${getProjectColor(entry.project)}80`,
                                    transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                                    '&:hover': {
                                      backgroundColor: getProjectColor(entry.project),
                                      boxShadow: `0 2px 4px ${getProjectColor(entry.project)}40`
                                    }
                                  }}
                                />
                            </td>
                              <td>{formatDateTime(entry.start_time)}</td>
                              <td>{formatDateTime(entry.end_time)}</td>
                              <td>{entry.duration.toFixed(1)} hrs</td>
                              <td>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="premium-icon-button"
                                >
                                  <Trash2 size={16} className="text-red-500 premium-icon" />
                                </IconButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                    <div className="pagination-controls">
                      <Button 
                        onClick={() => handlePageChange(currentPage - 1)} 
                        disabled={currentPage === 1}
                        className="premium-button"
                      >
                        Previous
                      </Button>
                      <span className="pagination-info">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button 
                        onClick={() => handlePageChange(currentPage + 1)} 
                        disabled={currentPage === totalPages}
                        className="premium-button"
                      >
                        Next
                      </Button>
                          </div>
                  </>
                )}
              </Paper>
            </div>

            {/* Timeline */}
            {paginatedEntries.length > 0 && (
              <div className="fade-in" style={{ animationDelay: '0.7s' }}>
                <Paper
                  className="premium-card brushed-metal"
                  sx={{
                    p: 3
                  }}
                >
                  <Typography 
                    variant="h6" 
                    component="h2" 
                    className="font-heading"
                    sx={{ 
                      fontWeight: 600, 
                      color: '#1f2937',
                      mb: 3,
                      display: 'flex',
                      alignItems: 'center',
                      letterSpacing: '-0.005em'
                    }}
                  >
                    <Calendar className="h-5 w-5 text-blue-500 mr-2 premium-icon" />
                    Timeline
                  </Typography>
                  
                  <Timeline position="alternate">
                    {Object.entries(groupEntriesByDate(paginatedEntries)).map(([date, entries]) => (
                      <React.Fragment key={date}>
                        <TimelineItem>
                          <TimelineSeparator>
                            <TimelineDot 
                              sx={{ 
                                bgcolor: 'rgba(11, 147, 246, 0.85)',
                                boxShadow: '0 0 10px rgba(11, 147, 246, 0.5), 0 0 20px rgba(11, 147, 246, 0.3), 0 0 30px rgba(11, 147, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.4)',
                              }}
                            >
                              <Calendar className="h-4 w-4 premium-icon" />
                            </TimelineDot>
                            <TimelineConnector />
                          </TimelineSeparator>
                          <TimelineContent>
                            <Typography 
                              variant="subtitle1" 
                              component="span" 
                              className="font-heading"
                              sx={{ 
                                fontWeight: 600,
                                color: '#1f2937',
                                letterSpacing: '-0.009em'
                              }}
                            >
                              {formatDateLong(date)}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              color="textSecondary"
                              sx={{ 
                                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                                letterSpacing: '-0.006em'
                              }}
                            >
                              {entries.length} entries, {entries.reduce((acc, entry) => acc + entry.duration, 0).toFixed(1)} hours
                            </Typography>
                          </TimelineContent>
                        </TimelineItem>
                        
                        {entries.map((entry) => {
                          const isCurrentUser = entry.user_id === user?.id;
                          const color = isCurrentUser ? 'rgba(11, 147, 246, 0.85)' : 'rgba(107, 114, 128, 0.85)';
                          const glowColor = isCurrentUser ? 'rgba(11, 147, 246, 0.5)' : 'rgba(107, 114, 128, 0.5)';
                          
                          return (
                            <TimelineItem key={entry.id}>
                              <TimelineSeparator>
                                <TimelineDot 
                                  sx={{ 
                                    bgcolor: color,
                                    boxShadow: `0 0 10px ${glowColor}, 0 0 20px ${glowColor.replace('0.5', '0.3')}, 0 0 30px ${glowColor.replace('0.5', '0.1')}`,
                                    border: isCurrentUser ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(107, 114, 128, 0.4)',
                                    transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                                    '&:hover': {
                                      transform: 'scale(1.1)',
                                      boxShadow: `0 0 15px ${glowColor}, 0 0 25px ${glowColor.replace('0.5', '0.3')}, 0 0 35px ${glowColor.replace('0.5', '0.1')}`
                                    }
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.1)';
                                    e.currentTarget.style.boxShadow = `0 0 15px ${glowColor}, 0 0 25px ${glowColor.replace('0.5', '0.3')}, 0 0 35px ${glowColor.replace('0.5', '0.1')}`;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = `0 0 10px ${glowColor}, 0 0 20px ${glowColor.replace('0.5', '0.3')}, 0 0 30px ${glowColor.replace('0.5', '0.1')}`;
                                  }}
                                />
                                <TimelineConnector />
                              </TimelineSeparator>
                              <TimelineContent>
                                <Paper
                                  className="premium-card"
                                  sx={{
                                    p: 2,
                                    mb: 2
                                  }}
                                >
                                  <Typography 
                                    variant="subtitle2" 
                                    component="div" 
                                    className="font-body"
                                    sx={{ 
                                      fontWeight: 600,
                                      color: '#1f2937',
                                      mb: 1,
                                      letterSpacing: '-0.006em'
                                    }}
                                  >
                                    {entry.description}
                                  </Typography>
                                  
                                  <div className="flex justify-between items-center">
                                    <Chip 
                                      label={entry.project || 'No Project'} 
                                      size="small"
                                      sx={{ 
                                        backgroundColor: `${getProjectColor(entry.project)}20`,
                                        color: getProjectColor(entry.project),
                                        fontWeight: 600,
                                        borderRadius: '6px',
                                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                                        letterSpacing: '0.01em',
                                        border: `1px solid ${getProjectColor(entry.project)}40`,
                                        transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                                        '&:hover': {
                                          backgroundColor: `${getProjectColor(entry.project)}30`,
                                          boxShadow: `0 2px 4px ${getProjectColor(entry.project)}10`
                                        }
                                      }}
                                    />
                                    
                                    <Typography 
                                      variant="caption" 
                                      className="caption"
                                      sx={{ 
                                        color: '#6b7280',
                                        letterSpacing: '0.01em',
                                        fontWeight: 500
                                      }}
                                    >
                                      {formatTime(entry.start_time)} - {formatTime(entry.end_time)} ({entry.duration.toFixed(1)} hrs)
                                    </Typography>
                          </div>
                                </Paper>
                              </TimelineContent>
                            </TimelineItem>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </Timeline>
                </Paper>
          </div>
        )}
      </main>
    </div>
      </Fade>
    </ThemeProvider>
  );
}