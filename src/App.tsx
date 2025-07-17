import { useState, useEffect, useRef } from 'react'
import { Session } from '@supabase/supabase-js'
import {
  Routes,
  Route,
  useLocation,
  useNavigate,
  Navigate,
} from 'react-router-dom'
import supabase from './supabaseClient'
import { ThemeProvider } from './contexts/ThemeContext'
import Auth from './components/Auth'
import AuthPage from './pages/AuthPage'
import Library from './pages/Library'
import Explore from './pages/Explore'
import GameDetails from './pages/GameDetails'
import Dashboard from './pages/Dashboard'
import HomePage from './pages/HomePage'
import SideBar from './components/SideBar'
import AddGameModal from './components/AddGameModal'
import LandingPage from './pages/LandingPage'
import FeedbackPage from './pages/FeedbackPage'
import ProfilePage from './pages/ProfilePage'
import MoodRecommendations from './pages/MoodRecommendations'
import ComingSoon from './pages/ComingSoon'
import Footer from './components/Footer'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import AuthCallback from './components/AuthCallback'

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const handleReset = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setMessage('Password updated successfully!')
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (error) {
      if (error instanceof Error) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage('An unexpected error occurred')
      }
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
      <button className="btn btn-primary mt-4 w-full" onClick={handleReset}>
        Update Password
      </button>
      {message && (
        <div
          className={`mt-4 p-4 rounded ${
            message.includes('Error')
              ? 'bg-error text-error-content'
              : 'bg-success text-success-content'
          }`}
        >
          {message}
        </div>
      )}
    </div>
  )
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true

    const checkAccess = async () => {
      try {
        // Get the current session
        const {
          data: { session: currentSession },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) throw sessionError

        if (!currentSession?.user?.email) {
          if (mounted) {
            setSession(null)
            setLoading(false)
          }
          return
        }

        // User is allowed, update the session
        if (mounted) {
          setSession(currentSession)
          setLoading(false)
        }
      } catch (error) {
        console.error('Protected route error:', error)
        if (mounted) {
          setSession(null)
          setLoading(false)
        }
        navigate('/login')
      }
    }

    // Initial check
    checkAccess()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, _newSession) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkAccess()
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          setSession(null)
          setLoading(false)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
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
  const libraryRef = useRef<{ refreshGames: () => Promise<void> }>(null)
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
  }, [navigate])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    navigate('/')
  }

  const handleGameAdded = async () => {
    setShowAddGame(false)
    // If we're on the library page, refresh it
    if (location.pathname === '/app/library' && libraryRef.current) {
      await libraryRef.current.refreshGames()
    } else {
      // Otherwise navigate to library
      navigate('/app/library')
    }
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Auth onAuth={setSession} />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />

          {/* Protected Routes */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <div className="flex flex-1 bg-base-200">
                  <SideBar
                    onLogout={handleLogout}
                    onAddGame={() => setShowAddGame(true)}
                  />
                  <main className="flex-1 pt-16 lg:pt-0">
                    <HomePage />
                    {showAddGame && (
                      <AddGameModal
                        onGameAdded={handleGameAdded}
                        showModal={showAddGame}
                        setShowModal={setShowAddGame}
                      />
                    )}
                    <Footer />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/dashboard"
            element={
              <ProtectedRoute>
                <div className="flex flex-1 bg-base-200">
                  <SideBar
                    onLogout={handleLogout}
                    onAddGame={() => setShowAddGame(true)}
                  />
                  <main className="flex-1 pt-16 lg:pt-0">
                    <Dashboard />
                    {showAddGame && (
                      <AddGameModal
                        onGameAdded={handleGameAdded}
                        showModal={showAddGame}
                        setShowModal={setShowAddGame}
                      />
                    )}
                    <Footer />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/library"
            element={
              <ProtectedRoute>
                <div className="flex flex-1 bg-base-200">
                  <SideBar
                    onLogout={handleLogout}
                    onAddGame={() => setShowAddGame(true)}
                  />
                  <main className="flex-1 pt-16 lg:pt-0">
                    <Library ref={libraryRef} />
                    {showAddGame && (
                      <AddGameModal
                        onGameAdded={handleGameAdded}
                        showModal={showAddGame}
                        setShowModal={setShowAddGame}
                      />
                    )}
                    <Footer />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/coming-soon"
            element={
              <ProtectedRoute>
                <div className="flex flex-1 bg-base-200">
                  <SideBar
                    onLogout={handleLogout}
                    onAddGame={() => setShowAddGame(true)}
                  />
                  <main className="flex-1 pt-16 lg:pt-0">
                    <ComingSoon />
                    {showAddGame && (
                      <AddGameModal
                        onGameAdded={handleGameAdded}
                        showModal={showAddGame}
                        setShowModal={setShowAddGame}
                      />
                    )}
                    <Footer />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/profile"
            element={
              <ProtectedRoute>
                <div className="flex flex-1 bg-base-200">
                  <SideBar
                    onLogout={handleLogout}
                    onAddGame={() => setShowAddGame(true)}
                  />
                  <main className="flex-1 pt-16 lg:pt-0">
                    <ProfilePage />
                    {showAddGame && (
                      <AddGameModal
                        onGameAdded={handleGameAdded}
                        showModal={showAddGame}
                        setShowModal={setShowAddGame}
                      />
                    )}
                    <Footer />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/feedback"
            element={
              <ProtectedRoute>
                <div className="flex flex-1 bg-base-200">
                  <SideBar
                    onLogout={handleLogout}
                    onAddGame={() => setShowAddGame(true)}
                  />
                  <main className="flex-1 pt-16 lg:pt-0">
                    <FeedbackPage />
                    {showAddGame && (
                      <AddGameModal
                        onGameAdded={handleGameAdded}
                        showModal={showAddGame}
                        setShowModal={setShowAddGame}
                      />
                    )}
                    <Footer />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />

          <Route
            path="/app/mood-recommendations"
            element={
              <ProtectedRoute>
                <div className="flex flex-1 bg-base-200">
                  <SideBar
                    onLogout={handleLogout}
                    onAddGame={() => setShowAddGame(true)}
                  />
                  <main className="flex-1 pt-16 lg:pt-0">
                    <MoodRecommendations />
                    {showAddGame && (
                      <AddGameModal
                        onGameAdded={handleGameAdded}
                        showModal={showAddGame}
                        setShowModal={setShowAddGame}
                      />
                    )}
                    <Footer />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />

          <Route
            path="/app/explore"
            element={
              <ProtectedRoute>
                <div className="flex flex-1 bg-base-200">
                  <SideBar
                    onLogout={handleLogout}
                    onAddGame={() => setShowAddGame(true)}
                  />
                  <main className="flex-1 pt-16 lg:pt-0">
                    <Explore
                      isDevUser={
                        session?.user?.email === 'joanaponder@gmail.com'
                      }
                    />
                    {showAddGame && (
                      <AddGameModal
                        onGameAdded={handleGameAdded}
                        showModal={showAddGame}
                        setShowModal={setShowAddGame}
                      />
                    )}
                    <Footer />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />

          <Route
            path="/app/game/:id"
            element={
              <ProtectedRoute>
                <div className="flex flex-1 bg-base-200">
                  <SideBar
                    onLogout={handleLogout}
                    onAddGame={() => setShowAddGame(true)}
                  />
                  <main className="flex-1 pt-16 lg:pt-0">
                    <GameDetails />
                    {showAddGame && (
                      <AddGameModal
                        onGameAdded={handleGameAdded}
                        showModal={showAddGame}
                        setShowModal={setShowAddGame}
                      />
                    )}
                    <Footer />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
        <div id="success-toast" className="toast toast-end hidden">
          <div className="alert alert-success">
            <span>Changes saved successfully!</span>
          </div>
        </div>
        <div id="error-toast" className="toast toast-end hidden">
          <div className="alert alert-error">
            <span>Error saving changes. Please try again.</span>
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}

export default App
