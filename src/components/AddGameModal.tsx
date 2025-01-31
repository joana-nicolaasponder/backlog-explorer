import { useState, useEffect } from 'react'
import supabase from '../supabaseClient'
import GameSearch from './GameSearch'
import { RAWGGame } from '../types/rawg'
import { mapRAWGGameToIds } from '../services/rawgMappings'

interface Mood {
  id: string
  name: string
  category: 'primary' | 'secondary'
  description: string
  created_at: string
}

interface GameFormData {
  title: string
  platforms: string[]
  genres: string[]
  status: string
  progress: number
  image: string
  moods: string[]
  rawg_id?: number
  rawg_slug?: string
  metacritic_rating?: number
  release_date?: string
  background_image?: string
  description?: string
}

interface AddGameModalProps {
  onGameAdded: () => void
  isOnboarding?: boolean
  showModal: boolean
  setShowModal: (showModal: boolean) => void
}

const AddGameModal: React.FC<AddGameModalProps> = ({
  onGameAdded,
  isOnboarding = false,
  showModal,
  setShowModal,
}) => {
  const [formData, setFormData] = useState<GameFormData>({
    title: '',
    platforms: [],
    genres: [],
    status: 'Not Started',
    progress: 0,
    image: '',
    moods: [],
  })
  const [platformOptions, setPlatformOptions] = useState<string[]>([])
  const [genreOptions, setGenreOptions] = useState<string[]>([])
  const [availableMoods, setAvailableMoods] = useState<Mood[]>([])
  const [selectedGame, setSelectedGame] = useState<RAWGGame | null>(null)
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
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [existingGameMessage, setExistingGameMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchOptions()
    fetchMoods()
  }, []) // Run once when component mounts

  const fetchMoods = async () => {
    try {
      const { data: moods, error } = await supabase
        .from('moods')
        .select('*')
        .order('name')

      if (error) throw error
      setAvailableMoods(moods)
    } catch (error) {
      console.error('Error fetching moods:', error)
    }
  }

  const fetchOptions = async () => {
    try {
      // Fetch platforms
      const { data: platforms, error: platformError } = await supabase
        .from('platforms')
        .select('name')
        .order('name')

      if (platformError) throw platformError
      setPlatformOptions(platforms.map((p) => p.name))

      // Fetch genres
      const { data: genres, error: genreError } = await supabase
        .from('genres')
        .select('name')
        .order('name')

      if (genreError) throw genreError
      setGenreOptions(genres.map((g) => g.name))
    } catch (error) {
      console.error('Error fetching options:', error)
    }
  }

  const handleGameSelect = async (game: RAWGGame) => {
    setSelectedGame(game)

    // Check if user already has this game
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No user found')

    // First check if the game exists
    const { data: existingGame } = await supabase
      .from('games')
      .select('id')
      .eq('rawg_id', game.id)
      .single()

    // Then check if user has this game
    const { data: existingUserGame } = await supabase
      .from('user_games')
      .select(`
        id,
        status,
        progress,
        game_id
      `)
      .eq('game_id', existingGame?.id)
      .eq('user_id', user.id)
      .single()

    if (existingUserGame) {
      // If user already has this game, show a message
      setExistingGameMessage(
        `You already have ${game.name} in your library with status: ${existingUserGame.status}`
      )
      // Clear the form and selected game
      setSelectedGame(null)
      setFormData({
        title: '',
        platforms: [],
        genres: [],
        status: '',
        progress: 0,
        moods: [],
        image: '',
        rawg_id: undefined,
        rawg_slug: undefined,
        metacritic_rating: undefined,
        release_date: undefined,
        background_image: undefined,
        description: undefined,
      })
    } else {
      // Get available platforms from RAWG
      const availablePlatforms = game.platforms.map((p) => p.platform.name)
      setPlatformOptions(availablePlatforms)

      // Set form data with RAWG data
      setFormData({
        title: game.name,
        platforms: [], // User will select from availablePlatforms
        genres: game.genres.map((g) => g.name), // Use RAWG genres directly
        status: 'Not Started',
        progress: 0,
        moods: [],
        image: game.background_image || '',
        rawg_id: game.id,
        rawg_slug: game.slug,
        metacritic_rating: game.metacritic || undefined,
        release_date: game.released || undefined,
        background_image: game.background_image || undefined,
        description: game.description || undefined,
      })
    }

    // Close search after selection
    setIsSearching(false)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setExistingGameMessage(null) // Clear any existing message
    e.preventDefault()
    setIsLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      // First, get or create the game
      let gameId: string

      // Check if game exists by RAWG ID
      const { data: existingGame } = await supabase
        .from('games')
        .select('id')
        .eq('rawg_id', formData.rawg_id)
        .single()

      if (existingGame) {
        gameId = existingGame.id
      } else {
        // Create new game
        const { data: newGame, error: gameError } = await supabase
          .from('games')
          .insert([
            {
              title: formData.title,
              rawg_id: formData.rawg_id,
              rawg_slug: formData.rawg_slug,
              metacritic_rating: formData.metacritic_rating,
              release_date: formData.release_date,
              background_image: formData.background_image,
              description: formData.description,
            },
          ])
          .select()
          .single()

        if (gameError) throw gameError
        if (!newGame) throw new Error('Failed to create game')
        gameId = newGame.id

        // Set up platform mappings from RAWG
        if (selectedGame && selectedGame.platforms) {
          for (const platform of selectedGame.platforms) {
            const { data: existingMapping } = await supabase
              .from('rawg_platform_mappings')
              .select('platform_id')
              .eq('rawg_id', platform.platform.id)
              .single()

            if (existingMapping) {
              await supabase.from('game_platforms').insert({
                game_id: gameId,
                platform_id: existingMapping.platform_id,
                created_at: new Date().toISOString()
              })
            }
          }
        }

        // Set up genre mappings from RAWG
        if (selectedGame && selectedGame.genres) {
          for (const genre of selectedGame.genres) {
            const { data: existingMapping } = await supabase
              .from('rawg_genre_mappings')
              .select('genre_id')
              .eq('rawg_id', genre.id)
              .single()

            if (existingMapping) {
              await supabase.from('game_genres').insert({
                game_id: gameId,
                genre_id: existingMapping.genre_id,
                created_at: new Date().toISOString()
              })
            }
          }
        }
      }

      // Now create or update the user_game relationship
      const { data: existingUserGame } = await supabase
        .from('user_games')
        .select('id')
        .eq('user_id', user.id)
        .eq('game_id', gameId)
        .single()

      if (existingUserGame) {
        // Update existing user_game
        await supabase
          .from('user_games')
          .update({
            status: formData.status,
            progress: formData.progress,
          })
          .eq('id', existingUserGame.id)
      } else {
        // Create new user_game
        await supabase.from('user_games').insert({
          user_id: user.id,
          game_id: gameId,
          status: formData.status,
          progress: formData.progress,
        })
      }

      // Insert moods if any are selected
      if (formData.moods.length > 0) {
        const moodData = formData.moods.map((moodId) => ({
          user_id: user.id,
          game_id: gameId,
          mood_id: moodId,
          weight: 1,
          created_at: new Date().toISOString(),
        }))

        const { error: moodError } = await supabase
          .from('game_moods')
          .insert(moodData)
          .throwOnError()

        if (moodError) {
          console.error('Failed to insert moods:', moodError)
          throw moodError
        }
      }

      setFormData({
        title: '',
        platforms: [],
        genres: [],
        status: 'Not Started',
        progress: 0,
        image: '',
        moods: [],
      })

      onGameAdded()
    } catch (error) {
      console.error('Error adding game:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className={`modal ${showModal ? 'modal-open' : ''} ${
        isOnboarding ? 'z-[100]' : ''
      }`}
    >
      <div className="modal-box max-w-3xl relative bg-base-100">
        <button
          className="btn btn-sm btn-circle absolute right-2 top-2"
          onClick={() => {
            setShowModal(false)
            setExistingGameMessage(null)
          }}
        >
          ✕
        </button>
        <h3 className="font-bold text-xl mb-6 text-base-content">
          Add New Game
        </h3>

        {existingGameMessage && (
          <div className="alert bg-base-200 text-base-content border-2 border-base-300 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-base-content shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>{existingGameMessage}</span>
          </div>
        )}

        {isSearching ? (
          <div className="mb-8">
            <GameSearch onGameSelect={handleGameSelect} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsSearching(true)
              setExistingGameMessage(null)
            }}
            className="btn btn-ghost btn-sm mb-8 gap-2"
          >
            <span className="text-lg">⬅️</span>
            Search for a different game
          </button>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Game Details Section */}
          <div className="card bg-base-200 shadow-sm p-6 space-y-4">
            <h2 className="card-title text-base-content text-lg">
              Game Details
            </h2>

            {formData.image && (
              <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-base-300">
                <img
                  src={formData.image}
                  alt={formData.title}
                  className="object-cover w-full h-full"
                />
              </div>
            )}

            <div className="form-control">
              <label className="label">
                <span className="label-text text-base-content">Title</span>
              </label>
              <input
                type="text"
                className="input input-bordered bg-base-100"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-base-content">
                  Platforms <span className="text-error">*</span>
                </label>
                {formData.platforms.length === 0 && (
                  <span className="text-sm text-error">
                    Select at least one platform
                  </span>
                )}
              </div>
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
                    className={`
                      btn btn-sm normal-case
                      ${
                        formData.platforms.includes(platform)
                          ? 'bg-primary text-primary-content hover:bg-primary-focus'
                          : 'btn-ghost hover:bg-base-300'
                      }
                      transition-all duration-200
                    `}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-base-content">
                Genres
              </label>
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

          <div className="mb-6">
            <label className="block text-lg font-medium mb-4 text-base-content">
              How would you describe this game?
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Primary Moods */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-base-content/70">
                    Primary Moods
                  </h3>
                  <span className="text-xs text-base-content/60">
                    {
                      formData.moods.filter(
                        (id) =>
                          availableMoods.find((m) => m.id === id)?.category ===
                          'primary'
                      ).length
                    }{' '}
                    / 2 max
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableMoods
                    .filter((mood) => mood.category === 'primary')
                    .map((mood) => {
                      const isSelected = formData.moods.includes(mood.id)
                      const primaryCount = formData.moods.filter(
                        (id) =>
                          availableMoods.find((m) => m.id === id)?.category ===
                          'primary'
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
                                const newMoods = e.target.checked
                                  ? [...formData.moods, mood.id]
                                  : formData.moods.filter((id) => id !== mood.id)
                                setFormData({ ...formData, moods: newMoods })
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
                  <h3 className="text-sm font-medium text-base-content/70">
                    Secondary Moods
                  </h3>
                  <span className="text-xs text-base-content/60">
                    {
                      formData.moods.filter(
                        (id) =>
                          availableMoods.find((m) => m.id === id)?.category ===
                          'secondary'
                      ).length
                    }{' '}
                    / 3 max
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableMoods
                    .filter((mood) => mood.category === 'secondary')
                    .map((mood) => {
                      const isSelected = formData.moods.includes(mood.id)
                      const secondaryCount = formData.moods.filter(
                        (id) =>
                          availableMoods.find((m) => m.id === id)?.category ===
                          'secondary'
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
                                const newMoods = e.target.checked
                                  ? [...formData.moods, mood.id]
                                  : formData.moods.filter((id) => id !== mood.id)
                                setFormData({ ...formData, moods: newMoods })
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

          {/* Game Progress Section */}
          <div className="card bg-base-200 shadow-sm p-6 space-y-6">
            <h2 className="card-title text-base-content text-lg">
              Game Progress
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="text-sm font-medium text-base-content">
                  Status
                </label>
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
                    { value: 'Come back!', icon: '⏰', desc: 'Return later' },
                  ].map((status) => (
                    <label
                      key={status.value}
                      className={`
                        btn btn-sm justify-start gap-2 normal-case
                        ${
                          formData.status === status.value
                            ? 'btn-primary'
                            : 'btn-ghost'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="status"
                        className="hidden"
                        checked={formData.status === status.value}
                        onChange={() =>
                          setFormData({ ...formData, status: status.value })
                        }
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
                  <label className="text-sm font-medium text-base-content">
                    Completion
                  </label>
                  <span className="badge badge-primary">
                    {formData.progress}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.progress}
                  className="range range-primary"
                  step="5"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      progress: parseInt(e.target.value),
                    })
                  }
                />
                <div className="w-full flex justify-between text-xs text-base-content/60">
                  <span>Just Started</span>
                  <span>Halfway</span>
                  <span>Almost Done</span>
                </div>
              </div>
            </div>
          </div>

          {/* Optional Details */}
          <div className="card bg-base-200 shadow-sm p-6 space-y-4">
            <h2 className="card-title text-base-content text-lg">
              Optional Details
            </h2>

            <div className="form-control">
              <label className="label">
                <span className="label-text text-base-content">
                  Cover Image URL
                </span>
              </label>
              <input
                type="text"
                className="input input-bordered bg-base-100"
                value={formData.image}
                onChange={(e) =>
                  setFormData({ ...formData, image: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="modal-action gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onGameAdded()}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || formData.platforms.length === 0}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Adding...
                </>
              ) : (
                'Add to Collection'
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={() => onGameAdded()}></div>
    </div>
  )
}

export default AddGameModal
