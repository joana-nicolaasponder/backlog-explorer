import { useNavigate } from 'react-router-dom'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { useEffect } from 'react'

const Dashboard = () => {
  const navigate = useNavigate()
  const { stats, topGenreCompleted, topMoodCompleted, loading, error } = useDashboardStats()

  useEffect(() => {
  if (error === 'unauthenticated') {
    navigate('/login')
  }
}, [error, navigate])

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      {error ? (
        <div className="text-center text-red-500 bg-red-100 p-4 rounded">
          {error}
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card bg-base-100 shadow-xl animate-pulse" role="status">
              <div className="card-body">
                <div className="h-6 bg-base-300 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-base-300 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            className="card bg-base-100 shadow-xl tooltip"
            data-tip="Total number of games in your collection, including games you own, want to play, or have finished"
          >
            <div className="card-body">
              <h2 className="card-title">Total Library</h2>
              <p className="text-4xl font-bold" data-testid="total-library">{stats.totalLibrary}</p>
              <p className="text-sm opacity-70">Games in your collection</p>
            </div>
          </div>
          <div
            className="card bg-base-100 shadow-xl hover:bg-base-200 cursor-pointer transition-colors tooltip"
            data-tip="Games marked as Try Again, Started, Owned, or Come back! - click to view all your backlog games"
            onClick={() =>
              navigate('/app/library', {
                state: {
                  filterStatus: ['Try Again', 'Started', 'Owned', 'Come back!'],
                },
              })
            }
          >
            <div className="card-body">
              <h2 className="card-title">Games in Backlog</h2>
              <p className="text-4xl font-bold" data-testid="backlog">{stats.backlog}</p>
              <p className="text-sm opacity-70">
                {((stats.backlog / stats.totalLibrary) * 100).toFixed(1)}% of
                your library
              </p>
            </div>
          </div>
          <div
            className="card bg-base-100 shadow-xl hover:bg-base-200 cursor-pointer transition-colors tooltip"
            data-tip="Games you're actively playing right now - click to view all your active games"
            onClick={() =>
              navigate('/app/library', {
                state: { filterStatus: 'Currently Playing' },
              })
            }
          >
            <div className="card-body">
              <h2 className="card-title">Currently Playing</h2>
              <p className="text-4xl font-bold" data-testid="currently-playing">{stats.currentlyPlaying}</p>
              <p className="text-sm opacity-70">Active games in progress</p>
            </div>
          </div>
          <div
            className="card bg-base-100 shadow-xl hover:bg-base-200 cursor-pointer transition-colors tooltip"
            data-tip="Games marked as Done, Endless, Satisfied, or DNF - click to view all your finished games"
            onClick={() =>
              navigate('/app/library', {
                state: {
                  filterStatus: ['Endless', 'Done', 'Satisfied', 'DNF'],
                },
              })
            }
          >
            <div className="card-body">
              <h2 className="card-title">Completed Games</h2>
              <p className="text-4xl font-bold" data-testid="completed">{stats.completed}</p>
              <p className="text-sm opacity-70">
                {((stats.completed / stats.totalLibrary) * 100).toFixed(1)}%
                completion rate
              </p>
            </div>
          </div>
          <div
            className="card bg-base-100 shadow-xl tooltip"
            data-tip="Based on the most common genre and mood in your completed games"
          >
            <div className="card-body">
              <h2 className="card-title">Favorite Game Type</h2>
              <p className="text-4xl font-bold capitalize" data-testid="favorite-game-type">
                {topGenreCompleted || 'Unknown'} • {topMoodCompleted || 'Unknown'}
              </p>
              <p className="text-sm opacity-70">Your most-played vibe</p>
            </div>
          </div>
          <div
            className="card bg-base-100 shadow-xl tooltip"
            data-tip="The gaming platform that you use most frequently across your game collection"
          >
            <div className="card-body">
              <h2 className="card-title">Most Used Platform</h2>
              <p className="text-4xl font-bold" data-testid="most-used-platform">{stats.topPlatform}</p>
              <p className="text-sm opacity-70">Your primary gaming platform</p>
            </div>
          </div>
          {/* Keeping this commented for future use - completion tracking card */}
          <div
            className="card bg-base-100 shadow-xl hover:bg-base-200 cursor-pointer transition-colors tooltip"
            data-tip="Games marked as Done, Endless, Satisfied, or DNF in 2025 - click to view all games completed this year"
            onClick={() =>
              navigate('/app/library', {
                state: {
                  filterStatus: ['Endless', 'Done', 'Satisfied', 'DNF'],
                  // Note: The actual filtering by year would need to be implemented in the Library component
                },
              })
            }
          >
            <div className="card-body">
              <h2 className="card-title">Completed in 2025</h2>
              <p className="text-4xl font-bold" data-testid="completed-this-year">{stats.completedThisYear}</p>
              <p className="text-sm opacity-70">
                {((stats.completedThisYear / stats.totalLibrary) * 100).toFixed(
                  1
                )}
                % of your library
              </p>
            </div>
          </div>

          <div
            className="card bg-base-100 shadow-xl tooltip"
            data-tip="The mood that appears most frequently across your game collection"
          >
            <div className="card-body">
              <h2 className="card-title">Most Common Mood</h2>
              <p className="text-4xl font-bold capitalize" data-testid="most-common-mood">{stats.topMood}</p>
              <p className="text-sm opacity-70">How your games make you feel</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
