import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Auth from './Auth'
import { Session } from '@supabase/supabase-js'

const AuthPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login')

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const modeParam = params.get('mode')
    if (modeParam === 'signup' || modeParam === 'reset') {
      setMode(modeParam)
    } else {
      setMode('login')
    }
  }, [location.search])

  const handleAuth = (session: Session | null) => {
    if (session) {
      navigate('/app')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="w-full max-w-md">
        <Auth onAuth={handleAuth} initialMode={mode} />
      </div>
    </div>
  )
}

export default AuthPage
