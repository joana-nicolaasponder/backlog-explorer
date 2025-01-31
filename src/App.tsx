import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom'
import supabase from './supabaseClient'
import Auth from './components/Auth'
import Library from './pages/Library'
import Explore from './pages/Explore'
import GameDetails from './pages/GameDetails'
import Dashboard from './pages/Dashboard'
import HomePage from './pages/HomePage'
import SideBar from './components/SideBar'
import AddGameModal from './components/AddGameModal'
import LandingPage from './pages/LandingPage'
import FeedbackPage from './pages/FeedbackPage'

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

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    )
  }
  
  if (!session) {
    return <Navigate to="/login" />
  }
  
  return <>{children}</>
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
    navigate('/')
  }

  const handleGameAdded = () => {
    setShowAddGame(false)
    // Refresh the current page by re-navigating to it
    navigate(location.pathname)
  }

  return (
    <div>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Auth onAuth={setSession} />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Protected Routes */}
        <Route path="/app" element={
          <ProtectedRoute>
            <div className="flex min-h-screen bg-base-200">
              <SideBar onLogout={handleLogout} onAddGame={() => setShowAddGame(true)} />
              <main className="flex-1 overflow-auto pt-16 lg:pt-0">
                <HomePage />
                {showAddGame && (
                  <AddGameModal 
                    onGameAdded={handleGameAdded}
                    showModal={showAddGame}
                    setShowModal={setShowAddGame}
                  />
                )}
              </main>
            </div>
          </ProtectedRoute>
        } />
        <Route path="/app/dashboard" element={
          <ProtectedRoute>
            <div className="flex min-h-screen bg-base-200">
              <SideBar onLogout={handleLogout} onAddGame={() => setShowAddGame(true)} />
              <main className="flex-1 overflow-auto pt-16 lg:pt-0">
                <Dashboard />
                {showAddGame && (
                  <AddGameModal 
                    onGameAdded={handleGameAdded}
                    showModal={showAddGame}
                    setShowModal={setShowAddGame}
                  />
                )}
              </main>
            </div>
          </ProtectedRoute>
        } />
        <Route path="/app/library" element={
          <ProtectedRoute>
            <div className="flex min-h-screen bg-base-200">
              <SideBar onLogout={handleLogout} onAddGame={() => setShowAddGame(true)} />
              <main className="flex-1 overflow-auto pt-16 lg:pt-0">
                <Library />
                {showAddGame && (
                  <AddGameModal 
                    onGameAdded={handleGameAdded}
                    showModal={showAddGame}
                    setShowModal={setShowAddGame}
                  />
                )}
              </main>
            </div>
          </ProtectedRoute>
        } />
        <Route path="/app/explore" element={
          <ProtectedRoute>
            <div className="flex min-h-screen bg-base-200">
              <SideBar onLogout={handleLogout} onAddGame={() => setShowAddGame(true)} />
              <main className="flex-1 overflow-auto pt-16 lg:pt-0">
                <Explore />
                {showAddGame && (
                  <AddGameModal 
                    onGameAdded={handleGameAdded}
                    showModal={showAddGame}
                    setShowModal={setShowAddGame}
                  />
                )}
              </main>
            </div>
          </ProtectedRoute>
        } />
        <Route path="/app/feedback" element={
          <ProtectedRoute>
            <div className="flex min-h-screen bg-base-200">
              <SideBar onLogout={handleLogout} onAddGame={() => setShowAddGame(true)} />
              <main className="flex-1 overflow-auto pt-16 lg:pt-0">
                <FeedbackPage />
                {showAddGame && (
                  <AddGameModal 
                    onGameAdded={handleGameAdded}
                    showModal={showAddGame}
                    setShowModal={setShowAddGame}
                  />
                )}
              </main>
            </div>
          </ProtectedRoute>
        } />
        <Route path="/app/game/:id" element={
          <ProtectedRoute>
            <div className="flex min-h-screen bg-base-200">
              <SideBar onLogout={handleLogout} onAddGame={() => setShowAddGame(true)} />
              <main className="flex-1 overflow-auto pt-16 lg:pt-0">
                <GameDetails />
                {showAddGame && (
                  <AddGameModal 
                    onGameAdded={handleGameAdded}
                    showModal={showAddGame}
                    setShowModal={setShowAddGame}
                  />
                )}
              </main>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  )
}

export default App
