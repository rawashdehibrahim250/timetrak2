import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, BarChart2, FileText, Users, Calendar, Star, AlertTriangle,
  CheckCircle, ArrowRight, LogOut, Bell, Search
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import KpiCard from '../components/KpiCard';
import TimeTracker from '../components/TimeTracker';
import '../glassmorphism.css';
import '../neonCardStyles.css';
import '../tableStyles.css';
import '../typography.css';
import '../premiumEffects.css';
import { initGlassmorphismEffect } from '../glassmorphismEffect';
import { 
  Typography, 
  Paper, 
  Button, 
  Avatar, 
  InputBase, 
  IconButton,
  Chip,
  Box,
  Divider,
  ThemeProvider,
  createTheme,
  Fade
} from '@mui/material';
import { TransitionGroup, CSSTransition } from 'react-transition-group';

interface Task {
  id: string;
  title: string;
  description: string;
  due_date: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  user_id: string;
  created_at: string;
}

interface TimeEntry {
  id: string;
  description: string;
  start_time: string;
  end_time: string;
  duration: number;
  user_id: string;
}

// Create a custom theme with our typography settings
const theme = createTheme({
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    h1: {
      fontFamily: "'Playfair Display', Georgia, serif",
      fontWeight: 700,
      letterSpacing: '-0.03em',
      lineHeight: 1.2
    },
    h2: {
      fontFamily: "'Playfair Display', Georgia, serif",
      fontWeight: 700,
      letterSpacing: '-0.025em',
      lineHeight: 1.25
    },
    h3: {
      fontFamily: "'Playfair Display', Georgia, serif",
      fontWeight: 700,
      letterSpacing: '-0.02em',
      lineHeight: 1.3
    },
    h4: {
      fontFamily: "'Playfair Display', Georgia, serif",
      fontWeight: 700,
      letterSpacing: '-0.015em',
      lineHeight: 1.35
    },
    h5: {
      fontFamily: "'Playfair Display', Georgia, serif",
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.4
    },
    h6: {
      fontFamily: "'Playfair Display', Georgia, serif",
      fontWeight: 600,
      letterSpacing: '-0.005em',
      lineHeight: 1.45
    },
    subtitle1: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      fontWeight: 600,
      letterSpacing: '-0.009em',
      lineHeight: 1.5
    },
    subtitle2: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      fontWeight: 500,
      letterSpacing: '-0.006em',
      lineHeight: 1.5
    },
    body1: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      letterSpacing: '-0.011em',
      lineHeight: 1.6
    },
    body2: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      letterSpacing: '-0.006em',
      lineHeight: 1.5
    },
    button: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      fontWeight: 600,
      letterSpacing: '0.01em',
      textTransform: 'none'
    },
    caption: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      letterSpacing: '0.01em',
      lineHeight: 1.4
    },
    overline: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      letterSpacing: '0.08em',
      lineHeight: 1.4,
      textTransform: 'uppercase'
    }
  },
  components: {
    MuiPaper: {
      defaultProps: {
        elevation: 0
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 16px',
          transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        },
        contained: {
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)'
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }
      }
    }
  }
});

export default function WelcomeDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userInitial, setUserInitial] = useState('');
  const [pageLoaded, setPageLoaded] = useState(false);
  const [userTasks, setUserTasks] = useState<Task[]>([]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    if (user?.email) {
      const initial = user.email.charAt(0).toUpperCase();
      setUserInitial(initial);
    }

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const cleanup = initGlassmorphismEffect();
    return cleanup;
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchTimeEntries();
  }, []);

  useEffect(() => {
    // Set page loaded after a small delay to trigger animations
    const timer = setTimeout(() => {
      setPageLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      // Mock data for tasks since we don't have a tasks table yet
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Complete project proposal',
          description: 'Finish the draft for the new client project',
          due_date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
          priority: 'high',
          status: 'in_progress',
          user_id: user?.id || '',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Review team timesheets',
          description: 'Check and approve team time entries for the week',
          due_date: new Date(Date.now() + 172800000).toISOString(), // day after tomorrow
          priority: 'medium',
          status: 'pending',
          user_id: user?.id || '',
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          title: 'Client meeting preparation',
          description: 'Prepare slides and talking points for the client meeting',
          due_date: new Date(Date.now() + 259200000).toISOString(), // 3 days from now
          priority: 'high',
          status: 'pending',
          user_id: user?.id || '',
          created_at: new Date().toISOString()
        },
        {
          id: '4',
          title: 'Update documentation',
          description: 'Update the user manual with the latest features',
          due_date: new Date(Date.now() + 345600000).toISOString(), // 4 days from now
          priority: 'low',
          status: 'pending',
          user_id: user?.id || '',
          created_at: new Date().toISOString()
        },
        {
          id: '5',
          title: 'Weekly team sync',
          description: 'Discuss progress and blockers with the team',
          due_date: new Date(Date.now() + 432000000).toISOString(), // 5 days from now
          priority: 'medium',
          status: 'pending',
          user_id: user?.id || '',
          created_at: new Date().toISOString()
        }
      ];
      
      setTasks(mockTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user?.id)
        .order('start_time', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      if (data) {
        // Process time entries to ensure duration is calculated
        const processedEntries = data.map(entry => {
          // If duration is undefined, calculate it from start_time and end_time
          if (entry.duration === undefined || entry.duration === null) {
            let calculatedDuration = 0;
            if (entry.start_time && entry.end_time) {
              const startTime = new Date(entry.start_time).getTime();
              const endTime = new Date(entry.end_time).getTime();
              calculatedDuration = (endTime - startTime) / (1000 * 60 * 60); // Convert to hours
            }
            return { ...entry, duration: calculatedDuration };
          }
          return entry;
        });
        setTimeEntries(processedEntries);
      }
    } catch (error) {
      console.error('Error fetching time entries:', error);
    }
  };

  const fetchUserTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setUserTasks(data || []);
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      toast.error('Failed to fetch user tasks');
    }
  };

  useEffect(() => {
    fetchUserTasks();
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'in_progress':
        return '#3b82f6';
      case 'pending':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} />;
      case 'in_progress':
        return <Clock size={16} />;
      case 'pending':
        return <AlertTriangle size={16} />;
      default:
        return null;
    }
  };

  // Calculate KPI metrics
  const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0).toFixed(1);
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const upcomingDeadlines = tasks.filter(task => 
    new Date(task.due_date).getTime() - new Date().getTime() < 86400000 * 2 && // within 2 days
    task.status !== 'completed'
  ).length;

  // Sort tasks by priority and due date
  const sortedTasks = [...tasks].sort((a, b) => {
    // First sort by priority (high > medium > low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then sort by due date (earliest first)
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  // Filter tasks based on search term
  const filteredTasks = sortedTasks.filter(task => 
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Custom KPI Card component with premium effects
  const PremiumKpiCard = ({ title, value, icon, color, onClick }: { 
    title: string, 
    value: string | number, 
    icon: React.ReactNode, 
    color: 'blue' | 'purple' | 'green' | 'orange',
    onClick?: () => void
  }) => (
    <div 
      className={`premium-kpi-card ${color} reflection-effect`} 
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="kpi-icon premium-icon">{icon}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-title">{title}</div>
    </div>
  );

  const handleAddTask = () => {
    navigate('/your-tasks');
  };

  return (
    <ThemeProvider theme={theme}>
      <div className="dashboard-container">
        <div className="glassmorphism-effect"></div>
        
        <Box sx={{ maxWidth: '1200px', margin: '0 auto', p: { xs: 2, sm: 3 } }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 4,
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 2, sm: 0 }
          }}>
            <Fade in={pageLoaded} timeout={800}>
              <Typography 
                variant="h4" 
                component="h1" 
                className="font-heading"
                sx={{ 
                  fontWeight: 700, 
                  color: '#1f2937',
                  letterSpacing: '-0.025em'
                }}
              >
                {greeting}, {user?.email?.split('@')[0] || 'User'}
              </Typography>
            </Fade>
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: 2
            }}>
              <Paper
                component="form"
                sx={{
                  p: '2px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  width: { xs: '100%', sm: 250 },
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <InputBase
                  sx={{ ml: 1, flex: 1 }}
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <IconButton type="button" sx={{ p: '10px' }}>
                  <Search />
                </IconButton>
              </Paper>
              
              <IconButton
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.9)',
                  }
                }}
              >
                <Bell size={20} />
              </IconButton>
              
              <Avatar 
                sx={{ 
                  bgcolor: '#3b82f6',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.5)'
                  }
                }}
                onClick={() => navigate('/profile')}
              >
                {userInitial}
              </Avatar>
            </Box>
          </Box>
          
          {/* Time Tracker Component */}
          <TimeTracker />
          
          {/* Rest of the dashboard content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Welcome Section */}
            <div className="mb-10 scale-in">
              <Typography 
                variant="body1" 
                className="body-large"
                sx={{ 
                  color: '#6b7280',
                  mb: 3,
                  fontSize: '1.125rem',
                  lineHeight: 1.65,
                  letterSpacing: '-0.009em'
                }}
              >
                Today is {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} • {formatTime(currentTime)}
              </Typography>
              
              <Paper
                className="premium-card brushed-metal"
                sx={{
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  mb: 5
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
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  startAdornment={<Search className="h-5 w-5 text-gray-400 mr-2 premium-icon" />}
                />
              </Paper>
            </div>
            
            <div className="flex justify-between items-center mb-4">
              <Button
                variant="contained"
                onClick={() => navigate('/your-tasks')}
                sx={{
                  backgroundColor: 'rgba(11, 147, 246, 0.85)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(11, 147, 246, 0.95)',
                  },
                  mr: 2
                }}
              >
                Your Tasks
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate('/projects')}
                sx={{
                  backgroundColor: 'rgba(11, 147, 246, 0.85)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(11, 147, 246, 0.95)',
                  }
                }}
              >
                Projects
              </Button>
            </div>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              <CSSTransition in={pageLoaded} timeout={300} classNames="fade-in" appear>
                <div className="fade-in" style={{ animationDelay: '0.1s' }}>
                  <PremiumKpiCard
                    title="Total Hours"
                    value={totalHours}
                    icon={<Clock className="h-5 w-5" />}
                    color="blue"
                    onClick={handleGoToDashboard}
                  />
                </div>
              </CSSTransition>
              
              <CSSTransition in={pageLoaded} timeout={300} classNames="fade-in" appear>
                <div className="fade-in" style={{ animationDelay: '0.2s' }}>
                  <PremiumKpiCard
                    title="Total Tasks"
                    value={totalTasks}
                    icon={<FileText className="h-5 w-5" />}
                    color="purple"
                  />
                </div>
              </CSSTransition>
              
              <CSSTransition in={pageLoaded} timeout={300} classNames="fade-in" appear>
                <div className="fade-in" style={{ animationDelay: '0.3s' }}>
                  <PremiumKpiCard
                    title="Completed Tasks"
                    value={completedTasks}
                    icon={<CheckCircle className="h-5 w-5" />}
                    color="green"
                  />
                </div>
              </CSSTransition>
              
              <CSSTransition in={pageLoaded} timeout={300} classNames="fade-in" appear>
                <div className="fade-in" style={{ animationDelay: '0.4s' }}>
                  <PremiumKpiCard
                    title="Upcoming Deadlines"
                    value={upcomingDeadlines}
                    icon={<Calendar className="h-5 w-5" />}
                    color="orange"
                  />
                </div>
              </CSSTransition>
            </div>
            
            {/* Tasks Section */}
            <div className="mb-10 fade-in" style={{ animationDelay: '0.5s' }}>
              <Typography 
                variant="h4" 
                component="h2" 
                className="font-heading"
                sx={{ 
                  fontWeight: 600, 
                  color: '#1f2937',
                  mb: 3,
                  display: 'flex',
                  alignItems: 'center',
                  letterSpacing: '-0.015em'
                }}
              >
                <Star className="h-5 w-5 text-yellow-500 mr-2 premium-icon" />
                Priority Tasks
              </Typography>
              
              {userTasks.length === 0 ? (
                <Button
                  variant="contained"
                  onClick={handleAddTask}
                  sx={{
                    backgroundColor: 'rgba(11, 147, 246, 0.85)',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(11, 147, 246, 0.95)',
                    },
                    mt: 2
                  }}
                >
                  Add Task
                </Button>
              ) : (
                <TransitionGroup className="space-y-4">
                  {userTasks.map((task, index) => (
                    <CSSTransition key={task.id} timeout={300} classNames="fade-in">
                      <Paper
                        className="premium-card reflection-effect"
                        sx={{
                          p: 3,
                          position: 'relative',
                          overflow: 'hidden',
                          borderColor: getPriorityColor(task.priority),
                          '&::before': {
                            background: `linear-gradient(90deg, 
                              rgba(${task.priority === 'high' ? '239, 68, 68' : task.priority === 'medium' ? '245, 158, 11' : '16, 185, 129'}, 0), 
                              rgba(${task.priority === 'high' ? '239, 68, 68' : task.priority === 'medium' ? '245, 158, 11' : '16, 185, 129'}, 0.3), 
                              rgba(${task.priority === 'high' ? '239, 68, 68' : task.priority === 'medium' ? '245, 158, 11' : '16, 185, 129'}, 0)
                            )`
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Typography 
                            variant="h6" 
                            className="font-heading"
                            sx={{ 
                              fontWeight: 600,
                              color: '#1f2937',
                              pl: 2,
                              letterSpacing: '-0.005em'
                            }}
                          >
                            {task.title}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Chip 
                              label={task.priority.toUpperCase()} 
                              size="small"
                              sx={{ 
                                backgroundColor: `${getPriorityColor(task.priority)}20`,
                                color: getPriorityColor(task.priority),
                                fontWeight: 600,
                                borderRadius: '6px',
                                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                                letterSpacing: '0.01em',
                                border: `1px solid ${getPriorityColor(task.priority)}40`,
                                transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                                '&:hover': {
                                  backgroundColor: `${getPriorityColor(task.priority)}30`,
                                  boxShadow: `0 2px 4px ${getPriorityColor(task.priority)}10`
                                }
                              }}
                            />
                            <Chip 
                              avatar={
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '-8px' }}>
                                  {getStatusIcon(task.status)}
                                </div>
                              }
                              label={task.status.replace('_', ' ').toUpperCase()} 
                              size="small"
                              sx={{ 
                                backgroundColor: `${getStatusColor(task.status)}20`,
                                color: getStatusColor(task.status),
                                fontWeight: 600,
                                borderRadius: '6px',
                                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                                letterSpacing: '0.01em',
                                border: `1px solid ${getStatusColor(task.status)}40`,
                                transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                                '&:hover': {
                                  backgroundColor: `${getStatusColor(task.status)}30`,
                                  boxShadow: `0 2px 4px ${getStatusColor(task.status)}10`
                                }
                              }}
                            />
                          </Box>
                        </Box>
                        <Typography 
                          variant="body2" 
                          className="font-body"
                          sx={{ 
                            color: '#4b5563',
                            mb: 2,
                            pl: 2,
                            lineHeight: 1.5,
                            letterSpacing: '-0.006em'
                          }}
                        >
                          {task.description}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pl: 2 }}>
                          <Typography 
                            variant="caption" 
                            className="caption"
                            sx={{ 
                              color: '#6b7280',
                              display: 'flex',
                              alignItems: 'center',
                              letterSpacing: '0.01em',
                              fontWeight: 500
                            }}
                          >
                            <Calendar className="h-4 w-4 mr-1 premium-icon" />
                            Due: {formatDate(task.due_date)}
                          </Typography>
                          <Button
                            className="premium-button"
                            endIcon={<ArrowRight size={16} className="premium-icon" />}
                            sx={{ 
                              color: '#3b82f6',
                              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                              fontWeight: 600,
                              letterSpacing: '0.01em',
                              '&:hover': {
                                backgroundColor: 'rgba(59, 130, 246, 0.1)'
                              }
                            }}
                            onClick={() => navigate(`/task/${task.id}`)}
                          >
                            View Details
                          </Button>
                        </Box>
                      </Paper>
                    </CSSTransition>
                  ))}
                </TransitionGroup>
              )}
            </div>
            
            {/* Recent Time Entries */}
            <div className="fade-in" style={{ animationDelay: '0.6s' }}>
              <Typography 
                variant="h4" 
                component="h2" 
                className="font-heading"
                sx={{ 
                  fontWeight: 600, 
                  color: '#1f2937',
                  mb: 3,
                  display: 'flex',
                  alignItems: 'center',
                  letterSpacing: '-0.015em'
                }}
              >
                <Clock className="h-5 w-5 text-blue-500 mr-2 premium-icon" />
                Recent Time Entries
              </Typography>
              
              {timeEntries.length === 0 ? (
                <Paper
                  className="premium-card"
                  sx={{
                    p: 4,
                    textAlign: 'center'
                  }}
                >
                  <Typography 
                    variant="body1" 
                    color="textSecondary"
                    sx={{
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                      letterSpacing: '-0.011em',
                      mb: 2
                    }}
                  >
                    No time entries found. Start tracking your time to see entries here.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handleGoToDashboard}
                    className="premium-button primary"
                    sx={{ 
                      mt: 2,
                      backgroundColor: 'rgba(11, 147, 246, 0.85)',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                      fontWeight: 600,
                      letterSpacing: '0.01em',
                      '&:hover': {
                        backgroundColor: 'rgba(11, 147, 246, 0.95)',
                      }
                    }}
                  >
                    Add Time Entry
                  </Button>
                </Paper>
              ) : (
                <Paper
                  className="premium-card brushed-metal"
                  sx={{
                    overflow: 'hidden'
                  }}
                >
                  {timeEntries.map((entry, index) => (
                    <React.Fragment key={entry.id}>
                      <Box sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography 
                            variant="subtitle1" 
                            className="font-body"
                            sx={{ 
                              fontWeight: 600,
                              color: '#1f2937',
                              letterSpacing: '-0.009em'
                            }}
                          >
                            {entry.description.length > 50 
                              ? `${entry.description.substring(0, 50)}...` 
                              : entry.description}
                          </Typography>
                          
                          <Typography 
                            variant="body2" 
                            className="font-body font-semibold"
                            sx={{ 
                              color: '#3b82f6',
                              fontWeight: 600,
                              letterSpacing: '-0.006em'
                            }}
                          >
                            {(entry.duration || 0).toFixed(1)} hours
                          </Typography>
                        </Box>
                        
                        <Typography 
                          variant="caption" 
                          className="caption"
                          sx={{ 
                            color: '#6b7280',
                            display: 'block',
                            mb: 1,
                            letterSpacing: '0.01em',
                            fontWeight: 500
                          }}
                        >
                          {formatDate(entry.start_time)} • {new Date(entry.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(entry.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>
                      {index < timeEntries.length - 1 && (
                        <Divider sx={{ borderColor: 'rgba(229, 231, 235, 0.3)' }} />
                      )}
                    </React.Fragment>
                  ))}
                  
                  <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                    <Button
                      className="premium-button"
                      endIcon={<ArrowRight size={16} className="premium-icon" />}
                      onClick={handleGoToDashboard}
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
                      View All Time Entries
                    </Button>
                  </Box>
                </Paper>
              )}
            </div>
          </main>
        </Box>
      </div>
    </ThemeProvider>
  );
} 