import { useState, useEffect } from 'react'
import supabase from '../supabaseClient'
import { Game } from '../types'
import { getGameDetails, searchGames } from '../services/rawg'
import { RAWGPlatform, RAWGGenre } from '../types/rawg'

import { Mood, Platform } from '../types'

interface EditableGame extends Omit<Game, 'game_genres' | 'game_platforms' | 'game_moods' | 'genre' | 'user_id' | 'created_at' | 'updated_at'> {
  genres: string[]
  platforms: string[]
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
  console.log('EditGameModal props:', { game, userId, showModal })

  // Initialize form data when modal opens
  useEffect(() => {
    if (showModal) {
      console.log('Modal opened, setting initial form data:', game)
      setFormData({
        status: game.status || '',
        progress: game.progress || 0,
        title: game.title || '',
        genres: game.genres || [],
        image: game.image,
        moods: game.moods || [],
        platforms: game.platforms || []
      })
      // Also set initial platforms and moods
      setSelectedPlatforms(game.platforms || [])
      setOriginalPlatforms(game.platforms || [])
      setSelectedMoods(game.moods || [])
      setOriginalMoods(game.moods || [])
    }
  }, [showModal, game])

  const [formData, setFormData] = useState({
    status: game.status || '',
    progress: game.progress || 0,
    title: game.title || '',
    genres: game.genres || [],
    image: game.image,
    moods: game.moods || [],
    platforms: game.platforms || []
  })
  const [availablePlatforms, setAvailablePlatforms] = useState<Platform[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [originalPlatforms, setOriginalPlatforms] = useState<string[]>([])
  const [availableMoods, setAvailableMoods] = useState<Mood[]>([])
  const [selectedMoods, setSelectedMoods] = useState<string[]>([])
  const [originalMoods, setOriginalMoods] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoadingMoods, setIsLoadingMoods] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [isValidatingImage, setIsValidatingImage] = useState(false)
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null)
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
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.length === sortedB.length && sortedA.every((value, index) => value === sortedB[index]);
  };

  // Load available platforms for this game from RAWG
  useEffect(() => {
    const loadGamePlatforms = async () => {
      if (!showModal) return; // Only load when modal is shown
      console.log('Loading platforms for game:', game.title)
      console.log('Loading platforms, game:', game)
      console.log('Initial platforms:', game.platforms)
      if (!showModal) return; // Only load when modal is shown
      if (!game.id || !userId) return;

      try {
        // First get user's selected platforms
        const { data: userGame, error: userGameError } = await supabase
          .from('user_games')
          .select('platforms')
          .eq('game_id', game.id)
          .eq('user_id', userId)
          .single();

        if (userGameError) throw userGameError;
        if (userGame?.platforms) {
          console.log('Found user platforms:', userGame.platforms);
          setSelectedPlatforms(userGame.platforms);
          setOriginalPlatforms(userGame.platforms);
        } else {
          console.log('No user platforms found in user_games');
          // If no platforms in user_games, use the ones from the game object
          if (game.platforms && game.platforms.length > 0) {
            console.log('Using platforms from game object:', game.platforms);
            setSelectedPlatforms(game.platforms);
            setOriginalPlatforms(game.platforms);
          }
        }

        // Then get available platforms from RAWG
        let gameDetails;
        
        if (game.external_id) {
          gameDetails = await getGameDetails(Number(game.external_id))
        } else {
          const searchResults = await searchGames(game.title)
          
          // Find the most relevant match
          const exactMatch = searchResults.find(g => 
            g.name.toLowerCase() === game.title.toLowerCase()
          )
          const bestMatch = exactMatch || searchResults[0]
          
          if (bestMatch) {
            gameDetails = await getGameDetails(bestMatch.id)
          }
        }

        if (!gameDetails?.platforms) {
          return
        }

        // Get the platform names from RAWG
        const rawgPlatformNames = gameDetails.platforms.map(p => p.platform.name)

        // Get all platform mappings
        const { data: allMappings, error: allMappingsError } = await supabase
          .from('rawg_platform_mappings')
          .select('rawg_name, platform_id')
        
        if (allMappingsError) {
          console.error('Error fetching all mappings:', allMappingsError)
          return
        }

        // Find which RAWG platforms we have mappings for using normalized comparison
        const mappedPlatforms = rawgPlatformNames.filter(name => {
          const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '')
          return allMappings?.some(mapping => 
            mapping.rawg_name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized
          )
        })

        if (mappedPlatforms.length === 0) {
          // If no mappings found, let's at least show the platform from the game data
          const { data: platforms, error: platformsError } = await supabase
            .from('platforms')
            .select('*')
            .order('name')

          if (!platformsError && platforms) {
            // Find platforms that match the RAWG names (case-insensitive, ignore spaces)
            const matchingPlatforms = platforms.filter(p => 
              rawgPlatformNames.some(rawgName => 
                p.name.toLowerCase().replace(/[^a-z0-9]/g, '') === 
                rawgName.toLowerCase().replace(/[^a-z0-9]/g, '')
              )
            )
            
            if (matchingPlatforms.length > 0) {
              setAvailablePlatforms(matchingPlatforms)
              return
            }
          }
          return
        }

        // Get the corresponding platform records from our database
        const { data: platformMappings, error: mappingError } = await supabase
          .from('rawg_platform_mappings')
          .select('platform_id, rawg_name')
          .in('rawg_name', mappedPlatforms)

        if (mappingError) {
          console.error('Error fetching platform mappings:', mappingError)
          return
        }

        if (!platformMappings || platformMappings.length === 0) {
          return
        }

        if (platformMappings && platformMappings.length > 0) {
          // Get the actual platform records
          const platformIds = platformMappings.map(m => m.platform_id)

          const { data: platforms, error: platformsError } = await supabase
            .from('platforms')
            .select('*')
            .in('id', platformIds)
            .order('name')

          if (platformsError) {
            console.error('Error loading platforms:', platformsError)
            return
          }

          if (platforms && platforms.length > 0) {
            setAvailablePlatforms(platforms)
          }
        }
      } catch (error) {
        console.error('Error in loadGamePlatforms:', error)
      }
    }

    loadGamePlatforms()
  }, [game.rawg_id, game.title])

  // Load available moods from Supabase
  useEffect(() => {
    const loadMoods = async () => {
      if (!showModal) return; // Only load when modal is shown
      console.log('Loading moods for game:', game.title)
      console.log('Loading moods for game:', game)
      console.log('Initial moods:', game.moods)
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
  }, [showModal, game.id, userId])

  // Load game's existing moods when modal opens
  useEffect(() => {
    let mounted = true;
    
    const loadGameMoods = async () => {
      if (!showModal || !mounted) return;
      
      // Reset states first
      setSelectedMoods([]);
      setOriginalMoods([]);
      // Don't try to load moods if we don't have both game.id and userId
      if (!game.id || !userId) {
        return;
      }
      try {
  
        const { data: gameMoods, error } = await supabase
          .from('game_moods')
          .select('mood_id')
          .eq('game_id', game.id)
          .eq('user_id', userId);

        if (error) throw error;
        if (gameMoods) {
          if (mounted) {
            const moodIds = gameMoods.map(gm => gm.mood_id);

            setSelectedMoods(moodIds);
            setOriginalMoods(moodIds);
          }
        } else {
          // No moods found, reset to empty if modal is open
          if (showModal) {

            setSelectedMoods([]);
            setOriginalMoods([]);
          }
        }
      } catch (error) {
        setError('Failed to load game moods. Please try again.');
      }
    }

    if (game.id && showModal) {
      loadGameMoods();
    }
    
    return () => {
      mounted = false;
    };
  }, [game.id, userId, showModal])



  useEffect(() => {
    const loadRawgData = async () => {
      if (!showModal) return; // Only load when modal is shown
      
      if (game.external_id) {
        try {
          const gameDetails = await getGameDetails(Number(game.external_id))
          if (gameDetails) {
            // Update form data with RAWG data while preserving user's status and progress
            setFormData((prev) => ({
              ...prev,
              title: gameDetails.name,
              genres: gameDetails.genres.map((g: RAWGGenre) => g.name), // Set genres from RAWG
              image: gameDetails.image || undefined,
            }))
          }
        } catch (error) {
          setError('Failed to load game details. Please try again.');
        }
      }
    }
    loadRawgData()
  }, [game.rawg_id])

  const handleMoodChange = (moods: string[]) => {
    setSelectedMoods(moods);
  };


  const validateImageUrl = async (url: string, isSubmit: boolean = false): Promise<boolean> => {
    // Clear any existing validation timeout
    if (validationTimeout) {
      clearTimeout(validationTimeout);
      setValidationTimeout(null);
    }
    if (!url) return true; // Empty URL is valid (optional field)
    
    // Basic URL format validation
    try {
      new URL(url);
    } catch {
      setImageError('Please enter a valid URL');
      return false;
    }

    // Check if image can be loaded in the browser
    try {
      setIsValidatingImage(true);
      
      const result = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
      });

      if (!result) {
        setImageError('Could not load image from URL');
        return false;
      }
    } catch (err) {
      setImageError('Failed to validate image URL');
      return false;
    } finally {
      setIsValidatingImage(false);
    }

    setImageError(null);
    return true;
  };

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
        const isValidImage = await validateImageUrl(formData.image, true);
        if (!isValidImage) {
          setIsLoading(false);
          return;
        }
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
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
          platforms: formData.platforms, // Keep this for backward compatibility
          image: formData.image,
          updated_at: new Date().toISOString()
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
          throw new Error('Failed to fetch platform information. Please try again.')
        }

        // Insert new platform relationships
        if (platformData && platformData.length > 0) {
          const platformRelations = platformData.map(platform => ({
            game_id: game.id,
            platform_id: platform.id,
            created_at: new Date().toISOString()
          }))

          const { error: insertPlatformsError } = await supabase
            .from('game_platforms')
            .insert(platformRelations)

          if (insertPlatformsError) {
            console.error('Error inserting platforms:', insertPlatformsError)
            throw new Error('Failed to save new game platforms. Please try again.')
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
            updated_at: new Date().toISOString()
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

            if (insertError) {
              console.error('Error inserting moods:', insertError)
              throw new Error('Failed to save new game moods. Please try again.')
            }
          }

          // Verify mood updates
          const { data: newMoods, error: moodsError } = await supabase
            .from('game_moods')
            .select('mood_id')
            .eq('game_id', game.id)

          if (moodsError) {
            console.error('Error verifying moods:', moodsError)
            throw new Error('Failed to verify mood updates. Please check your library.')
          }

          setSelectedMoods(newMoods ? newMoods.map(m => m.mood_id) : [])
        } catch (moodError) {
          // If mood update fails, we should roll back the game status update
          const { error: rollbackError } = await supabase
            .from('user_games')
            .update({
              status: originalFormState.status,
              progress: originalFormState.progress,
              platforms: originalFormState.platforms,
              updated_at: new Date().toISOString()
            })
            .eq('game_id', game.id)
            .eq('user_id', userId)

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
      setError(error instanceof Error ? error.message : 'Failed to update game. Please try again.')
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
        <h3 className="font-bold text-xl mb-6 text-base-content">Edit Game Progress</h3>

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

          {/* Custom Image Section */}
          <div className="card bg-base-200 shadow-sm p-6 space-y-6">
            <h2 className="card-title text-base-content text-lg">Custom Cover Image</h2>
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <label htmlFor="image" className="text-sm font-medium text-base-content">
                  Custom Cover Image URL (optional)
                </label>
                <input
                  type="text"
                  id="image"
                  name="image"
                  value={formData.image || ''}
                  onChange={(e) => {
                    const newUrl = e.target.value;
                    setFormData({ ...formData, image: newUrl });
                    
                    // Clear any existing timeout
                    if (validationTimeout) {
                      clearTimeout(validationTimeout);
                    }
                    
                    if (newUrl) {
                      // Set a new timeout for validation
                      const timeout = setTimeout(() => {
                        validateImageUrl(newUrl);
                      }, 500); // 500ms debounce
                      setValidationTimeout(timeout);
                    } else {
                      setImageError(null);
                      setIsValidatingImage(false);
                    }
                  }}
                  placeholder="Enter a URL for a custom cover image"
                  className={`input input-bordered w-full ${imageError ? 'input-error' : ''}`}
                  disabled={isValidatingImage}
                />
                {isValidatingImage && (
                  <div className="text-sm text-base-content/70">
                    Validating image URL...
                  </div>
                )}
                {imageError && (
                  <div className="text-sm text-error">
                    {imageError}
                  </div>
                )}
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
                        onChange={() => {
                           setFormData({ ...formData, status: status.value });
                         }}
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

          {/* Platform Selection */}
          <div className="card bg-base-200 shadow-sm p-6 space-y-6">
            <h2 className="card-title text-base-content text-lg">Platforms</h2>
            <div className="flex flex-wrap gap-2">
              {availablePlatforms.map((platform) => {
                const isSelected = formData.platforms.includes(platform.name)
                return (
                  <label
                    key={platform.id}
                    className="cursor-pointer"
                  >
                    <span
                      className={`
                        btn btn-sm normal-case
                        ${isSelected ? 'btn-primary' : 'btn-ghost border border-base-300'}
                      `}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={isSelected}
                        onChange={(e) => {
                          const newPlatforms = e.target.checked
                            ? [...formData.platforms, platform.name]
                            : formData.platforms.filter(p => p !== platform.name)
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

          <div className="space-y-4">
            {/* Error and Success Messages */}
            {(error || imageError || success) && (
              <div className={`alert ${error || imageError ? 'alert-error' : 'alert-success'} mb-2`}>
                {(error || imageError) && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {success && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                title={imageError ? 'Please fix the image URL error before saving' : undefined}
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
