import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Button, 
  Paper, 
  TextField, 
  Grid, 
  Box, 
  Card, 
  CardContent, 
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Divider,
  Tooltip,
  Alert,
  Snackbar
} from '@mui/material';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Users,
  Calendar,
  DollarSign,
  BarChart2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { ChromePicker, ColorResult } from 'react-color';

interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  user_id: string;
  is_default: boolean;
  budget_hours: number | null;
  budget_amount: number | null;
  client: string | null;
  start_date: string | null;
  end_date: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

interface ProjectStats {
  total_time_entries: number;
  total_hours: number;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
}

const defaultColors = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#6366f1', // indigo
  '#64748b', // slate
  '#0ea5e9', // sky
  '#dc2626', // red
];

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectColor, setProjectColor] = useState(defaultColors[0]);
  const [projectClient, setProjectClient] = useState('');
  const [projectBudgetHours, setProjectBudgetHours] = useState<number | ''>('');
  const [projectBudgetAmount, setProjectBudgetAmount] = useState<number | ''>('');
  const [projectStartDate, setProjectStartDate] = useState('');
  const [projectEndDate, setProjectEndDate] = useState('');
  const [projectTags, setProjectTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [projectStats, setProjectStats] = useState<Record<string, ProjectStats>>({});
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      setProjects(data || []);
      
      // Fetch stats for each project
      const statsPromises = data?.map(async (project) => {
        const { data: stats, error: statsError } = await supabase
          .rpc('get_project_statistics', { project_id: project.id });
        
        if (statsError) {
          console.error('Error fetching project stats:', statsError);
          return;
        }
        
        if (stats && stats.length > 0) {
          setProjectStats(prev => ({
            ...prev,
            [project.id]: stats[0]
          }));
        }
      });
      
      if (statsPromises) {
        await Promise.all(statsPromises);
      }
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to fetch projects');
      setError(`Failed to fetch projects: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setProjectName(project.name);
      setProjectDescription(project.description || '');
      setProjectColor(project.color || defaultColors[0]);
      setProjectClient(project.client || '');
      setProjectBudgetHours(project.budget_hours || '');
      setProjectBudgetAmount(project.budget_amount || '');
      setProjectStartDate(project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : '');
      setProjectEndDate(project.end_date ? new Date(project.end_date).toISOString().split('T')[0] : '');
      setProjectTags(project.tags || []);
    } else {
      setEditingProject(null);
      setProjectName('');
      setProjectDescription('');
      setProjectColor(defaultColors[Math.floor(Math.random() * defaultColors.length)]);
      setProjectClient('');
      setProjectBudgetHours('');
      setProjectBudgetAmount('');
      setProjectStartDate('');
      setProjectEndDate('');
      setProjectTags([]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setShowColorPicker(false);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !projectTags.includes(newTag.trim())) {
      setProjectTags([...projectTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setProjectTags(projectTags.filter(tag => tag !== tagToRemove));
  };

  const validateForm = () => {
    if (!projectName.trim()) {
      toast.error('Project name is required');
      return false;
    }
    
    if (projectEndDate && projectStartDate && new Date(projectEndDate) < new Date(projectStartDate)) {
      toast.error('End date cannot be before start date');
      return false;
    }
    
    return true;
  };

  const handleSaveProject = async () => {
    if (!validateForm()) return;
    if (!user?.id) {
      toast.error('You must be logged in to create a project');
      return;
    }
    
    try {
      const projectData = {
        name: projectName.trim(),
        description: projectDescription.trim() || null,
        color: projectColor,
        user_id: user.id,
        client: projectClient.trim() || null,
        budget_hours: projectBudgetHours === '' ? null : Number(projectBudgetHours),
        budget_amount: projectBudgetAmount === '' ? null : Number(projectBudgetAmount),
        start_date: projectStartDate ? new Date(projectStartDate).toISOString() : null,
        end_date: projectEndDate ? new Date(projectEndDate).toISOString() : null,
        tags: projectTags.length > 0 ? projectTags : null
      };
      
      if (editingProject) {
        // Update existing project
        const { data, error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', editingProject.id)
          .select();
        
        if (error) throw error;
        
        toast.success('Project updated successfully');
        setProjects(projects.map(p => p.id === editingProject.id ? { ...p, ...projectData } : p));
      } else {
        // Create new project
        const { data, error } = await supabase
          .from('projects')
          .insert(projectData)
          .select();
        
        if (error) throw error;
        
        toast.success('Project created successfully');
        if (data) {
          setProjects([...projects, data[0]]);
        }
      }
      
      handleCloseDialog();
      fetchProjects(); // Refresh the list
    } catch (error: any) {
      console.error('Error saving project:', error);
      toast.error(`Failed to save project: ${error.message}`);
      setError(`Failed to save project: ${error.message}`);
    }
  };

  const handleDeleteConfirm = (project: Project) => {
    setProjectToDelete(project);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectToDelete.id);
      
      if (error) throw error;
      
      toast.success('Project deleted successfully');
      setProjects(projects.filter(p => p.id !== projectToDelete.id));
      setDeleteConfirmOpen(false);
      setProjectToDelete(null);
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast.error(`Failed to delete project: ${error.message}`);
      setError(`Failed to delete project: ${error.message}`);
    }
  };

  const getCompletionPercentage = (stats?: ProjectStats) => {
    if (!stats || stats.total_tasks === 0) return 0;
    return Math.round((stats.completed_tasks / stats.total_tasks) * 100);
  };

  const formatHours = (hours?: number) => {
    if (hours === undefined || hours === null) return '0h';
    return `${Math.round(hours * 10) / 10}h`;
  };

  return (
    <Paper sx={{ p: 3, maxWidth: '1200px', margin: '0 auto', mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">
          Projects
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<Plus size={18} />}
          onClick={() => handleOpenDialog()}
        >
          New Project
        </Button>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
          <CircularProgress />
        </Box>
      ) : projects.length === 0 ? (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 6, 
            textAlign: 'center', 
            backgroundColor: '#f9fafb',
            border: '1px dashed #d1d5db',
            borderRadius: '8px',
            my: 4
          }}
        >
          <Typography variant="h6" color="textSecondary" sx={{ mb: 2 }}>
            No projects found
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
            Create your first project to start organizing your time entries and tasks.
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<Plus size={18} />}
            onClick={() => handleOpenDialog()}
          >
            Create Your First Project
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {projects.map(project => (
            <Grid item xs={12} md={6} lg={4} key={project.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderTop: `4px solid ${project.color || '#3b82f6'}`,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    transform: 'translateY(-5px)'
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                      {project.name}
                    </Typography>
                    {project.is_default && (
                      <Chip 
                        label="Default" 
                        size="small"
                        sx={{ 
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          color: '#3b82f6',
                          fontWeight: 600
                        }}
                      />
                    )}
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: '40px' }}>
                    {project.description || 'No description provided'}
                  </Typography>
                  
                  {project.client && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Users size={16} style={{ marginRight: '8px', opacity: 0.7 }} />
                      <Typography variant="body2" color="text.secondary">
                        Client: {project.client}
                      </Typography>
                    </Box>
                  )}
                  
                  {project.start_date && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Calendar size={16} style={{ marginRight: '8px', opacity: 0.7 }} />
                      <Typography variant="body2" color="text.secondary">
                        {project.end_date 
                          ? `${new Date(project.start_date).toLocaleDateString()} - ${new Date(project.end_date).toLocaleDateString()}`
                          : `Started: ${new Date(project.start_date).toLocaleDateString()}`
                        }
                      </Typography>
                    </Box>
                  )}
                  
                  {project.budget_hours && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Clock size={16} style={{ marginRight: '8px', opacity: 0.7 }} />
                      <Typography variant="body2" color="text.secondary">
                        Budget: {project.budget_hours} hours
                      </Typography>
                    </Box>
                  )}
                  
                  {project.budget_amount && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <DollarSign size={16} style={{ marginRight: '8px', opacity: 0.7 }} />
                      <Typography variant="body2" color="text.secondary">
                        Budget: ${project.budget_amount}
                      </Typography>
                    </Box>
                  )}
                  
                  {project.tags && project.tags.length > 0 && (
                    <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {project.tags.map(tag => (
                        <Chip 
                          key={tag} 
                          label={tag} 
                          size="small"
                          sx={{ 
                            backgroundColor: 'rgba(0, 0, 0, 0.05)',
                            fontSize: '0.7rem'
                          }}
                        />
                      ))}
                    </Box>
                  )}
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Statistics
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Clock size={14} style={{ marginRight: '6px', opacity: 0.7 }} />
                        <Typography variant="body2" color="text.secondary">
                          {formatHours(projectStats[project.id]?.total_hours)} tracked
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <BarChart2 size={14} style={{ marginRight: '6px', opacity: 0.7 }} />
                        <Typography variant="body2" color="text.secondary">
                          {projectStats[project.id]?.total_time_entries || 0} entries
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CheckCircle size={14} style={{ marginRight: '6px', opacity: 0.7 }} />
                        <Typography variant="body2" color="text.secondary">
                          {projectStats[project.id]?.completed_tasks || 0} tasks done
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <AlertTriangle size={14} style={{ marginRight: '6px', opacity: 0.7 }} />
                        <Typography variant="body2" color="text.secondary">
                          {projectStats[project.id]?.pending_tasks || 0} pending
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  
                  {projectStats[project.id]?.total_tasks > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Task Completion
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getCompletionPercentage(projectStats[project.id])}%
                        </Typography>
                      </Box>
                      <Box sx={{ width: '100%', backgroundColor: '#e5e7eb', borderRadius: 1, height: 6 }}>
                        <Box 
                          sx={{ 
                            width: `${getCompletionPercentage(projectStats[project.id])}%`, 
                            backgroundColor: project.color || '#3b82f6',
                            borderRadius: 1,
                            height: 6
                          }} 
                        />
                      </Box>
                    </Box>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
                  <Tooltip title="Edit Project">
                    <IconButton 
                      size="small" 
                      onClick={() => handleOpenDialog(project)}
                      sx={{ color: '#6b7280' }}
                    >
                      <Edit2 size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Project">
                    <IconButton 
                      size="small" 
                      onClick={() => handleDeleteConfirm(project)}
                      sx={{ color: '#6b7280' }}
                      disabled={project.is_default}
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Add/Edit Project Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingProject ? 'Edit Project' : 'Create New Project'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Project Name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                fullWidth
                required
                error={!projectName.trim()}
                helperText={!projectName.trim() ? 'Project name is required' : ''}
                sx={{ mb: 2 }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Description"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                fullWidth
                multiline
                rows={3}
                sx={{ mb: 2 }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Project Color
                </Typography>
                <Box 
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Box 
                    sx={{ 
                      width: 36, 
                      height: 36, 
                      borderRadius: '6px', 
                      backgroundColor: projectColor,
                      cursor: 'pointer',
                      border: '2px solid #fff',
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
                      mr: 2
                    }}
                    onClick={() => setShowColorPicker(!showColorPicker)}
                  />
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {defaultColors.map(color => (
                      <Box 
                        key={color}
                        sx={{ 
                          width: 24, 
                          height: 24, 
                          borderRadius: '4px', 
                          backgroundColor: color,
                          cursor: 'pointer',
                          border: projectColor === color ? '2px solid #3b82f6' : '2px solid transparent',
                          '&:hover': {
                            transform: 'scale(1.1)'
                          }
                        }}
                        onClick={() => setProjectColor(color)}
                      />
                    ))}
                  </Box>
                </Box>
                
                {showColorPicker && (
                  <Box sx={{ position: 'absolute', zIndex: 2, mt: 2 }}>
                    <Box 
                      sx={{ 
                        position: 'fixed', 
                        top: 0, 
                        right: 0, 
                        bottom: 0, 
                        left: 0,
                      }} 
                      onClick={() => setShowColorPicker(false)} 
                    />
                    <ChromePicker 
                      color={projectColor}
                      onChange={(color: ColorResult) => setProjectColor(color.hex)}
                    />
                  </Box>
                )}
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Client"
                value={projectClient}
                onChange={(e) => setProjectClient(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Budget (Hours)"
                value={projectBudgetHours}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                    setProjectBudgetHours(value === '' ? '' : Number(value));
                  }
                }}
                type="number"
                fullWidth
                sx={{ mb: 2 }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Budget (Amount)"
                value={projectBudgetAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                    setProjectBudgetAmount(value === '' ? '' : Number(value));
                  }
                }}
                type="number"
                fullWidth
                sx={{ mb: 2 }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Start Date"
                type="date"
                value={projectStartDate}
                onChange={(e) => setProjectStartDate(e.target.value)}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{ mb: 2 }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="End Date"
                type="date"
                value={projectEndDate}
                onChange={(e) => setProjectEndDate(e.target.value)}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
                error={Boolean(projectEndDate && projectStartDate && new Date(projectEndDate) < new Date(projectStartDate))}
                helperText={projectEndDate && projectStartDate && new Date(projectEndDate) < new Date(projectStartDate) ? 'End date cannot be before start date' : ''}
                sx={{ mb: 2 }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Tags
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {projectTags.map(tag => (
                  <Chip 
                    key={tag} 
                    label={tag} 
                    onDelete={() => handleRemoveTag(tag)}
                    size="small"
                  />
                ))}
                {projectTags.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No tags added yet
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label="Add Tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  size="small"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button 
                  variant="outlined" 
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                >
                  Add
                </Button>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveProject} 
            variant="contained"
            disabled={!projectName.trim()}
          >
            {editingProject ? 'Update Project' : 'Create Project'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the project "{projectToDelete?.name}"? This action cannot be undone.
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            Note: This will not delete time entries or tasks associated with this project, but they will no longer be linked to a project.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteProject} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
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

export default Projects; 