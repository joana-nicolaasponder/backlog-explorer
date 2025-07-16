import { useState } from 'react'
import { Link } from 'react-router-dom'
import supabase from '../supabaseClient'

const LandingPage = () => {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')
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
    } catch (error) {
      console.error('Error:', error)
      setStatus('error')
      if (
        error instanceof Error &&
        error.message ===
          'duplicate key value violates unique constraint "waitlist_email_key"'
      ) {
        setErrorMessage('This email is already on the waitlist!')
      } else {
        setErrorMessage('Something went wrong. Please try again.')
      }
    }
  }

  return (
    <div className="min-h-screen bg-base-100">
      <nav className="navbar bg-base-100 border-b border-base-200">
        <div className="container mx-auto px-4">
          <div className="flex-1">
            <Link to="/" className="text-xl font-bold">
              Backlog Explorer
            </Link>
          </div>
          <div className="flex-none space-x-2">
            <Link to="/auth?mode=login" className="btn btn-ghost">
              Login
            </Link>
            <Link to="/auth?mode=signup" className="btn btn-primary">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-purple-500 to-secondary bg-clip-text text-transparent animate-gradient leading-relaxed py-2">
            Your Personal Gaming Companion
          </h1>

          <div className="prose prose-lg mx-auto mb-12">
            <p className="text-xl mb-8 text-base-content/80">
              Backlog Explorer transforms the way you engage with your video
              game collection. Instead of seeing your backlog as an overwhelming
              to-do list, we help you celebrate your gaming journey and find the
              perfect game for every moment.
            </p>
          </div>

          <div className="mb-12 max-w-3xl mx-auto text-left">
            <h2 className="text-2xl font-semibold mb-4 text-base-content">
              🎥 A Peek Inside
            </h2>
            <div className="card bg-base-200 shadow-xl">
              <div className="relative w-full pb-[56.25%] h-0 overflow-hidden rounded-b-lg">
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src="https://www.youtube.com/embed/dsJUFhKoyGQ?start=1"
                  title="Backlog Explorer WIP Demo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>

          <div className="max-w-md mx-auto mb-16">
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
                className={`btn btn-primary ${
                  status === 'loading' ? 'loading' : ''
                }`}
                disabled={status === 'loading' || status === 'success'}
              >
                {status === 'success'
                  ? "You're on the list! 🎮"
                  : 'Join the Waitlist'}
              </button>
              {status === 'error' && (
                <p className="text-error text-sm">{errorMessage}</p>
              )}
            </form>
          </div>

          <div className="grid md:grid-cols-2 gap-8 text-left">
            <div className="card bg-base-200 hover:shadow-lg transition-shadow">
              <div className="card-body">
                <div className="flex items-center gap-4 mb-4">
                  <svg
                    className="w-6 h-6 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <h3 className="card-title">Track Your Progress</h3>
                </div>
                <p>
                  Every game tells a story—whether you’re deep in an adventure,
                  taking a break, or moving on. Keep track of your journey and
                  celebrate every win.
                </p>
              </div>
            </div>

            <div className="card bg-base-200 hover:shadow-lg transition-shadow">
              <div className="card-body">
                <div className="flex items-center gap-4 mb-4">
                  <svg
                    className="w-6 h-6 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  <h3 className="card-title">Smart Organization</h3>
                </div>
                <p>
                  Organize your games by status, platform, and genres. Create
                  custom collections and themed playlists that match your gaming
                  style.
                </p>
              </div>
            </div>

            <div className="card bg-base-200 hover:shadow-lg transition-shadow">
              <div className="card-body">
                <div className="flex items-center gap-4 mb-4">
                  <svg
                    className="w-6 h-6 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <h3 className="card-title">Discover Games</h3>
                </div>
                <p>
                  Explore your library with purpose. Find the perfect game based
                  on your mood, available time, and gaming preferences.
                </p>
              </div>
            </div>

            <div className="card bg-base-200 hover:shadow-lg transition-shadow">
              <div className="card-body">
                <div className="flex items-center gap-4 mb-4">
                  <svg
                    className="w-6 h-6 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                  <h3 className="card-title">Personal Gaming Journal</h3>
                </div>
                <p>
                  Keep track of your favorite gaming moments, achievements, and
                  memories. Your backlog isn't a chore—it's an adventure waiting
                  to unfold.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Meet the Developer</h2>
              <div className="avatar mb-6">
                <div className="w-24 h-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                  <img
                    src="https://api.dicebear.com/9.x/adventurer/svg?seed=Sophia&glasses[]&glassesProbability=0&hair=long01,long02,long03,long04,long05,long06,long07,long08,long09,long10,long11,long12,long13,long14,long15,long16,long17,long18,long19,long20,long21,long22,long23,long24,long25,long26&hairColor=562306&skinColor=ecad80,f2d3b1&backgroundColor=a991f7"
                    alt="Avatar"
                  />
                </div>
              </div>
              <p className="text-lg font-medium">Hi! I'm Joana 👋</p>
              <p className="text-base-content/70">
                Full-stack Developer & Gaming Enthusiast
              </p>
              <div className="flex justify-center gap-4 mt-4">
                <a
                  href="https://www.linkedin.com/in/joanaponder/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base-content/70 hover:text-primary transition-colors"
                  aria-label="LinkedIn Profile"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                <a
                  href="https://bsky.app/profile/levelupjo.bsky.social"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base-content/70 hover:text-primary transition-colors"
                  aria-label="Bluesky Profile"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 512 512"
                  >
                    <path d="M111.8 62.2C170.2 105.9 233 194.7 256 242.4c23-47.6 85.8-136.4 144.2-180.2c42.1-31.6 110.3-56 110.3 21.8c0 15.5-8.9 130.5-14.1 149.2C478.2 298 412 314.6 353.1 304.5c102.9 17.5 129.1 75.5 72.5 133.5c-107.4 110.2-154.3-27.6-166.3-62.9l0 0c-1.7-4.9-2.6-7.8-3.3-7.8s-1.6 3-3.3 7.8l0 0c-12 35.3-59 173.1-166.3 62.9c-56.5-58-30.4-116 72.5-133.5C100 314.6 33.8 298 15.7 233.1C10.4 214.4 1.5 99.4 1.5 83.9c0-77.8 68.2-53.4 110.3-21.8z" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="card bg-base-200">
                <div className="card-body">
                  <h3 className="card-title mb-4">
                    <svg
                      className="w-5 h-5 text-primary mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                    The Journey
                  </h3>
                  <p>
                    Fresh out of bootcamp in 2023, I combined my newfound coding
                    skills with a problem I knew all too well: managing an
                    ever-growing game collection while balancing life as a
                    full-time professional and mom to a toddler.
                  </p>
                </div>
              </div>

              <div className="card bg-base-200">
                <div className="card-body">
                  <h3 className="card-title mb-4">
                    <svg
                      className="w-5 h-5 text-primary mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    The Inspiration
                  </h3>
                  <p>
                    Like many gamers, I found myself buying exciting new games
                    only to have them sit untouched. With limited gaming time,
                    choosing what to play next became overwhelming rather than
                    enjoyable.
                  </p>
                </div>
              </div>

              <div className="card bg-base-200">
                <div className="card-body">
                  <h3 className="card-title mb-4">
                    <svg
                      className="w-5 h-5 text-primary mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    The Solution
                  </h3>
                  <p>
                    Backlog Explorer isn't just another tracking tool—it's a
                    response to the overwhelm of choice. It helps you rediscover
                    games you were once excited about by matching them to your
                    current mood and available time.
                  </p>
                </div>
              </div>

              <div className="card bg-base-200">
                <div className="card-body">
                  <h3 className="card-title mb-4">
                    <svg
                      className="w-5 h-5 text-primary mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    Personal Touch
                  </h3>
                  <p>
                    This is my passion project, built in moments between work
                    and family time. It combines my love for coding with gaming,
                    and I hope it helps you find more joy in your gaming
                    collection!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-base-200 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-base-content/60">
          <p>
            {' '}
            {new Date().getFullYear()} Backlog Explorer. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
