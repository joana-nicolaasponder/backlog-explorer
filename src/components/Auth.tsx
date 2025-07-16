import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { useLocation, useNavigate } from 'react-router-dom'
import supabase from '../supabaseClient'

interface AuthProps {
  onAuth: (session: Session | null) => void
}

const Auth: React.FC<AuthProps> = ({ onAuth }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [isSignUp, setIsSignUp] = useState<boolean>(false)
  const [isResetPassword, setIsResetPassword] = useState<boolean>(false)
  const [resetSent, setResetSent] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [googleLoading, setGoogleLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>(
    (location.state as { error?: string })?.error || ''
  )
  const [success, setSuccess] = useState<string>('')

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const validatePassword = (password: string) => {
    return password.length >= 6
  }

  const clearMessages = () => {
    setError('')
    setSuccess('')
  }

  const handleAuth = async () => {
    clearMessages()
    setLoading(true)

    try {
      if (!validateEmail(email)) {
        throw new Error('Please enter a valid email address')
      }

      if (isResetPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/reset-password',
        })
        if (error) throw error
        setResetSent(true)
        setSuccess('Password reset instructions have been sent to your email')
        return
      }

      if (!validatePassword(password)) {
        throw new Error('Password must be at least 6 characters long')
      }

      if (isSignUp) {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match')
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        setSuccess(
          'Sign-up successful! Please check your email to confirm your account.'
        )
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        onAuth(data.session)

        navigate('/app')
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(message)
      console.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, _session) => {
      // Handle auth state changes if needed in the future
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [onAuth])

  const handleGoogleSignIn = async () => {
    clearMessages()
    setGoogleLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (err: any) {
      setError(err.message)
      console.error('Google sign-in error:', err.message)
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleModeSwitch = (mode: 'signup' | 'login' | 'reset') => {
    clearMessages()
    setPassword('')
    setConfirmPassword('')

    if (mode === 'reset') {
      setIsResetPassword(true)
      setIsSignUp(false)
    } else {
      setIsResetPassword(false)
      setIsSignUp(mode === 'signup')
    }
  }

  if (resetSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="p-8 bg-base-100 rounded-lg shadow-lg w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">Check Your Email</h2>
          <p className="mb-6 text-base-content/80">
            We've sent password reset instructions to your email address.
          </p>
          <button
            className="btn btn-primary w-full"
            onClick={() => {
              setIsResetPassword(false)
              setResetSent(false)
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="p-8 bg-base-100 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">
            {isResetPassword
              ? 'Reset Password'
              : isSignUp
              ? 'Create Account'
              : 'Welcome Back'}
          </h2>
          <p className="text-base-content/60 mt-2">
            {isResetPassword
              ? 'Enter your email to receive reset instructions'
              : isSignUp
              ? 'Start managing your game backlog today'
              : 'Sign in to continue to Backlog Explorer'}
          </p>
        </div>

        {(error || success) && (
          <div
            className={`alert ${error ? 'alert-error' : 'alert-success'} mb-6`}
          >
            <span>{error || success}</span>
          </div>
        )}

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Email</span>
          </label>
          <input
            type="email"
            placeholder="your@email.com"
            className={`input input-bordered w-full ${
              error && error.includes('email') ? 'input-error' : ''
            }`}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              clearMessages()
            }}
          />
        </div>

        {!isResetPassword && (
          <div className="form-control w-full mt-4">
            <label className="label">
              <span className="label-text">Password</span>
            </label>
            <input
              type="password"
              placeholder={
                isSignUp ? 'Choose a secure password' : 'Enter your password'
              }
              className={`input input-bordered w-full ${
                error && error.includes('Password') ? 'input-error' : ''
              }`}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                clearMessages()
              }}
            />
          </div>
        )}

        {isSignUp && (
          <div className="form-control w-full mt-4">
            <label className="label">
              <span className="label-text">Confirm Password</span>
            </label>
            <input
              type="password"
              placeholder="Confirm your password"
              className={`input input-bordered w-full ${
                error && error.includes('match') ? 'input-error' : ''
              }`}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                clearMessages()
              }}
            />
          </div>
        )}

        <div className="mt-8 space-y-4">
          <button
            className={`btn btn-primary w-full ${loading ? 'loading' : ''}`}
            onClick={handleAuth}
            disabled={loading || googleLoading}
          >
            {loading
              ? 'Please wait...'
              : isResetPassword
              ? 'Send Reset Instructions'
              : isSignUp
              ? 'Create Account'
              : 'Sign In'}
          </button>

          {!isResetPassword && (
            <>
              <div className="divider text-base-content/40">
                or continue with
              </div>

              <button
                className={`btn btn-outline w-full ${
                  googleLoading ? 'loading' : ''
                }`}
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
              >
                {!googleLoading && (
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                {googleLoading ? 'Connecting...' : 'Sign in with Google'}
              </button>
            </>
          )}

          <div className="divider text-base-content/40">or</div>

          <div className="flex flex-col space-y-3 items-center">
            {!isResetPassword && (
              <button
                className="btn btn-outline btn-block"
                onClick={() => handleModeSwitch(isSignUp ? 'login' : 'signup')}
              >
                {isSignUp
                  ? 'Already have an account? Sign In'
                  : 'Need an account? Sign Up'}
              </button>
            )}

            {!isSignUp && (
              <button
                className="btn btn-ghost btn-block"
                onClick={() => handleModeSwitch('reset')}
              >
                {isResetPassword ? 'Back to Sign In' : 'Forgot your password?'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Auth
