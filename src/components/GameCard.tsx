import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  platforms: string[]
  genres: string[]
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
  switch (status) {
    case 'Endless':
    case 'Satisfied':
    case 'Done':
      return 'bg-green-100 text-green-800' // Completed games
    
    case 'DNF':
      return 'bg-rose-100 text-rose-800' // Dropped games
    
    case 'Wishlist':
    case 'Try Again':
    case 'Started':
    case 'Owned':
      return 'bg-blue-100 text-blue-800' // Todo/Backlog games
    
    case 'Come back!':
    case 'Currently Playing':
      return 'bg-amber-100 text-amber-800' // In Progress games
    
    default:
      return 'bg-gray-100 text-gray-800' // Default
  }
}

const GameCard: React.FC<GameCardProps> = ({ games, userId, onRefresh }) => {
  const navigate = useNavigate()
  const [showEditModal, setShowEditModal] = useState(false)
  const [formData, setFormData] = useState<Game | null>(null)
  const [platformOptions, setPlatformOptions] = useState<string[]>([])
  const [genreOptions, setGenreOptions] = useState<string[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        console.log('Fetching options for edit modal')
        
        // Get all platforms
        const { data: platforms, error: platformError } = await supabase
          .from('platforms')
          .select('id, name')
          .order('name')

        console.log('All platforms for edit:', platforms)

        if (platformError) {
          console.error('Error fetching platforms:', platformError)
        } else if (platforms) {
          setPlatformOptions(platforms.map(p => p.name))
        }

        // Get all genres
        const { data: genres, error: genreError } = await supabase
          .from('genres')
          .select('id, name')
          .order('name')

        console.log('All genres for edit:', genres)

        if (genreError) {
          console.error('Error fetching genres:', genreError)
        } else if (genres) {
          setGenreOptions(genres.map(g => g.name))
        }

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
      } catch (error) {
        console.error('Error in fetchOptions:', error)
      }
    }

    if (isOpen) {
      fetchOptions()
    }
  }, [isOpen])

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!formData) return

    setIsLoading(true)
    try {
      // Update the game's basic information
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

      // Get platform IDs from names
      const { data: selectedPlatformIds, error: platformError } = await supabase
        .from('platforms')
        .select('id')
        .in('name', formData.platforms)

      if (platformError) throw platformError

      // Delete existing platform relationships
      const { error: deleteError } = await supabase
        .from('game_platforms')
        .delete()
        .eq('game_id', formData.id)

      if (deleteError) throw deleteError

      // Add new platform relationships
      if (selectedPlatformIds && selectedPlatformIds.length > 0) {
        const { error: insertError } = await supabase
          .from('game_platforms')
          .insert(
            selectedPlatformIds.map(platform => ({
              game_id: formData.id,
              platform_id: platform.id
            }))
          )

        if (insertError) throw insertError
      }

      // Get genre IDs from names
      const { data: selectedGenreIds, error: genreError } = await supabase
        .from('genres')
        .select('id')
        .in('name', formData.genres)

      if (genreError) throw genreError

      // Delete existing genre relationships
      const { error: deleteGenreError } = await supabase
        .from('game_genres')
        .delete()
        .eq('game_id', formData.id)

      if (deleteGenreError) throw deleteGenreError

      // Add new genre relationships
      if (selectedGenreIds && selectedGenreIds.length > 0) {
        const { error: insertGenreError } = await supabase
          .from('game_genres')
          .insert(
            selectedGenreIds.map(genre => ({
              game_id: formData.id,
              genre_id: genre.id
            }))
          )

        if (insertGenreError) throw insertGenreError
      }

      onRefresh()
      setShowEditModal(false)
    } catch (error) {
      console.error('Error updating game:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteClick = async (gameId: string) => {
    if (window.confirm('Are you sure you want to delete this game?')) {
      try {
        // First delete the game-platform relationships
        const { error: platformError } = await supabase
          .from('game_platforms')
          .delete()
          .eq('game_id', gameId)

        if (platformError) {
          console.error('Error deleting game platforms:', platformError)
          return
        }

        // Then delete the game-genre relationships
        const { error: genreError } = await supabase
          .from('game_genres')
          .delete()
          .eq('game_id', gameId)

        if (genreError) {
          console.error('Error deleting game genres:', genreError)
          return
        }

        // Finally delete the game itself
        const { error } = await supabase
          .from('games')
          .delete()
          .eq('id', gameId)

        if (error) {
          console.error('Error deleting game:', error)
        } else {
          onRefresh() // Refresh the games list after successful deletion
          // Force a page refresh to update all components
          window.location.reload()
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
                  <span className="label-text">Platforms</span>
                </label>
                <select
                  name="platforms"
                  className="select select-bordered"
                  multiple
                  value={formData.platforms || []}
                  onChange={(e) => {
                    const selectedOptions = Array.from(
                      e.target.selectedOptions
                    ).map((option) => option.value)
                    setFormData({
                      ...formData,
                      platforms: selectedOptions,
                    })
                  }}
                >
                  {platformOptions.map((platform) => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Genres</span>
                </label>
                <select
                  name="genres"
                  className="select select-bordered"
                  multiple
                  value={formData.genres || []}
                  onChange={(e) => {
                    const selectedOptions = Array.from(
                      e.target.selectedOptions
                    ).map((option) => option.value)
                    setFormData({
                      ...formData,
                      genres: selectedOptions,
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
        {games.map((game) => (
          <div
            key={game.id}
            className="card bg-base-100 shadow-xl cursor-pointer hover:shadow-2xl transition-shadow duration-200"
            onClick={() => navigate(`/game/${game.id}`)}
          >
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
                <div className={`badge ${getStatusBadgeColor(game.status || '')}`}>
                  {game.status}
                </div>
              </h2>
              <div className="flex gap-2 items-center flex-wrap">
                {game.platforms?.map((platform) => (
                  <span key={platform} className="badge badge-outline">
                    {platform}
                  </span>
                ))}
              </div>
              <div className="flex gap-2 items-center flex-wrap mt-2 mb-4">
                {game.genres?.map((genre) => (
                  <span key={genre} className="badge badge-accent">
                    {genre}
                  </span>
                ))}
              </div>
              <div className="w-full bg-base-200 rounded-full overflow-hidden mb-4">
                <div 
                  className="bg-primary rounded-full h-2 transition-all duration-300" 
                  style={{ width: `${game.progress || 0}%` }}
                />
              </div>
              <div className="card-actions justify-end mt-auto">
                <button
                  className="btn btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();  
                    setFormData(game);
                    setShowEditModal(true);
                    setIsOpen(true);
                  }}
                >
                  Edit
                </button>
                <button
                  className="btn btn-error"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(game.id);
                  }}
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
