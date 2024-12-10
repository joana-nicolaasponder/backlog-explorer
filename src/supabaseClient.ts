import { createClient } from '@supabase/supabase-js'

// Supabase project URL and public anonymous key from your Supabase dashboard or .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create and export the Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase
