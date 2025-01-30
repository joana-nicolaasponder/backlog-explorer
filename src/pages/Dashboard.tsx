import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../supabaseClient'

interface GameStats {
  totalLibrary: number
  backlog: number
  currentlyPlaying: number
  completed: number
  topGenre: string
  topPlatform: string
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
    topGenre: '',
    topPlatform: '',
    recentActivity: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchGameStats = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          navigate('/login')
          return
        }

        // Get user games with their genres and platforms
        const { data: userGames, error } = await supabase
          .from('user_games')
          .select(`
            status,
            progress,
            game:games (
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
              )
            )
          `)
          .eq('user_id', user.id)

        if (error) throw error

        // Get the most recent game note
        const { data: recentNote } = await supabase
          .from('game_notes')
          .select('created_at, content')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        const completedGames = userGames.filter(game => 
          ['Endless', 'Done', 'Satisfied', 'DNF'].includes(game.status)
        ).length

        // Count genre occurrences
        const genreCounts = userGames.reduce((acc: { [key: string]: number }, userGame) => {
          userGame.game.game_genres.forEach((gg: any) => {
            const genreName = gg.genres.name
            acc[genreName] = (acc[genreName] || 0) + 1
          })
          return acc
        }, {})

        // Count platform occurrences
        const platformCounts = userGames.reduce((acc: { [key: string]: number }, userGame) => {
          userGame.game.game_platforms.forEach((gp: any) => {
            const platformName = gp.platforms.name
            acc[platformName] = (acc[platformName] || 0) + 1
          })
          return acc
        }, {})

        // Find the most common genre and platform
        const getTopItem = (counts: { [key: string]: number }) => {
          if (Object.keys(counts).length === 0) return 'None'
          return Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b)[0]
        }

        setStats({
          totalLibrary: userGames.length,
          backlog: userGames.filter(game => game.status === 'Wishlist' || game.status === 'Owned').length,
          currentlyPlaying: userGames.filter(game => game.status === 'Currently Playing').length,
          completed: completedGames,
          topGenre: getTopItem(genreCounts),
          topPlatform: getTopItem(platformCounts),
          recentActivity: recentNote ? {
            date: new Date(recentNote.created_at).toLocaleDateString(),
            action: recentNote.content
          } : null
        })
      } catch (error) {
        console.error('Error fetching game stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchGameStats()
  }, [navigate])

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
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Total Library</h2>
              <p className="text-4xl font-bold">{stats.totalLibrary}</p>
              <p className="text-sm opacity-70">
                Games in your collection
              </p>
            </div>
          </div>
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Games in Backlog</h2>
              <p className="text-4xl font-bold">{stats.backlog}</p>
              <p className="text-sm opacity-70">
                {((stats.backlog / stats.totalLibrary) * 100).toFixed(1)}% of your library
              </p>
            </div>
          </div>
          <div 
            className="card bg-base-100 shadow-xl hover:bg-base-200 cursor-pointer transition-colors"
            onClick={() => navigate('/library', { state: { filterStatus: 'Currently Playing' } })}
          >
            <div className="card-body">
              <h2 className="card-title">Currently Playing</h2>
              <p className="text-4xl font-bold">{stats.currentlyPlaying}</p>
              <p className="text-sm opacity-70">
                Active games in progress
              </p>
            </div>
          </div>
          <div 
            className="card bg-base-100 shadow-xl hover:bg-base-200 cursor-pointer transition-colors"
            onClick={() => navigate('/library', { state: { filterStatus: ['Endless', 'Done', 'Satisfied', 'DNF'] } })}
          >
            <div className="card-body">
              <h2 className="card-title">Completed Games</h2>
              <p className="text-4xl font-bold">{stats.completed}</p>
              <p className="text-sm opacity-70">
                {((stats.completed / stats.totalLibrary) * 100).toFixed(1)}% completion rate
              </p>
            </div>
          </div>
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Most Played Genre</h2>
              <p className="text-4xl font-bold capitalize">{stats.topGenre}</p>
              <p className="text-sm opacity-70">
                Your favorite type of game
              </p>
            </div>
          </div>
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Most Used Platform</h2>
              <p className="text-4xl font-bold">{stats.topPlatform}</p>
              <p className="text-sm opacity-70">
                Your primary gaming platform
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard