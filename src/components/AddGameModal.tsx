import { useState, useEffect } from 'react'
import supabase from '../supabaseClient'

interface GameFormData {
  title: string
  platforms: string[]
  genres: string[]
  status: string
  progress: number
  image: string
}

interface AddGameModalProps {
  onGameAdded: () => void
  showModal: boolean
  setShowModal: (showModal: boolean) => void
}

function AddGameModal({ onGameAdded, showModal, setShowModal }: AddGameModalProps) {
  const [formData, setFormData] = useState<GameFormData>({
    title: '',
    platforms: [],
    genres: [],
    status: 'Not Started',
    progress: 0,
    image: '',
  })
  const [platformOptions, setPlatformOptions] = useState<string[]>([])
  const [genreOptions, setGenreOptions] = useState<string[]>([])
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
    'Done'
  ])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchOptions()
  }, []) // Run once when component mounts

  const fetchOptions = async () => {
    try {
      // Fetch platforms
      const { data: platforms, error: platformError } = await supabase
        .from('platforms')
        .select('name')
        .order('name')

      if (platformError) throw platformError
      setPlatformOptions(platforms.map(p => p.name))

      // Fetch genres
      const { data: genres, error: genreError } = await supabase
        .from('genres')
        .select('name')
        .order('name')

      if (genreError) throw genreError
      setGenreOptions(genres.map(g => g.name))
    } catch (error) {
      console.error('Error fetching options:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      // Create the game
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert([
          {
            title: formData.title,
            status: formData.status,
            progress: formData.progress,
            image: formData.image,
            user_id: user.id
          }
        ])
        .select()
        .single()

      if (gameError) throw gameError

      // Get platform IDs
      const { data: selectedPlatformIds, error: platformError } = await supabase
        .from('platforms')
        .select('id')
        .in('name', formData.platforms)

      if (platformError) throw platformError

      // Add platform relationships
      if (selectedPlatformIds && selectedPlatformIds.length > 0) {
        const { error: platformLinkError } = await supabase
          .from('game_platforms')
          .insert(
            selectedPlatformIds.map(platform => ({
              game_id: game.id,
              platform_id: platform.id
            }))
          )

        if (platformLinkError) throw platformLinkError
      }

      // Get genre IDs
      const { data: selectedGenreIds, error: genreError } = await supabase
        .from('genres')
        .select('id')
        .in('name', formData.genres)

      if (genreError) throw genreError

      // Add genre relationships
      if (selectedGenreIds && selectedGenreIds.length > 0) {
        const { error: genreLinkError } = await supabase
          .from('game_genres')
          .insert(
            selectedGenreIds.map(genre => ({
              game_id: game.id,
              genre_id: genre.id
            }))
          )

        if (genreLinkError) throw genreLinkError
      }

      // Reset form and close modal
      setFormData({
        title: '',
        platforms: [],
        genres: [],
        status: 'Not Started',
        progress: 0,
        image: '',
      })
      onGameAdded()
    } catch (error) {
      console.error('Error adding game:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">Add New Game</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Title</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Platforms</span>
            </label>
            <select
              className="select select-bordered"
              multiple
              value={formData.platforms}
              onChange={(e) => {
                const selectedOptions = Array.from(e.target.selectedOptions, option => option.value)
                setFormData({ ...formData, platforms: selectedOptions })
              }}
            >
              {platformOptions.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Genres</span>
            </label>
            <select
              className="select select-bordered"
              multiple
              value={formData.genres}
              onChange={(e) => {
                const selectedOptions = Array.from(e.target.selectedOptions, option => option.value)
                setFormData({ ...formData, genres: selectedOptions })
              }}
            >
              {genreOptions.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Status</span>
            </label>
            <select
              className="select select-bordered"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
              min="0"
              max="100"
            />
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Image URL</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            />
          </div>

          <div className="modal-action">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Adding...' : 'Add Game'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => onGameAdded()}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={() => onGameAdded()}></div>
    </div>
  )
}

export default AddGameModal
