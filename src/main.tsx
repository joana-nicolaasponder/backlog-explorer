import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './styles/gradients.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'

// src/main.ts or src/main.jsx

console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('VITE_BACKLOG_EXPLORER_URL:', import.meta.env.VITE_BACKLOG_EXPLORER_URL);
console.log('VITE_APP_ENV:', import.meta.env.VITE_APP_ENV);


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
)
