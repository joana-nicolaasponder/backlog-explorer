import { useState } from 'react'
import { Session } from '@supabase/supabase-js'
import supabase from '../supabaseClient'

interface AuthProps {
  onAuth: (session: Session | null) => void
}

const Auth: React.FC<AuthProps> = ({ onAuth }) => {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [isSignUp, setIsSignUp] = useState<boolean>(false)
  const [isResetPassword, setIsResetPassword] = useState<boolean>(false)
  const [resetSent, setResetSent] = useState<boolean>(false)

  const handleAuth = async () => {
    if (isResetPassword) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/reset-password',
        })
        if (error) throw error
        setResetSent(true)
        alert('Check your email for the password reset link')
      } catch (error: any) {
        console.error('Reset password error:', error.message)
        alert(`Reset password error: ${error.message}`)
      }
      return
    }

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) {
        console.error('Sign-up error:', error.message)
        alert(`Sign-up error: ${error.message}`)
      } else {
        alert(
          'Sign-up successful! Please check your email to confirm your account.'
        )
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        console.error('Login error:', error.message)
        alert(`Login error: ${error.message}`)
      } else {
        console.log(
          `User logged in successfully at ${new Date().toLocaleString()}: `,
          data.session.user
        )
        onAuth(data.session)
      }
    }
  }

  if (resetSent) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-lg font-bold mb-4">Password Reset Email Sent</h2>
        <p className="mb-4">Please check your email for the password reset link.</p>
        <button
          className="btn btn-primary"
          onClick={() => {
            setIsResetPassword(false)
            setResetSent(false)
          }}
        >
          Back to Login
        </button>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">
        {isResetPassword ? 'Reset Password' : isSignUp ? 'Sign Up' : 'Login'}
      </h2>
      <div className="form-control w-full max-w-xs">
        <label className="label">
          <span className="label-text">Email</span>
        </label>
        <input
          type="email"
          className="input input-bordered w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      
      {!isResetPassword && (
        <div className="form-control w-full max-w-xs mt-4">
          <label className="label">
            <span className="label-text">Password</span>
          </label>
          <input
            type="password"
            className="input input-bordered w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      )}

      <div className="mt-6 space-y-4">
        <button
          className="btn btn-primary w-full max-w-xs"
          onClick={handleAuth}
        >
          {isResetPassword ? 'Send Reset Instructions' : isSignUp ? 'Sign Up' : 'Login'}
        </button>

        <div className="flex flex-col space-y-2">
          {!isResetPassword && (
            <button
              className="btn btn-link"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? 'Already have an account? Login' : 'Need an account? Sign Up'}
            </button>
          )}
          
          {!isSignUp && (
            <button
              className="btn btn-link"
              onClick={() => setIsResetPassword(!isResetPassword)}
            >
              {isResetPassword ? 'Back to Login' : 'Forgot Password?'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Auth
