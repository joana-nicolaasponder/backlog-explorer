import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingFlow from './OnboardingFlow'
import {
  extractFirstName,
  fetchFormattedCurrentGames,
  getUserOrRedirect,
  isNewUser,
} from './homePageHelpers'

interface Game {
  id: string
  title: string
  image: string
  progress: number
  platforms: string[]
  genres: string[]
  status: string
  nextIntent?: string
  nextNote?: string
}

const HomePage = () => {
  const navigate = useNavigate()
  const [currentGames, setCurrentGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [userName, setUserName] = useState<string>('')

  useEffect(() => {
    const loadUserHomepage = async () => {
      try {
        const user = await getUserOrRedirect(navigate)
        if (!user) return

        setUserName(extractFirstName(user))

        setShowOnboarding(await isNewUser(user.id))

        setCurrentGames(await fetchFormattedCurrentGames(user.id))
      } catch (error) {
        console.error('Error fetching current games:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserHomepage()
  }, [navigate])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="loading loading-spinner loading-lg" role="status"></div>
      </div>
    )
  }

  if (showOnboarding) {
    return (
      <OnboardingFlow
        onComplete={() => {
          setShowOnboarding(false)
          navigate('/app/library')
        }}
      />
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">
        {userName ? `Welcome back, ${userName}! 👋🏼` : 'Welcome Back! 👋🏼'}
      </h1>
     
    
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Currently Playing</h2>
        {currentGames.length === 0 ? (
          <div className="text-center py-8 bg-base-200 rounded-lg">
            <p className="text-lg mb-4">
              You're not playing any games right now.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/app/library')}
            >
              Browse Your Library
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentGames.map((game) => (
                <div
                  key={game.id}
                  className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
                  onClick={() => navigate(`/app/game/${game.id}`)}
                >
                  <figure>
                    <img
                      src={game.image || '/default-image.jpg'}
                      alt={game.title}
                      className="w-full h-48 object-cover"
                    />
                  </figure>
                  <div className="card-body">
                    <h3 className="card-title">{game.title}</h3>
                    <div className="flex gap-2 flex-wrap mb-2">
                      {game.platforms.map((platform, index) => (
                        <span
                          key={`${game.id}-${platform}-${index}`}
                          className="badge badge-outline"
                        >
                          {platform}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2 flex-wrap mb-4">
                      {game.genres.map((genre, index) => (
                        <span
                          key={`${game.id}-${genre}-${index}`}
                          className="badge badge-accent"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                    {(game.nextIntent || game.nextNote) && (
                      <div className="mt-2 text-sm">
                        <p>
                          <span className="font-medium">🎯 Next Up:</span>{' '}
                          {game.nextIntent}
                        </p>
                        {game.nextNote && (
                          <p className="text-xs opacity-70">
                            📝 {game.nextNote}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="w-full bg-base-200 rounded-full overflow-hidden">
                      <div
                        className="bg-primary rounded-full h-2 transition-all duration-300"
                        style={{ width: `${game.progress || 0}%` }}
                      />
                    </div>
                    <p className="text-right text-sm text-base-content/70">
                      {game.progress || 0}% Complete
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default HomePage
