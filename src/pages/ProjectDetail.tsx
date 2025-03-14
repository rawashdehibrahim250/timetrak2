import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabaseClient';

interface Project {
  id: number;
  name: string;
  description: string;
  client: string;
  start_date: string;
  end_date: string;
  budget_hours: number;
  budget_amount: number;
  tags: string[];
}

interface ProjectStats {
  total_time_entries: number;
  total_hours: number;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
}

const ProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!projectId) {
        setError('No project ID provided');
        return;
      }
      setLoading(true);

      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) {
        setError(projectError.message);
        toast.error(projectError.message);
        setLoading(false);
        return;
      }

      setProject(projectData);

      // Fetch project statistics using RPC
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_project_statistics', { project_id: projectId });

      if (statsError) {
        setError(statsError.message);
        toast.error(statsError.message);
        setLoading(false);
        return;
      }

      setStats(statsData);
      setLoading(false);
    };

    fetchProjectDetails();
  }, [projectId]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-4">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-blue-500 hover:underline"
      >
        Back
      </button>
      {project ? (
        <div className="bg-white shadow-md p-6 rounded">
          <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
          <p className="mb-2">{project.description}</p>
          <p className="mb-2"><strong>Client:</strong> {project.client}</p>
          <p className="mb-2"><strong>Duration:</strong> {project.start_date} to {project.end_date}</p>
          <p className="mb-2"><strong>Budget Hours:</strong> {project.budget_hours}</p>
          <p className="mb-2"><strong>Budget Amount:</strong> ${project.budget_amount}</p>
          <div className="mb-2">
            <strong>Tags:</strong> {project.tags ? project.tags.join(', ') : 'None'}
          </div>
        </div>
      ) : (
        <div className="text-gray-500">No project found.</div>
      )}
      {stats && (
        <div className="mt-8 bg-gray-100 p-4 rounded">
          <h2 className="text-2xl font-bold mb-2">Project Statistics</h2>
          <p className="mb-1"><strong>Total Time Entries:</strong> {stats.total_time_entries}</p>
          <p className="mb-1"><strong>Total Hours:</strong> {stats.total_hours}</p>
          <p className="mb-1"><strong>Total Tasks:</strong> {stats.total_tasks}</p>
          <p className="mb-1"><strong>Completed Tasks:</strong> {stats.completed_tasks}</p>
          <p className="mb-1"><strong>Pending Tasks:</strong> {stats.pending_tasks}</p>
          <p className="mb-1"><strong>In-Progress Tasks:</strong> {stats.in_progress_tasks}</p>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail; 