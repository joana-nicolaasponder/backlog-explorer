import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import supabase from '../supabaseClient'
import { Game, GameNote, RawgGameDetails } from '../types'
import EditGameModal from '../components/EditGameModal'
import ExpandableText from '../components/ExpandableText'
import imageCompression from 'browser-image-compression'
import { gameService } from '../services/gameService'

const GameDetails = () => {
  const { id } = useParams()
  const [userId, setUserId] = useState<string>('')
  const [game, setGame] = useState<Game | null>(null)
  const [notes, setNotes] = useState<GameNote[]>([])
  const [rawgDetails, setRawgDetails] = useState<RawgGameDetails | null>(null)
  const [details, setDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAddNote, setShowAddNote] = useState(false)
  const [editingNote, setEditingNote] = useState<GameNote | null>(null)

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    getCurrentUser()
  }, [])
  const [noteForm, setNoteForm] = useState<Partial<GameNote>>({
    content: '',
    play_session_date: null,
    duration: null,
    accomplishments: [],
    mood: null,
    next_session_plan: {
      intent: null,
      note: null,
    },
    is_completion_entry: false,
    completion_date: null,
    screenshots: [],
  })
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false)
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(
    null
  )
  const [showEditModal, setShowEditModal] = useState(false)

  const migrateToIGDB = async (game: Game) => {
    try {
      // Search for game in IGDB
      const searchResult = await gameService.searchGames(game.title)
      if (searchResult.results.length === 0) return null

      const igdbGame = searchResult.results[0]
      console.log('Found IGDB match:', igdbGame)

      // Instead of updating the existing game, we need to:
      // 1. Check if a game with this IGDB ID already exists
      const { data: existingIgdbGame, error: checkError } = await supabase
        .from('games')
        .select('*')
        .eq('provider', 'igdb')
        .eq('igdb_id', igdbGame.id)
        .maybeSingle()

      if (checkError) {
        console.error('Error checking for existing IGDB game:', checkError)
        return null
      }

      let targetGameId

      if (existingIgdbGame) {
        // If the IGDB game already exists, we'll use that one
        targetGameId = existingIgdbGame.id
        console.log(
          'Found existing IGDB game, will use that instead of migrating'
        )
      } else {
        // Otherwise, create a new game with IGDB data
        const gameData = {
          provider: 'igdb',
          igdb_id: igdbGame.id,
          title: igdbGame.name || game.title,
          description: igdbGame.summary || game.description,
          metacritic_rating: igdbGame.metacritic || game.metacritic_rating,
          release_date: igdbGame.released || game.release_date,
          background_image: igdbGame.background_image || game.background_image,
          created_at: new Date().toISOString(),
        }

        // Use upsert to handle potential race conditions
        const { data: newIgdbGame, error: insertError } = await supabase
          .from('games')
          .upsert([gameData], { onConflict: 'igdb_id,provider' })
          .select()
          .single()

        if (insertError) {
          console.error('Error inserting new IGDB game:', insertError)
          return null
        }

        targetGameId = newIgdbGame.id
        console.log('Created new IGDB game')
      }

      // Now we need to update the user_games relationship
      // First, get all user_game records for this game
      const { data: userGames, error: userGamesError } = await supabase
        .from('user_games')
        .select('*')
        .eq('game_id', game.id)

      if (userGamesError) {
        console.error('Error fetching user_games:', userGamesError)
        return null
      }

      if (userGames && userGames.length > 0) {
        console.log(`Found ${userGames.length} user_games entries to update`)

        // Process each user_game entry
        for (const userGame of userGames) {
          // Check if the user already has this IGDB game
          const { data: existingUserIgdbGame, error: checkExistingError } =
            await supabase
              .from('user_games')
              .select('id')
              .eq('user_id', userGame.user_id)
              .eq('game_id', targetGameId)
              .maybeSingle()

          if (checkExistingError) {
            console.error(
              'Error checking if user already has IGDB game:',
              checkExistingError
            )
            continue
          }

          if (existingUserIgdbGame) {
            // User already has this IGDB game, delete the Steam version
            console.log(
              `User ${userGame.user_id} already has IGDB game ${targetGameId}, deleting Steam version`
            )
            const { error: deleteError } = await supabase
              .from('user_games')
              .delete()
              .eq('id', userGame.id)

            if (deleteError) {
              console.error(
                'Error deleting duplicate user_game entry:',
                deleteError
              )
            }
          } else {
            // Create a new user_game record with the IGDB game
            const newUserGame = {
              user_id: userGame.user_id,
              game_id: targetGameId,
              status: userGame.status,
              progress: userGame.progress,
              platforms: userGame.platforms,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              steam_appid: userGame.steam_appid,
              steam_playtime: userGame.steam_playtime,
              steam_achievements: userGame.steam_achievements,
              steam_total_achievements: userGame.steam_total_achievements,
              steam_dlc: userGame.steam_dlc,
              steam_total_dlc: userGame.steam_total_dlc,
              last_steam_sync: userGame.last_steam_sync,
              steam_review_score: userGame.steam_review_score,
              steam_total_positive: userGame.steam_total_positive,
              steam_total_negative: userGame.steam_total_negative,
              steam_total_reviews: userGame.steam_total_reviews,
              steam_review_score_desc: userGame.steam_review_score_desc,
              image: userGame.image,
            }

            const { error: insertError } = await supabase
              .from('user_games')
              .insert(newUserGame)

            if (insertError) {
              console.error('Error creating new user_game:', insertError)
              continue
            }

            // Delete the old Steam game entry
            const { error: deleteError } = await supabase
              .from('user_games')
              .delete()
              .eq('id', userGame.id)

            if (deleteError) {
              console.error('Error deleting old user_game entry:', deleteError)
            }
          }
        }
      } else {
        console.log('No user_games entries found for this game')
      }

      // Handle genres if available
      if (igdbGame.genres && igdbGame.genres.length > 0) {
        console.log(`Adding ${igdbGame.genres.length} genres for ${game.title}`)

        try {
          // Prepare genre data for upsert
          const genresToUpsert = igdbGame.genres.map((g) => ({
            name: g.name,
            // Add any other required fields with default values
            created_at: new Date().toISOString(),
          }))

          // Upsert genres to handle potential conflicts
          const { error: upsertError } = await supabase
            .from('genres')
            .upsert(genresToUpsert, {
              onConflict: 'name',
              ignoreDuplicates: true,
            })

          if (upsertError) {
            console.error('Error upserting genres:', upsertError)
          }

          // Get all genre IDs based on names
          const { data: allGenres, error: allGenresError } = await supabase
            .from('genres')
            .select('id, name')
            .in(
              'name',
              igdbGame.genres.map((g) => g.name)
            )

          if (allGenresError) {
            console.error('Error fetching all genres:', allGenresError)
          } else if (allGenres && allGenres.length > 0) {
            console.log(`Found ${allGenres.length} genres for association`)

            // First check for existing game_genres associations to avoid duplicates
            const { data: existingAssociations, error: checkAssocError } =
              await supabase
                .from('game_genres')
                .select('genre_id')
                .eq('game_id', targetGameId)

            if (checkAssocError) {
              console.error(
                'Error checking existing game_genres associations:',
                checkAssocError
              )
            }

            // Create a set of existing genre IDs for this game
            const existingGenreIds = new Set(
              existingAssociations?.map((assoc) => assoc.genre_id) || []
            )

            // Filter out genres that are already associated with this game
            const newGameGenres = allGenres
              .filter((genre) => !existingGenreIds.has(genre.id))
              .map((genre) => ({
                game_id: targetGameId,
                genre_id: genre.id,
                created_at: new Date().toISOString(),
              }))

            if (newGameGenres.length > 0) {
              // Insert new game_genres associations
              const { error: gameGenresError } = await supabase
                .from('game_genres')
                .insert(newGameGenres)

              if (gameGenresError) {
                console.error('Error inserting game_genres:', gameGenresError)
              } else {
                console.log(
                  `Successfully added ${newGameGenres.length} genres for ${game.title}`
                )
              }
            } else {
              console.log('No new genres to associate with this game')
            }
          } else {
            console.log('No genres found for association')
          }
        } catch (genreError) {
          console.error('Error in genre processing:', genreError)
        }
      }

      // Fetch the newly created/existing IGDB game to return it
      const { data: newGame, error: fetchNewGameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', targetGameId)
        .single()

      if (fetchNewGameError) {
        console.error('Error fetching new IGDB game:', fetchNewGameError)
        return null
      }

      // First, get the user_games entries for the Steam game to preserve their data
      const { data: steamUserGames, error: fetchUserGamesError } =
        await supabase.from('user_games').select('*').eq('game_id', game.id)

      if (fetchUserGamesError) {
        console.error(
          'Error fetching user_games for the Steam game:',
          fetchUserGamesError
        )
        // Continue anyway, but we won't be able to preserve user data
      }

      if (steamUserGames && steamUserGames.length > 0) {
        console.log(
          `Found ${steamUserGames.length} user_games entries to update`
        )

        // For each user_game entry, update it to point to the IGDB game while preserving other data
        for (const userGame of steamUserGames) {
          // Check if this user already has the IGDB game
          const { data: existingIgdbUserGame, error: checkExistingError } =
            await supabase
              .from('user_games')
              .select('*')
              .eq('user_id', userGame.user_id)
              .eq('game_id', targetGameId)
              .maybeSingle()

          if (checkExistingError) {
            console.error(
              'Error checking if user already has IGDB game:',
              checkExistingError
            )
            continue
          }

          if (existingIgdbUserGame) {
            // User already has this IGDB game - update platforms if Steam isn't included
            const currentPlatforms = existingIgdbUserGame.platforms || []
            const steamPlatform = 'Steam'

            if (!currentPlatforms.includes(steamPlatform)) {
              // Add Steam to platforms and update
              // Make sure to include user_id in the query to satisfy RLS policies
              const { error: updatePlatformsError } = await supabase
                .from('user_games')
                .update({
                  platforms: [...currentPlatforms, steamPlatform],
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingIgdbUserGame.id)
                .eq('user_id', userGame.user_id)

              if (updatePlatformsError) {
                console.error(
                  'Error updating platforms for existing IGDB user_game:',
                  updatePlatformsError
                )
              } else {
                console.log(
                  `Updated platforms for existing IGDB game for user ${userGame.user_id}`
                )
              }
            } else {
              console.log(
                `User ${userGame.user_id} already has IGDB game with Steam platform`
              )
            }

            // Delete the Steam user_game entry as it's now redundant
            // Include user_id in the query to satisfy RLS policies
            const { error: deleteError } = await supabase
              .from('user_games')
              .delete()
              .eq('id', userGame.id)
              .eq('user_id', userGame.user_id)

            if (deleteError) {
              console.error(
                'Error deleting redundant Steam user_game entry:',
                deleteError
              )
            } else {
              console.log(
                `Deleted redundant Steam user_game entry for user ${userGame.user_id}`
              )
            }
          } else {
            // User doesn't have the IGDB game yet - update the Steam entry to point to IGDB game
            // Include user_id in the query to satisfy RLS policies
            const { error: updateUserGameError } = await supabase
              .from('user_games')
              .update({
                game_id: targetGameId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', userGame.id)
              .eq('user_id', userGame.user_id)

            if (updateUserGameError) {
              console.error(
                `Error updating user_game for user ${userGame.user_id}:`,
                updateUserGameError
              )
            } else {
              console.log(
                `Successfully updated user_game for user ${userGame.user_id} to IGDB game`
              )
            }
          }
        }
      } else {
        console.log('No user_games entries found for the Steam game')
      }

      console.log('Successfully migrated to IGDB game:', newGame)
      return newGame
    } catch (error) {
      console.error('Error in IGDB migration:', error)
      return null
    }
  }

  const fetchGameDetails = async (game: Game) => {
    if (!game) return

    // Check if this is a Steam game (igdb_id is a Steam app ID)
    const isSteamGame =
      game.provider === 'steam' ||
      (game.igdb_id &&
        /^\d+$/.test(game.igdb_id.toString()) &&
        game.igdb_id.toString().length >= 5)

    // If it's an IGDB game, fetch details from IGDB
    if (game.provider === 'igdb' && game.igdb_id) {
      try {
        const [gameDetails, screenshots] = await Promise.all([
          gameService.getGameDetails(game.igdb_id.toString()),
          gameService.getGameScreenshots(game.igdb_id.toString()),
        ])

        setDetails(gameDetails)
        const rawgDetails = {
          description_raw: gameDetails.summary || '',
          metacritic: gameDetails.aggregated_rating || 0,
          playtime: 0,
          background_image: gameDetails.background_image || '',
          screenshots: screenshots.map((url) => ({ image: url })),
        }

        setRawgDetails(rawgDetails)
      } catch (error) {
        console.error('Error fetching IGDB details:', error)
      }
      return
    }

    // Handle Steam games - try to migrate to IGDB
    if (isSteamGame || game.provider === 'steam') {
      try {
        console.log('Migrating Steam game to IGDB:', game.title)

        // First, set the existing Steam data as a fallback
        const steamDetails = {
          description_raw: game.description || '',
          metacritic: game.metacritic_rating || 0,
          playtime: 0,
          background_image: game.background_image || '',
          screenshots: [],
        }
        setRawgDetails(steamDetails)

        // Try to migrate the game to IGDB
        const migratedGame = await migrateToIGDB(game)
        if (migratedGame) {
          console.log('Successfully migrated Steam game to IGDB')

          // Option 1: Redirect to the new IGDB game page
          window.location.href = `/app/game/${migratedGame.id}`
          return

          /* Option 2: Update the current page with the migrated game data
          setGame(migratedGame);
          
          // Fetch details for the newly migrated IGDB game
          try {
            const [gameDetails, screenshots] = await Promise.all([
              gameService.getGameDetails(migratedGame.igdb_id.toString()),
              gameService.getGameScreenshots(migratedGame.igdb_id.toString()),
            ])

            setDetails(gameDetails);
            const rawgDetails = {
              description_raw: gameDetails.summary || '',
              metacritic: gameDetails.aggregated_rating || 0,
              playtime: 0,
              background_image: gameDetails.background_image || '',
              screenshots: screenshots.map((url) => ({ image: url })),
            }

            setRawgDetails(rawgDetails);
          } catch (detailsError) {
            console.error('Error fetching IGDB details after migration:', detailsError);
          }
          */
        } else {
          console.log('Could not migrate Steam game to IGDB, using Steam data')
        }
      } catch (error) {
        console.error('Error migrating Steam game to IGDB:', error)
      }
      return
    }

    // Try to migrate RAWG game to IGDB
    if (game.provider === 'rawg') {
      const migratedGame = await migrateToIGDB(game)
      if (migratedGame) {
        setGame(migratedGame)
        // Fetch details for the newly migrated IGDB game
        await fetchGameDetails(migratedGame)
        return
      }
    }

    // Fallback to RAWG if migration failed or for legacy support
    try {
      const apiKey = import.meta.env.VITE_RAWG_API_KEY
      // Search for the game first
      const searchResponse = await fetch(
        `https://api.rawg.io/api/games?search=${encodeURIComponent(
          game.title
        )}&key=${apiKey}`
      )
      const searchData = await searchResponse.json()

      if (searchData.results && searchData.results.length > 0) {
        const gameId = searchData.results[0].id
        // Get detailed game information
        const detailsResponse = await fetch(
          `https://api.rawg.io/api/games/${gameId}?key=${apiKey}`
        )
        const gameDetails = await detailsResponse.json()

        // Get screenshots
        const screenshotsResponse = await fetch(
          `https://api.rawg.io/api/games/${gameId}/screenshots?key=${apiKey}`
        )
        const screenshotsData = await screenshotsResponse.json()

        setRawgDetails({
          description_raw: gameDetails.description_raw,
          metacritic: gameDetails.metacritic,
          playtime: gameDetails.playtime,
          background_image: gameDetails.background_image,
          screenshots: screenshotsData.results || [],
        })
      }
    } catch (error) {
      console.error('Error fetching RAWG details:', error)
    }
  }

  const fetchGameAndNotes = async () => {
    try {
      if (!userId) {
        console.error('No user ID found')
        return
      }

      // Fetch game details and user-specific data
      const { data: userGameData, error: gameError } = await supabase
        .from('user_games')
        .select(
          `
          id,
          status,
          progress,
          platforms,
          image,
          game:games!user_games_game_id_fkey (
            id,
            title,
            igdb_id,
            provider,
            metacritic_rating,
            release_date,
            background_image,
            description,
            game_moods (moods (*))
          )
        `
        )
        .eq('user_id', userId)
        .eq('game_id', id)
        .single()

      if (gameError) {
        console.error('Error fetching game:', gameError)
        return
      }

      if (!userGameData) {
        console.error('Game not found')
        return
      }

      const gameData = {
        id: userGameData.game.id,
        title: userGameData.game.title,
        status: userGameData.status,
        progress: userGameData.progress,
        provider: userGameData.game.provider || 'rawg',
        igdb_id: userGameData.game.igdb_id || 0,
        metacritic_rating: userGameData.game.metacritic_rating,
        release_date: userGameData.game.release_date,
        // Use custom image if available, otherwise fall back to game's background image
        background_image:
          userGameData.image || userGameData.game.background_image,
        description: userGameData.game.description,
        platforms: userGameData.platforms || [],
        genres: [],
        image: userGameData.image || userGameData.game.background_image,
      }

      setGame(gameData)

      // Fetch additional details from external provider
      if (userGameData.game) {
        fetchGameDetails(userGameData.game)
      }

      // Fetch game notes
      const { data: notesData, error: notesError } = await supabase
        .from('game_notes')
        .select('*')
        .eq('game_id', id)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (notesError) throw notesError
      setNotes(notesData || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      fetchGameAndNotes()
    }
  }, [id, userId])

  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB in bytes
  const MAX_FILES_PER_NOTE = 6 // Reasonable limit per note

  const compressImage = async (file: File) => {
    const options = {
      maxSizeMB: 1, // Max file size of 1MB
      maxWidthOrHeight: 1920, // Max width/height of 1920px
      useWebWorker: true, // Use web worker for better performance
      fileType: file.type, // Maintain original file type
      initialQuality: 0.8, // Initial quality (0.8 is a good balance)
    }

    try {
      // Show compression progress
      const progress = document.createElement('div')
      progress.className =
        'fixed bottom-4 right-4 bg-base-200 p-4 rounded-lg shadow-lg'
      progress.innerHTML = `Compressing ${file.name}...`
      document.body.appendChild(progress)

      const compressedFile = await imageCompression(file, options)
      document.body.removeChild(progress)

      // Log compression results

      //   originalSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      //   compressedSize: `${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
      //   ratio: `${((1 - compressedFile.size / file.size) * 100).toFixed(
      //     1
      //   )}% reduction`,
      // })

      return compressedFile
    } catch (error) {
      console.error('Error compressing image:', error)
      throw error
    }
  }

  const uploadScreenshot = async (file: File) => {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error(
          `Invalid file type: ${file.name}. Only images are allowed.`
        )
      }

      // Compress image before size check
      const compressedFile = await compressImage(file)

      // Validate compressed file size
      if (compressedFile.size > MAX_FILE_SIZE) {
        throw new Error(`File still too large after compression: ${file.name}`)
      }

      const { data: userData } = await supabase.auth.getUser()
      const user_id = userData.user?.id

      // Create a unique file path
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()
        .toString(36)
        .substring(2)}${Date.now()}.${fileExt}`
      const filePath = `${user_id}/${id}/${fileName}`

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('game-screenshots')
        .upload(filePath, compressedFile)

      if (uploadError) throw uploadError

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('game-screenshots').getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading screenshot:', error)
      throw error
    }
  }

  const handleScreenshotUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    try {
      // Check total number of files
      const currentCount = noteForm.screenshots?.length || 0
      if (currentCount + files.length > MAX_FILES_PER_NOTE) {
        alert(
          `You can only add up to ${MAX_FILES_PER_NOTE} screenshots per note. Please select fewer files.`
        )
        return
      }

      // Upload files
      const uploadPromises = Array.from(files).map((file) =>
        uploadScreenshot(file)
      )
      const results = await Promise.allSettled(uploadPromises)

      // Filter successful uploads and handle errors
      const successfulUrls = results
        .filter(
          (result): result is PromiseFulfilledResult<string> =>
            result.status === 'fulfilled'
        )
        .map((result) => result.value)

      const errors = results
        .filter(
          (result): result is PromiseRejectedResult =>
            result.status === 'rejected'
        )
        .map((result) => result.reason)

      if (errors.length > 0) {
        alert(
          `Some files failed to upload:\n${errors
            .map((e) => e.message)
            .join('\n')}`
        )
      }

      if (successfulUrls.length > 0) {
        setNoteForm((prev) => ({
          ...prev,
          screenshots: [...(prev.screenshots || []), ...successfulUrls],
        }))
      }
    } catch (error) {
      console.error('Error handling screenshots:', error)
      alert('Error uploading screenshots. Please try again.')
    }
  }

  const removeScreenshot = (index: number) => {
    setNoteForm((prev) => ({
      ...prev,
      screenshots: prev.screenshots?.filter((_, i) => i !== index) || [],
    }))
  }

  const addNote = async () => {
    if (!noteForm.content?.trim() || !game) return

    try {
      const { data: userData } = await supabase.auth.getUser()
      const user_id = userData.user?.id

      // The ID from the URL is actually the game ID
      // Prepare note data with required fields
      const noteData = {
        ...noteForm,
        game_id: id, // Use the game ID directly from the URL
        user_id,
        // Ensure all required fields have default values
        play_session_date: noteForm.play_session_date || null,
        duration: noteForm.duration || null,
        accomplishments: noteForm.accomplishments || [],
        mood: noteForm.mood || null,
        next_session_plan: noteForm.next_session_plan || {
          intent: null,
          note: null,
        },
        is_completion_entry: noteForm.is_completion_entry || false,
        completion_date: noteForm.completion_date || null,
        screenshots: noteForm.screenshots || [],
      }

      // Insert note
      const { error: noteError } = await supabase
        .from('game_notes')
        .insert([noteData])

      if (noteError) throw noteError

      // If this is a completion entry, update the game's progress to 100%
      if (noteForm.is_completion_entry) {
        const { error: updateError } = await supabase
          .from('user_games')
          .update({
            progress: 100,
            status: 'Done',
          })
          .eq('game_id', id)
          .eq('user_id', user_id)

        if (updateError) {
          console.error('Error updating game progress:', updateError)
        }
      }

      // Refresh game and notes
      fetchGameAndNotes()

      // Reset form
      setNoteForm({
        content: '',
        play_session_date: null,
        duration: null,
        accomplishments: [],
        mood: null,
        next_session_plan: {
          intent: null,
          note: null,
        },
        is_completion_entry: false,
        completion_date: null,
      })
      setShowAddNote(false)
    } catch (error) {
      console.error('Error adding note:', error)
    }
  }

  const deleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return

    try {
      const { error } = await supabase
        .from('game_notes')
        .delete()
        .eq('id', noteId)

      if (error) throw error

      // Refresh notes
      fetchGameAndNotes()
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  const _startEditingNote = (note: GameNote) => {
    setEditingNote(note)
    setNoteForm({
      content: note.content,
      play_session_date: note.play_session_date,
      duration: note.duration,
      accomplishments: note.accomplishments || [],
      mood: note.mood,
      next_session_plan: note.next_session_plan || { intent: null, note: null },
      is_completion_entry: note.is_completion_entry,
      completion_date: note.completion_date,
    })
    setShowAddNote(true)
  }

  const updateNote = async () => {
    if (!noteForm.content?.trim() || !editingNote) return

    try {
      const { data: userData } = await supabase.auth.getUser()
      const user_id = userData.user?.id

      const { error: noteError } = await supabase
        .from('game_notes')
        .update({
          ...noteForm,
          user_id,
        })
        .eq('id', editingNote.id)

      if (noteError) throw noteError

      // Refresh notes and reset form
      fetchGameAndNotes()
      setNoteForm({
        content: '',
        play_session_date: null,
        duration: null,
        accomplishments: [],
        mood: null,
        next_session_plan: {
          intent: null,
          note: null,
        },
        is_completion_entry: false,
        completion_date: null,
      })
      setEditingNote(null)
      setShowAddNote(false)
    } catch (error) {
      console.error('Error updating note:', error)
    }
  }

  const updateProgress = async (newProgress: number) => {
    if (!game) return
    setIsUpdatingProgress(true)

    try {
      const { data: userData } = await supabase.auth.getUser()
      const user_id = userData.user?.id

      const { error } = await supabase
        .from('user_games')
        .update({
          progress: newProgress,
          status: newProgress === 100 ? 'Done' : game.status,
        })
        .eq('game_id', game.id)
        .eq('user_id', user_id)

      if (error) throw error

      // Update local state
      setGame((prev) =>
        prev
          ? {
              ...prev,
              progress: newProgress,
              status: newProgress === 100 ? 'Done' : prev.status,
            }
          : null
      )
    } catch (error) {
      console.error('Error updating progress:', error)
    } finally {
      setIsUpdatingProgress(false)
    }
  }

  const getMoodEmoji = (mood: GameNote['mood']) => {
    const emojiMap = {
      Amazing: '🤩',
      Great: '😊',
      Good: '🙂',
      Relaxing: '😌',
      Mixed: '🤔',
      Frustrating: '😤',
      Meh: '😕',
      Regret: '😫',
      // Legacy values
      Excited: '🤩',
      Satisfied: '😊',
      Confused: '🤔',
      Nostalgic: '🥹',
      Impressed: '😯',
      Disappointed: '😕',
    }
    return mood ? emojiMap[mood] || '' : ''
  }

  const getRatingStars = (rating: number | null) => {
    if (!rating) return null
    return '⭐'.repeat(rating)
  }

  const _formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (minutes: number | null): string => {
    if (!minutes) return ''
    const totalSeconds = minutes * 60
    const hours = Math.floor(totalSeconds / 3600)
    const remainingMinutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m ${seconds}s`
    } else if (remainingMinutes > 0) {
      return `${remainingMinutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  if (loading) {
    return <div className="p-4">Loading...</div>
  }

  if (!game) {
    return <div className="p-4">Game not found</div>
  }

  return (
    <div className="p-2 sm:p-4 max-w-4xl mx-auto">
      {/* Game Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold">{game.title}</h1>
          <button
            onClick={() => setShowEditModal(true)}
            className="btn btn-ghost btn-sm"
          >
            Edit
          </button>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-4 text-sm">
          {/* <span className="badge badge-primary">{game.rawg_id}</span>
          <span className="badge badge-secondary">{game.metacritic_rating}</span> */}
          <span className="badge badge-accent">{game.status}</span>
        </div>
      </div>

      {/* Progress Tracking */}
      <div className="space-y-4 mb-8">
        <div className="card bg-base-200">
          <div className="card-body py-3 px-3 sm:py-4 sm:px-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm font-medium">{game.progress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={game.progress}
                  className="range range-primary range-sm"
                  step="5"
                  onChange={(e) => updateProgress(parseInt(e.target.value))}
                />
                <div className="w-full flex justify-between text-xs px-1 mt-1">
                  <span>|</span>
                  <span>|</span>
                  <span>|</span>
                  <span>|</span>
                  <span>|</span>
                </div>
              </div>
              {isUpdatingProgress && (
                <div className="loading loading-spinner loading-xs"></div>
              )}
            </div>
          </div>
        </div>

        {/* Time to Beat */}
        {details?.time_to_beat && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium px-1">Time to Beat</h3>
            <div className="stats stats-vertical lg:stats-horizontal shadow bg-base-200 w-full">
              {details.time_to_beat.hastily && (
                <div className="stat place-items-center">
                  <div className="stat-title text-xs">Quick Play</div>
                  <div className="stat-value text-2xl">
                    {Math.round(details.time_to_beat.hastily / 3600)}h
                  </div>
                </div>
              )}
              {details.time_to_beat.normally && (
                <div className="stat place-items-center">
                  <div className="stat-title text-xs">Main Story</div>
                  <div className="stat-value text-2xl">
                    {Math.round(details.time_to_beat.normally / 3600)}h
                  </div>
                </div>
              )}
              {details.time_to_beat.completely && (
                <div className="stat place-items-center">
                  <div className="stat-title text-xs">Completionist</div>
                  <div className="stat-value text-2xl">
                    {Math.round(details.time_to_beat.completely / 3600)}h
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Game Details Section */}
      <div className="card bg-base-200 mb-8">
        <div className="card-body">
          <h2 className="card-title mb-4">Game Details</h2>
          {rawgDetails ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  {/* {rawgDetails.metacritic && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Metacritic:</span>
                      <span
                        className={`badge ${
                          rawgDetails.metacritic >= 75
                            ? 'badge-accent bg-opacity-50'
                            : rawgDetails.metacritic >= 60
                            ? 'badge-secondary bg-opacity-50'
                            : 'badge-primary bg-opacity-50'
                        }`}
                      >
                        {rawgDetails.metacritic}
                      </span>
                    </div>
                  )} */}
                  {/* {rawgDetails.playtime > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Average Playtime:</span>
                      <span className="badge badge-ghost">
                        {rawgDetails.playtime} hours
                      </span>
                    </div>
                  )} */}
                </div>

                <div>
                  {/* Show IGDB details if available */}
                  {details?.summary && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-lg mb-2">Summary</h3>
                      <ExpandableText
                        text={details.summary}
                        className="text-sm opacity-70 whitespace-pre-line"
                      />
                    </div>
                  )}
                  {details?.storyline && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-lg mb-2">Storyline</h3>
                      <ExpandableText
                        text={details.storyline}
                        className="text-sm opacity-70 whitespace-pre-line"
                      />
                    </div>
                  )}

                  {/* Show RAWG/Steam description if IGDB details aren't available */}
                  {!details?.summary && rawgDetails?.description_raw && (
                    <div>
                      <h3 className="font-semibold text-lg mb-2">About</h3>
                      <ExpandableText
                        text={rawgDetails.description_raw}
                        className="text-sm opacity-70 whitespace-pre-line"
                      />
                    </div>
                  )}
                </div>
              </div>
              {rawgDetails.screenshots &&
                rawgDetails.screenshots.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Screenshots</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {rawgDetails.screenshots.map((screenshot, index) => (
                        <img
                          key={`screenshot-${index}`}
                          src={screenshot.image}
                          alt="Game Screenshot"
                          className="rounded-lg w-full h-40 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() =>
                            setSelectedScreenshot(screenshot.image)
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-base-300 rounded w-3/4"></div>
              <div className="h-4 bg-base-300 rounded w-1/2"></div>
              <div className="h-32 bg-base-300 rounded"></div>
            </div>
          )}
        </div>
      </div>

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl h-auto relative p-0 bg-transparent">
            <button
              className="btn btn-circle btn-ghost absolute right-2 top-2 z-10 text-white bg-black bg-opacity-50 hover:bg-opacity-70"
              onClick={() => setSelectedScreenshot(null)}
            >
              ✕
            </button>
            <img
              src={selectedScreenshot}
              alt="Game Screenshot"
              className="w-full h-auto rounded-lg"
            />
          </div>
          <div
            className="modal-backdrop"
            onClick={() => setSelectedScreenshot(null)}
          ></div>
        </div>
      )}

      {/* Game Journal Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Game Journal</h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddNote(true)}
          >
            Add Entry
          </button>
        </div>

        {notes.length === 0 ? (
          <p className="text-center py-4 bg-base-200 rounded-lg">
            No journal entries yet. Start tracking your gaming journey!
          </p>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="card bg-base-100 shadow">
                <div className="card-body">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {new Date(note.created_at).toLocaleDateString(
                            'en-US',
                            {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </h3>
                      </div>
                      <div className="flex gap-2 mt-1">
                        {note.duration && (
                          <div className="badge badge-primary">
                            Session: {formatDuration(note.duration)}
                          </div>
                        )}
                        {note.mood && (
                          <div className="badge badge-ghost">
                            {getMoodEmoji(note.mood)} {note.mood}
                          </div>
                        )}
                        {note.rating && (
                          <div className="badge badge-ghost">
                            {getRatingStars(note.rating)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setEditingNote(note)
                          setNoteForm({
                            content: note.content,
                            mood: note.mood,
                            rating: note.rating,
                            play_session_date: note.play_session_date,
                            hours_played: note.hours_played,
                            is_completion_entry: note.is_completion_entry,
                            completion_date: note.completion_date,
                            screenshots: note.screenshots || [],
                          })
                          setShowAddNote(true)
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-ghost btn-sm text-error"
                        onClick={() => deleteNote(note.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                      <p className="mt-2 whitespace-pre-wrap">{note.content}</p>
                      {(note.next_session_plan?.intent || note.next_session_plan?.note) && (
                        <div className="mt-4 bg-base-200 p-3 rounded-lg">
                          <h4 className="font-semibold mb-1">🎯 Next Time</h4>
                          {note.next_session_plan.intent && (
                            <p className="text-sm">
                              <span className="font-medium">Plan:</span> {note.next_session_plan.intent}
                            </p>
                          )}
                          {note.next_session_plan.note && (
                            <p className="text-sm mt-1">
                              <span className="font-medium">Note:</span> {note.next_session_plan.note}
                            </p>
                          )}
                        </div>
                      )}

                  {/* Screenshots */}
                  {note.screenshots && note.screenshots.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {note.screenshots.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Screenshot ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg cursor-pointer"
                          onClick={() => setSelectedScreenshot(url)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Note Modal */}
      {showAddNote && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {editingNote ? 'Edit Journal Entry' : 'Add Journal Entry'}
            </h3>
            <div className="form-control gap-4">
              {/* Core Journal Entry */}
              <div className="space-y-2">
                <label className="label">
                  <span className="label-text font-medium text-lg">
                    📝 What happened in this session?
                  </span>
                  <span className="label-text-alt opacity-70">Required</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full min-h-[200px] text-base"
                  placeholder="Share your gaming experience! Some ideas:
• What were the memorable moments?
• Did you discover anything interesting?
• Any frustrating parts or funny glitches?
• What strategies worked or didn't work?
• How did the story develop?"
                  value={noteForm.content}
                  onChange={(e) =>
                    setNoteForm({ ...noteForm, content: e.target.value })
                  }
                ></textarea>
                <p className="text-sm opacity-70 mt-1">
                  Feel free to write as much or as little as you'd like. This is
                  your gaming journal!
                </p>
              </div>

              {/* Screenshots */}
              <div className="space-y-2">
                <label className="label">
                  <span className="label-text font-medium text-lg">
                    📸 Add Screenshots
                  </span>
                  <span className="label-text-alt opacity-70">Optional</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleScreenshotUpload}
                  className="file-input file-input-bordered w-full"
                />
                {noteForm.screenshots && noteForm.screenshots.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {noteForm.screenshots.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Screenshot ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removeScreenshot(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Session Context */}
              <div className="bg-base-200 rounded-lg p-4 space-y-6">
                <h3 className="font-medium text-base">Session Details</h3>

                {/* Date & Time */}
                <div>
                  <label className="label">
                    <span className="label-text font-medium">
                      📅 When did you play?
                    </span>
                    <span className="label-text-alt opacity-70">Required</span>
                  </label>
                  <input
                    type="datetime-local"
                    className="input input-bordered w-full"
                    required
                    value={noteForm.play_session_date || ''}
                    onChange={(e) =>
                      setNoteForm({
                        ...noteForm,
                        play_session_date: e.target.value,
                      })
                    }
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="label">
                    <span className="label-text font-medium">
                      ⏳ How long did you play?
                    </span>
                    <span className="label-text-alt opacity-70">Optional</span>
                  </label>
                  <div className="flex gap-4 items-center">
                    <div className="flex-1">
                      <input
                        type="number"
                        min="0"
                        className="input input-bordered w-full"
                        placeholder="30"
                        value={noteForm.duration || ''}
                        onChange={(e) =>
                          setNoteForm({
                            ...noteForm,
                            duration: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          })
                        }
                      />
                    </div>
                    <span className="text-sm opacity-70">minutes</span>
                  </div>
                  <p className="text-xs opacity-70 mt-1">
                    Track your gaming sessions to understand your habits
                  </p>
                </div>

                {/* Accomplishments */}
                <div>
                  <label className="label">
                    <span className="label-text font-medium">
                      🏆 What did you accomplish?
                    </span>
                    <span className="label-text-alt opacity-70">Optional</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      'Story Progress',
                      'Side Quest',
                      'Exploration',
                      'Challenge Completed',
                      'Just Messing Around',
                      'Grinding',
                      'Boss Fight',
                      'Achievement Hunting',
                      'Learning Game Mechanics',
                    ].map((accomplishment) => (
                      <label
                        key={accomplishment}
                        className="flex items-center gap-2 cursor-pointer hover:bg-base-300 p-2 rounded-lg transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={noteForm.accomplishments?.includes(
                            accomplishment
                          )}
                          onChange={(e) => {
                            const currentAccomplishments =
                              noteForm.accomplishments || []
                            setNoteForm({
                              ...noteForm,
                              accomplishments: e.target.checked
                                ? [...currentAccomplishments, accomplishment]
                                : currentAccomplishments.filter(
                                    (a) => a !== accomplishment
                                  ),
                            })
                          }}
                        />
                        <span className="text-sm">{accomplishment}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reflection Section */}
              <div className="bg-base-200 rounded-lg p-4 space-y-6">
                <h3 className="font-medium text-base">Reflection</h3>

                {/* Mood & Enjoyment */}
                <div>
                  <label className="label">
                    <span className="label-text font-medium">
                      🎭 How did this session make you feel?
                    </span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 'Amazing', emoji: '🤩', enjoyment: 'high' },
                      { value: 'Great', emoji: '😊', enjoyment: 'high' },
                      { value: 'Good', emoji: '🙂', enjoyment: 'medium' },
                      { value: 'Relaxing', emoji: '😌', enjoyment: 'medium' },
                      { value: 'Mixed', emoji: '🤔', enjoyment: 'medium' },
                      { value: 'Frustrating', emoji: '😤', enjoyment: 'low' },
                      { value: 'Meh', emoji: '😕', enjoyment: 'low' },
                      { value: 'Regret', emoji: '😫', enjoyment: 'low' },
                    ].map(({ value, emoji, enjoyment }) => (
                      <label
                        key={value}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg cursor-pointer transition-all hover:bg-base-300
                          ${
                            noteForm.mood === value
                              ? `bg-base-300 ring-2 ${
                                  {
                                    high: 'ring-success',
                                    medium: 'ring-primary',
                                    low: 'ring-error',
                                  }[enjoyment]
                                }`
                              : ''
                          }`}
                        onClick={() =>
                          setNoteForm({
                            ...noteForm,
                            mood: value as GameNote['mood'],
                          })
                        }
                      >
                        <span
                          className="text-2xl"
                          role="img"
                          aria-label={value}
                        >
                          {emoji}
                        </span>
                        <span className="text-xs text-center">{value}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Next Time Plans - Optional */}
                <div className="space-y-4">
                  <label className="label">
                    <span className="label-text font-medium">
                      🎯 Next time, I want to...
                    </span>
                    <span className="label-text-alt opacity-70">Optional</span>
                  </label>

                  {/* Quick Options */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Continue Story',
                      'Try Different Build',
                      'Explore New Area',
                      'Beat That Boss',
                      'Grind Items/Levels',
                      'Try Different Character',
                      'Complete Side Content',
                    ].map((intent) => (
                      <button
                        key={intent}
                        type="button"
                        className={`btn btn-sm ${
                          noteForm.next_session_plan?.intent === intent
                            ? 'btn-primary'
                            : 'btn-ghost'
                        }`}
                        onClick={() =>
                          setNoteForm({
                            ...noteForm,
                            next_session_plan: {
                              ...noteForm.next_session_plan,
                              intent,
                            },
                          })
                        }
                      >
                        {intent}
                      </button>
                    ))}
                  </div>

                  {/* Custom Note */}
                  <div>
                    <textarea
                      className="textarea textarea-bordered w-full"
                      placeholder="Any other thoughts about what you want to do next time? (optional)"
                      value={noteForm.next_session_plan?.note || ''}
                      onChange={(e) =>
                        setNoteForm({
                          ...noteForm,
                          next_session_plan: {
                            ...noteForm.next_session_plan,
                            note: e.target.value,
                          },
                        })
                      }
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* Completion Entry */}
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">
                    Is this a completion entry?
                  </span>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={noteForm.is_completion_entry || false}
                    onChange={(e) => {
                      const isCompletion = e.target.checked
                      setNoteForm((prev) => ({
                        ...prev,
                        is_completion_entry: isCompletion,
                        completion_date: isCompletion
                          ? new Date().toISOString().split('T')[0]
                          : null,
                      }))
                    }}
                  />
                </label>
              </div>

              {/* Form Actions */}
              <div className="modal-action">
                <button
                  className="btn"
                  onClick={() => {
                    setNoteForm({
                      content: '',
                      play_session_date: null,
                      duration: null,
                      accomplishments: [],
                      mood: null,
                      next_session_plan: {
                        intent: null,
                        note: null,
                      },
                      is_completion_entry: false,
                      completion_date: null,
                    })
                    setShowAddNote(false)
                    setEditingNote(null)
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={editingNote ? updateNote : addNote}
                  disabled={
                    !noteForm.content?.trim() || !noteForm.play_session_date
                  }
                >
                  {editingNote ? 'Update' : 'Add'} Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Game Modal */}
      {game && (
        <EditGameModal
          game={game}
          userId={userId}
          showModal={showEditModal}
          setShowModal={setShowEditModal}
          onGameUpdated={fetchGameAndNotes}
        />
      )}
    </div>
  )
}

export default GameDetails
