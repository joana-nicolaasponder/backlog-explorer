import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../supabaseClient'
import { UserGameResponse } from '../types'

interface GameStats {
  totalLibrary: number
  backlog: number
  currentlyPlaying: number
  completed: number
  // Keeping this commented for future use
  completedThisYear: number
  topGenre: string
  topPlatform: string
  topMood: string
  recentActivity: {
    date: string
    action: string
  } | null
}

const Dashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState<GameStats>({
    totalLibrary: 0,
    backlog: 0,
    currentlyPlaying: 0,
    completed: 0,
    completedThisYear: 0,
    topGenre: '',
    topPlatform: '',
    topMood: '',
    recentActivity: null,
  })
  const [loading, setLoading] = useState(true)

  // Helper to get the top item from a count object
  const getTopItem = (counts: { [key: string]: number }) => {
    if (Object.keys(counts).length === 0) return 'None'
    return Object.entries(counts).reduce((a, b) => (a[1] > b[1] ? a : b))[0]
  }

  // Declare genreCounts and completedMoodCounts in component scope
  let genreCounts = {}
  let completedMoodCounts = {}

  // New state for top genre and mood among completed games
  const [topGenreCompleted, setTopGenreCompleted] = useState('')
  const [topMoodCompleted, setTopMoodCompleted] = useState('')

  useEffect(() => {
    const fetchGameStats = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          navigate('/login')
          return
        }

        // Get user games with their genres, platforms, and moods
        const { data: userGames, error } = (await supabase
          
          .from('user_games')
          .select(
            `
            status,
            progress,
            game_id,
            updated_at,
            platforms,
            games!user_games_game_id_fkey (
              id,
              title,
              game_genres (
                genres (
                  name
                )
              ),
              game_platforms (
                platforms (
                  name
                )
              ),
              game_moods (
                moods (
                  name
                )
              )
            )
          `
          )
          .eq('user_id', user.id)) as {
          data: UserGameResponse[] | null
          error: Error | null
        }

        console.log('📊 Supabase user_games data:', userGames)

        //Keeping this commented for future use - completion tracking
        const currentYear = new Date().getFullYear()
        const { data: completionNotes } = await supabase
          .from('game_notes')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_completion_entry', true)
          .gte('completion_date', `${currentYear}-01-01`)
          .lte('completion_date', `${currentYear}-12-31`)

        if (error) throw error

        // Get the most recent game note
        const { data: recentNotes } = await supabase
          .from('game_notes')
          .select('created_at, content')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)

        const recentNote = recentNotes?.[0]

        if (!userGames) {
          throw new Error('No user games found')
        }

        const completedGames = userGames.filter((game) =>
          ['Endless', 'Done', 'Satisfied', 'DNF'].includes(game.status)
        ).length

        // Keeping this commented for future use - completion tracking
        const gamesCompletedThisYear = userGames.filter((game) => {
          const updatedAt = new Date(game.updated_at)
          return (
            ['Endless', 'Done', 'Satisfied', 'DNF'].includes(game.status) &&
            updatedAt.getFullYear() === currentYear
          )
        })

        const completedThisYear = gamesCompletedThisYear.length

        const completedUserGames = userGames.filter((game) =>
          ['Endless', 'Done', 'Satisfied', 'DNF'].includes(game.status)
        )

        // Count mood occurrences for completed games only
        completedMoodCounts = completedUserGames.reduce(
          (acc: { [key: string]: number }, userGame) => {
            if (userGame.games && Array.isArray(userGame.games.game_moods)) {
              userGame.games.game_moods.forEach((gm) => {
                const moodName = gm.moods.name
                acc[moodName] = (acc[moodName] || 0) + 1
              })
            }
            return acc
          },
          {}
        )

        // Genres to ignore in stats
        const IGNORED_GENRES = [
          'Adventure',
          'Indie',
          'RPG',
          'Simulation',
          'Strategy',
        ]

        // Count most meaningful genre (first non-ignored) per game
        genreCounts = completedUserGames.reduce(
          (acc: { [key: string]: number }, userGame) => {
            const genres = userGame.games?.game_genres || []
            const meaningfulGenre = genres.find(
              (gg) => !IGNORED_GENRES.includes(gg.genres.name)
            )
            if (meaningfulGenre) {
              const genreName = meaningfulGenre.genres.name
              acc[genreName] = (acc[genreName] || 0) + 1
            }
            return acc
          },
          {}
        )

        // Set top genre and mood among completed games
        setTopGenreCompleted(getTopItem(genreCounts))
        setTopMoodCompleted(getTopItem(completedMoodCounts))

        // Log user games platforms for debugging
        console.log(
          'User games with platforms:',
          userGames.map((game) => ({
            title: game.games.title,
            platforms: game.platforms || [],
          }))
        )

        // Count platform occurrences from user's selected platforms
        const platformCounts = completedUserGames.reduce(
          (acc: { [key: string]: number }, userGame) => {
            ;(userGame.platforms || []).forEach((platformName: string) => {
              acc[platformName] = (acc[platformName] || 0) + 1
            })
            return acc
          },
          {}
        )

        // Log platform counts for debugging
        console.log('Platform counts:', platformCounts)

        // Count mood occurrences for all games (not just completed ones)
        // (Restored original logic for mood counting)
        const allMoodCounts = userGames.reduce(
          (acc: { [key: string]: number }, userGame) => {
            if (userGame.games && Array.isArray(userGame.games.game_moods)) {
              userGame.games.game_moods.forEach((gm) => {
                const moodName = gm.moods.name
                acc[moodName] = (acc[moodName] || 0) + 1
              })
            } else {
              console.warn(
                'Missing or invalid game_moods for userGame:',
                userGame
              )
            }
            return acc
          },
          {}
        )

        setStats({
          totalLibrary: userGames?.length || 0,
          backlog:
            userGames?.filter((game) =>
              ['Try Again', 'Started', 'Owned', 'Come back!'].includes(
                game.status
              )
            ).length || 0,
          currentlyPlaying:
            userGames?.filter((game) => game.status === 'Currently Playing')
              .length || 0,
          completed: completedGames,
          completedThisYear: completedThisYear,
          topGenre: getTopItem(genreCounts),
          topPlatform: getTopItem(platformCounts),
          // Use allMoodCounts for topMood (all games, not just completed)
          topMood: getTopItem(allMoodCounts),
          recentActivity: recentNote
            ? {
                date: new Date(recentNote.created_at).toLocaleDateString(),
                action: recentNote.content,
              }
            : null,
        })
      } catch (error) {
        console.error('Error fetching game stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchGameStats()
  }, [navigate])

  // fallback assignments just above return
  genreCounts = genreCounts || {}
  completedMoodCounts = completedMoodCounts || {}
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card bg-base-100 shadow-xl animate-pulse">
              <div className="card-body">
                <div className="h-6 bg-base-300 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-base-300 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            className="card bg-base-100 shadow-xl tooltip"
            data-tip="Total number of games in your collection, including games you own, want to play, or have finished"
          >
            <div className="card-body">
              <h2 className="card-title">Total Library</h2>
              <p className="text-4xl font-bold" data-testid="total-library">{stats.totalLibrary}</p>
              <p className="text-sm opacity-70">Games in your collection</p>
            </div>
          </div>
          <div
            className="card bg-base-100 shadow-xl hover:bg-base-200 cursor-pointer transition-colors tooltip"
            data-tip="Games marked as Try Again, Started, Owned, or Come back! - click to view all your backlog games"
            onClick={() =>
              navigate('/app/library', {
                state: {
                  filterStatus: ['Try Again', 'Started', 'Owned', 'Come back!'],
                },
              })
            }
          >
            <div className="card-body">
              <h2 className="card-title">Games in Backlog</h2>
              <p className="text-4xl font-bold" data-testid="backlog">{stats.backlog}</p>
              <p className="text-sm opacity-70">
                {((stats.backlog / stats.totalLibrary) * 100).toFixed(1)}% of
                your library
              </p>
            </div>
          </div>
          <div
            className="card bg-base-100 shadow-xl hover:bg-base-200 cursor-pointer transition-colors tooltip"
            data-tip="Games you're actively playing right now - click to view all your active games"
            onClick={() =>
              navigate('/app/library', {
                state: { filterStatus: 'Currently Playing' },
              })
            }
          >
            <div className="card-body">
              <h2 className="card-title">Currently Playing</h2>
              <p className="text-4xl font-bold" data-testid="currently-playing">{stats.currentlyPlaying}</p>
              <p className="text-sm opacity-70">Active games in progress</p>
            </div>
          </div>
          <div
            className="card bg-base-100 shadow-xl hover:bg-base-200 cursor-pointer transition-colors tooltip"
            data-tip="Games marked as Done, Endless, Satisfied, or DNF - click to view all your finished games"
            onClick={() =>
              navigate('/app/library', {
                state: {
                  filterStatus: ['Endless', 'Done', 'Satisfied', 'DNF'],
                },
              })
            }
          >
            <div className="card-body">
              <h2 className="card-title">Completed Games</h2>
              <p className="text-4xl font-bold" data-testid="completed">{stats.completed}</p>
              <p className="text-sm opacity-70">
                {((stats.completed / stats.totalLibrary) * 100).toFixed(1)}%
                completion rate
              </p>
            </div>
          </div>
          <div
            className="card bg-base-100 shadow-xl tooltip"
            data-tip="Based on the most common genre and mood in your completed games"
          >
            <div className="card-body">
              <h2 className="card-title">Favorite Game Type</h2>
              <p className="text-4xl font-bold capitalize" data-testid="favorite-game-type">
                {topGenreCompleted || 'Unknown'} • {topMoodCompleted || 'Unknown'}
              </p>
              <p className="text-sm opacity-70">Your most-played vibe</p>
            </div>
          </div>
          <div
            className="card bg-base-100 shadow-xl tooltip"
            data-tip="The gaming platform that you use most frequently across your game collection"
          >
            <div className="card-body">
              <h2 className="card-title">Most Used Platform</h2>
              <p className="text-4xl font-bold" data-testid="most-used-platform">{stats.topPlatform}</p>
              <p className="text-sm opacity-70">Your primary gaming platform</p>
            </div>
          </div>
          {/* Keeping this commented for future use - completion tracking card */}
          <div
            className="card bg-base-100 shadow-xl hover:bg-base-200 cursor-pointer transition-colors tooltip"
            data-tip="Games marked as Done, Endless, Satisfied, or DNF in 2025 - click to view all games completed this year"
            onClick={() =>
              navigate('/app/library', {
                state: {
                  filterStatus: ['Endless', 'Done', 'Satisfied', 'DNF'],
                  // Note: The actual filtering by year would need to be implemented in the Library component
                },
              })
            }
          >
            <div className="card-body">
              <h2 className="card-title">Completed in 2025</h2>
              <p className="text-4xl font-bold" data-testid="completed-this-year">{stats.completedThisYear}</p>
              <p className="text-sm opacity-70">
                {((stats.completedThisYear / stats.totalLibrary) * 100).toFixed(
                  1
                )}
                % of your library
              </p>
            </div>
          </div>

          <div
            className="card bg-base-100 shadow-xl tooltip"
            data-tip="The mood that appears most frequently across your game collection"
          >
            <div className="card-body">
              <h2 className="card-title">Most Common Mood</h2>
              <p className="text-4xl font-bold capitalize" data-testid="most-common-mood">{stats.topMood}</p>
              <p className="text-sm opacity-70">How your games make you feel</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
