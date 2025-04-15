import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../supabaseClient'
import OnboardingFlow from '../components/OnboardingFlow'

interface Game {
  id: string
  title: string
  image: string
  progress: number
  platforms: string[]
  genres: string[]
  status: string
}

const HomePage = () => {
  const navigate = useNavigate()
  const [currentGames, setCurrentGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [userName, setUserName] = useState<string>('')

  useEffect(() => {
    const fetchCurrentGames = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          navigate('/login')
          return
        }

        // Get user's name from metadata
        const firstName = user.user_metadata?.full_name?.split(' ')[0] || ''
        setUserName(firstName)

        // First check if user has any games at all
        const { count: totalGames } = await supabase
          .from('user_games')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        // Only show onboarding if user has no games at all
        setShowOnboarding(totalGames === 0)

        // Then get currently playing games for display
        const { data: games, error } = await supabase
          .from('user_games')
          .select(
            `
            id,
            status,
            progress,
            platforms,
            image,
            game:games!user_games_game_id_fkey (
              id,
              title,
              background_image,
              game_genres (
                genres (
                  name
                )
              )
            )
          `
          )
          .eq('user_id', user.id)
          .eq('status', 'Currently Playing')

        if (error) throw error

        // Transform the data to match the expected format
        const formattedGames =
          games?.map((userGame) => ({
            id: userGame.game.id,
            title: userGame.game.title,
            image: userGame.image || userGame.game.background_image,
            progress: userGame.progress,
            platforms: userGame.platforms || [],
            genres: userGame.game.game_genres.map(gg => gg.genres.name),
            status: userGame.status,
          })) || []

        setCurrentGames(formattedGames)
      } catch (error) {
        console.error('Error fetching current games:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentGames()
  }, [navigate])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="loading loading-spinner loading-lg"></div>
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
                        <span key={`${game.id}-${platform}-${index}`} className="badge badge-outline">
                          {platform}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2 flex-wrap mb-4">
                      {game.genres.map((genre, index) => (
                        <span key={`${game.id}-${genre}-${index}`} className="badge badge-accent">
                          {genre}
                        </span>
                      ))}
                    </div>
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
