import { useState, useEffect, useCallback } from 'react'
import supabase from '../../supabaseClient'

interface GenreResponse {
  genre_id: string
  genres: {
    id: number
    name: string
  }
}

interface MoodResponse {
  mood_id: string
  moods: {
    id: string
    name: string
  }
}

interface GameQueryResponse {
  id: string
  title: string
  background_image?: string
  created_at: string
  provider: string
  igdb_id: number
  game_genres: GenreResponse[]
  game_moods?: MoodResponse[]
}

interface UserGameQueryResponse {
  id: string
  status: string
  progress: number
  platforms: string[]
  image?: string
  updated_at: string
  game: GameQueryResponse
}

interface FormattedGame {
  id: string
  title: string
  status: string
  progress: number
  image?: string
  created_at: string
  updated_at: string
  platforms: string[]
  genres: string[]
  moods: string[]
  provider: string
  igdb_id: number
}

export function useLibraryGames(userId: string | null, filterLetter?: string) {
  // Filter states
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [filterYear, setFilterYear] = useState<number | null>(null)
  const [filterPlatform, setFilterPlatform] = useState<string>('')
  const [filterGenre, setFilterGenre] = useState<string>('')
  const [filterMood, setFilterMood] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<string>('alphabetical-asc')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Data states
  const [games, setGames] = useState<FormattedGame[]>([])
  const [platformOptions, setPlatformOptions] = useState<string[]>([])
  const [genreOptions, setGenreOptions] = useState<string[]>([])
  const [moodOptions, setMoodOptions] = useState<string[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [yearOptions, setYearOptions] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)

  // Pagination states
  const [page, setPage] = useState(1)
  const pageSize = 30
  const [totalCount, setTotalCount] = useState(0)

  const fetchGames = useCallback(async () => {
    if (!userId) return
    setError(null)
    try {
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

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabase
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
        `,
          { count: 'exact' }
        )
        .eq('user_id', userId)
        .order('game(title)', { ascending: true })

      if (searchQuery) {
        query = query.ilike('game.title', `%${searchQuery}%`)
      } else if (filterLetter === '#') {
        for (let i = 0; i < 26; i++) {
          const letter = String.fromCharCode(65 + i)
          query = query.not('game.title', 'ilike', `${letter}%`)
          query = query.not('game.title', 'ilike', `${letter.toLowerCase()}%`)
        }
      } else if (filterLetter) {
        query = query.ilike('game.title', `${filterLetter}%`)
      }

      query = query.range(from, to)

      const { data: userGames, count, error: gamesError } = await query

      if (gamesError) {
        setError(gamesError.message || 'Something went wrong fetching games.')
        return
      }

      const typedUserGames = userGames ? userGames as unknown as UserGameQueryResponse[]: null 

      let formattedGames: FormattedGame[] = (typedUserGames || [])
        .filter((userGame: UserGameQueryResponse) => userGame.game)
        .map((userGame: UserGameQueryResponse): FormattedGame => {
          const game = userGame.game 
          return {
            id: game.id,
            title: game.title,
            status: userGame.status,
            progress: userGame.progress,
            image: userGame.image || game.background_image,
            created_at: game.created_at,
            updated_at: userGame.updated_at,
            platforms: userGame.platforms || [],
            genres: game.game_genres.map((gg: GenreResponse) => gg.genres.name),
            moods: game.game_moods?.map((gm: MoodResponse) => gm.moods.name) || [],
            provider: game.provider || 'rawg',
            igdb_id: game.igdb_id || 0,
          }
        })

      // Build options for filters
      const years = Array.from(
        new Set(
          (typedUserGames || []).map((game: UserGameQueryResponse) =>
            new Date(game.updated_at).getFullYear()
          )
        )
      ).sort((a, b) => b - a)
      setYearOptions(years)

      const platformNames = Array.from(
        new Set(formattedGames.flatMap((game: FormattedGame) => game.platforms))
      ).sort()
      setPlatformOptions(platformNames)

      const genreNames = Array.from(
        new Set(formattedGames.flatMap((game: FormattedGame) => game.genres))
      ).sort()
      setGenreOptions(genreNames)

      const moodNames = Array.from(
        new Set(formattedGames.flatMap((game: FormattedGame) => game.moods))
      ).sort()
      setMoodOptions(moodNames)

      // Apply filters
      if (filterPlatform) {
        formattedGames = formattedGames.filter((game: FormattedGame) =>
          game.platforms.includes(filterPlatform)
        )
      }
      if (filterGenre) {
        formattedGames = formattedGames.filter((game: FormattedGame) =>
          game.genres.includes(filterGenre)
        )
      }
      if (filterMood) {
        formattedGames = formattedGames.filter((game: FormattedGame) =>
          game.moods.includes(filterMood)
        )
      }
      if (filterStatus.length > 0) {
        formattedGames = formattedGames.filter((game: FormattedGame) =>
          filterStatus.includes(game.status)
        )
      }
      if (filterYear) {
        formattedGames = formattedGames.filter((game: FormattedGame) => {
          const updatedYear = new Date(game.updated_at).getFullYear()
          return updatedYear === filterYear
        })
      }
      if (searchQuery) {
        formattedGames = formattedGames.filter((game: FormattedGame) =>
          game.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }

      switch (sortOrder) {
        case 'alphabetical-asc':
          formattedGames.sort((a: FormattedGame, b: FormattedGame) =>
            a.title.localeCompare(b.title)
          )
          break
        case 'alphabetical-desc':
          formattedGames.sort((a: FormattedGame, b: FormattedGame) =>
            b.title.localeCompare(a.title)
          )
          break
        case 'progress-asc':
          formattedGames.sort(
            (a: FormattedGame, b: FormattedGame) =>
              (a.progress || 0) - (b.progress || 0)
          )
          break
        case 'progress-desc':
          formattedGames.sort(
            (a: FormattedGame, b: FormattedGame) =>
              (b.progress || 0) - (a.progress || 0)
          )
          break
        case 'date-newest':
          formattedGames.sort(
            (a: FormattedGame, b: FormattedGame) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          break
        case 'date-oldest':
          formattedGames.sort(
            (a: FormattedGame, b: FormattedGame) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          )
          break
      }

      setGames(formattedGames)
      setTotalCount(count || 0)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong.'
      setError(message)
    }
  }, [
    userId,
    filterStatus,
    filterPlatform,
    filterGenre,
    filterMood,
    filterYear,
    sortOrder,
    searchQuery,
    page,
    filterLetter,
  ])

  useEffect(() => {
    if (userId) {
      fetchGames()
    }
  }, [userId, fetchGames])

  return {
    games,
    fetchGames,
    page,
    setPage,
    pageSize,
    totalCount,
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
