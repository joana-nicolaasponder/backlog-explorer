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

  const [selectedLetter, setSelectedLetter] = useState<string>('');
  const { games, fetchGames, page, setPage, pageSize, totalCount, filters, setters, options, error } =
    useLibraryGames(userId, selectedLetter);


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
    <div className="container mx-auto p-4 overflow-x-hidden">
      <FilterControls filters={filters} setters={setters} options={options} />
      {/* A-Z Filter Bar */}
      <div className="flex flex-wrap gap-1 justify-center my-4">
        {[...Array(26)].map((_, i) => {
          const letter = String.fromCharCode(65 + i);
          return (
            <button
              key={letter}
              className={`px-2 py-1 rounded text-sm font-semibold border border-base-300 transition-colors duration-100 ${selectedLetter === letter ? 'bg-primary text-white' : 'bg-base-200 hover:bg-primary/20'}`}
              onClick={() => {
                setSelectedLetter(selectedLetter === letter ? '' : letter);
                setPage(1);
              }}
              type="button"
            >
              {letter}
            </button>
          );
        })}
        <button
          className={`px-2 py-1 rounded text-sm font-semibold border border-base-300 transition-colors duration-100 ${selectedLetter === '#' ? 'bg-primary text-white' : 'bg-base-200 hover:bg-primary/20'}`}
          onClick={() => {
            setSelectedLetter(selectedLetter === '#' ? '' : '#');
            setPage(1);
          }}
          type="button"
        >
          #
        </button>
        <button
          className={`px-2 py-1 rounded text-sm font-semibold border border-base-300 transition-colors duration-100 ${selectedLetter === '' ? 'bg-primary text-white' : 'bg-base-200 hover:bg-primary/20'}`}
          onClick={() => {
            setSelectedLetter('');
            setPage(1);
          }}
          type="button"
        >
          All
        </button>
      </div>
      {error && (
        <div className="alert alert-error my-4" role="alert">
          {error}
        </div>
      )}
      {!games.length && !error ? (
        <div className="text-center text-gray-500 my-6">Loading games...</div>
      ) : (
        <>
          <GameList games={games} userId={userId} onRefresh={fetchGames} />
          <div className="flex flex-wrap justify-center items-center gap-2 mt-6 w-full">
            <button
              className="btn btn-outline"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span className="truncate min-w-0">
              Page {page} of {Math.max(1, Math.ceil(totalCount / pageSize))}
            </span>
            <button
              className="btn btn-outline"
              disabled={page * pageSize >= totalCount}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default forwardRef(Library)
