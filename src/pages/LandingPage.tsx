import { useState } from 'react'
import supabase from '../supabaseClient'
import { Link } from 'react-router-dom'

const LandingPage = () => {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    try {
      const { error } = await supabase
        .from('waitlist')
        .insert([{ email, signed_up_at: new Date().toISOString() }])

      if (error) throw error

      setStatus('success')
      setEmail('')
    } catch (error: any) {
      console.error('Error:', error)
      setStatus('error')
      setErrorMessage(error.message === 'duplicate key value violates unique constraint "waitlist_email_key"' 
        ? 'This email is already on the waitlist!'
        : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-base-100">
      <nav className="navbar bg-base-100 border-b border-base-200">
        <div className="container mx-auto px-4">
          <div className="flex-1">
            <Link to="/" className="text-xl font-bold">Backlog Explorer</Link>
          </div>
          <div className="flex-none">
            <Link to="/login" className="btn btn-ghost">Login</Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-purple-500 to-secondary bg-clip-text text-transparent animate-gradient">
            Take Control of Your Gaming Backlog
          </h1>
          <p className="text-xl mb-12 text-base-content/80">
            Track, organize, and conquer your gaming backlog. Never lose track of what you're playing or what's next in your queue.
            Join the waitlist to be notified when we launch!
          </p>

          <div className="max-w-md mx-auto mb-12">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="input input-bordered w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={status === 'loading' || status === 'success'}
                />
              </div>
              <button
                type="submit"
                className={`btn btn-primary ${status === 'loading' ? 'loading' : ''}`}
                disabled={status === 'loading' || status === 'success'}
              >
                {status === 'success' ? "You're on the list! 🎮" : 'Join the Waitlist'}
              </button>
              {status === 'error' && (
                <p className="text-error text-sm">{errorMessage}</p>
              )}
            </form>
          </div>

          <div className="grid md:grid-cols-3 gap-8 text-left">
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title">Track Your Progress</h3>
                <p>Keep track of your gaming progress across multiple platforms and genres.</p>
              </div>
            </div>
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title">Smart Organization</h3>
                <p>Organize your games by status, platform, and custom categories.</p>
              </div>
            </div>
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title">Insightful Stats</h3>
                <p>Get insights about your gaming habits and completion rates.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-base-200 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-base-content/60">
          <p> {new Date().getFullYear()} Backlog Explorer. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
