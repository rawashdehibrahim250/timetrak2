import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

// Initialize Supabase client with new env var names
const supabaseUrl = Deno.env.get('DB_URL') || ''
const supabaseServiceKey = Deno.env.get('SERVICE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Excel file constants
const BUCKET_NAME = 'exports'
const FILE_PATH = 'time-entries.xlsx'
const WORKSHEET_NAME = 'Time Entries'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch all time entries
    const { data: entries, error: entriesError } = await supabaseAdmin
      .from('time_entries')
      .select('*')
      .order('start_time', { ascending: false })

    if (entriesError) {
      throw entriesError
    }

    // Fetch user emails for each entry
    const entriesWithEmails = await Promise.all(
      entries.map(async (entry) => {
        const { data: emailData } = await supabaseAdmin
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

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('exports')
      .upload('time-entries.xlsx', excelBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true,
      })

    if (uploadError) {
      throw uploadError
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Excel file updated successfully',
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