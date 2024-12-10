import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { Routes, Route } from 'react-router-dom'
import supabase from './supabaseClient'
import Auth from './components/Auth'
import Library from './pages/Library'
import Explore from './pages/Explore'
import GameDetails from './pages/GameDetails'
import SideBar from './components/SideBar'

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
    }

    getSession()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => {
      listener?.subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
  }

  return (
    <div>
      {!session ? (
        <Auth />
      ) : (
        <div className="flex min-h-screen bg-base-200">
          <SideBar onLogout={handleLogout} />
          <main className="flex-1 p-8">
            <Routes>
              <Route path="/" element={<Library />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/game/:id" element={<GameDetails />} />
            </Routes>
          </main>
        </div>
      )}
    </div>
  )
}

export default App
