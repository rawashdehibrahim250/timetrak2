-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT NOT NULL DEFAULT 'medium',
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    project TEXT
);

-- Create task_comments table for task comments
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL
);

-- Set up Row Level Security (RLS) for tasks table
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own tasks and tasks assigned to them
CREATE POLICY "Users can view their own tasks and tasks assigned to them"
ON public.tasks
FOR SELECT
USING (
    auth.uid() = user_id OR 
    auth.uid() = assigned_to OR 
    auth.uid() = created_by
);

-- Create policy to allow users to insert their own tasks
CREATE POLICY "Users can insert their own tasks"
ON public.tasks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own tasks and tasks assigned to them
CREATE POLICY "Users can update their own tasks and tasks assigned to them"
ON public.tasks
FOR UPDATE
USING (
    auth.uid() = user_id OR 
    auth.uid() = assigned_to OR 
    auth.uid() = created_by
);

-- Create policy to allow users to delete their own tasks
CREATE POLICY "Users can delete their own tasks"
ON public.tasks
FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = created_by);

-- Set up Row Level Security (RLS) for task_comments table
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view comments on tasks they can access
CREATE POLICY "Users can view comments on tasks they can access"
ON public.task_comments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.tasks
        WHERE 
            public.tasks.id = task_id AND
            (public.tasks.user_id = auth.uid() OR 
             public.tasks.assigned_to = auth.uid() OR 
             public.tasks.created_by = auth.uid())
    )
);

-- Create policy to allow users to insert comments on tasks they can access
CREATE POLICY "Users can insert comments on tasks they can access"
ON public.task_comments
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.tasks
        WHERE 
            public.tasks.id = task_id AND
            (public.tasks.user_id = auth.uid() OR 
             public.tasks.assigned_to = auth.uid() OR 
             public.tasks.created_by = auth.uid())
    )
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp on tasks table
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON public.tasks (user_id);
CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx ON public.tasks (assigned_to);
CREATE INDEX IF NOT EXISTS tasks_created_by_idx ON public.tasks (created_by);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks (status);
CREATE INDEX IF NOT EXISTS tasks_priority_idx ON public.tasks (priority);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON public.tasks (due_date);
CREATE INDEX IF NOT EXISTS task_comments_task_id_idx ON public.task_comments (task_id);
CREATE INDEX IF NOT EXISTS task_comments_user_id_idx ON public.task_comments (user_id); 