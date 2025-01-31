import { createClient } from '@supabase/supabase-js'

// Supabase project URL and public anonymous key from your Supabase dashboard or .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// console.log('Environment variables check:')
// console.log('VITE_SUPABASE_URL:', !!supabaseUrl)
// console.log('VITE_SUPABASE_ANON_KEY:', !!supabaseAnonKey)

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!')
  console.error('Available env vars:', import.meta.env)
}

// Create and export the Supabase client with custom error handling
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: (...args) => {
      return fetch(...args).catch(error => {
        // Handle network errors gracefully
        console.error('Network error:', error);
        throw new Error('Unable to connect to the service. Please check your internet connection.');
      });
    }
  }
})

export default supabase
