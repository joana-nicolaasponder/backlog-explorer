import { createClient } from '@supabase/supabase-js'

// Supabase project URL and public anonymous key from your Supabase dashboard or .env file
const supabaseUrl = 'http://localhost:54321'
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

// Create and export the Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase
