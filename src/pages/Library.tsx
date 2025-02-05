import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import supabase from '../supabaseClient'
import GameCard from '../components/GameCard'
import SearchBar from '../components/SearchBar'
import { UserGame } from '../types'

const Library = () => {
  const location = useLocation()
  const [filterStatus, setFilterStatus] = useState<string>(
    Array.isArray(location.state?.filterStatus) 
      ? location.state.filterStatus[0] || ''
      : location.state?.filterStatus || ''
  )
  const [filterPlatform, setFilterPlatform] = useState<string>('')
  const [filterGenre, setFilterGenre] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<string>('alphabetical-asc')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [games, setGames] = useState<UserGame[]>([])
  const [platformOptions, setPlatformOptions] = useState<string[]>([])
  const [genreOptions, setGenreOptions] = useState<string[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [userId, setUserId] = useState<string>('')

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    getCurrentUser()
  }, [])

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
          'Done'
        ])

        // Get all games with their relationships
        const { data: userGames, error: gamesError } = await supabase
          .from('user_games')
          .select(`
            id,
            status,
            progress,
            platforms,
            image,
            game:games (
              id,
              title,
              background_image,
              created_at,
              game_genres (
                genre_id,
                genres (
                  id,
                  name
                )
              )
            )
          `)
          .eq('user_id', userId)
          .order('game(title)', { ascending: true })

        if (gamesError) {
          console.error('Error fetching games:', gamesError)
          return
        }

        // Format games with platform and genre names
        let formattedGames = userGames.map(userGame => ({
          id: userGame.game.id,
          title: userGame.game.title,
          status: userGame.status,
          progress: userGame.progress,
          image: userGame.image || userGame.game.background_image,
          created_at: userGame.game.created_at,
          platforms: userGame.platforms,
          genres: userGame.game.game_genres.map(gg => gg.genres.name)
        }))

        // Extract unique platform names
        const platformNames = Array.from(new Set(
          formattedGames.flatMap(game => game.platforms)
        )).sort()
        setPlatformOptions(platformNames)

        // Extract unique genre names
        const genreNames = Array.from(new Set(
          formattedGames.flatMap(game => game.genres)
        )).sort()
        setGenreOptions(genreNames)

        // Apply filters
        if (filterPlatform) {
          formattedGames = formattedGames.filter(game =>
            game.platforms.includes(filterPlatform)
          )
        }

        if (filterGenre) {
          formattedGames = formattedGames.filter(game =>
            game.genres.includes(filterGenre)
          )
        }

        if (filterStatus) {
          formattedGames = formattedGames.filter(game =>
            game.status === filterStatus
          )
        }

        if (searchQuery) {
          formattedGames = formattedGames.filter(game =>
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
  }, [userId, filterStatus, filterPlatform, filterGenre, sortOrder, searchQuery])

  return (
    <div className="container mx-auto p-4">
      {/* Filters Section */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex flex-wrap gap-4">
          <select
            className="select select-bordered"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

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
      <GameCard
        games={games}
        userId={userId}
        onRefresh={() => {}}
      />
    </div>
  )
}

export default Library