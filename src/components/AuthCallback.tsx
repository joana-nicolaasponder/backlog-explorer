import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../supabaseClient'

const AuthCallback = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const completeSignIn = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Error retrieving session:', error.message)
        navigate('/login', { state: { error: 'Could not complete sign-in. Please try logging in again.' } })
        return
      }

      if (data.session) {
        navigate('/app')
      } else {
        navigate('/login', { state: { error: 'No session found. Please log in.' } })
      }
    }

    completeSignIn()
  }, [navigate])

  return <p className="text-center p-8">Completing sign-in...</p>
}

export default AuthCallback
