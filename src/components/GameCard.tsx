import { useState } from 'react'
import supabase from '../supabaseClient'

interface Game {
  id: string
  title: string
  platform: string
  genre: string
  status: string
  progress: number
  image: string
}

interface GameCardProps {
  games: Game[] 
  userId: string 
}

const GameCard: React.FC<GameCardProps> = ({ games, userId }) => {
  const [showEditModal, setShowEditModal] = useState(false)
  const [formData, setFormData] = useState<Game | null>(null)

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!formData) return

    const { data, error } = await supabase
      .from('games')
      .update(formData)
      .eq('id', formData.id)

    if (error) {
      console.error('Error updating game:', error)
    } else {
      console.log('Game updated:', data)
      setShowEditModal(false)
      setFormData(null)
    }
  }

  const handleDeleteClick = async (gameId: string) => {
    if (window.confirm('Are you sure you want to delete this game?')) {
      const { error } = await supabase.from('games').delete().eq('id', gameId)

      if (error) {
        console.error('Error deleting game:', error)
      } else {
        const updatedGames = games.filter((game) => game.id !== gameId)
        setGames(updatedGames)
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
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Platform</span>
                  </label>
                  <input
                    type="text"
                    name="platform"
                    placeholder="Platform (e.g., PC, Switch)"
                    className="input input-bordered"
                    value={formData.platform}
                    onChange={(e) =>
                      setFormData({ ...formData, platform: e.target.value })
                    }
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Genre</span>
                  </label>
                  <input
                    type="text"
                    name="genre"
                    placeholder="Genre (e.g., RPG, Action)"
                    className="input input-bordered"
                    value={formData.genre}
                    onChange={(e) =>
                      setFormData({ ...formData, genre: e.target.value })
                    }
                  />
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
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Wish List">Wish List</option>
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
              </div>
              <div className="modal-action">
                <button type="submit" className="btn btn-primary">
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
                <div className="badge badge-secondary">{game.status}</div>
              </h2>
              <p>{game.genre}</p>
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
