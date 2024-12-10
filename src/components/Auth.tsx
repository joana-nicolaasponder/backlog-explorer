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

  const handleAuth = async () => {
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

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold">{isSignUp ? 'Sign Up' : 'Login'}</h2>
      <div className="form-control">
        <label className="label">Email</label>
        <input
          type="email"
          placeholder="Enter your email"
          className="input input-bordered"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="form-control">
        <label className="label">Password</label>
        <input
          type="password"
          placeholder="Enter your password"
          className="input input-bordered"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button className="btn btn-primary mt-4" onClick={handleAuth}>
        {isSignUp ? 'Sign Up' : 'Login'}
      </button>
      <button
        className="btn btn-link mt-2"
        onClick={() => setIsSignUp(!isSignUp)}
      >
        {isSignUp
          ? 'Already have an account? Log in'
          : "Don't have an account? Sign up"}
      </button>
    </div>
  )
}

export default Auth
