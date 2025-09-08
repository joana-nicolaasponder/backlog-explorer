import { useEffect, useState } from 'react'
import supabase from '../../supabaseClient'


const COMPLETED_STATUSES = ['Endless', 'Done', 'Satisfied', 'DNF']
const BACKLOG_STATUSES = ['Try Again', 'Started', 'Owned', 'Come back!']



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

        const [
          { count: totalLibrary },
          { count: backlog },
          { count: currentlyPlaying },
          { count: completed },
        ] = await Promise.all([
          supabase
            .from('user_games')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('user_games')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .in('status', BACKLOG_STATUSES),
          supabase
            .from('user_games')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'Currently Playing'),
          supabase
            .from('user_games')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .in('status', COMPLETED_STATUSES),
        ])

        const { data: userGamesMin } = await supabase
          .from('user_games')
          .select(
            `status, updated_at, platforms, games!user_games_game_id_fkey (game_genres (genres (name)), game_platforms (platforms (name)), game_moods (moods (name)))`
          )
          .eq('user_id', user.id)
          .limit(2000) 

        const currentYear = new Date().getFullYear()
        const [
          { data: topGenreData },
          { data: topPlatformData },
          { data: topMoodData },
        ] = await Promise.all([
          supabase.rpc('get_top_genre', { user_id: user.id }),
          supabase.rpc('get_top_platform', { user_id: user.id }),
          supabase.rpc('get_top_mood', { user_id: user.id }),
        ])
        const topGenre = topGenreData?.[0]?.genre || ''
        const topPlatform = topPlatformData?.[0]?.platform || ''
        const topMood = topMoodData?.[0]?.mood || ''

        const gamesCompletedThisYear = (userGamesMin || []).filter((game) => {
          const updatedAt = new Date(game.updated_at)
          return (
            COMPLETED_STATUSES.includes(game.status) &&
            updatedAt.getFullYear() === currentYear
          )
        })
        const completedThisYear = gamesCompletedThisYear.length

        const { data: recentNotes } = await supabase
          .from('game_notes')
          .select('created_at, content')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
        const recentNote = recentNotes?.[0]

        setStats({
          totalLibrary: totalLibrary || 0,
          backlog: backlog || 0,
          currentlyPlaying: currentlyPlaying || 0,
          completed: completed || 0,
          completedThisYear: completedThisYear,
          topGenre,
          topPlatform,
          topMood,
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

  const [topGenreMoodCombo, setTopGenreMoodCombo] = useState<{
    genre: string
    mood: string
    count: number
  } | null>(null)

  useEffect(() => {
    const fetchGenreMoodCombo = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.rpc('get_top_genre_mood_combo', {
        user_id: user.id,
      })
      setTopGenreMoodCombo(data?.[0] || null)
    }
    fetchGenreMoodCombo()
  }, [])

  return {
    stats,

    topGenreMoodCombo,
    loading,
    error,
  }
}
