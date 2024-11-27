import { useState, useEffect } from 'react'
import supabase from '../supabaseClient'

interface Platform {
  id: string
  name: string
}

interface Genre {
  id: string
  name: string
}

interface Game {
  id: string
  title: string
  platform: string[]
  genre: string[]
  status: string
  progress: number
  image: string
}

interface GameCardProps {
  games: Game[]
  userId: string
  onRefresh: () => void
}

const getStatusBadgeColor = (status: string): string => {
  const todoStatuses = ['Wishlist', 'Try Again', 'Started', 'Owned']
  const inProgressStatuses = ['Come back!', 'Currently Playing']
  const completedStatuses = ['Endless', 'Satisfied', 'Done']

  if (todoStatuses.includes(status)) {
    return 'bg-blue-100 text-blue-800' // Pastel blue
  } else if (inProgressStatuses.includes(status)) {
    return 'bg-amber-100 text-amber-800' // Pastel amber
  } else if (completedStatuses.includes(status)) {
    return 'bg-green-100 text-green-800' // Pastel green
  } else if (status === 'DNF') {
    return 'bg-rose-100 text-rose-800' // Pastel rose/red
  }
  return 'bg-gray-100 text-gray-800' // Pastel gray as default
}

const GameCard: React.FC<GameCardProps> = ({ games, userId, onRefresh }) => {
  const [showEditModal, setShowEditModal] = useState(false)
  const [formData, setFormData] = useState<Game | null>(null)
  const [platformOptions, setPlatformOptions] = useState<Platform[]>([])
  const [genreOptions, setGenreOptions] = useState<string[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchOptions = async () => {
      // Fetch platforms
      const { data: platforms } = await supabase
        .from('platforms')
        .select('id, name')

      if (platforms) {
        setPlatformOptions(platforms)
      }

      // Fetch genres
      const { data: genres } = await supabase
        .from('genres')
        .select('id, name')
        .order('name')

      if (genres) {
        setGenreOptions(genres.map((g) => g.name))
      }

      // Fetch statuses
      const { data: statuses } = await supabase
        .from('games')
        .select('status')
        .not('status', 'is', null)

      if (statuses) {
        const uniqueStatuses = Array.from(
          new Set(statuses.map((s) => s.status))
        )
        setStatusOptions(uniqueStatuses)
      }
    }

    fetchOptions()
  }, [])

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // First, update the game details
      const { error: updateError } = await supabase
        .from('games')
        .update({
          title: formData.title,
          status: formData.status,
          progress: formData.progress,
          image: formData.image,
        })
        .eq('id', formData.id)

      if (updateError) throw updateError

      // Handle platforms
      const selectedPlatforms = platformOptions.filter((platform) =>
        formData.platform.includes(platform.name)
      )

      // Delete existing platform relationships
      const { error: deletePlatformError } = await supabase
        .from('game_platforms')
        .delete()
        .eq('game_id', formData.id)

      if (deletePlatformError) throw deletePlatformError

      // Insert new platform relationships
      const { error: insertPlatformError } = await supabase
        .from('game_platforms')
        .insert(
          selectedPlatforms.map((platform) => ({
            game_id: formData.id,
            platform_id: platform.id,
          }))
        )

      if (insertPlatformError) throw insertPlatformError

      // Handle genres
      // Get genre IDs for selected genres
      const { data: genreData, error: genreError } = await supabase
        .from('genres')
        .select('id, name')
        .in('name', formData.genre)

      if (genreError) throw genreError

      // Delete existing genre relationships
      const { error: deleteGenreError } = await supabase
        .from('game_genres')
        .delete()
        .eq('game_id', formData.id)

      if (deleteGenreError) throw deleteGenreError

      // Insert new genre relationships
      const { error: insertGenreError } = await supabase
        .from('game_genres')
        .insert(
          genreData.map((genre) => ({
            game_id: formData.id,
            genre_id: genre.id,
          }))
        )

      if (insertGenreError) throw insertGenreError

      setShowEditModal(false)
      setFormData(null)
      onRefresh() // Refresh the games list after successful update
    } catch (error) {
      console.error('Error updating game:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteClick = async (gameId: string) => {
    if (window.confirm('Are you sure you want to delete this game?')) {
      try {
        const { error } = await supabase.from('games').delete().eq('id', gameId)

        if (error) {
          console.error('Error deleting game:', error)
        } else {
          onRefresh() // Refresh the games list after successful deletion
        }
      } catch (error) {
        console.error('Error:', error)
      }
    }
  }

  if (games.length === 0) return <p>No games found.</p>

  return (
    <div>
      {showEditModal && formData && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Edit Game</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-control">
                <label className="label">Title</label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Platform</span>
                </label>
                <select
                  name="platform"
                  className="select select-bordered"
                  multiple
                  value={formData.platform || []}
                  onChange={(e) => {
                    const selectedOptions = Array.from(
                      e.target.selectedOptions
                    ).map((option) => option.value)
                    setFormData({
                      ...formData,
                      platform: selectedOptions,
                    })
                  }}
                >
                  {platformOptions.map((platform) => (
                    <option key={platform.id} value={platform.name}>
                      {platform.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Genre</span>
                </label>
                <select
                  name="genre"
                  className="select select-bordered"
                  multiple
                  value={formData.genre || []}
                  onChange={(e) => {
                    const selectedOptions = Array.from(
                      e.target.selectedOptions
                    ).map((option) => option.value)
                    setFormData({
                      ...formData,
                      genre: selectedOptions,
                    })
                  }}
                >
                  {genreOptions.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Status</span>
                </label>
                <select
                  name="status"
                  className="select select-bordered"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <option value="">Select Status</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Progress</span>
                </label>
                <input
                  type="number"
                  name="progress"
                  placeholder="Progress (e.g., 50)"
                  className="input input-bordered"
                  value={formData.progress}
                  onChange={(e) =>
                    setFormData({ ...formData, progress: e.target.value })
                  }
                  min="0"
                  max="100"
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Image URL</span>
                </label>
                <input
                  type="text"
                  name="image"
                  placeholder="Image URL"
                  className="input input-bordered"
                  value={formData.image}
                  onChange={(e) =>
                    setFormData({ ...formData, image: e.target.value })
                  }
                />
              </div>
              <div className="modal-action">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isLoading}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {games.map((game) => (
          <div key={game.id} className="card w-full bg-base-100 shadow-xl">
            <figure>
              <img
                src={game.image || '/default-image.jpg'}
                alt={game.title}
                className="w-full h-48 object-cover"
              />
            </figure>
            <div className="card-body">
              <h2 className="card-title flex justify-between items-center">
                {game.title}{' '}
                <div className={`badge ${getStatusBadgeColor(game.status)}`}>
                  {game.status}
                </div>
              </h2>
              <div className="flex gap-2 items-center flex-wrap">
                {game.platform.map((platform) => (
                  <span key={platform} className="badge badge-outline">
                    {platform}
                  </span>
                ))}
              </div>
              <div className="flex gap-2 items-center flex-wrap mt-2">
                {game.genre.map((genre) => (
                  <span key={genre} className="badge badge-accent">
                    {genre}
                  </span>
                ))}
              </div>
              <progress
                className="progress progress-primary w-full"
                value={game.progress}
                max="100"
              ></progress>
              <div className="card-actions justify-end">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setFormData(game)
                    setShowEditModal(true)
                  }}
                >
                  Edit
                </button>
                <button
                  className="btn btn-error"
                  onClick={() => handleDeleteClick(game.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default GameCard
