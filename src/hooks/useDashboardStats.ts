import { useEffect, useState } from 'react'
import supabase from '../supabaseClient'
import { UserGameResponse } from '../types'

const IGNORED_GENRES = ['Adventure', 'Indie', 'RPG', 'Simulation', 'Strategy']

function getTopItem(counts: { [key: string]: number }) {
  if (Object.keys(counts).length === 0) return 'None'
  return Object.entries(counts).reduce((a, b) => (a[1] > b[1] ? a : b))[0]
}

const COMPLETED_STATUSES = ['Endless', 'Done', 'Satisfied', 'DNF']
const BACKLOG_STATUSES = ['Try Again', 'Started', 'Owned', 'Come back!']

function filterCompletedGames(games: UserGameResponse[]) {
  return games.filter((game) => COMPLETED_STATUSES.includes(game.status))
}

function countMoodOccurrences(games: UserGameResponse[]) {
  return games.reduce((acc: { [key: string]: number }, game) => {
    if (game.games && Array.isArray(game.games.game_moods)) {
      game.games.game_moods.forEach((gm) => {
        const name = gm.moods.name
        acc[name] = (acc[name] || 0) + 1
      })
    }
    return acc
  }, {})
}

function countGenreOccurrences(games: UserGameResponse[]) {
  return games.reduce((acc: { [key: string]: number }, game) => {
    const genres = game.games?.game_genres || []
    const meaningful = genres.find((g) => !IGNORED_GENRES.includes(g.genres.name))
    if (meaningful) {
      const name = meaningful.genres.name
      acc[name] = (acc[name] || 0) + 1
    }
    return acc
  }, {})
}

function countPlatformOccurrences(games: UserGameResponse[]) {
  return games.reduce((acc: { [key: string]: number }, game) => {
    (game.platforms || []).forEach((name: string) => {
      acc[name] = (acc[name] || 0) + 1
    })
    return acc
  }, {})
}

interface GameStats {
  totalLibrary: number
  backlog: number
  currentlyPlaying: number
  completed: number
  completedThisYear: number
  topGenre: string
  topPlatform: string
  topMood: string
  recentActivity: {
    date: string
    action: string
  } | null
}

export function useDashboardStats() {
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
  const [topGenreCompleted, setTopGenreCompleted] = useState('')
  const [topMoodCompleted, setTopMoodCompleted] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchGameStats = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          setError('unauthenticated')
          return
        }

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

        const currentYear = new Date().getFullYear()
        // const { data: completionNotes } = await supabase
        //   .from('game_notes')
        //   .select('*')
        //   .eq('user_id', user.id)
        //   .eq('is_completion_entry', true)
        //   .gte('completion_date', `${currentYear}-01-01`)
        //   .lte('completion_date', `${currentYear}-12-31`)

        // if (error) throw error

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

        const completedUserGames = filterCompletedGames(userGames)
        const completedMoodCounts = countMoodOccurrences(completedUserGames)
        const genreCounts = countGenreOccurrences(completedUserGames)
        const platformCounts = countPlatformOccurrences(completedUserGames)
        const allMoodCounts = countMoodOccurrences(userGames)

        const completedGames = completedUserGames.length

        const gamesCompletedThisYear = userGames.filter((game) => {
          const updatedAt = new Date(game.updated_at)
          return (
            COMPLETED_STATUSES.includes(game.status) &&
            updatedAt.getFullYear() === currentYear
          )
        })

        const completedThisYear = gamesCompletedThisYear.length

        setTopGenreCompleted(getTopItem(genreCounts))
        setTopMoodCompleted(getTopItem(completedMoodCounts))

      

        setStats({
          totalLibrary: userGames?.length || 0,
          backlog: userGames.filter((g) => BACKLOG_STATUSES.includes(g.status)).length,
          currentlyPlaying: userGames.filter((g) => g.status === 'Currently Playing').length,
          completed: completedGames,
          completedThisYear: completedThisYear,
          topGenre: getTopItem(genreCounts),
          topPlatform: getTopItem(platformCounts),
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
        setError(
          'Something went wrong while fetching your dashboard stats. Please try again later.'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchGameStats()
  }, [])

  return {
    stats,
    topGenreCompleted,
    topMoodCompleted,
    loading,
    error,
  }
}
