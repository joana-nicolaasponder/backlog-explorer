import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { Routes, Route, Link } from 'react-router-dom'
import supabase from './supabaseClient'
import Auth from './components/Auth'
import AddGameModal from './components/AddGameModal'
import Library from './pages/Library'
import Explore from './pages/Explore'
import GameDetails from './pages/GameDetails'

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
        <>
          <div className="navbar bg-base-100">
            <div className="flex-1">
              <span className="text-xl font-bold px-4">Backlog Explorer</span>
            </div>
            <div className="flex-none gap-4">
              <div className="tabs">
                <Link to="/" className="tab tab-bordered">
                  Library
                </Link>
                <Link to="/explore" className="tab tab-bordered">
                  Explore
                </Link>
              </div>
              <AddGameModal onGameAdded={() => {}} userId={session?.user.id} />
              <button className="btn btn-ghost" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>

          <Routes>
            <Route path="/" element={<Library />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/game/:id" element={<GameDetails />} />
          </Routes>
        </>
      )}
    </div>
  )
}

export default App
