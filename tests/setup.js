// Mock Vite's import.meta.env
global.import = {};
global.import.meta = {
  env: {
    VITE_SUPABASE_URL: 'http://localhost:54321',
    VITE_SUPABASE_ANON_KEY: 'test-key',
    VITE_RAWG_API_KEY: 'test-key',
    VITE_API_URL: 'http://localhost:3000'
  }
};
