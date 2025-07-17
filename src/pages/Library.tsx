import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react'
import { useLocation } from 'react-router-dom'
import supabase from '../supabaseClient'
import { useLibraryGames } from '../hooks/useLibraryGames'
import FilterControls from '../components/FilterControls'
import GameList from '../components/GameList'

export interface LibraryHandle {
  refreshGames: () => Promise<void>
}

const Library: React.ForwardRefRenderFunction<
  LibraryHandle,
  Record<string, never>
> = (_props, ref) => {
  const location = useLocation();
  const [userId, setUserId] = useState<string>('');

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

  const { games, fetchGames, filters, setters, options, error } =
    useLibraryGames(userId);

  // Apply initial filters from navigation state only once on mount
  useEffect(() => {
    if (location.state) {
      const {
        filterStatus,
        filterYear,
        filterPlatform,
        filterGenre,
        filterMood,
        sortOrder,
        searchQuery,
      } = location.state as Record<string, any>;
      if (filterStatus) setters.setFilterStatus(Array.isArray(filterStatus) ? filterStatus : [filterStatus]);
      if (typeof filterYear !== 'undefined') setters.setFilterYear(filterYear);
      if (filterPlatform) setters.setFilterPlatform(filterPlatform);
      if (filterGenre) setters.setFilterGenre(filterGenre);
      if (filterMood) setters.setFilterMood(filterMood);
      if (sortOrder) setters.setSortOrder(sortOrder);
      if (searchQuery) setters.setSearchQuery(searchQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useImperativeHandle(ref, () => ({
    refreshGames: fetchGames,
  }))

  return (
    <div className="container mx-auto p-4">
      <FilterControls filters={filters} setters={setters} options={options} />
      {error && (
        <div className="alert alert-error my-4" role="alert">
          {error}
        </div>
      )}
      {!games.length && !error ? (
        <div className="text-center text-gray-500 my-6">Loading games...</div>
      ) : (
        <GameList games={games} userId={userId} onRefresh={fetchGames} />
      )}
    </div>
  )
}

export default forwardRef(Library)
