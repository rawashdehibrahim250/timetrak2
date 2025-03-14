import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Check if user is admin
    const { data: adminData } = await supabaseClient
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .single()

    const isAdmin = !!adminData

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Project patterns to match in descriptions
    const projectPatterns = [
      { pattern: /\b(website|web site|web development|frontend|front-end)\b/i, project: 'Website Development' },
      { pattern: /\b(mobile app|ios|android|react native)\b/i, project: 'Mobile App' },
      { pattern: /\b(database|db|sql|postgres|supabase)\b/i, project: 'Database' },
      { pattern: /\b(api|backend|back-end|server)\b/i, project: 'Backend' },
      { pattern: /\b(meeting|call|discussion|planning)\b/i, project: 'Meetings' },
      { pattern: /\b(design|ui|ux|figma|sketch)\b/i, project: 'Design' },
      { pattern: /\b(test|testing|qa|quality assurance)\b/i, project: 'Testing' },
      { pattern: /\b(documentation|docs|readme)\b/i, project: 'Documentation' },
      { pattern: /\b(research|learning|study)\b/i, project: 'Research' },
      { pattern: /\b(bug|fix|issue|problem)\b/i, project: 'Bug Fixes' },
    ]

    // Get all time entries without a project
    const { data: entries, error: fetchError } = await supabaseClient
      .from('time_entries')
      .select('id, description')
      .is('project', null)

    if (fetchError) {
      throw fetchError
    }

    // Process entries and assign projects based on description patterns
    const updates = entries.map(entry => {
      let project = null
      
      // Try to match description with project patterns
      for (const { pattern, project: projectName } of projectPatterns) {
        if (pattern.test(entry.description)) {
          project = projectName
          break
        }
      }
      
      return {
        id: entry.id,
        project
      }
    }).filter(update => update.project !== null)

    // Update entries with assigned projects
    const { data: updateResult, error: updateError } = await supabaseClient
      .from('time_entries')
      .upsert(updates)
      .select()

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated ${updates.length} entries with project assignments`,
        updated: updates
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
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