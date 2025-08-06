import { useState, useEffect } from 'react'
import supabase from '../../supabaseClient'
import { Game } from '../../types'
import { gameService } from '../../services/gameService'
import { Platform as GamePlatform, Genre as GameGenre } from '../types/game'

import { Mood, Platform } from '../../types'

type UIPlatform = { id: string; name: string }

interface EditableGame
  extends Omit<
    Game,
    | 'game_genres'
    | 'game_platforms'
    | 'game_moods'
    | 'genre'
    | 'user_id'
    | 'created_at'
    | 'updated_at'
  > {
  genres: string[]
  platforms: string[]
  availablePlatforms?: string[]
  rawg_id?: string | number
}

interface EditGameModalProps {
  game: EditableGame
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
  const [hasLoadedMoods, setHasLoadedMoods] = useState(false)
  const [formData, setFormData] = useState({
    status: game.status || '',
    progress: game.progress || 0,
    title: game.title || '',
    genres: game.genres || [],
    image: game.image || '',
    moods: game.moods || [],
    // Initialize with user's previously selected platforms
    platforms: Array.isArray(game.platforms) ? game.platforms : [],
    // Track if the image is custom
    hasCustomImage: !!game.image,
  })
  // Track the originally loaded platforms
  const [originalPlatforms, setOriginalPlatforms] = useState<string[]>(
    game.platforms || []
  )

  // Update formData and selections when modal opens
  useEffect(() => {
    if (showModal) {
      setFormData({
        status: game.status || '',
        progress: game.progress || 0,
        title: game.title || '',
        genres: game.genres || [],
        image: game.image || '',
        moods: game.moods || [],
        platforms: Array.isArray(game.platforms) ? game.platforms : [],
        hasCustomImage: !!game.image,
      })
      setSelectedMoods(game.moods || [])
      setOriginalMoods(game.moods || [])
      setOriginalPlatforms(game.platforms || [])
    }
  }, [showModal])
  const [platformOptions, setPlatformOptions] = useState<GamePlatform[]>([])
  const [genreOptions, setGenreOptions] = useState<GameGenre[]>([])
  // Use the availablePlatforms passed from the game object
  const [availablePlatforms, setAvailablePlatforms] = useState<UIPlatform[]>(
    game.availablePlatforms?.map((name) => ({ id: name, name })) || []
  )
  // Platforms are managed in formData.platforms
  const [availableMoods, setAvailableMoods] = useState<Mood[]>([])
  const [selectedMoods, setSelectedMoods] = useState<string[]>(game.moods || [])
  const [originalMoods, setOriginalMoods] = useState<string[]>(game.moods || [])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoadingMoods, setIsLoadingMoods] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [isValidatingImage, setIsValidatingImage] = useState(false)
  const [validationTimeout, setValidationTimeout] =
    useState<NodeJS.Timeout | null>(null)
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

  const arraysEqual = (a: string[], b: string[]): boolean => {
    const sortedA = [...a].sort()
    const sortedB = [...b].sort()
    return (
      sortedA.length === sortedB.length &&
      sortedA.every((value, index) => value === sortedB[index])
    )
  }

  // Load available platforms for this game
  useEffect(() => {
    const loadGamePlatforms = async () => {
      try {
        let igdbGameDetails = null;
        // Always try to get IGDB details if igdb_id is present
        if (game.igdb_id) {
          igdbGameDetails = await gameService.getGameDetails(game.igdb_id.toString());
        } else if (game.provider === 'steam' && game.title) {
          // Fallback: search IGDB by title for Steam games without igdb_id
          try {
            const searchResult = await gameService.searchGames(game.title);
            if (searchResult.results.length > 0) {
              igdbGameDetails = await gameService.getGameDetails(searchResult.results[0].id);
            }
          } catch (e) {
            console.log('Could not find matching IGDB game for Steam game:', e);
          }
        }

        if (igdbGameDetails) {
          // --- STEAM LINK LOGIC ---
          const hasSteamLink =
            Array.isArray(igdbGameDetails.websites) &&
            igdbGameDetails.websites.some(
              (w) => w.type === 13 || w.url?.includes('store.steampowered.com')
            );
          // --- END STEAM LINK LOGIC ---

          let platforms: UIPlatform[] = [];
          if (Array.isArray(igdbGameDetails.platforms) && igdbGameDetails.platforms.length > 0) {
            platforms = igdbGameDetails.platforms.map((p: any) => ({ id: p.name, name: p.name }));
          }

          // Only add Steam if IGDB platforms includes Steam, or IGDB websites has a Steam link
          const hasSteamPlatform = platforms.some((p) => p.name === 'Steam');
          if (!hasSteamPlatform && hasSteamLink) {
            platforms.push({ id: 'Steam', name: 'Steam' });
          }

          // Set the available platforms from IGDB (+Steam if above)
          setAvailablePlatforms(platforms);

          // If we have user-selected platforms that aren't in IGDB's list,
          // add them to available platforms to preserve user's selections
          const igdbPlatformNames = platforms.map((p) => p.name);
          const userPlatforms = Array.isArray(game.platforms) ? game.platforms : [];
          const missingPlatforms = userPlatforms
            .filter((p) => !igdbPlatformNames.includes(p))
            .map((name) => ({ id: name, name }));

          if (missingPlatforms.length > 0) {
            setAvailablePlatforms((prev) => [...prev, ...missingPlatforms]);
          }
        } else {
          // Fallback: use whatever platforms are on the game object
          setAvailablePlatforms(
            Array.isArray(game.availablePlatforms)
              ? game.availablePlatforms.map((name) => ({ id: name, name }))
              : []
          );
        }
      } catch (error) {
        console.error('Error in loadGamePlatforms:', error);
      }
    }

    // Load platforms when the component mounts
    loadGamePlatforms()
  }, [game.igdb_id, game.title])

  // Load available moods from Supabase
  useEffect(() => {
    const loadMoods = async () => {
      try {
        // Get the current session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Session error:', sessionError)
          return
        }

        if (!session) {
          console.warn('No active session')
          return
        }

        const { data: moods, error: moodsError } = await supabase
          .from('moods')
          .select('*')
          .throwOnError()

        if (moodsError) {
          console.error('Supabase moods error:', moodsError)
          throw moodsError
        }

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

        setAvailableMoods(sortedMoods)
      } catch (error) {
        console.error('Error in loadMoods:', error)
      }
    }

    loadMoods()
  }, [])

  // Load game's existing moods when modal opens, but only if not already loaded and user hasn't made changes
  useEffect(() => {
    let mounted = true

    const loadGameMoods = async () => {
      if (!showModal || !mounted) return
      if (!game.id || !userId) return

      try {
        const { data: gameMoods, error } = await supabase
          .from('game_moods')
          .select('mood_id')
          .eq('game_id', game.id)
          .eq('user_id', userId)

        if (error) throw error

        const moodIds = gameMoods?.map((gm) => gm.mood_id) || []

        if (mounted) {
          setSelectedMoods(moodIds)
          setOriginalMoods(moodIds)
          setHasLoadedMoods(true)
        }
      } catch (error) {
        setError('Failed to load game moods. Please try again.')
      }
    }

    // Only reload moods if the user hasn't made any changes (i.e., no unsaved changes)
    const moodUnchanged = arraysEqual(selectedMoods, originalMoods)
    const platformUnchanged = arraysEqual(formData.platforms, originalPlatforms)
    if (showModal && !hasLoadedMoods && moodUnchanged && platformUnchanged) {
      loadGameMoods()
    }

    return () => {
      mounted = false
    }
  }, [
    game.id,
    userId,
    showModal,
    hasLoadedMoods,
    selectedMoods,
    originalMoods,
    formData.platforms,
    originalPlatforms,
  ])

  // Reset hasLoadedMoods when modal closes
  useEffect(() => {
    if (!showModal) {
      setHasLoadedMoods(false)
    }
  }, [showModal])

  const handleMoodChange = (moods: string[]) => {
    setSelectedMoods(moods)
    setFormData((prev) => ({ ...prev, moods }))
  }

  const validateImageUrl = async (
    url: string,
    isSubmit: boolean = false
  ): Promise<boolean> => {
    // Clear any existing validation timeout
    if (validationTimeout) {
      clearTimeout(validationTimeout)
      setValidationTimeout(null)
    }
    if (!url) return true // Empty URL is valid (optional field)

    // Basic URL format validation
    try {
      new URL(url)
    } catch {
      setImageError('Please enter a valid URL')
      return false
    }

    // Check if image can be loaded in the browser
    try {
      setIsValidatingImage(true)

      const result = await new Promise((resolve) => {
        const img = new Image()
        img.onload = () => resolve(true)
        img.onerror = () => resolve(false)
        img.src = url
      })

      if (!result) {
        setImageError('Could not load image from URL')
        return false
      }
    } catch (err) {
      setImageError('Failed to validate image URL')
      return false
    } finally {
      setIsValidatingImage(false)
    }

    setImageError(null)
    return true
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    // Store original form state to revert on error
    const originalFormState = { ...formData }

    try {
      // Validate image URL if one is provided
      if (formData.image) {
        const isValidImage = await validateImageUrl(formData.image, true)
        if (!isValidImage) {
          setIsLoading(false)
          return
        }
      }

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError) {
        throw new Error('Authentication error. Please try again.')
      }
      if (!user) {
        throw new Error('No user found. Please log in again.')
      }

      // Step 1: Update user_games
      const { error: updateError } = await supabase
        .from('user_games')
        .update({
          status: formData.status,
          progress: formData.progress,
          platforms: Array.isArray(formData.platforms)
            ? formData.platforms
            : [], // Ensure platforms is always an array
          image: formData.image,
          updated_at: new Date().toISOString(),
        })
        .eq('game_id', game.id)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Error updating game:', updateError)
        throw new Error('Failed to update game status. Please try again.')
      }

      // Step 2: Update platform relationships
      try {
        // Delete existing platform relationships
        const { error: deletePlatformsError } = await supabase
          .from('game_platforms')
          .delete()
          .eq('game_id', game.id)

        if (deletePlatformsError) {
          console.error('Error deleting platforms:', deletePlatformsError)
          throw new Error('Failed to update game platforms. Please try again.')
        }

        // Get platform IDs for the selected platform names
        const { data: platformData, error: platformError } = await supabase
          .from('platforms')
          .select('id, name')
          .in('name', formData.platforms)

        if (platformError) {
          console.error('Error fetching platform IDs:', platformError)
          throw new Error(
            'Failed to fetch platform information. Please try again.'
          )
        }

        // Insert new platform relationships
        if (platformData && platformData.length > 0) {
          const platformRelations = platformData.map((platform) => ({
            game_id: game.id,
            platform_id: platform.id,
            created_at: new Date().toISOString(),
          }))

          const { error: insertPlatformsError } = await supabase
            .from('game_platforms')
            .insert(platformRelations)

          if (insertPlatformsError) {
            console.error('Error inserting platforms:', insertPlatformsError)
            throw new Error(
              'Failed to save new game platforms. Please try again.'
            )
          }
        }
      } catch (platformError) {
        // If platform update fails, roll back the game status update
        const { error: rollbackError } = await supabase
          .from('user_games')
          .update({
            status: originalFormState.status,
            progress: originalFormState.progress,
            platforms: originalFormState.platforms,
            updated_at: new Date().toISOString(),
          })
          .eq('game_id', game.id)
          .eq('user_id', user.id)

        if (rollbackError) {
          console.error('Error rolling back game status:', rollbackError)
          throw new Error('Update failed. Please refresh and try again.')
        }

        // Reset form state
        setFormData(originalFormState)
        throw platformError
      }

      // Handle mood updates
      const hasExistingMoods = originalMoods.length > 0
      const moodsCleared = selectedMoods.length === 0 && hasExistingMoods
      const moodsChanged = !arraysEqual(selectedMoods, originalMoods)

      if (moodsCleared || moodsChanged) {
        try {
          // Step 2: Delete existing moods
          const { error: deleteError } = await supabase
            .from('game_moods')
            .delete()
            .eq('game_id', game.id)
            .eq('user_id', userId)

          if (deleteError) {
            console.error('Error deleting moods:', deleteError)
            throw new Error('Failed to update game moods. Please try again.')
          }

          // Step 3: Insert new moods if any are selected
          if (selectedMoods.length > 0) {
            const moodData = selectedMoods.map((moodId) => ({
              user_id: userId,
              game_id: game.id,
              mood_id: moodId,
              weight: 1,
              created_at: new Date().toISOString(),
            }))

            const { error: insertError } = await supabase
              .from('game_moods')
              .insert(moodData)

            if (insertError) {
              console.error('Error inserting moods:', insertError)
              throw new Error(
                'Failed to save new game moods. Please try again.'
              )
            }
          }

          // Verify mood updates
          const { data: newMoods, error: moodsError } = await supabase
            .from('game_moods')
            .select('mood_id')
            .eq('game_id', game.id)

          if (moodsError) {
            console.error('Error verifying moods:', moodsError)
            throw new Error(
              'Failed to verify mood updates. Please check your library.'
            )
          }

          setSelectedMoods(newMoods ? newMoods.map((m) => m.mood_id) : [])
        } catch (moodError) {
          // If mood update fails, we should roll back the game status update
          const { error: rollbackError } = await supabase
            .from('user_games')
            .update({
              status: originalFormState.status,
              progress: originalFormState.progress,
              platforms: originalFormState.platforms,
              updated_at: new Date().toISOString(),
            })
            .eq('game_id', game.id)
            .eq('user_id', user.id)

          if (rollbackError) {
            console.error('Error rolling back game status:', rollbackError)
            throw new Error('Update failed. Please refresh and try again.')
          }

          // Reset form state
          setFormData(originalFormState)
          throw moodError
        }
      }

      setSuccess('Changes saved successfully!')
      // Give users a moment to see the success message
      setTimeout(() => {
        setShowModal(false)
        onGameUpdated()
      }, 1000)
    } catch (error) {
      console.error('Submit error:', error)
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to update game. Please try again.'
      )
      // Reset form state on error
      setFormData(originalFormState)
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
        <h3 className="font-bold text-xl mb-6 text-base-content">
          Edit Game Progress
        </h3>

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

            <div className="space-y-3">
              <h4 className="text-lg font-medium text-base-content">
                {formData.title}
              </h4>
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

          {/* Custom Image Section */}
          <div className="card bg-base-200 shadow-sm p-6 space-y-6">
            <h2 className="card-title text-base-content text-lg">
              Custom Cover Image
            </h2>
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <label
                  htmlFor="image"
                  className="text-sm font-medium text-base-content"
                >
                  Custom Cover Image URL (optional)
                </label>
                <input
                  type="text"
                  id="image"
                  name="image"
                  value={formData.image || ''}
                  onChange={(e) => {
                    const newUrl = e.target.value
                    setFormData({ ...formData, image: newUrl })

                    // Clear any existing timeout
                    if (validationTimeout) {
                      clearTimeout(validationTimeout)
                    }

                    if (newUrl) {
                      // Set a new timeout for validation
                      const timeout = setTimeout(() => {
                        validateImageUrl(newUrl)
                      }, 500) // 500ms debounce
                      setValidationTimeout(timeout)
                    } else {
                      setImageError(null)
                      setIsValidatingImage(false)
                    }
                  }}
                  placeholder="Enter a URL for a custom cover image"
                  className={`input input-bordered w-full ${
                    imageError ? 'input-error' : ''
                  }`}
                  disabled={isValidatingImage}
                />
                {isValidatingImage && (
                  <div className="text-sm text-base-content/70">
                    Validating image URL...
                  </div>
                )}
                {imageError && (
                  <div className="text-sm text-error">{imageError}</div>
                )}
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
                    {
                      value: 'Currently Playing',
                      icon: '▶️',
                      desc: 'In progress',
                    },
                    { value: 'Done', icon: '✅', desc: 'Completed main story' },
                    { value: 'DNF', icon: '⏹️', desc: 'Did not finish' },
                    { value: 'Endless', icon: '♾️', desc: 'No definite end' },
                    {
                      value: 'Satisfied',
                      icon: '🌟',
                      desc: 'Happy with progress',
                    },
                    {
                      value: 'Try Again',
                      icon: '🔄',
                      desc: 'Give it another shot',
                    },
                    { value: 'Started', icon: '🎯', desc: 'Just began' },
                    { value: 'Owned', icon: '💫', desc: 'In collection' },
                    { value: 'Come back!', icon: '⏰', desc: 'Return later' },
                  ].map((status) => (
                    <div key={`status-${status.value}`} className="join-item">
                      <label
                        className={`
                          btn btn-sm justify-start gap-2 normal-case w-full
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
                          onChange={() => {
                            setFormData({ ...formData, status: status.value })
                          }}
                        />
                        <span className="text-lg">{status.icon}</span>
                        <span>{status.value}</span>
                        <span className="text-xs opacity-70">
                          {status.desc}
                        </span>
                      </label>
                    </div>
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

          {/* Platform Selection */}
          <div className="card bg-base-200 shadow-sm p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="card-title text-base-content text-lg">
                Platforms
              </h2>
              <span className="text-xs text-base-content/60">
                Select the platforms you own or plan to play this game on
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availablePlatforms.map((platform) => {
                const isSelected = formData.platforms.includes(platform.name)
                return (
                  <label
                    key={`platform-${platform.id}`}
                    className="cursor-pointer"
                  >
                    <span
                      className={`
                        btn btn-sm normal-case
                        ${
                          isSelected
                            ? 'btn-primary'
                            : 'btn-ghost border border-base-300'
                        }
                      `}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={isSelected}
                        onChange={(e) => {
                          const newPlatforms = e.target.checked
                            ? [...formData.platforms, platform.name]
                            : formData.platforms.filter(
                                (p) => p !== platform.name
                              )
                          setFormData({ ...formData, platforms: newPlatforms })
                        }}
                      />
                      {platform.name}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Mood Selection */}
          <div className="card bg-base-200 shadow-sm p-6 space-y-6">
            <h2 className="card-title text-base-content text-lg">Game Moods</h2>
            <p className="text-sm text-base-content/60">
              Select up to 5 moods that capture the emotional tone of this game.
            </p>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-base-content/70">
                  Moods
                </h3>
                <span className="text-xs text-base-content/60">
                  {selectedMoods.length} / 5 max
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableMoods.map((mood) => {
                  const isSelected = selectedMoods.includes(mood.id)
                  // Selected moods are never disabled, even if cap is reached
                  const disabled = selectedMoods.length >= 5 && !isSelected
                  return (
                    <div key={mood.id} className="relative group">
                      <label className="cursor-pointer">
                        <span
                          className={`
                            btn btn-sm normal-case px-4
                            ${
                              isSelected
                                ? 'btn-primary'
                                : disabled
                                ? 'opacity-50 cursor-not-allowed bg-base-200 text-base-content/40 border border-base-300'
                                : 'btn-ghost border border-base-300'
                            }
                          `}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={isSelected}
                            onChange={(e) => {
                              const newMoods = e.target.checked
                                ? [...selectedMoods, mood.id]
                                : selectedMoods.filter((id) => id !== mood.id)
                              handleMoodChange(newMoods)
                            }}
                            disabled={disabled}
                          />
                          {mood.name}
                        </span>
                      </label>
                      {mood.description && (
                        <div className="absolute z-50 hidden group-hover:block bg-base-300 text-base-content text-sm p-2 rounded shadow-lg max-w-xs top-full mt-2 left-0">
                          {mood.description}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Error and Success Messages */}
            {(error || imageError || success) && (
              <div
                className={`alert ${
                  error || imageError ? 'alert-error' : 'alert-success'
                } mb-2`}
              >
                {(error || imageError) && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current shrink-0 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
                {success && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current shrink-0 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
                <span>{error || imageError || success}</span>
              </div>
            )}

            {/* Action Buttons */}
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
                disabled={isLoading || !!imageError}
                title={
                  imageError
                    ? 'Please fix the image URL error before saving'
                    : undefined
                }
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
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={() => setShowModal(false)}></div>
    </div>
  )
}

export default EditGameModal
