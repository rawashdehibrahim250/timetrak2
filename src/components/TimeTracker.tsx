import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Typography, 
  Paper,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider
} from '@mui/material';
import { Play, Square, Clock, RefreshCw, Edit, Plus } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

interface Project {
  id: string;
  name: string;
}

interface TimeEntry {
  id: string;
  project_id: string | null;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  project_name: string | null;
}

const TimeTracker: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [activeTimeEntry, setActiveTimeEntry] = useState<TimeEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Manual time entry state
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualProject, setManualProject] = useState<string | null>(null);
  const [manualDescription, setManualDescription] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualStartTime, setManualStartTime] = useState('09:00');
  const [manualEndTime, setManualEndTime] = useState('17:00');
  const [manualLoading, setManualLoading] = useState(false);

  // Fetch projects and check for active time entry on component mount
  useEffect(() => {
    if (user?.id) {
      fetchProjects();
      checkActiveTimeEntry();
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [user]);

  // Update elapsed time when tracking is active
  useEffect(() => {
    if (isTracking && activeTimeEntry) {
      startTimer();
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTracking, activeTimeEntry]);

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', user?.id)
        .order('name');
      
      if (error) throw error;
      
      setProjects(data || []);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  };

  const checkActiveTimeEntry = async () => {
    if (!user?.id) return;
    
    try {
      // First try to use the RPC function
      let { data, error } = await supabase
        .rpc('get_active_time_entry', { p_user_id: user.id });
      
      // If there's an error with the RPC function (e.g., missing column), fall back to direct query
      if (error && error.message.includes('column te.duration_seconds does not exist')) {
        console.log('Falling back to direct query for active time entry');
        
        const { data: directData, error: directError } = await supabase
          .from('time_entries')
          .select('id, project_id, description, start_time, end_time')
          .eq('user_id', user.id)
          .is('end_time', null)
          .order('start_time', { ascending: false })
          .limit(1);
        
        if (directError) throw directError;
        
        if (directData && directData.length > 0) {
          data = directData;
          
          // If we have a project_id, fetch the project name
          if (directData[0].project_id) {
            const { data: projectData, error: projectError } = await supabase
              .from('projects')
              .select('name')
              .eq('id', directData[0].project_id)
              .single();
            
            if (!projectError && projectData) {
              data[0].project_name = projectData.name;
            }
          }
        }
      } else if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        const entry = data[0];
        setActiveTimeEntry(entry);
        setSelectedProject(entry.project_id);
        setDescription(entry.description || '');
        setIsTracking(true);
        
        // Calculate elapsed time
        const startTime = new Date(entry.start_time).getTime();
        const currentTime = new Date().getTime();
        const elapsed = Math.floor((currentTime - startTime) / 1000);
        setElapsedTime(elapsed);
        
        startTimer();
      }
    } catch (error: any) {
      console.error('Error checking active time entry:', error);
    }
  };

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
  };

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTracking = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to track time');
      return;
    }
    
    setLoading(true);
    
    try {
      const newTimeEntry = {
        user_id: user.id,
        project_id: selectedProject,
        description: description.trim() || null,
        start_time: new Date().toISOString(),
      };
      
      // First insert the time entry
      const { data, error } = await supabase
        .from('time_entries')
        .insert(newTimeEntry)
        .select()
        .single();
      
      if (error) throw error;
      
      // If we have a project_id, fetch the project name separately
      let projectName = null;
      if (data.project_id) {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('name')
          .eq('id', data.project_id)
          .single();
        
        if (!projectError && projectData) {
          projectName = projectData.name;
        }
      }
      
      setActiveTimeEntry({
        ...data,
        project_name: projectName
      });
      setIsTracking(true);
      setElapsedTime(0);
      toast.success('Time tracking started');
    } catch (error: any) {
      console.error('Error starting time tracking:', error);
      toast.error('Failed to start time tracking');
    } finally {
      setLoading(false);
    }
  };

  const handleStopTracking = async () => {
    if (!activeTimeEntry?.id) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('time_entries')
        .update({
          end_time: new Date().toISOString(),
        })
        .eq('id', activeTimeEntry.id);
      
      if (error) throw error;
      
      setIsTracking(false);
      setActiveTimeEntry(null);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      toast.success('Time tracking stopped');
    } catch (error: any) {
      console.error('Error stopping time tracking:', error);
      toast.error('Failed to stop time tracking');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscardTracking = async () => {
    if (!activeTimeEntry?.id) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', activeTimeEntry.id);
      
      if (error) throw error;
      
      setIsTracking(false);
      setActiveTimeEntry(null);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      toast.success('Time entry discarded');
    } catch (error: any) {
      console.error('Error discarding time entry:', error);
      toast.error('Failed to discard time entry');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenManualEntry = () => {
    setManualProject(selectedProject);
    setManualDescription(description);
    setManualDate(new Date().toISOString().split('T')[0]);
    setManualStartTime('09:00');
    setManualEndTime('17:00');
    setManualEntryOpen(true);
  };

  const handleCloseManualEntry = () => {
    setManualEntryOpen(false);
  };

  const handleSaveManualEntry = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to add time');
      return;
    }
    
    if (!manualDescription.trim()) {
      toast.error('Please provide a description');
      return;
    }
    
    setManualLoading(true);
    
    try {
      // Create start and end datetime objects
      const startDateTime = new Date(`${manualDate}T${manualStartTime}:00`);
      const endDateTime = new Date(`${manualDate}T${manualEndTime}:00`);
      
      // Validate times
      if (endDateTime <= startDateTime) {
        toast.error('End time must be after start time');
        setManualLoading(false);
        return;
      }
      
      const newTimeEntry = {
        user_id: user.id,
        project_id: manualProject,
        description: manualDescription.trim(),
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
      };
      
      const { error } = await supabase
        .from('time_entries')
        .insert(newTimeEntry);
      
      if (error) throw error;
      
      toast.success('Time entry added successfully');
      handleCloseManualEntry();
    } catch (error: any) {
      console.error('Error adding manual time entry:', error);
      toast.error('Failed to add time entry');
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 4, border: '1px solid #eee', borderRadius: '8px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Clock size={20} style={{ marginRight: '8px' }} />
          <Typography variant="h6">Time Tracker</Typography>
        </Box>
        <Tooltip title="Add time manually">
          <IconButton 
            onClick={handleOpenManualEntry}
            disabled={isTracking}
            color="primary"
          >
            <Edit size={18} />
          </IconButton>
        </Tooltip>
      </Box>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormControl fullWidth>
          <InputLabel id="project-select-label">Project</InputLabel>
          <Select
            labelId="project-select-label"
            value={selectedProject || ''}
            label="Project"
            onChange={(e) => setSelectedProject(e.target.value)}
            disabled={isTracking || loadingProjects}
          >
            <MenuItem value="">No Project</MenuItem>
            {projects.map((project) => (
              <MenuItem key={project.id} value={project.id}>
                {project.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <TextField
          label="What would you like to track today?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isTracking}
          placeholder="What would you like to track today?"
          fullWidth
          InputProps={{
            endAdornment: isTracking ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ mr: 1, fontFamily: 'monospace', fontWeight: 'bold' }}>
                  {formatElapsedTime(elapsedTime)}
                </Typography>
              </Box>
            ) : null
          }}
        />
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          {isTracking ? (
            <>
              <Button
                variant="outlined"
                color="error"
                onClick={handleDiscardTracking}
                disabled={loading}
                sx={{ minWidth: '120px' }}
              >
                Discard
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleStopTracking}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Square size={16} />}
                sx={{ minWidth: '120px' }}
              >
                {loading ? 'Stopping...' : 'STOP TRACKING'}
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={handleStartTracking}
              disabled={loading || !description.trim()}
              startIcon={loading ? <CircularProgress size={20} /> : <Play size={16} />}
              sx={{ minWidth: '120px' }}
            >
              {loading ? 'Starting...' : 'START TRACKING'}
            </Button>
          )}
        </Box>
      </Box>
      
      {/* Manual Time Entry Dialog */}
      <Dialog 
        open={manualEntryOpen} 
        onClose={handleCloseManualEntry}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Time Manually</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="manual-project-select-label">Project</InputLabel>
                  <Select
                    labelId="manual-project-select-label"
                    value={manualProject || ''}
                    label="Project"
                    onChange={(e) => setManualProject(e.target.value)}
                  >
                    <MenuItem value="">No Project</MenuItem>
                    {projects.map((project) => (
                      <MenuItem key={project.id} value={project.id}>
                        {project.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  fullWidth
                  required
                  error={!manualDescription.trim()}
                  helperText={!manualDescription.trim() ? 'Description is required' : ''}
                  sx={{ mb: 2 }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Date"
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={{ mb: 2 }}
                />
              </Grid>
              
              <Grid item xs={6}>
                <TextField
                  label="Start Time"
                  type="time"
                  value={manualStartTime}
                  onChange={(e) => setManualStartTime(e.target.value)}
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={{ mb: 2 }}
                />
              </Grid>
              
              <Grid item xs={6}>
                <TextField
                  label="End Time"
                  type="time"
                  value={manualEndTime}
                  onChange={(e) => setManualEndTime(e.target.value)}
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                  error={manualEndTime <= manualStartTime}
                  helperText={manualEndTime <= manualStartTime ? 'End time must be after start time' : ''}
                  sx={{ mb: 2 }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ mt: 1, p: 2, bgcolor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Duration:
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    {(() => {
                      try {
                        const start = new Date(`2000-01-01T${manualStartTime}:00`);
                        const end = new Date(`2000-01-01T${manualEndTime}:00`);
                        if (end <= start) return '0h 0m';
                        
                        const diffMs = end.getTime() - start.getTime();
                        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                        
                        return `${diffHrs}h ${diffMins}m`;
                      } catch (e) {
                        return '0h 0m';
                      }
                    })()}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseManualEntry}>Cancel</Button>
          <Button 
            onClick={handleSaveManualEntry} 
            variant="contained"
            disabled={manualLoading || !manualDescription.trim() || manualEndTime <= manualStartTime}
            startIcon={manualLoading ? <CircularProgress size={16} /> : <Plus size={16} />}
          >
            {manualLoading ? 'Saving...' : 'Add Time Entry'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default TimeTracker; 