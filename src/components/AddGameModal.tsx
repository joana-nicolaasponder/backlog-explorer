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
  userId: string
}

function AddGameModal({ onGameAdded, userId }: AddGameModalProps) {
  const [showModal, setShowModal] = useState(false)
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
    'Not Started',
    'In Progress',
    'Completed',
    'Dropped',
    'On Hold'
  ])

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const { data: userGames, error: gamesError } = await supabase
          .from('games')
          .select(`
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
          .eq('user_id', userId)

        if (gamesError) {
          console.error('Error fetching options:', gamesError)
          return
        }

        if (userGames) {
          const platformNames = Array.from(new Set(
            userGames.flatMap(game => 
              game.game_platforms.map(gp => gp.platforms.name)
            )
          )).sort()
          setPlatformOptions(platformNames)

          const genreNames = Array.from(new Set(
            userGames.flatMap(game => 
              game.game_genres.map(gg => gg.genres.name)
            )
          )).sort()
          setGenreOptions(genreNames)
        }
      } catch (error) {
        console.error('Error:', error)
      }
    }

    if (userId) {
      fetchOptions()
    }
  }, [userId])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    try {
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .insert([{
          title: formData.title,
          status: formData.status,
          progress: formData.progress,
          image: formData.image,
          user_id: userId
        }])
        .select()
        .single()

      if (gameError) throw gameError

      const { data: selectedPlatformIds, error: platformError } = await supabase
        .from('platforms')
        .select('id')
        .in('name', formData.platforms)

      if (platformError) throw platformError

      if (selectedPlatformIds && selectedPlatformIds.length > 0) {
        const platformRelations = selectedPlatformIds.map(platform => ({
          game_id: gameData.id,
          platform_id: platform.id
        }))

        const { error: platformRelationError } = await supabase
          .from('game_platforms')
          .insert(platformRelations)

        if (platformRelationError) throw platformRelationError
      }

      const { data: selectedGenreIds, error: genreError } = await supabase
        .from('genres')
        .select('id')
        .in('name', formData.genres)

      if (genreError) throw genreError

      if (selectedGenreIds && selectedGenreIds.length > 0) {
        const genreRelations = selectedGenreIds.map(genre => ({
          game_id: gameData.id,
          genre_id: genre.id
        }))

        const { error: genreRelationError } = await supabase
          .from('game_genres')
          .insert(genreRelations)

        if (genreRelationError) throw genreRelationError
      }

      setShowModal(false)
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
    }
  }

  return (
    <div>
      <button className="btn btn-primary" onClick={() => setShowModal(true)}>
        + Add Game
      </button>

      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Add a New Game</h3>
            <form onSubmit={handleSubmit} className="mt-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Title</span>
                </label>
                <input
                  type="text"
                  name="title"
                  placeholder="Game title"
                  className="input input-bordered"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
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
                  value={formData.platforms}
                  onChange={(e) => {
                    const selectedOptions = Array.from(
                      e.target.selectedOptions,
                      (option) => option.value
                    )
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
                  value={formData.genres}
                  onChange={(e) => {
                    const selectedOptions = Array.from(
                      e.target.selectedOptions,
                      (option) => option.value
                    )
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
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
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
                  placeholder="Progress (0-100)"
                  className="input input-bordered"
                  value={formData.progress}
                  onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
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
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                />
              </div>
              <div className="modal-action">
                <button type="submit" className="btn btn-primary">
                  Add Game
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
      )}
    </div>
  )
}

export default AddGameModal
