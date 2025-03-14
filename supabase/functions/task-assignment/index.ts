import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Types
interface User {
  id: string;
  email: string;
  active_tasks_count: number;
  total_hours: number;
}

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    // Check if user is authenticated
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse request body
    const { action, taskId, assigneeId, projectFilter } = await req.json()

    // Validate required parameters
    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if the current user is an admin
    const { data: adminData } = await supabaseClient
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .single()

    const isAdmin = !!adminData

    // Handle different actions
    switch (action) {
      case 'assign_task':
        if (!taskId || !assigneeId) {
          return new Response(
            JSON.stringify({ error: 'Missing taskId or assigneeId' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }
        return await handleAssignTask(supabaseClient, taskId, assigneeId, user.id, isAdmin)
      
      case 'auto_assign':
        if (!taskId) {
          return new Response(
            JSON.stringify({ error: 'Missing taskId' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }
        return await handleAutoAssign(supabaseClient, taskId, user.id, isAdmin)
      
      case 'get_workload':
        return await handleGetWorkload(supabaseClient, isAdmin, projectFilter)
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

// Function to handle assigning a task to a user
async function handleAssignTask(
  supabase: any,
  taskId: string,
  assigneeId: string,
  currentUserId: string,
  isAdmin: boolean
) {
  try {
    // Get the task data
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (taskError) {
      return new Response(
        JSON.stringify({ error: `Task not found: ${taskError.message}` }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if the current user is authorized to assign the task
    if (!isAdmin && taskData.created_by !== currentUserId) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to assign this task' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Update the task
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ assigned_to: assigneeId })
      .eq('id', taskId)

    if (updateError) {
      return new Response(
        JSON.stringify({ error: `Failed to assign task: ${updateError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create a notification for the assignee
    const { data: assigneeData } = await supabase
      .from('auth.users')
      .select('email')
      .eq('id', assigneeId)
      .single()

    const assigneeName = assigneeData?.email || 'User'

    // Create a notification
    await supabase
      .from('task_notifications')
      .insert({
        task_id: taskId,
        user_id: assigneeId,
        message: `You have been assigned to task "${taskData.title}"`,
        is_read: false
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Task assigned to ${assigneeName} successfully` 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Failed to assign task: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
}

// Function to handle auto-assigning a task based on workload
async function handleAutoAssign(
  supabase: any,
  taskId: string,
  currentUserId: string,
  isAdmin: boolean
) {
  try {
    // Get the task data
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (taskError) {
      return new Response(
        JSON.stringify({ error: `Task not found: ${taskError.message}` }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if the current user is authorized to assign the task
    if (!isAdmin && taskData.created_by !== currentUserId) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to assign this task' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get all users with their workload
    const { data: usersData, error: usersError } = await supabase.rpc('get_user_workload')

    if (usersError) {
      return new Response(
        JSON.stringify({ error: `Failed to get user workload: ${usersError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Find the user with the lowest workload
    let lowestWorkloadUser = null
    let lowestWorkload = Number.MAX_VALUE

    for (const user of usersData) {
      // Skip the task creator
      if (user.id === taskData.created_by) {
        continue
      }

      // Calculate workload score (combination of active tasks and total hours)
      const workloadScore = (user.active_tasks_count * 5) + user.total_hours

      if (workloadScore < lowestWorkload) {
        lowestWorkload = workloadScore
        lowestWorkloadUser = user
      }
    }

    if (!lowestWorkloadUser) {
      return new Response(
        JSON.stringify({ error: 'No eligible users found for auto-assignment' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Update the task
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ assigned_to: lowestWorkloadUser.id })
      .eq('id', taskId)

    if (updateError) {
      return new Response(
        JSON.stringify({ error: `Failed to assign task: ${updateError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create a notification for the assignee
    await supabase
      .from('task_notifications')
      .insert({
        task_id: taskId,
        user_id: lowestWorkloadUser.id,
        message: `You have been automatically assigned to task "${taskData.title}" based on workload balancing`,
        is_read: false
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Task auto-assigned to ${lowestWorkloadUser.email} successfully`,
        assignee: {
          id: lowestWorkloadUser.id,
          email: lowestWorkloadUser.email
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Failed to auto-assign task: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
}

// Function to get user workload information
async function handleGetWorkload(
  supabase: any,
  isAdmin: boolean,
  projectFilter?: string
) {
  try {
    // Only admins can view workload for all users
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to view workload information' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get workload data
    let query = supabase.rpc('get_user_workload')
    
    // Apply project filter if provided
    if (projectFilter) {
      query = query.eq('project', projectFilter)
    }
    
    const { data, error } = await query

    if (error) {
      return new Response(
        JSON.stringify({ error: `Failed to get workload data: ${error.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get task distribution by status
    const { data: taskDistribution, error: taskDistError } = await supabase.rpc('get_task_distribution')

    if (taskDistError) {
      return new Response(
        JSON.stringify({ error: `Failed to get task distribution: ${taskDistError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        workload: data,
        task_distribution: taskDistribution
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Failed to get workload information: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
} 