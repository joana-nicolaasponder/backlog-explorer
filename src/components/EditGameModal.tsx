import { useState, useEffect } from 'react'
import supabase from '../supabaseClient'
import { Game } from '../types'
import { getGameDetails } from '../services/rawg'
import { RAWGPlatform, RAWGGenre } from '../types/rawg'

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
    platforms: game.platforms || [],
    genres: game.genres || [],
    title: game.title || '',
    rawg_id: game.rawg_id,
    rawg_slug: game.rawg_slug,
    metacritic_rating: game.metacritic_rating,
    release_date: game.release_date,
    background_image: game.background_image,
    description: game.description,
  })
  const [platformOptions, setPlatformOptions] = useState<string[]>([])
  const [genreOptions, setGenreOptions] = useState<string[]>([])
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

  // Load RAWG data when game changes
  useEffect(() => {
    const loadRawgData = async () => {
      if (game.rawg_id) {
        try {
          console.log('Loading RAWG data for game:', game.rawg_id)
          const gameDetails = await getGameDetails(Number(game.rawg_id))
          if (gameDetails) {
            console.log('RAWG data loaded:', gameDetails)
            // Set available platforms from RAWG
            const availablePlatforms = gameDetails.platforms.map(
              (p: RAWGPlatform) => p.platform.name
            )
            setPlatformOptions(availablePlatforms)

            // Set genres from RAWG
            const rawgGenres = gameDetails.genres.map((g: RAWGGenre) => g.name)
            setGenreOptions(rawgGenres)

            // Update form data with RAWG data while preserving user's status and progress
            setFormData((prev) => ({
              ...prev,
              title: gameDetails.name,
              genres: rawgGenres,
              rawg_slug: gameDetails.slug,
              metacritic_rating: gameDetails.metacritic || undefined,
              release_date: gameDetails.released || undefined,
              background_image: gameDetails.background_image || undefined,
              description: gameDetails.description || undefined,
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

      // Update games table first
      const { error: gameUpdateError } = await supabase
        .from('games')
        .update({
          title: formData.title,
          rawg_slug: formData.rawg_slug,
          metacritic_rating: formData.metacritic_rating,
          release_date: formData.release_date,
          background_image: formData.background_image,
          description: formData.description,
        })
        .eq('id', game.id)

      if (gameUpdateError) throw gameUpdateError

      // Update user_games entry
      const { error: updateError } = await supabase
        .from('user_games')
        .update({
          status: formData.status,
          progress: formData.progress,
          platforms: formData.platforms,
        })
        .eq('game_id', game.id)
        .eq('user_id', userData.user.id)

      if (updateError) throw updateError

      // Update game_platforms
      if (formData.platforms.length > 0) {
        // Get platform IDs
        const { data: platformIds } = await supabase
          .from('platforms')
          .select('id')
          .in('name', formData.platforms)

        if (platformIds && platformIds.length > 0) {
          // Delete existing platform relationships
          await supabase.from('game_platforms').delete().eq('game_id', game.id)

          // Insert new platform relationships
          await supabase.from('game_platforms').insert(
            platformIds.map((platform) => ({
              game_id: game.id,
              platform_id: platform.id,
            }))
          )
        }
      }

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
        <h3 className="font-bold text-lg mb-4">Edit {game.title}</h3>

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-white">
              Available Platforms <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {platformOptions.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => {
                    const newPlatforms = formData.platforms.includes(platform)
                      ? formData.platforms.filter((p) => p !== platform)
                      : [...formData.platforms, platform]
                    setFormData({ ...formData, platforms: newPlatforms })
                  }}
                  className={`px-3 py-1.5 rounded text-sm transition-colors duration-200 ${
                    formData.platforms.includes(platform)
                      ? 'bg-zinc-700 text-white border border-zinc-600'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>
            {formData.platforms.length === 0 && (
              <p className="mt-2 text-sm text-red-400">
                Please select the platforms you own this game on
              </p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-white">
              Genres
            </label>
            <div className="flex flex-wrap gap-2">
              {formData.genres.map((genre) => (
                <span
                  key={genre}
                  className="px-3 py-1.5 rounded text-sm bg-zinc-800 text-zinc-400 border border-zinc-700"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Status</span>
            </label>
            <select
              className="select select-bordered"
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

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Progress</span>
            </label>
            <input
              type="number"
              className="input input-bordered"
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
