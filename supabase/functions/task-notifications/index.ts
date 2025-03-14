import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Types
interface TaskNotification {
  id: string;
  task_id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface TaskData {
  id: string;
  title: string;
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
    const { action, taskId, userId, message } = await req.json()

    // Validate required parameters
    if (!action || !taskId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get task data
    const { data: taskData, error: taskError } = await supabaseClient
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

    // Handle different actions
    switch (action) {
      case 'create_notification':
        return await handleCreateNotification(supabaseClient, taskData, userId || user.id, message)
      
      case 'mark_as_read':
        return await handleMarkAsRead(supabaseClient, taskId, user.id)
      
      case 'get_notifications':
        return await handleGetNotifications(supabaseClient, user.id)
      
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

// Function to handle creating a notification
async function handleCreateNotification(
  supabase: any,
  task: TaskData,
  userId: string,
  customMessage?: string
) {
  try {
    // Determine the recipient(s)
    let recipients: string[] = []
    
    // If the notification is for a specific user, only send to them
    if (userId) {
      recipients.push(userId)
    } 
    // Otherwise, send to both the creator and assignee (if different)
    else {
      if (task.created_by) {
        recipients.push(task.created_by)
      }
      
      if (task.assigned_to && task.assigned_to !== task.created_by) {
        recipients.push(task.assigned_to)
      }
    }
    
    // Generate a default message if none provided
    const message = customMessage || `Task "${task.title}" has been updated.`
    
    // Create notifications for all recipients
    const notificationPromises = recipients.map(recipientId => 
      supabase
        .from('task_notifications')
        .insert({
          task_id: task.id,
          user_id: recipientId,
          message: message,
          is_read: false
        })
    )
    
    await Promise.all(notificationPromises)
    
    return new Response(
      JSON.stringify({ success: true, message: 'Notification created successfully' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Failed to create notification: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
}

// Function to handle marking notifications as read
async function handleMarkAsRead(
  supabase: any,
  taskId: string,
  userId: string
) {
  try {
    const { error } = await supabase
      .from('task_notifications')
      .update({ is_read: true })
      .eq('task_id', taskId)
      .eq('user_id', userId)
    
    if (error) {
      throw error
    }
    
    return new Response(
      JSON.stringify({ success: true, message: 'Notifications marked as read' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Failed to mark notifications as read: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
}

// Function to handle getting notifications for a user
async function handleGetNotifications(
  supabase: any,
  userId: string
) {
  try {
    const { data, error } = await supabase
      .from('task_notifications')
      .select(`
        *,
        tasks:task_id (
          id,
          title,
          status,
          priority,
          due_date,
          project
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) {
      throw error
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        notifications: data,
        unread_count: data.filter((n: TaskNotification) => !n.is_read).length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Failed to get notifications: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
} 