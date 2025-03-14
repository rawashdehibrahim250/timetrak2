# Project Management in TimeTrak

This document outlines the project management functionality implemented in the TimeTrak application.

## Database Schema

We've created a dedicated `projects` table with the following structure:

```sql
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT,
    icon TEXT,
    is_active BOOLEAN DEFAULT true,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT false,
    budget_hours NUMERIC,
    budget_amount NUMERIC,
    client TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    tags TEXT[]
);
```

We've also created a `project_members` table to track who has access to which projects:

```sql
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    UNIQUE(project_id, user_id)
);
```

## Features Implemented

1. **Projects Page**
   - View all projects in a grid layout
   - Create new projects
   - Edit existing projects
   - Delete projects
   - View project statistics (time entries, tasks, etc.)

2. **Project Details**
   - Project name and description
   - Project color
   - Client information
   - Budget tracking (hours and amount)
   - Project timeline (start and end dates)
   - Project tags

3. **Integration with Time Entries**
   - Time entries can be associated with projects
   - Project selector in time entry form
   - Project filtering in dashboard

4. **Integration with Tasks**
   - Tasks can be associated with projects
   - Project statistics include task completion metrics

## How to Use

1. **Creating a Project**
   - Navigate to the Projects page
   - Click "New Project"
   - Fill in the project details
   - Click "Create Project"

2. **Editing a Project**
   - Navigate to the Projects page
   - Click the edit icon on a project card
   - Update the project details
   - Click "Update Project"

3. **Deleting a Project**
   - Navigate to the Projects page
   - Click the delete icon on a project card
   - Confirm deletion

4. **Associating Time Entries with Projects**
   - When creating a time entry, select a project from the dropdown
   - The project selector will suggest projects based on the description

5. **Viewing Project Statistics**
   - Navigate to the Projects page
   - Each project card shows statistics about time entries and tasks

## Implementation Details

1. **Database Migration**
   - Created SQL script to set up the projects table
   - Added Row Level Security (RLS) policies
   - Created function to migrate existing projects from time entries

2. **UI Components**
   - Created Projects page component
   - Enhanced ProjectSelector component to work with the new table
   - Updated Dashboard to use the new projects table

3. **Routing**
   - Added route for Projects page
   - Added navigation to Projects page from WelcomeDashboard

## Future Enhancements

1. **Project Dashboard**
   - Dedicated dashboard for each project
   - More detailed statistics and charts

2. **Team Collaboration**
   - Invite team members to projects
   - Assign roles and permissions

3. **Project Templates**
   - Create project templates
   - Clone existing projects

4. **Project Categories**
   - Group projects by category
   - Filter projects by category

5. **Project Status**
   - Track project status (active, on hold, completed)
   - Filter projects by status

## How to Run the SQL Script

To create the projects table, run the SQL script in the Supabase SQL Editor:

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Copy the contents of the `create_projects_table.sql` file
4. Paste it into the SQL Editor
5. Run the script 