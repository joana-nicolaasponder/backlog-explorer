import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react'
import { useLocation } from 'react-router-dom'
import supabase from '../supabaseClient'
import GameCard from '../components/GameCard'
import SearchBar from '../components/SearchBar'
import { UserGame } from '../types'

export interface LibraryHandle {
  refreshGames: () => Promise<void>
}

const Library: React.ForwardRefRenderFunction<
  LibraryHandle,
  Record<string, never>
> = (props, ref) => {
  const location = useLocation()
  const [filterStatus, setFilterStatus] = useState<string[]>(
    Array.isArray(location.state?.filterStatus)
      ? location.state.filterStatus
      : location.state?.filterStatus
      ? [location.state.filterStatus]
      : []
  )
  const [filterYear, setFilterYear] = useState<number | null>(
    location.state?.filterYear ?? null
  )
  const [filterPlatform, setFilterPlatform] = useState<string>('')
  const [filterGenre, setFilterGenre] = useState<string>('')
  const [filterMood, setFilterMood] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<string>('alphabetical-asc')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [games, setGames] = useState<UserGame[]>([])
  const [platformOptions, setPlatformOptions] = useState<string[]>([])
  const [genreOptions, setGenreOptions] = useState<string[]>([])
  const [moodOptions, setMoodOptions] = useState<string[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [yearOptions, setYearOptions] = useState<number[]>([])
  const [userId, setUserId] = useState<string>('')

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    getCurrentUser()
  }, [])

  const fetchGames = async () => {
    if (!userId) return

    try {
      // Get all games with their relationships
      const { data: userGames, error: gamesError } = await supabase
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
            created_at,
            provider,
            igdb_id,
            game_genres (
              genre_id,
              genres (
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
        console.error('Error fetching games:', gamesError)
        return
      }

      // Format games with platform and genre names
      const formattedGames = userGames.map((userGame) => ({
        id: userGame.game.id,
        title: userGame.game.title,
        status: userGame.status,
        progress: userGame.progress,
        image: userGame.image || userGame.game.background_image,
        created_at: userGame.game.created_at,
        platforms: userGame.platforms || [],
        genres: userGame.game.game_genres.map((gg) => gg.genres.name),
        provider: userGame.game.provider || 'rawg',
        igdb_id: userGame.game.igdb_id || 0,
      }))

      setGames(formattedGames)

      // Extract unique platforms and genres
      const platforms = new Set<string>()
      const genres = new Set<string>()

      formattedGames.forEach((game) => {
        game.platforms?.forEach((platform) => platforms.add(platform))
        game.genres?.forEach((genre) => genres.add(genre))
      })

      setPlatformOptions(Array.from(platforms).sort())
      setGenreOptions(Array.from(genres).sort())
    } catch (error) {
      console.error('Error in fetchGames:', error)
    }
  }

  // Expose the refresh function through the ref
  useImperativeHandle(ref, () => ({
    refreshGames: fetchGames,
  }))

  useEffect(() => {
    const fetchOptions = async () => {
      if (!userId) {
        return
      }

      try {
        // Set predefined status options
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

        // Get all games with their relationships
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
          console.error('Error fetching games:', gamesError)
          return
        }

        // Format games with platform, genre and mood names
        let formattedGames = userGames.map((userGame) => ({
          id: userGame.game.id,
          title: userGame.game.title,
          status: userGame.status,
          progress: userGame.progress,
          image: userGame.image || userGame.game.background_image,
          created_at: userGame.game.created_at,
          updated_at: userGame.updated_at,
          platforms: userGame.platforms || [],
          genres: userGame.game.game_genres.map((gg) => gg.genres.name),
          moods: userGame.game.game_moods?.map((gm) => gm.moods.name) || [],
          provider: userGame.game.provider || 'rawg',
          igdb_id: userGame.game.igdb_id || 0,
        }))

        const years = Array.from(
          new Set(userGames.map((game) => new Date(game.updated_at).getFullYear()))
        ).sort((a, b) => b - a)
        setYearOptions(years)

        // Extract unique platform names
        const platformNames = Array.from(
          new Set(formattedGames.flatMap((game) => game.platforms))
        ).sort()
        setPlatformOptions(platformNames)

        // Extract unique genre names
        const genreNames = Array.from(
          new Set(formattedGames.flatMap((game) => game.genres))
        ).sort()
        setGenreOptions(genreNames)

        // Extract unique mood names
        const moodNames = Array.from(
          new Set(formattedGames.flatMap((game) => game.moods))
        ).sort()
        setMoodOptions(moodNames)

        // Apply filters
        if (filterPlatform) {
          formattedGames = formattedGames.filter((game) =>
            game.platforms.includes(filterPlatform)
          )
        }

        if (filterGenre) {
          formattedGames = formattedGames.filter((game) =>
            game.genres.includes(filterGenre)
          )
        }

        if (filterMood) {
          formattedGames = formattedGames.filter((game) =>
            game.moods.includes(filterMood)
          )
        }

        if (filterStatus.length > 0) {
          formattedGames = formattedGames.filter((game) =>
            filterStatus.includes(game.status)
          )
        }

        if (filterYear) {
          formattedGames = formattedGames.filter((game) => {
            const updatedYear = new Date(game.updated_at).getFullYear()
            return updatedYear === filterYear
          })
        }

        if (searchQuery) {
          formattedGames = formattedGames.filter((game) =>
            game.title.toLowerCase().includes(searchQuery.toLowerCase())
          )
        }

        // Apply sorting
        switch (sortOrder) {
          case 'alphabetical-asc':
            formattedGames.sort((a, b) => a.title.localeCompare(b.title))
            break
          case 'alphabetical-desc':
            formattedGames.sort((a, b) => b.title.localeCompare(a.title))
            break
          case 'progress-asc':
            formattedGames.sort((a, b) => (a.progress || 0) - (b.progress || 0))
            break
          case 'progress-desc':
            formattedGames.sort((a, b) => (b.progress || 0) - (a.progress || 0))
            break
          case 'date-newest':
            formattedGames.sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )
            break
          case 'date-oldest':
            formattedGames.sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            )
            break
        }

        setGames(formattedGames)
      } catch (error) {
        console.error('Error:', error)
      }
    }

    if (userId) {
      fetchOptions()
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
  ])

  return (
    <div className="container mx-auto p-4">
      {/* Filters Section */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex flex-wrap gap-4">
          <div className="dropdown dropdown-hover">
            <div tabIndex={0} role="button" className="btn m-1">
              {filterStatus.length === 0
                ? 'All Statuses'
                : `${filterStatus.length} Selected`}
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
            >
              {statusOptions.map((status) => (
                <li key={status}>
                  <label className="label cursor-pointer justify-start gap-2">
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={filterStatus.includes(status)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilterStatus([...filterStatus, status])
                        } else {
                          setFilterStatus(
                            filterStatus.filter((s) => s !== status)
                          )
                        }
                      }}
                    />
                    <span>{status}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <select
            className="select select-bordered"
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
          >
            <option value="">All Platforms</option>
            {platformOptions.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>

          <select
            className="select select-bordered"
            value={filterGenre}
            onChange={(e) => setFilterGenre(e.target.value)}
          >
            <option value="">All Genres</option>
            {genreOptions.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>

          <select
            className="select select-bordered"
            value={filterMood}
            onChange={(e) => setFilterMood(e.target.value)}
          >
            <option value="">All Moods</option>
            {moodOptions.map((mood) => (
              <option key={mood} value={mood}>
                {mood}
              </option>
            ))}
          </select>

          <select
            id="year-filter"
            className="select select-bordered"
            value={filterYear ?? ''}
            onChange={(e) =>
              setFilterYear(e.target.value ? parseInt(e.target.value) : null)
            }
            title="Filters by year the game was completed (based on last update)"
          >
            <option value="">Year Completed (All)</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <select
            className="select select-bordered"
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="alphabetical-asc">Title (A → Z)</option>
            <option value="alphabetical-desc">Title (Z → A)</option>
            <option value="progress-asc">Progress (0% → 100%)</option>
            <option value="progress-desc">Progress (100% → 0%)</option>
            <option value="date-newest">Date Added (Newest)</option>
            <option value="date-oldest">Date Added (Oldest)</option>
          </select>
        </div>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />
      </div>
      <GameCard games={games} userId={userId} onRefresh={() => {}} />
    </div>
  )
}

export default forwardRef(Library)
