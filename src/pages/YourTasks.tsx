import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Button, 
  Paper, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Box,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Clock, AlertTriangle, CheckCircle, Plus, Calendar, ArrowRight } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  completed_at: string | null;
  user_id: string;
  created_by: string;
  assigned_to: string | null;
  project: string | null;
  created_at: string;
  updated_at: string;
}

const YourTasks: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingTasks, setFetchingTasks] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    if (!user?.id) return;
    
    setFetchingTasks(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tasks:', error);
        throw error;
      }
      
      setTasks(data || []);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      setError(`Failed to fetch tasks: ${error.message}`);
      toast.error('Failed to fetch tasks');
    } finally {
      setFetchingTasks(false);
    }
  };

  const handleAddTask = async () => {
    if (!taskTitle.trim()) {
      toast.error('Please provide a title for the task.');
      return;
    }

    if (!user?.id) {
      toast.error('You must be logged in to add a task.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Format the due date properly if provided
      let formattedDueDate = null;
      if (taskDueDate) {
        formattedDueDate = new Date(taskDueDate).toISOString();
      } else {
        // Default to tomorrow if no date is provided
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        formattedDueDate = tomorrow.toISOString();
      }

      const newTask = {
        title: taskTitle,
        description: taskDescription || '',
        status: 'pending' as const,
        priority: taskPriority,
        due_date: formattedDueDate,
        user_id: user.id,
        created_by: user.id
      };
      
      console.log('Task data being sent:', newTask);
      
      const { data, error } = await supabase
        .from('tasks')
        .insert(newTask)
        .select();

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      console.log('Task added successfully:', data);
      toast.success('Task added successfully!');
      setTaskTitle('');
      setTaskDescription('');
      setTaskPriority('medium');
      setTaskDueDate('');
      
      // Refresh the task list
      fetchTasks();
    } catch (error: any) {
      console.error('Error adding task:', error);
      setError(`Failed to add task: ${error.message}`);
      toast.error(`Failed to add task: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Paper sx={{ p: 3, maxWidth: '800px', margin: '0 auto', mt: 4 }}>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Your Tasks
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <Plus size={18} className="mr-2" /> Add New Task
        </Typography>
        <TextField
          label="Task Title"
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
          required
          error={!taskTitle.trim() && loading}
          helperText={!taskTitle.trim() && loading ? 'Title is required' : ''}
        />
        <TextField
          label="Task Description"
          value={taskDescription}
          onChange={(e) => setTaskDescription(e.target.value)}
          fullWidth
          multiline
          rows={4}
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={taskPriority}
              label="Priority"
              onChange={(e) => setTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Due Date"
            type="date"
            value={taskDueDate}
            onChange={(e) => setTaskDueDate(e.target.value)}
            fullWidth
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Box>
        <Button 
          variant="contained" 
          onClick={handleAddTask}
          disabled={loading || !user?.id}
          sx={{ mt: 2 }}
          startIcon={loading ? <CircularProgress size={20} /> : <Plus size={20} />}
        >
          {loading ? 'Adding...' : 'Add Task'}
        </Button>
      </Box>
      
      <Divider sx={{ my: 4 }} />
      
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <Calendar size={18} className="mr-2" /> Your Tasks
        </Typography>
        
        {fetchingTasks ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : tasks.length === 0 ? (
          <Paper 
            elevation={0} 
            sx={{ 
              p: 4, 
              textAlign: 'center', 
              backgroundColor: '#f9fafb',
              border: '1px dashed #d1d5db',
              borderRadius: '8px'
            }}
          >
            <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
              No tasks found. Add your first task above!
            </Typography>
            <Button 
              variant="outlined" 
              onClick={() => {
                document.getElementById('task-title-input')?.focus();
              }}
              startIcon={<Plus size={16} />}
            >
              Create Your First Task
            </Button>
          </Paper>
        ) : (
          <Box>
            {tasks.map((task) => (
              <Paper 
                key={task.id} 
                sx={{ 
                  p: 3, 
                  mb: 2, 
                  border: '1px solid #eee',
                  cursor: 'pointer',
                  borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    transform: 'translateY(-2px)'
                  }
                }}
                onClick={() => navigate(`/task/${task.id}`)}
              >
                <Typography variant="h6" sx={{ mb: 1 }}>{task.title}</Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    mb: 2,
                    color: '#4b5563',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {task.description || 'No description provided'}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip 
                      label={task.priority.toUpperCase()} 
                      size="small"
                      sx={{ 
                        backgroundColor: `${getPriorityColor(task.priority)}20`,
                        color: getPriorityColor(task.priority),
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: `1px solid ${getPriorityColor(task.priority)}40`,
                      }}
                    />
                    <Chip 
                      icon={<div style={{ display: 'flex', alignItems: 'center' }}>{getStatusIcon(task.status)}</div>}
                      label={task.status.replace('_', ' ').toUpperCase()} 
                      size="small"
                      sx={{ 
                        backgroundColor: `${getStatusColor(task.status)}20`,
                        color: getStatusColor(task.status),
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: `1px solid ${getStatusColor(task.status)}40`,
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', color: '#6b7280' }}>
                      <Calendar size={14} style={{ marginRight: '4px' }} />
                      Due: {formatDate(task.due_date)}
                    </Typography>
                    <Button
                      size="small"
                      endIcon={<ArrowRight size={14} />}
                      sx={{ 
                        color: '#3b82f6',
                        fontWeight: 600,
                        '&:hover': {
                          backgroundColor: 'rgba(59, 130, 246, 0.1)'
                        }
                      }}
                    >
                      View
                    </Button>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Box>
      
      {error && (
        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      )}
    </Paper>
  );
};

export default YourTasks; 