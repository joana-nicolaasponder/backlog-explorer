import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import supabase from './supabaseClient'
import Auth from './components/Auth'
import GameCard from './components/GameCard'
import AddGameModal from './components/AddGameModal'
import SearchBar from './components/SearchBar'

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterPlatform, setFilterPlatform] = useState<string>('')
  const [filterGenre, setFilterGenre] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<string>('alphabetical-asc')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [games, setGames] = useState<any[]>([])
  const [platformOptions, setPlatformOptions] = useState<string[]>([])
  const [genreOptions, setGenreOptions] = useState<string[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>([])

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
    }

    getSession()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => {
      listener?.subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
  }

  useEffect(() => {
    const fetchOptions = async () => {
      if (!session?.user?.id) return

      // Fetch unique platforms
      const { data: platforms } = await supabase
        .from('platforms')
        .select('name')
        .order('name')

      if (platforms) {
        setPlatformOptions(platforms.map(p => p.name))
      }

      // Fetch unique genres
      const { data: genres } = await supabase
        .from('genres')
        .select('name')
        .order('name')

      if (genres) {
        setGenreOptions(genres.map(g => g.name))
      }

      // Fetch unique statuses
      const { data: statuses } = await supabase
        .from('games')
        .select('status')
        .eq('user_id', session.user.id)
        .not('status', 'is', null)

      if (statuses) {
        const uniqueStatuses = Array.from(
          new Set(statuses.map((s) => s.status))
        )
        setStatusOptions(uniqueStatuses)
      }
    }

    fetchOptions()
  }, [session])

  const fetchGames = async () => {
    try {
      let query = supabase
        .from('games')
        .select(`
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
        `)
        .eq('user_id', session?.user.id)

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

      const formattedGames = data.map(game => ({
        ...game,
        platform: game.game_platforms.map((gp: any) => gp.platforms.name),
        genre: game.game_genres.map((gg: any) => gg.genres.name)
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
    if (session?.user.id) {
      fetchGames()
    }
  }, [session?.user.id, filterStatus, filterPlatform, filterGenre, sortOrder, searchQuery])

  console.log('Session User ID:', session?.user?.id)

  return (
    <div>
      {!session ? (
        <Auth onAuth={setSession} />
      ) : (
        <>
          {/* Header */}
          <div className="navbar bg-base-100 shadow-lg mb-4">
            <div className="flex-1">
              <span className="text-xl font-bold px-4">Backlog Explorer</span>
            </div>
            <div className="flex-none gap-4">
              <AddGameModal onGameAdded={fetchGames} />
              <button
                className="btn btn-ghost"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>

          <div className="container mx-auto px-4">
            {/* Filters Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
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

            {/* Game Cards */}
            <GameCard games={games} userId={session.user.id} onRefresh={fetchGames} />
          </div>
        </>
      )}
    </div>
  )
}

export default App
