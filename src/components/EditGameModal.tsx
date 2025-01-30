import { useState, useEffect } from 'react'
import supabase from '../supabaseClient'
import { Game } from '../types'
import { getGameDetails } from '../services/rawg'
import { RAWGPlatform, RAWGGenre } from '../types/rawg'

interface Game {
  id: string
  title: string
  status: string
  progress: number
  genres: string[]
  image: string
  rawg_id?: string
}

interface EditGameModalProps {
  game: Game
  onGameUpdated: () => void
  showModal: boolean
  setShowModal: (show: boolean) => void
}

const EditGameModal: React.FC<EditGameModalProps> = ({
  game,
  onGameUpdated,
  showModal,
  setShowModal,
}) => {
  const [formData, setFormData] = useState({
    status: game.status || '',
    progress: game.progress || 0,
    title: game.title || '',
    genres: game.genres || [],
    image: game.image,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusOptions] = useState<string[]>([
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

  useEffect(() => {
    const loadRawgData = async () => {
      if (game.rawg_id) {
        try {
          console.log('Loading RAWG data for game:', game.rawg_id)
          const gameDetails = await getGameDetails(Number(game.rawg_id))
          if (gameDetails) {
            console.log('RAWG data loaded:', gameDetails)
            // Update form data with RAWG data while preserving user's status and progress
            setFormData((prev) => ({
              ...prev,
              title: gameDetails.name,
              genres: gameDetails.genres.map((g: RAWGGenre) => g.name), // Set genres from RAWG
              image: gameDetails.image || undefined,
            }))
          }
        } catch (error) {
          console.error('Error loading RAWG data:', error)
        }
      }
    }
    loadRawgData()
  }, [game.rawg_id])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No user found')

      // Update user_games entry only
      const { error: updateError } = await supabase
        .from('user_games')
        .update({
          status: formData.status,
          progress: formData.progress,
        })
        .eq('game_id', game.id)
        .eq('user_id', userData.user.id)

      if (updateError) throw updateError

      onGameUpdated()
      setShowModal(false)
    } catch (error) {
      console.error('Error updating game:', error)
      setError('Failed to update game. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!showModal) return null

  return (
    <div className={`modal ${showModal ? 'modal-open' : ''}`}>
      <div className="modal-box max-w-2xl relative">
        <button
          className="btn btn-sm btn-circle absolute right-2 top-2"
          onClick={() => setShowModal(false)}
        >
          ✕
        </button>
        <h3 className="font-bold text-lg mb-4">Edit Game Progress</h3>

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Read-only game info */}
          <div className="mb-6">
            <div className="flex items-center gap-4">
              <img 
                src={formData.image || '/default-image.jpg'} 
                alt={formData.title} 
                className="w-24 h-24 object-cover rounded"
              />
              <div>
                <h4 className="text-lg font-semibold">{formData.title}</h4>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-2 py-1 text-sm bg-zinc-700 text-white rounded"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Editable user data */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Status</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control mb-6">
            <label className="label">
              <span className="label-text">Progress (%)</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={formData.progress}
              onChange={(e) =>
                setFormData({ ...formData, progress: Number(e.target.value) })
              }
              min="0"
              max="100"
            />
          </div>

          <div className="modal-action">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditGameModal
