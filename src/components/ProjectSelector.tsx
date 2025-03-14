import React, { useState, useEffect } from 'react';
import { 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Chip,
  SelectChangeEvent,
  Tooltip,
  Typography,
  Box,
  CircularProgress
} from '@mui/material';
import { Lightbulb } from 'lucide-react';
import { suggestProject, getAvailableProjects } from '../lib/projectSuggestions';
import { supabase } from '../supabaseClient';

interface Project {
  id: string;
  name: string;
  color: string | null;
  is_default: boolean;
}

interface ProjectSelectorProps {
  value: string;
  onChange: (value: string) => void;
  description: string;
  customProjects?: string[];
  label?: string;
  className?: string;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  value,
  onChange,
  description,
  customProjects = [],
  label = 'Project',
  className = ''
}) => {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [allProjects, setAllProjects] = useState<string[]>([]);
  const [projectsData, setProjectsData] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Fetch projects from the database
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        // Check if projects table exists
        const { data: tableExists, error: tableError } = await supabase
          .from('projects')
          .select('id', { count: 'exact', head: true });
        
        if (tableError && tableError.code === '42P01') {
          // Table doesn't exist, use default projects
          const defaultProjects = getAvailableProjects();
          const uniqueProjects = Array.from(new Set([...defaultProjects, ...customProjects]));
          setAllProjects(uniqueProjects);
          setProjectsData([]);
        } else {
          // Projects table exists, fetch projects
          const { data, error } = await supabase
            .from('projects')
            .select('id, name, color, is_default')
            .eq('is_active', true)
            .order('name');
          
          if (error) throw error;
          
          setProjectsData(data || []);
          const projectNames = data.map(project => project.name);
          const uniqueProjects = Array.from(new Set([...projectNames, ...customProjects]));
          setAllProjects(uniqueProjects);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        // Fallback to default projects
        const defaultProjects = getAvailableProjects();
        const uniqueProjects = Array.from(new Set([...defaultProjects, ...customProjects]));
        setAllProjects(uniqueProjects);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjects();
  }, [customProjects]);
  
  // Update suggestion when description changes
  useEffect(() => {
    const newSuggestion = suggestProject(description);
    setSuggestion(newSuggestion);
  }, [description]);
  
  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value);
  };
  
  const handleSuggestionClick = () => {
    if (suggestion) {
      onChange(suggestion);
    }
  };
  
  const getProjectColor = (projectName: string): string => {
    const project = projectsData.find(p => p.name === projectName);
    return project?.color || '#6b7280'; // Default gray if no color found
  };
  
  const isDefaultProject = (projectName: string): boolean => {
    const project = projectsData.find(p => p.name === projectName);
    return project?.is_default || false;
  };
  
  return (
    <FormControl fullWidth className={className}>
      <InputLabel id="project-selector-label">{label}</InputLabel>
      <Select
        labelId="project-selector-label"
        value={value}
        onChange={handleChange}
        label={label}
        className="premium-select"
        disabled={loading}
        MenuProps={{
          PaperProps: {
            style: {
              maxHeight: 300,
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.03)'
            }
          }
        }}
        startAdornment={
          loading ? (
            <CircularProgress size={20} sx={{ mr: 1 }} />
          ) : suggestion && suggestion !== value ? (
            <Tooltip 
              title={`Suggested project based on your description: "${suggestion}". Click to use.`}
              placement="top"
              arrow
            >
              <Chip
                icon={<Lightbulb size={14} className="text-yellow-500" />}
                label={`Suggestion: ${suggestion}`}
                size="small"
                onClick={handleSuggestionClick}
                sx={{ 
                  mr: 1,
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  color: 'rgba(245, 158, 11, 0.9)',
                  fontWeight: 600,
                  borderRadius: '6px',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                  letterSpacing: '0.01em',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                  }
                }}
              />
            </Tooltip>
          ) : null
        }
      >
        <MenuItem value="all">All Projects</MenuItem>
        <MenuItem value="none">No Project</MenuItem>
        
        {allProjects.length > 0 && (
          <>
            <Typography 
              variant="caption" 
              sx={{ 
                display: 'block', 
                px: 2, 
                py: 1, 
                color: 'text.secondary',
                fontWeight: 600,
                borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
              }}
            >
              Projects
            </Typography>
            
            {allProjects.map((project) => (
              <MenuItem key={project} value={project}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Box 
                    sx={{ 
                      width: 12, 
                      height: 12, 
                      borderRadius: '50%', 
                      backgroundColor: getProjectColor(project),
                      mr: 1.5
                    }} 
                  />
                  <Box sx={{ flexGrow: 1 }}>{project}</Box>
                  {isDefaultProject(project) && (
                    <Chip 
                      label="Default" 
                      size="small"
                      sx={{ 
                        ml: 1,
                        height: 20,
                        fontSize: '0.625rem',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        color: '#3b82f6'
                      }}
                    />
                  )}
                </Box>
              </MenuItem>
            ))}
          </>
        )}
        
        {customProjects.length > 0 && !projectsData.length && (
          <>
            <Typography 
              variant="caption" 
              sx={{ 
                display: 'block', 
                px: 2, 
                py: 1, 
                color: 'text.secondary',
                fontWeight: 600,
                borderTop: '1px solid rgba(0, 0, 0, 0.05)',
                borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
              }}
            >
              Custom Projects
            </Typography>
            
            {customProjects
              .filter(project => !getAvailableProjects().includes(project))
              .map((project) => (
                <MenuItem key={project} value={project}>
                  {project}
                </MenuItem>
              ))
            }
          </>
        )}
      </Select>
    </FormControl>
  );
};

export default ProjectSelector; 