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

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const handleReset = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error
      
      setMessage('Password updated successfully!')
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">Reset Your Password</h2>
      <div className="form-control">
        <label className="label">
          <span className="label-text">New Password</span>
        </label>
        <input
          type="password"
          className="input input-bordered"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter your new password"
        />
      </div>
      <button 
        className="btn btn-primary mt-4 w-full"
        onClick={handleReset}
      >
        Update Password
      </button>
      {message && (
        <div className={`mt-4 p-4 rounded ${message.includes('Error') ? 'bg-error text-error-content' : 'bg-success text-success-content'}`}>
          {message}
        </div>
      )}
    </div>
  )
}

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
          <main className="flex-1 overflow-auto pt-16 lg:pt-0">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/library" element={<Library />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/game/:id" element={<GameDetails />} />
              <Route path="/reset-password" element={<ResetPassword />} />
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
