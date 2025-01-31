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
        // console.log('Loading moods...')
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

        // console.log('Got session, fetching moods...', session)
        const { data: moods, error: moodsError } = await supabase
          .from('moods')
          .select('*')
          .throwOnError()

        if (moodsError) {
          console.error('Supabase moods error:', moodsError)
          throw moodsError
        }

        // console.log('Raw moods response:', moods)
        
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

        // console.log('Sorted moods:', sortedMoods)
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
          // console.log('Loading RAWG data for game:', game.rawg_id)
          const gameDetails = await getGameDetails(Number(game.rawg_id))
          if (gameDetails) {
            // console.log('RAWG data loaded:', gameDetails)
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
      
      // console.log('1. User authenticated:', user.id)
      // console.log('2. Game ID:', game.id)
      // console.log('3. Selected moods:', selectedMoods)

      // Step 1: Update user_games
      const { error: updateError } = await supabase
        .from('user_games')
        .update({
          status: formData.status,
          progress: formData.progress,
          updated_at: new Date().toISOString()
        })
        .eq('game_id', game.id)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Failed to update user_games:', updateError)
        throw updateError
      }
      // console.log('4. Updated user_games successfully')

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
      // console.log('5. Deleted existing moods successfully')

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
        // console.log('6. Inserted new moods successfully')
      } else {
        // console.log('6. No new moods to insert')
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
      <div className="modal-box max-w-3xl relative bg-base-100">
        <button
          className="btn btn-sm btn-circle absolute right-2 top-2"
          onClick={() => setShowModal(false)}
        >
          ✕
        </button>
        <h3 className="font-bold text-xl mb-6 text-base-content">Edit Game Progress</h3>

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Game Details Section */}
          <div className="card bg-base-200 shadow-sm p-6 space-y-4">
            <h2 className="card-title text-base-content text-lg">Game Details</h2>

            {formData.image && (
              <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-base-300">
                <img
                  src={formData.image}
                  alt={formData.title}
                  className="object-cover w-full h-full"
                />
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-lg font-medium text-base-content">{formData.title}</h4>
              <div className="flex flex-wrap gap-2">
                {formData.genres.map((genre) => (
                  <span
                    key={genre}
                    className="badge badge-secondary badge-lg font-medium"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Game Progress Section */}
          <div className="card bg-base-200 shadow-sm p-6 space-y-6">
            <h2 className="card-title text-base-content text-lg">Game Progress</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="text-sm font-medium text-base-content">Status</label>
                <div className="join join-vertical w-full">
                  {[
                    { value: 'Wishlist', icon: '🎮', desc: 'Want to play' },
                    { value: 'Currently Playing', icon: '▶️', desc: 'In progress' },
                    { value: 'Done', icon: '✅', desc: 'Completed main story' },
                    { value: 'DNF', icon: '⏹️', desc: 'Did not finish' },
                    { value: 'Endless', icon: '♾️', desc: 'No definite end' },
                    { value: 'Satisfied', icon: '🌟', desc: 'Happy with progress' },
                    { value: 'Try Again', icon: '🔄', desc: 'Give it another shot' },
                    { value: 'Started', icon: '🎯', desc: 'Just began' },
                    { value: 'Owned', icon: '💫', desc: 'In collection' },
                    { value: 'Come back!', icon: '⏰', desc: 'Return later' }
                  ].map((status) => (
                    <label
                      key={status.value}
                      className={`
                        btn btn-sm justify-start gap-2 normal-case
                        ${formData.status === status.value ? 'btn-primary' : 'btn-ghost'}
                      `}
                    >
                      <input
                        type="radio"
                        name="status"
                        className="hidden"
                        checked={formData.status === status.value}
                        onChange={() => setFormData({ ...formData, status: status.value })}
                      />
                      <span className="text-lg">{status.icon}</span>
                      <span>{status.value}</span>
                      <span className="text-xs opacity-70">{status.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-base-content">Completion</label>
                  <span className="badge badge-primary">{formData.progress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.progress}
                  className="range range-primary"
                  step="5"
                  onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                />
                <div className="w-full flex justify-between text-xs text-base-content/60">
                  <span>Just Started</span>
                  <span>Halfway</span>
                  <span>Almost Done</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mood Selection */}
          <div className="card bg-base-200 shadow-sm p-6 space-y-6">
            <h2 className="card-title text-base-content text-lg">Game Moods</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Primary Moods */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-base-content/70">Primary Moods</h3>
                  <span className="text-xs text-base-content/60">
                    {selectedMoods.filter(id => 
                      availableMoods.find(m => m.id === id)?.category === 'primary'
                    ).length} / 2 max
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableMoods
                    .filter(mood => mood.category === 'primary')
                    .map((mood) => {
                      const isSelected = selectedMoods.includes(mood.id)
                      const primaryCount = selectedMoods.filter(id => 
                        availableMoods.find(m => m.id === id)?.category === 'primary'
                      ).length
                      const disabled = !isSelected && primaryCount >= 2

                      return (
                        <label
                          key={mood.id}
                          className={`
                            tooltip
                            before:!bg-base-300 before:!text-base-content
                            before:!shadow-lg before:!rounded-lg
                          `}
                          data-tip={mood.description}
                        >
                          <span
                            className={`
                              btn btn-sm normal-case px-4
                              ${isSelected 
                                ? 'bg-primary text-primary-content hover:bg-primary-focus border-primary'
                                : disabled
                                  ? 'btn-disabled opacity-50'
                                  : 'btn-ghost hover:bg-base-200 border border-base-300'}
                              transition-all duration-200
                            `}
                          >
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={isSelected}
                              disabled={disabled}
                              onChange={(e) => {
                                setSelectedMoods(prev =>
                                  e.target.checked
                                    ? [...prev, mood.id]
                                    : prev.filter(id => id !== mood.id)
                                )
                              }}
                            />
                            {mood.name}
                          </span>
                        </label>
                      )
                    })}
                </div>
              </div>

              {/* Secondary Moods */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-base-content/70">Secondary Moods</h3>
                  <span className="text-xs text-base-content/60">
                    {selectedMoods.filter(id => 
                      availableMoods.find(m => m.id === id)?.category === 'secondary'
                    ).length} / 3 max
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableMoods
                    .filter(mood => mood.category === 'secondary')
                    .map((mood) => {
                      const isSelected = selectedMoods.includes(mood.id)
                      const secondaryCount = selectedMoods.filter(id => 
                        availableMoods.find(m => m.id === id)?.category === 'secondary'
                      ).length
                      const disabled = !isSelected && secondaryCount >= 3

                      return (
                        <label
                          key={mood.id}
                          className={`
                            tooltip
                            before:!bg-base-300 before:!text-base-content
                            before:!shadow-lg before:!rounded-lg
                          `}
                          data-tip={mood.description}
                        >
                          <span
                            className={`
                              btn btn-sm normal-case px-4
                              ${isSelected
                                ? 'bg-secondary text-secondary-content hover:bg-secondary-focus border-secondary'
                                : disabled
                                  ? 'btn-disabled opacity-50'
                                  : 'btn-ghost hover:bg-base-200 border border-base-300'}
                              transition-all duration-200
                            `}
                          >
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={isSelected}
                              disabled={disabled}
                              onChange={(e) => {
                                setSelectedMoods(prev =>
                                  e.target.checked
                                    ? [...prev, mood.id]
                                    : prev.filter(id => id !== mood.id)
                                )
                              }}
                            />
                            {mood.name}
                          </span>
                        </label>
                      )
                    })}
                </div>
              </div>
            </div>
          </div>

          <div className="modal-action gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={() => setShowModal(false)}></div>
    </div>
  )
}

export default EditGameModal
