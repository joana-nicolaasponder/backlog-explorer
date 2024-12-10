import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import supabase from './supabaseClient'
import Auth from './components/Auth'
import Library from './pages/Library'
import Explore from './pages/Explore'
import GameDetails from './pages/GameDetails'
import Dashboard from './pages/Dashboard'
import HomePage from './pages/HomePage'
import SideBar from './components/SideBar'
import AddGameModal from './components/AddGameModal'

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null)
  const [showAddGame, setShowAddGame] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

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

  const handleGameAdded = () => {
    setShowAddGame(false)
    // Refresh the current page by re-navigating to it
    navigate(location.pathname)
  }

  return (
    <div>
      {!session ? (
        <Auth />
      ) : (
        <div className="flex min-h-screen bg-base-200">
          <SideBar onLogout={handleLogout} onAddGame={() => setShowAddGame(true)} />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/library" element={<Library />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/game/:id" element={<GameDetails />} />
            </Routes>
            {showAddGame && (
              <AddGameModal 
                onGameAdded={handleGameAdded}
              />
            )}
          </main>
        </div>
      )}
    </div>
  )
}

export default App
