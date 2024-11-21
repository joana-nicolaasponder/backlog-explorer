import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import supabase from './supabaseClient'
import Auth from './components/Auth'
import GameCard from './components/GameCard'
import AddGameModal from './components/AddGameModal'

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterPlatform, setFilterPlatform] = useState<string>('')
  const [filterGenre, setFilterGenre] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<string>('alphabetical-asc')
  const [games, setGames] = useState<any[]>([]) 

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
    const fetchGames = async () => {
      if (!session?.user?.id) return 

      let query = supabase
        .from('games')
        .select('*')
        .eq('user_id', session.user.id)

      // Apply filters
      if (filterStatus) {
        query = query.eq('status', filterStatus)
      }
      if (filterPlatform) {
        query = query.eq('platform', filterPlatform)
      }
      if (filterGenre) {
        query = query.eq('genre', filterGenre)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching games:', error)
      } else {
        let sortedData = data || []
        switch (sortOrder) {
          case 'alphabetical-asc':
            sortedData = sortedData.sort((a, b) =>
              a.title.localeCompare(b.title)
            )
            break
          case 'alphabetical-desc':
            sortedData = sortedData.sort((a, b) =>
              b.title.localeCompare(a.title)
            )
            break
          case 'progress-asc':
            sortedData = sortedData.sort((a, b) => a.progress - b.progress)
            break
          case 'progress-desc':
            sortedData = sortedData.sort((a, b) => b.progress - a.progress)
            break
          case 'date-newest':
            sortedData = sortedData.sort(
              (a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            break
          case 'date-oldest':
            sortedData = sortedData.sort(
              (a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
            break
        }
        setGames(sortedData)
      }
    }

    fetchGames()
  }, [session, filterStatus, filterPlatform, filterGenre, sortOrder])

  console.log('Session User ID:', session?.user?.id)

  return (
    <div>
      {!session ? (
        <Auth onAuth={setSession} />
      ) : (
        <>
          {/* Header */}
          <div className="flex justify-between items-center p-4 bg-base-200">
            <h1 className="text-xl font-bold">My Library</h1>
            <AddGameModal />
            <button className="btn btn-error" onClick={handleLogout}>
              Logout
            </button>
          </div>

          {/* Filters and Sorting */}
          <div className="p-4 bg-base-100">
            <div className="flex gap-4">
              <select
                className="select select-bordered"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>

              <select
                className="select select-bordered"
                onChange={(e) => setFilterPlatform(e.target.value)}
              >
                <option value="">All Platforms</option>
                <option value="PC">PC</option>
                <option value="Switch">Switch</option>
                <option value="PlayStation">PlayStation</option>
              </select>

              <select
                className="select select-bordered"
                onChange={(e) => setFilterGenre(e.target.value)}
              >
                <option value="">All Genres</option>
                <option value="RPG">RPG</option>
                <option value="Action">Action</option>
                <option value="Adventure">Adventure</option>
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
          </div>

          {/* Game Cards */}
          <GameCard games={games} userId={session.user.id} />
        </>
      )}
    </div>
  )
}

export default App