import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

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

    // Parse request body
    const { dateRange } = await req.json()

    // Fetch time entries
    let query = supabaseClient
      .from('time_entries')
      .select('*')
      .order('start_time', { ascending: false })

    // Apply date filters if provided
    if (dateRange && dateRange.start) {
      query = query.gte('start_time', dateRange.start)
    }
    if (dateRange && dateRange.end) {
      query = query.lte('start_time', dateRange.end)
    }

    const { data: entries, error: entriesError } = await query

    if (entriesError) {
      throw entriesError
    }

    // Fetch user emails for each entry
    const entriesWithEmails = await Promise.all(
      entries.map(async (entry) => {
        const { data: emailData } = await supabaseClient
          .rpc('get_user_email', { user_id: entry.user_id })

        return {
          ...entry,
          user_email: emailData || 'Unknown',
        }
      })
    )

    // Create workbook
    const workbook = XLSX.utils.book_new()

    // Format data for Excel
    const formattedEntries = entriesWithEmails.map((entry) => ({
      'User': entry.user_email,
      'Description': entry.description,
      'Project': entry.project || 'No Project',
      'Start Time': new Date(entry.start_time).toLocaleString(),
      'End Time': new Date(entry.end_time).toLocaleString(),
      'Duration (hours)': entry.duration.toFixed(2),
    }))

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(formattedEntries)

    // Set column widths
    const columnWidths = [
      { wch: 30 }, // User email
      { wch: 50 }, // Description
      { wch: 20 }, // Project
      { wch: 20 }, // Start Time
      { wch: 20 }, // End Time
      { wch: 15 }, // Duration
    ]
    worksheet['!cols'] = columnWidths

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Time Entries')

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Create a unique filename
    const filename = `time-entries-report-${new Date().toISOString().split('T')[0]}.xlsx`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from('exports')
      .upload(filename, excelBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true,
      })

    if (uploadError) {
      throw uploadError
    }

    // Get public URL
    const { data: urlData } = await supabaseClient
      .storage
      .from('exports')
      .createSignedUrl(filename, 60 * 60) // 1 hour expiry

    return new Response(
      JSON.stringify({
        success: true,
        url: urlData.signedUrl,
        filename,
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