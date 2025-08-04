import { useState, useEffect } from 'react'
import SteamConnectButton from './SteamConnectButton'
import { useNavigate } from 'react-router-dom'
import supabase from '../supabaseClient'
import GameSearch from './GameSearch'
import { GameBasic, GameDetailed } from '../types/game'
import { GAME_PROVIDER, gameService } from '../services/gameService'
import { Mood } from '../types'
// import { useToast } from '../hooks/useToast'

interface GameFormData {
  title: string
  platforms: string[]
  genres: string[]
  status: string
  progress: number
  image: string
  moods: string[] // Mood IDs are strings from the database
  igdb_id?: string
  provider?: string
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
  // IGDB ID input and fetch-by-ID state
  const [igdbIdInput, setIgdbIdInput] = useState('')
  const [isFetchingById, setIsFetchingById] = useState(false)
  const [fetchByIdError, setFetchByIdError] = useState<string | null>(null)

  // Handler for IGDB ID fetch
  const handleFetchByIgdbId = async () => {
    setFetchByIdError(null)
    setIsFetchingById(true)
    try {
      if (!/^\d+$/.test(igdbIdInput)) {
        setFetchByIdError('Please enter a valid IGDB numeric ID.')
        setIsFetchingById(false)
        return
      }
      const game = await gameService.getGameDetails(igdbIdInput.trim())
      if (!game) {
        setFetchByIdError('No game found for that IGDB ID.')
        setIsFetchingById(false)
        return
      }
      // Check if user already has this game
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')
      const { data: existingGames } = await supabase
        .from('games')
        .select('id')
        .eq('igdb_id', game.id)
        .eq('provider', GAME_PROVIDER)
      const existingGameId = existingGames?.[0]?.id
      if (existingGameId) {
        const { data: userGames } = await supabase
          .from('user_games')
          .select('id, status')
          .eq('game_id', existingGameId)
          .eq('user_id', user.id)
        if (userGames?.length) {
          setFetchByIdError('You already have this game in your library.')
          setIsFetchingById(false)
          return
        }
      }
      // Set selected game and form data
      setSelectedGame(game)
      setFormData({
        title: game.name,
        platforms: [],
        genres: (game.genres || []).map((g: any) => g.name),
        status: 'Not Started',
        progress: 0,
        moods: [],
        image: game.background_image || '',
        igdb_id: game.id?.toString(),
        provider: GAME_PROVIDER,
        metacritic_rating: game.metacritic || undefined,
        release_date: game.released || undefined,
        background_image: game.background_image || undefined,
        description: game.summary || '',
      })
      setFetchByIdError(null)
      setIgdbIdInput('')
    } catch (e: any) {
      setFetchByIdError(e?.message || 'Failed to fetch game by IGDB ID.')
    } finally {
      setIsFetchingById(false)
    }
  }

  const navigate = useNavigate()
  const [formData, setFormData] = useState<GameFormData>({
    title: '',
    platforms: [],
    genres: [],
    status: 'Not Started',
    progress: 0,
    image: '',
    moods: [] as string[],
  })
  const [availablePlatforms, setAvailablePlatforms] = useState<
    { id: string; name: string }[]
  >([])
  const [selectedGame, setSelectedGame] = useState<GameDetailed | null>(null)
  useEffect(() => {
    if (!selectedGame) return
    // Auto-select the only platform if there's just one
    if (
      availablePlatforms.length === 1 &&
      !formData.platforms.includes(availablePlatforms[0].name)
    ) {
      setFormData((prev) => ({
        ...prev,
        platforms: [availablePlatforms[0].name],
      }))
    }
    // Log when selectedGame is loaded but missing websites
    if (!selectedGame.websites) {
      console.log('Selected game loaded but missing websites:', selectedGame)
    }

    const loadSteamLogic = async () => {
      // Detect a Steam link in the IGDB game websites (category 13 = Steam)
      const hasSteamLink =
        Array.isArray(selectedGame.websites) &&
        selectedGame.websites.some(
          (w) => w.type === 13 || w.url?.includes('store.steampowered.com')
        )
      // console.log removed for production
      const steamPlat = { id: 'Steam', name: 'Steam' }
      // console.log removed for production

      // Start with IGDB platforms
      let platforms = (selectedGame.platforms || []).map((p) => ({
        id: p.name,
        name: p.name,
      }))

      // If Steam game, ensure Steam is included and enrich via title search
      if (hasSteamLink) {
        if (!platforms.some((p) => p.name === 'Steam')) {
          platforms.push(steamPlat)
        }
        try {
          const searchResult = await gameService.searchGames(selectedGame.name)
          if (searchResult.results.length) {
            const details = await gameService.getGameDetails(
              searchResult.results[0].id
            )
            if (details.platforms?.length) {
              const fetched = details.platforms.map((p) => ({
                id: p.name,
                name: p.name,
              }))
              const combined = Array.from(
                new Map(
                  [...fetched, steamPlat].map((x) => [x.name, x])
                ).values()
              )
              platforms = combined
            }
          }
        } catch (err) {
          console.warn('Couldn’t enrich Steam platforms:', err)
        }
      }

      // Preserve any user-selected platforms
      const userChosen = Array.isArray(formData.platforms)
        ? formData.platforms
        : []
      userChosen.forEach((name) => {
        if (!platforms.some((p) => p.name === name)) {
          platforms.push({ id: name, name })
        }
      })

      setAvailablePlatforms(platforms)
    }

    loadSteamLogic()
  }, [selectedGame, formData.platforms])
  const [_genreOptions, setGenreOptions] = useState<string[]>([])
  const [availableMoods, setAvailableMoods] = useState<Mood[]>([])
  const [_statusOptions] = useState<string[]>([
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
  const [_isSearching, setIsSearching] = useState(true)
  const [_error, setError] = useState<string | null>(null)
  const [existingGameMessage, setExistingGameMessage] = useState<string | null>(
    null
  )
  // Direct DOM manipulation for toast
  const showToast = ({
    message,
    type = 'warning',
    duration = 10000,
  }: {
    message: string
    type?: string
    duration?: number
  }) => {
    // console.log removed for production

    // Create a toast element using DaisyUI
    const toastContainer = document.createElement('div')
    toastContainer.className = 'toast toast-top toast-center z-[9999]'

    const alertClass =
      type === 'error'
        ? 'alert-error'
        : type === 'success'
        ? 'alert-success'
        : type === 'warning'
        ? 'alert-warning'
        : 'alert-info'

    toastContainer.innerHTML = `
      <div class="alert ${alertClass} shadow-xl font-bold text-lg border-2 border-black p-4">
        <span>${message}</span>
      </div>
    `

    // Add to document
    document.body.appendChild(toastContainer)

    // Remove after duration
    setTimeout(() => {
      // console.log removed for production
      if (document.body.contains(toastContainer)) {
        document.body.removeChild(toastContainer)
      }
    }, duration)
  }

  useEffect(() => {
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

  const handleGameSelect = async (game: GameBasic) => {
    try {
      const gameDetails = await gameService.getGameDetails(game.id)
      setSelectedGame(gameDetails)

      // Check if user already has this game
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      // First check if the game exists in IGDB provider (only if igdb_id is defined)
      let existingGames = null
      if (game.igdb_id) {
        const { data } = await supabase
          .from('games')
          .select('id')
          .eq('igdb_id', game.igdb_id)
          .eq('provider', GAME_PROVIDER)
        existingGames = data
      }

      // Also check if the game exists in RAWG provider with the same title
      // This handles legacy RAWG games that might not have igdb_id yet
      const { data: rawgGames } = await supabase
        .from('games')
        .select('id')
        .eq('title', game.name)
        .eq('provider', 'rawg')

      // Combine both results to check for existing games
      const allExistingGames = [...(existingGames || []), ...(rawgGames || [])]
      const existingGame = allExistingGames[0]
      const resolvedGameId = existingGame?.id

      // Only check for user game if we found an existing game
      let existingUserGame = null
      if (existingGame) {
        const { data: userGames } = await supabase
          .from('user_games')
          .select(
            `
            id,
            status,
            progress,
            game_id
          `
          )
          .eq('game_id', existingGame.id)
          .eq('user_id', user.id)

        existingUserGame = userGames?.[0]
      }

      if (existingUserGame) {
        // If user already has this game, show a message
        setExistingGameMessage(
          `You already have ${game.name} in your library with status: ${existingUserGame.status}. You can edit it in your library.`
        )

        console.log('GAME ALREADY EXISTS IN LIBRARY:', game.name)

        // Force a small delay to ensure state updates properly
        setTimeout(() => {
          // Show toast notification with more prominent styling
          showToast({
            message: `Game "${game.name}" is already in your library!`,
            type: 'error', // Changed to error for maximum visibility
            duration: 10000, // Increased duration to 10 seconds
          })
        }, 100)
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
          igdb_id: undefined,
          provider: undefined,
          metacritic_rating: undefined,
          release_date: undefined,
          background_image: undefined,
          description: undefined,
        })
      } else {
        // Build platform options from both IGDB and existing Supabase platforms for this game
        const igdbPlatformNames = (game.platforms || []).map((p) => p.name)

        // Fetch additional platforms from Supabase if the game already exists
        let extraPlatformNames: string[] = []
        // Use resolvedGameId instead of gameDetails.id for the game_platforms query
        if (resolvedGameId) {
          // Step 1: Get platform IDs from game_platforms
          const { data: gamePlatformLinks, error: linkError } = await supabase
            .from('game_platforms')
            .select('platform_id')
            .eq('game_id', resolvedGameId)

          if (linkError) {
            console.error('Error fetching game_platforms:', linkError)
          }

          const platformIds =
            gamePlatformLinks?.map((gp) => gp.platform_id) || []

          // Step 2: Get platform names from platforms table
          const { data: platformsData, error: platformError } = await supabase
            .from('platforms')
            .select('name')
            .in('id', platformIds)

          if (platformError) {
            console.error('Error fetching platforms:', platformError)
          }

          extraPlatformNames = (platformsData || [])
            .map((p) => p.name)
            .filter((name) => name && !igdbPlatformNames.includes(name))
        }

        const combinedPlatforms = [
          ...igdbPlatformNames,
          ...extraPlatformNames,
        ].filter((value, index, self) => self.indexOf(value) === index)

        setAvailablePlatforms(
          combinedPlatforms.map((name) => ({ id: name, name }))
        )

        // Set form data with IGDB data
        setFormData({
          title: game.name,
          platforms: [], // User will select from combinedPlatforms
          genres: (game.genres || []).map((g) => g.name), // Use IGDB genres
          status: 'Not Started',
          progress: 0,
          moods: [],
          image: game.background_image || '', // IGDB image is already set in background_image
          igdb_id: game.igdb_id?.toString(),
          provider: GAME_PROVIDER,
          metacritic_rating: game.metacritic || undefined,
          release_date: game.released || undefined,
          background_image: game.background_image || undefined,
          description: game.summary || undefined,
        })
      }

      // Close search after selection
      setIsSearching(false)
    } catch (error) {
      console.error('Error in handleGameSelect:', error)
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to handle game selection'
      )
      setSelectedGame(null)
      setFormData({
        title: '',
        platforms: [],
        genres: [],
        status: 'Not Started',
        progress: 0,
        moods: [],
        image: '',
        igdb_id: undefined,
        provider: undefined,
        metacritic_rating: undefined,
        release_date: undefined,
        background_image: undefined,
        description: undefined,
      })
    }
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

      // Check if we have a selected game with IGDB data
      if (selectedGame) {
        // If we have a selected game but no igdb_id/provider, this is likely a legacy RAWG game
        // that needs to be migrated to IGDB
        const igdbId = formData.igdb_id || selectedGame.id?.toString()
        const provider = formData.provider || GAME_PROVIDER

        // Check if game exists by igdb_id and provider (only if igdbId is defined)
        let existingGames = null
        if (igdbId) {
          const { data } = await supabase
            .from('games')
            .select('id, provider, igdb_id')
            .eq('igdb_id', igdbId)
            .eq('provider', provider)
          existingGames = data
        }

        // Also check if this game exists as a RAWG game by title
        const { data: rawgGames } = await supabase
          .from('games')
          .select('id, provider, igdb_id')
          .eq('title', formData.title)
          .eq('provider', 'rawg')

        // Check if the user already has this game (from either provider)
        const allExistingGames = [
          ...(existingGames || []),
          ...(rawgGames || []),
        ]
        const existingGame = allExistingGames[0]

        if (existingGame) {
          // If it's a RAWG game, migrate it to IGDB
          if (existingGame.provider === 'rawg') {
            // Upgrade to IGDB
            const { error: updateError } = await supabase
              .from('games')
              .update({
                provider: GAME_PROVIDER,
                igdb_id: igdbId,
                metacritic_rating: formData.metacritic_rating,
                release_date: formData.release_date,
                background_image: formData.background_image,
                description: formData.description,
              })
              .eq('id', existingGame.id)

            if (updateError) throw updateError
          }
          gameId = existingGame.id
        } else {
          // Create new game - ensure we have a valid title at minimum
          if (!formData.title) {
            throw new Error('Game title is required')
          }

          // Create the game object with required fields
          const gameData: {
            title: string
            provider: string
            igdb_id?: string
            metacritic_rating?: number
            release_date?: string
            background_image?: string
            description?: string
          } = {
            title: formData.title,
            provider: provider,
          }

          // Only add igdb_id if it's defined
          if (igdbId) {
            gameData.igdb_id = igdbId
          }

          // Add optional fields if they exist
          if (formData.metacritic_rating)
            gameData.metacritic_rating = formData.metacritic_rating
          if (formData.release_date)
            gameData.release_date = formData.release_date
          if (formData.background_image)
            gameData.background_image = formData.background_image
          if (formData.description) gameData.description = formData.description

          const { data: newGame, error: gameError } = await supabase
            .from('games')
            .insert([gameData])
            .select()
            .single()

          if (gameError) throw gameError
          if (!newGame) throw new Error('Failed to create game')
          gameId = newGame.id
        }
      } else {
        // If no selected game, we can't proceed
        throw new Error('No game selected')
      }

      // For new games, add all available platforms and genres from RAWG
      if (selectedGame && gameId) {
        // Get platform and genre IDs from the database based on names
        const { data: platforms } = await supabase
          .from('platforms')
          .select('id, name')
          .in(
            'name',
            selectedGame.platforms.map((p) => p.name)
          )

        const { data: genres } = await supabase
          .from('genres')
          .select('id, name')
          .in(
            'name',
            selectedGame.genres.map((g) => g.name)
          )

        const platformIds = platforms?.map((p) => p.id) || []
        const genreIds = genres?.map((g) => g.id) || []

        // Add all available platforms - check if they exist first to avoid 409 errors
        try {
          for (const platformId of platformIds) {
            // Check if this platform is already associated with the game
            const { data: existingPlatform } = await supabase
              .from('game_platforms')
              .select('*')
              .eq('game_id', gameId)
              .eq('platform_id', platformId)
              .maybeSingle()

            // Only insert if it doesn't already exist
            if (!existingPlatform) {
              await supabase.from('game_platforms').insert({
                game_id: gameId,
                platform_id: platformId,
              })
            }
          }
        } catch (error) {
          console.error('Error adding platforms:', error)
          // Continue execution even if platform insertion fails
        }

        // Add genres - check if they exist first to avoid 409 errors
        try {
          for (const genreId of genreIds) {
            // Check if this genre is already associated with the game
            const { data: existingGenre } = await supabase
              .from('game_genres')
              .select('*')
              .eq('game_id', gameId)
              .eq('genre_id', genreId)
              .maybeSingle()

            // Only insert if it doesn't already exist
            if (!existingGenre) {
              await supabase.from('game_genres').insert({
                game_id: gameId,
                genre_id: genreId,
              })
            }
          }
        } catch (error) {
          console.error('Error adding genres:', error)
          // Continue execution even if genre insertion fails
        }
      }

      // Now check if the user already has this game in their library
      const { data: existingUserGames } = await supabase
        .from('user_games')
        .select('id, status, platforms')
        .eq('user_id', user.id)
        .eq('game_id', gameId)

      const existingUserGame = existingUserGames?.[0]

      if (existingUserGame) {
        // Get existing platforms and merge with new ones (avoiding duplicates)
        const existingPlatforms = existingUserGame.platforms || []
        const mergedPlatforms = [
          ...new Set([...existingPlatforms, ...formData.platforms]),
        ]

        // Update platforms for existing user_game
        await supabase
          .from('user_games')
          .update({
            platforms: mergedPlatforms,
          })
          .eq('id', existingUserGame.id)

        // Set a message but don't throw an error
        setExistingGameMessage(
          `You already have this game in your library with status: ${existingUserGame.status}. Platforms have been updated.`
        )

        console.log('UPDATING EXISTING GAME PLATFORMS')

        // Force a small delay to ensure state updates properly
        setTimeout(() => {
          // Show toast notification with more prominent styling
          showToast({
            message: `Game is already in your library. Platforms updated.`,
            type: 'error', // Changed to error for maximum visibility
            duration: 10000, // Increased duration to 10 seconds
          })
        }, 100)

        // Navigate to the library instead of throwing an error
        onGameAdded()
        setShowModal(false)
        navigate('/app/library')
        return
      } else {
        // Create new user_game
        await supabase.from('user_games').upsert(
          {
            user_id: user.id,
            game_id: gameId,
            status: formData.status,
            progress: formData.progress,
            platforms: formData.platforms, // Store user's selected platforms
            image:
              formData.image !== formData.background_image
                ? formData.image
                : null, // Store user's custom image
          },
          { onConflict: ['user_id', 'game_id'] }
        )
      }

      // Insert moods if any are selected
      if (formData.moods.length > 0) {
        try {
          for (const moodId of formData.moods) {
            // Check if this mood is already associated with the game for this user
            const { data: existingMood } = await supabase
              .from('game_moods')
              .select('*')
              .eq('user_id', user.id)
              .eq('game_id', gameId)
              .eq('mood_id', moodId)
              .maybeSingle()

            // Only insert if it doesn't already exist
            if (!existingMood) {
              await supabase.from('game_moods').insert({
                user_id: user.id,
                game_id: gameId,
                mood_id: moodId,
                weight: 1,
                created_at: new Date().toISOString(),
              })
            }
          }
        } catch (error) {
          console.error('Failed to insert moods:', error)
          // Continue execution even if mood insertion fails
          // Don't throw the error to prevent the whole transaction from failing
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
      setError(
        error instanceof Error
          ? error.message
          : 'An error occurred while adding the game'
      )
      return // Exit early if there's an error
    } finally {
      setIsLoading(false)
    }

    // Only close modal, notify, and navigate if we succeeded
    setShowModal(false)
    onGameAdded()
    navigate('/app/library')
  }

  // --- STEAM OAUTH HANDLER (copied from ProfilePage) ---
  const BASE_URL =
    import.meta.env.MODE === 'development'
      ? 'http://localhost:5173'
      : import.meta.env.VITE_BACKLOG_EXPLORER_URL
  const handleConnectToSteam = () => {
    const params = {
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': `${BASE_URL}/app/profile`,
      'openid.realm': BASE_URL,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    }
    const steamLoginUrl = `https://steamcommunity.com/openid/login?${new URLSearchParams(
      params
    )}`
    window.location.href = steamLoginUrl
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
        <h3 className="font-bold text-xl mb-4 text-base-content">
          Add New Game
        </h3>

        {existingGameMessage && (
          <div className="alert bg-base-200 text-base-content border-2 border-base-300 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-base-content shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <span>{existingGameMessage}</span>
          </div>
        )}

        <div className="mb-8 space-y-4">
          {!selectedGame ? (
            <div className="bg-primary/10 border-2 border-primary rounded-lg p-6 space-y-6">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-primary rounded-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-6 h-6 text-primary-content"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-1">
                    Search for your game
                  </h4>
                  <p className="text-base-content/70">
                    Search our database of over 500,000 games to add to your
                    library.
                  </p>
                </div>
              </div>

              <GameSearch onGameSelect={handleGameSelect} />

              <div className="alert bg-base-200 text-base-content/80 border border-base-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                  />
                </svg>
                <span>
                  Can't find your game? Try searching by the game's official
                  title. If you still can't find it,{' '}
                  <a href="/app/feedback" className="link link-primary">
                    let us know
                  </a>
                  !
                </span>
              </div>
              {/* IGDB ID Fallback Add */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-base-content/70 text-sm mb-2">
                  Or add by IGDB ID (advanced)
                </span>
                <div className="flex gap-2 w-full justify-center">
                  <input
                    type="text"
                    className="input input-bordered input-sm max-w-xs"
                    placeholder="Enter IGDB ID (e.g. 255090)"
                    value={igdbIdInput}
                    onChange={(e) => setIgdbIdInput(e.target.value)}
                  />
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={isFetchingById || !/^\d+$/.test(igdbIdInput)}
                    onClick={handleFetchByIgdbId}
                    type="button"
                  >
                    {isFetchingById ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      'Fetch by ID'
                    )}
                  </button>
                </div>
                {fetchByIdError && (
                  <span className="text-error text-xs mt-1">
                    {fetchByIdError}
                  </span>
                )}
                <span className="text-base-content/70 text-sm mt-2">
                  Or import your Steam library
                </span>
                <SteamConnectButton onConnect={handleConnectToSteam} />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSelectedGame(null)
                setFormData({
                  ...formData,
                  title: '',
                  platforms: [],
                  genres: [],
                  rawg_id: undefined,
                  rawg_slug: undefined,
                  metacritic_rating: undefined,
                  release_date: undefined,
                  background_image: undefined,
                  description: undefined,
                })
              }}
              className="btn btn-ghost gap-2 mb-8 hover:bg-primary/10"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
              Search for a different game
            </button>
          )}
        </div>

        {selectedGame && (
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
                    onError={(_e) => {
                      console.error('Image failed to load:', formData.image)
                      setError(
                        'Failed to load image. Please check the URL and try again.'
                      )
                    }}
                  />
                </div>
              )}

              <div className="form-control">
                <label className="label">
                  <span className="label-text text-base-content">
                    Custom Image URL (optional)
                  </span>
                </label>
                <input
                  type="url"
                  className="input input-bordered bg-base-100"
                  value={
                    formData.image !== formData.background_image
                      ? formData.image
                      : ''
                  }
                  placeholder="Enter a URL to override the default game image"
                  onChange={(e) => {
                    const url = e.target.value.trim()
                    setFormData({
                      ...formData,
                      image: url || formData.background_image || '',
                    })
                    setError(null)
                  }}
                />
              </div>

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
                  {availablePlatforms.map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => {
                        const newPlatforms = formData.platforms.includes(
                          platform.name
                        )
                          ? formData.platforms.filter(
                              (p) => p !== platform.name
                            )
                          : [...formData.platforms, platform.name]
                        setFormData({ ...formData, platforms: newPlatforms })
                      }}
                      className={`
                        btn btn-sm normal-case
                        ${
                          formData.platforms.includes(platform.name)
                            ? 'bg-primary text-primary-content hover:bg-primary-focus'
                            : 'btn-ghost hover:bg-base-300'
                        }
                        transition-all duration-200
                      `}
                    >
                      {platform.name}
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

            <div className="card bg-base-200 shadow-sm p-6 space-y-4">
              <h2 className="card-title text-base-content text-lg">
                Game Moods
              </h2>
              <p className="text-sm text-base-content/60">
                Select up to 5 moods that capture the emotional tone of this
                game.
              </p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-base-content/70">
                    Moods
                  </h3>
                  <span className="text-xs text-base-content/60">
                    {formData.moods.length} / 5 max
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableMoods.map((mood) => {
                    const isSelected = formData.moods.includes(mood.id)
                    const disabled = !isSelected && formData.moods.length >= 5
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
                              disabled={disabled}
                              onChange={(e) => {
                                const newMoods = e.target.checked
                                  ? [...formData.moods, mood.id]
                                  : formData.moods.filter(
                                      (id) => id !== mood.id
                                    )
                                setFormData({ ...formData, moods: newMoods })
                              }}
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
                      {
                        value: 'Done',
                        icon: '✅',
                        desc: 'Completed main story',
                      },
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
                        <span className="text-xs opacity-70">
                          {status.desc}
                        </span>
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
        )}
      </div>
      <div className="modal-backdrop" onClick={() => onGameAdded()}></div>

      {/* Toast is now handled via direct DOM manipulation */}
    </div>
  )
}

export default AddGameModal
