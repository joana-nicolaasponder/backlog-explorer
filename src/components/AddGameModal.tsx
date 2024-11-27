import { useState } from 'react'
import supabase from '../supabaseClient'

interface GameFormData {
  title: string
  platform: string
  genre: string
  status: string
  progress: number
  image: string
}

interface AddGameModalProps {
  onGameAdded: () => void
}

function AddGameModal({ onGameAdded }: AddGameModalProps) {
  
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState<GameFormData>({
    title: '',
    platform: '',
    genre: '',
    status: 'Not Started',
    progress: 0,
    image: '',
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const { data: session } = await supabase.auth.getSession()
    const user = session?.session?.user

    if (!user) {
      console.error('User not authenticated')
      return
    }

    const gameData = { ...formData, user_id: user.id }

    const { data, error } = await supabase.from('games').insert([gameData])
    if (error) {
      console.error('Error adding game:', error)
    } else {
      console.log('Game added:', data)
      setShowModal(false)
      setFormData({
        title: '',
        platform: '',
        genre: '',
        status: 'Not Started',
        progress: 0,
        image: '',
      })
      onGameAdded() // Call the callback to refresh the games list
    }
  }
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prevData) => ({
      ...prevData,
      [name]: name === 'progress' ? parseInt(value) || 0 : value,
    }))
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
                  onChange={handleChange}
                  required
                />
              </div>
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
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
                />
              </div>
              <div className="modal-action">
                <button type="submit" className="btn btn-primary">
                  Save
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
