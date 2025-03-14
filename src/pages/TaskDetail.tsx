import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Typography, Paper, Button, Chip, Box, TextField } from '@mui/material';
import { CheckCircle, AlertTriangle, Edit, Save, ChevronLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string | null;
  created_by: string;
  assigned_to: string | null;
  project: string | null;
}

const TaskDetail: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const fetchTask = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .single();

        if (error) throw error;
        setTask(data);
        setNewStatus(data.status);
      } catch (error) {
        console.error('Error fetching task:', error);
        toast.error('Failed to fetch task details');
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId]);

  const handleStatusChange = async () => {
    if (!task) return;
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', task.id);

      if (error) throw error;
      toast.success('Task status updated successfully');
      setTask({ ...task, status: newStatus });
      setEditing(false);
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status');
    }
  };

  const handleAddComment = async () => {
    if (!task || !newComment.trim()) return;
    try {
      const { error } = await supabase
        .from('task_comments')
        .insert({
          task_id: task.id,
          user_id: task.created_by, // Assuming the current user is the creator
          content: newComment,
        });

      if (error) throw error;
      toast.success('Comment added successfully');
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  if (loading) return <div>Loading...</div>;

  if (!task) return <div>Task not found</div>;

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Button onClick={() => navigate(-1)} startIcon={<ChevronLeft />} sx={{ mb: 2 }}>
        Back to Tasks
      </Button>
      <Typography variant="h4" sx={{ mb: 2 }}>{task.title}</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>{task.description}</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Chip label={task.priority.toUpperCase()} color="primary" />
        <Chip label={task.status.toUpperCase()} color="secondary" />
      </Box>
      <Typography variant="body2" sx={{ mb: 2 }}>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</Typography>
      {editing ? (
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
          />
          <Button onClick={handleStatusChange} startIcon={<Save />}>Save</Button>
        </Box>
      ) : (
        <Button onClick={() => setEditing(true)} startIcon={<Edit />}>Edit Status</Button>
      )}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Add Comment</Typography>
        <TextField
          label="Comment"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          fullWidth
          multiline
          rows={4}
          sx={{ mb: 2 }}
        />
        <Button onClick={handleAddComment} startIcon={<CheckCircle />}>Add Comment</Button>
      </Box>
    </Paper>
  );
};

export default TaskDetail; 