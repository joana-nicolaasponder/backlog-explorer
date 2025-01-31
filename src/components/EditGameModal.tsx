import { useState, useEffect } from 'react'
import supabase from '../supabaseClient'
import { Game } from '../types'
import { getGameDetails } from '../services/rawg'
import { RAWGPlatform, RAWGGenre } from '../types/rawg'

interface Mood {
  id: string
  name: string
  category: 'primary' | 'secondary'
  description: string
  created_at: string
}

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
  userId: string
  onGameUpdated: () => void
  showModal: boolean
  setShowModal: (show: boolean) => void
}

const EditGameModal: React.FC<EditGameModalProps> = ({
  game,
  userId,
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
    moods: game.moods || []
  })
  const [availableMoods, setAvailableMoods] = useState<Mood[]>([])
  const [selectedMoods, setSelectedMoods] = useState<string[]>([])
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

  // Load available moods from Supabase
  useEffect(() => {
    const loadMoods = async () => {
      try {
        console.log('Loading moods...')
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          return
        }

        if (!session) {
          console.warn('No active session')
          return
        }

        console.log('Got session, fetching moods...', session)
        const { data: moods, error: moodsError } = await supabase
          .from('moods')
          .select('*')
          .throwOnError()

        if (moodsError) {
          console.error('Supabase moods error:', moodsError)
          throw moodsError
        }

        console.log('Raw moods response:', moods)
        
        if (!moods) {
          console.warn('No moods data received')
          return
        }

        // Sort moods after receiving them
        const sortedMoods = [...moods].sort((a, b) => {
          // Sort by category (primary first)
          if (a.category === 'primary' && b.category !== 'primary') return -1
          if (a.category !== 'primary' && b.category === 'primary') return 1
          // Then by name
          return a.name.localeCompare(b.name)
        })

        console.log('Sorted moods:', sortedMoods)
        setAvailableMoods(sortedMoods)
      } catch (error) {
        console.error('Error in loadMoods:', error)
      }
    }

    loadMoods()
  }, [])

  // Load game's existing moods
  useEffect(() => {
    const loadGameMoods = async () => {
      try {
        const { data: gameMoods, error } = await supabase
          .from('game_moods')
          .select('mood_id')
          .eq('game_id', game.id)

        if (error) throw error
        if (gameMoods) {
          const moodIds = gameMoods.map(gm => gm.mood_id)
          setSelectedMoods(moodIds)
        }
      } catch (error) {
        console.error('Error loading game moods:', error)
      }
    }

    if (game.id) loadGameMoods()
  }, [game.id])

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
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) throw new Error('No user found')
      
      console.log('1. User authenticated:', user.id)
      console.log('2. Game ID:', game.id)
      console.log('3. Selected moods:', selectedMoods)

      // Step 1: Update user_games
      const { error: updateError } = await supabase
        .from('user_games')
        .update({
          status: formData.status,
          progress: formData.progress,
        })
        .eq('game_id', game.id)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Failed to update user_games:', updateError)
        throw updateError
      }
      console.log('4. Updated user_games successfully')

      // Step 2: Delete existing moods
      const { error: deleteError } = await supabase
        .from('game_moods')
        .delete()
        .eq('game_id', game.id)
        .throwOnError()

      if (deleteError) {
        console.error('Failed to delete existing moods:', deleteError)
        throw deleteError
      }
      console.log('5. Deleted existing moods successfully')

      // Step 3: Insert new moods if any are selected
      if (selectedMoods.length > 0) {
        const moodData = selectedMoods.map(moodId => ({
          user_id: userId,
          game_id: game.id,
          mood_id: moodId,
          weight: 1,
          created_at: new Date().toISOString()
        }))

        const { error: insertError } = await supabase
          .from('game_moods')
          .insert(moodData)
          .throwOnError()

        if (insertError) {
          console.error('Failed to insert new moods:', insertError)
          throw insertError
        }
        console.log('6. Inserted new moods successfully')
      } else {
        console.log('6. No new moods to insert')
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

          {/* Mood Selection */}
          <div className="form-control mb-6">
            <label className="label">
              <span className="label-text font-semibold">Primary Moods</span>
              <span className="label-text-alt">Choose 1-2 primary moods</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-4">
              {availableMoods
                .filter(mood => mood.category === 'primary')
                .map(mood => (
                  <div
                    key={mood.id}
                    className="tooltip"
                    data-tip={mood.description}
                  >
                    <label className="cursor-pointer flex items-center">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary checkbox-sm mr-2"
                        checked={selectedMoods.includes(mood.id)}
                        onChange={(e) => {
                          const primarySelected = selectedMoods.filter(id => 
                            availableMoods.find(m => m.id === id)?.category === 'primary'
                          )
                          if (e.target.checked && primarySelected.length >= 2) {
                            // Already have 2 primary moods
                            return
                          }
                          setSelectedMoods(prev =>
                            e.target.checked
                              ? [...prev, mood.id]
                              : prev.filter(id => id !== mood.id)
                          )
                        }}
                      />
                      <span className="text-sm">{mood.name}</span>
                    </label>
                  </div>
                ))}
            </div>

            <label className="label mt-4">
              <span className="label-text font-semibold">Secondary Moods</span>
              <span className="label-text-alt">Choose up to 3 secondary moods</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {availableMoods
                .filter(mood => mood.category === 'secondary')
                .map(mood => (
                  <div
                    key={mood.id}
                    className="tooltip"
                    data-tip={mood.description}
                  >
                    <label className="cursor-pointer flex items-center">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-secondary checkbox-sm mr-2"
                        checked={selectedMoods.includes(mood.id)}
                        onChange={(e) => {
                          const secondarySelected = selectedMoods.filter(id => 
                            availableMoods.find(m => m.id === id)?.category === 'secondary'
                          )
                          if (e.target.checked && secondarySelected.length >= 3) {
                            // Already have 3 secondary moods
                            return
                          }
                          setSelectedMoods(prev =>
                            e.target.checked
                              ? [...prev, mood.id]
                              : prev.filter(id => id !== mood.id)
                          )
                        }}
                      />
                      <span className="text-sm">{mood.name}</span>
                    </label>
                  </div>
                ))}
            </div>
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
