import { useState, useEffect, useCallback } from 'react'
import supabase from '../supabaseClient'

// Custom hook for library games with filtering, sorting, and options
export function useLibraryGames(userId: string | null) {
  // Filter states
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [filterYear, setFilterYear] = useState<number | null>(null)
  const [filterPlatform, setFilterPlatform] = useState<string>('')
  const [filterGenre, setFilterGenre] = useState<string>('')
  const [filterMood, setFilterMood] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<string>('alphabetical-asc')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Data states
  const [games, setGames] = useState<any[]>([])
  const [platformOptions, setPlatformOptions] = useState<string[]>([])
  const [genreOptions, setGenreOptions] = useState<string[]>([])
  const [moodOptions, setMoodOptions] = useState<string[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [yearOptions, setYearOptions] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)

  // Fetch and process games from Supabase
  const fetchGames = useCallback(async () => {
    if (!userId) return
    setError(null)
    try {
      // Predefined status options
      setStatusOptions([
        'Endless',
        'Satisfied',
        'DNF',
        'Wishlist',
        'Try Again',
        'Started',
        'Owned',
        'Come back!',
        'Currently Playing',
        'Done',
      ])

      // Fetch user games with relationships
      const { data: userGames, error: gamesError } = await supabase
        .from('user_games')
        .select(
          `
          id,
          status,
          progress,
          platforms,
          image,
          updated_at,
          game:games!user_games_game_id_fkey (
            id,
            title,
            background_image,
            created_at,
            provider,
            igdb_id,
            game_genres (
              genre_id,
              genres (
                id,
                name
              )
            ),
            game_moods (
              mood_id,
              moods (
                id,
                name
              )
            )
          )
        `
        )
        .eq('user_id', userId)
        .order('game(title)', { ascending: true })

      if (gamesError) {
        setError(gamesError.message || 'Something went wrong fetching games.')
        return
      }

      // Format games with platform, genre, and mood names
      let formattedGames = (userGames || []).map((userGame: any) => ({
        id: userGame.game.id,
        title: userGame.game.title,
        status: userGame.status,
        progress: userGame.progress,
        image: userGame.image || userGame.game.background_image,
        created_at: userGame.game.created_at,
        updated_at: userGame.updated_at,
        platforms: userGame.platforms || [],
        genres: userGame.game.game_genres.map((gg: any) => gg.genres.name),
        moods: userGame.game.game_moods?.map((gm: any) => gm.moods.name) || [],
        provider: userGame.game.provider || 'rawg',
        igdb_id: userGame.game.igdb_id || 0,
      }))

      // Build options for filters
      const years = Array.from(
        new Set((userGames || []).map((game: any) => new Date(game.updated_at).getFullYear()))
      ).sort((a, b) => b - a)
      setYearOptions(years)

      const platformNames = Array.from(
        new Set(formattedGames.flatMap((game: any) => game.platforms))
      ).sort()
      setPlatformOptions(platformNames)

      const genreNames = Array.from(
        new Set(formattedGames.flatMap((game: any) => game.genres))
      ).sort()
      setGenreOptions(genreNames)

      const moodNames = Array.from(
        new Set(formattedGames.flatMap((game: any) => game.moods))
      ).sort()
      setMoodOptions(moodNames)

      // Apply filters
      if (filterPlatform) {
        formattedGames = formattedGames.filter((game: any) =>
          game.platforms.includes(filterPlatform)
        )
      }
      if (filterGenre) {
        formattedGames = formattedGames.filter((game: any) =>
          game.genres.includes(filterGenre)
        )
      }
      if (filterMood) {
        formattedGames = formattedGames.filter((game: any) =>
          game.moods.includes(filterMood)
        )
      }
      if (filterStatus.length > 0) {
        formattedGames = formattedGames.filter((game: any) =>
          filterStatus.includes(game.status)
        )
      }
      if (filterYear) {
        formattedGames = formattedGames.filter((game: any) => {
          const updatedYear = new Date(game.updated_at).getFullYear()
          return updatedYear === filterYear
        })
      }
      if (searchQuery) {
        formattedGames = formattedGames.filter((game: any) =>
          game.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }

      // Sorting
      switch (sortOrder) {
        case 'alphabetical-asc':
          formattedGames.sort((a: any, b: any) => a.title.localeCompare(b.title))
          break
        case 'alphabetical-desc':
          formattedGames.sort((a: any, b: any) => b.title.localeCompare(a.title))
          break
        case 'progress-asc':
          formattedGames.sort((a: any, b: any) => (a.progress || 0) - (b.progress || 0))
          break
        case 'progress-desc':
          formattedGames.sort((a: any, b: any) => (b.progress || 0) - (a.progress || 0))
          break
        case 'date-newest':
          formattedGames.sort(
            (a: any, b: any) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          break
        case 'date-oldest':
          formattedGames.sort(
            (a: any, b: any) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          )
          break
      }

      setGames(formattedGames)
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userId,
    filterStatus,
    filterPlatform,
    filterGenre,
    filterMood,
    filterYear,
    sortOrder,
    searchQuery,
  ])

  // Fetch games and options when dependencies change
  useEffect(() => {
    if (userId) {
      fetchGames()
    }
  }, [
    userId,
    fetchGames,
  ])

  return {
    games,
    fetchGames,
    filters: {
      filterStatus,
      filterYear,
      filterPlatform,
      filterGenre,
      filterMood,
      sortOrder,
      searchQuery,
    },
    setters: {
      setFilterStatus,
      setFilterYear,
      setFilterPlatform,
      setFilterGenre,
      setFilterMood,
      setSortOrder,
      setSearchQuery,
    },
    options: {
      platformOptions,
      genreOptions,
      moodOptions,
      statusOptions,
      yearOptions,
    },
    error,
  }
}