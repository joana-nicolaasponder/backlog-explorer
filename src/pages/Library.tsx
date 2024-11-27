import { useState, useEffect } from 'react'
import supabase from '../supabaseClient'
import GameCard from '../components/GameCard'
import AddGameModal from '../components/AddGameModal'
import SearchBar from '../components/SearchBar'

const Library = () => {
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterPlatform, setFilterPlatform] = useState<string>('')
  const [filterGenre, setFilterGenre] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<string>('alphabetical-asc')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [games, setGames] = useState<any[]>([])
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
      if (!userId) return

      // Fetch unique platforms
      const { data: platforms } = await supabase
        .from('platforms')
        .select('name')
        .order('name')

      if (platforms) {
        setPlatformOptions(platforms.map((p) => p.name))
      }

      // Fetch unique genres
      const { data: genres } = await supabase
        .from('genres')
        .select('name')
        .order('name')

      if (genres) {
        setGenreOptions(genres.map((g) => g.name))
      }

      // Fetch unique statuses
      const { data: statuses } = await supabase
        .from('games')
        .select('status')
        .eq('user_id', userId)
        .not('status', 'is', null)

      if (statuses) {
        const uniqueStatuses = Array.from(
          new Set(statuses.map((s) => s.status))
        )
        setStatusOptions(uniqueStatuses)
      }
    }

    fetchOptions()
  }, [userId])

  const fetchGames = async () => {
    try {
      let query = supabase
        .from('games')
        .select(
          `
          *,
          game_platforms!inner (
            platforms!inner (
              name
            )
          ),
          game_genres!inner (
            genres!inner (
              name
            )
          )
        `
        )
        .eq('user_id', userId)

      if (filterStatus) {
        query = query.eq('status', filterStatus)
      }

      if (filterPlatform) {
        query = query.eq('game_platforms.platforms.name', filterPlatform)
      }

      if (filterGenre) {
        query = query.eq('game_genres.genres.name', filterGenre)
      }

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching games:', error)
        return
      }

      const formattedGames = data.map((game) => ({
        ...game,
        platform: game.game_platforms.map((gp: any) => gp.platforms.name),
        genre: game.game_genres.map((gg: any) => gg.genres.name),
      }))

      switch (sortOrder) {
        case 'alphabetical-asc':
          formattedGames.sort((a, b) => a.title.localeCompare(b.title))
          break
        case 'alphabetical-desc':
          formattedGames.sort((a, b) => b.title.localeCompare(a.title))
          break
        case 'progress-asc':
          formattedGames.sort((a, b) => a.progress - b.progress)
          break
        case 'progress-desc':
          formattedGames.sort((a, b) => b.progress - a.progress)
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

  useEffect(() => {
    if (userId) {
      fetchGames()
    }
  }, [
    userId,
    filterStatus,
    filterPlatform,
    filterGenre,
    sortOrder,
    searchQuery,
  ])

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
        onRefresh={fetchGames}
      />
    </div>
  )
}

export default Library