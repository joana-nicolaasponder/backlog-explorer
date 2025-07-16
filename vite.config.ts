import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  // Determine environment based on mode or git branch
  const getEnvironment = () => {
    if (mode === 'production') return 'production'
    try {
      const branch = process.env.GITHUB_REF_NAME || 'develop'
      if (branch === 'deploy') return 'production'
      if (branch === 'main') return 'staging'
      return 'development'
    } catch (error) {
      return 'development'
    }
  }

  const environment = getEnvironment()

  return {
    plugins: [

      react(),
      ...(environment === "production"
        ? [
            sentryVitePlugin({
              authToken: process.env.SENTRY_AUTH_TOKEN,
              org: "joana-ponder",
              project: "javascript-react",
              // Add further options here if needed
            }),
          ]
        : []),
    ],
    define: {
      __DEV__: environment === 'development',
      // Ensure environment variables are properly replaced
      'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
      'process.env.VITE_BACKLOG_EXPLORER_URL': JSON.stringify(env.VITE_BACKLOG_EXPLORER_URL),
      'process.env.VITE_APP_ENV': JSON.stringify(environment),
    },
    envDir: './',
    mode: environment,
    build: {
      sourcemap: environment === 'production', // Sentry requires sourcemaps in production
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './tests/vitest.setup.ts',
    },
    server: {
      proxy: {
        '/api': 'http://localhost:3001',
      },
    },
  }
})