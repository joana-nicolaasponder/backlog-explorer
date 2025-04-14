import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../supabaseClient'
import { useTheme } from '../contexts/ThemeContext'
import { gameService } from '../services/gameService'
const BASE_URL =
  import.meta.env.MODE === 'development'
    ? 'http://localhost:5173'
    : import.meta.env.VITE_BACKLOG_EXPLORER_URL
const API_BASE_URL = import.meta.env.VITE_API_URL

const ProfilePage = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [visibleCount, setVisibleCount] = useState(30)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [steamGames, setSteamGames] = useState<any[]>([])
  const [loadingGames, setLoadingGames] = useState(false)
  const [selectedGames, setSelectedGames] = useState<Set<any>>(new Set())
  const [userLibraryGames, setUserLibraryGames] = useState<
    Map<number, string[]>
  >(new Map())
  const [steamProfile, setSteamProfile] = useState<{
    steamId: string
    nickname: string
    avatar: string
    profileUrl: string
  } | null>(null)

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser()
        if (userError) throw userError
        if (currentUser) {
          setUser(currentUser)
          setEditedName(currentUser.user_metadata?.full_name || '')

          const { data: existingPreferences, error: prefError } = await supabase
            .from('user_preferences')
            .select('id')
            .maybeSingle()

          if (!existingPreferences && !prefError) {
            const { error: insertPrefError } = await supabase
              .from('user_preferences')
              .insert({
                user_id: currentUser.id,
                theme: 'pastel',
                updated_at: new Date().toISOString(),
              })

            if (insertPrefError) {
              console.error(
                'Error inserting default user preferences:',
                insertPrefError
              )
            }
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error)
        setError(
          error instanceof Error ? error.message : 'Failed to load profile'
        )
      } finally {
        setLoading(false)
      }
    }

    loadUserProfile()
  }, [])

  const { theme, setTheme } = useTheme()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const themes = [
    'light',
    'dark',
    'cupcake',
    'pastel',
    'dracula',
    'wireframe',
    'cyberpunk',
    'forest',
    'luxury',
    'retro',
    'synthwave',
    'valentine',
    'halloween',
    'garden',
    'lofi',
    'fantasy',
  ]

  const handleThemeChange = async (newTheme: string) => {
    await setTheme(newTheme)
  }

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

  const handleOpenIDResponse = async () => {
    setLoadingGames(true) // ✅ Start loading spinner
    try {
      const urlParams = new URLSearchParams(window.location.search)

      const response = await fetch(`${API_BASE_URL}/api/verify-openid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          openidResponse: Object.fromEntries(urlParams.entries()),
        }),
      })

      const responseData = await response.json()
      if (!response.ok) {
        throw new Error(
          responseData.error || 'Failed to verify OpenID response'
        )
      }

      setSteamProfile(responseData)

      if (responseData.steamId) {
        setUser((prevUser) => ({
          ...prevUser,
          steamId: responseData.steamId,
          nickname: responseData.nickname,
          avatar: responseData.avatar,
          profileUrl: responseData.profileUrl,
        }))

        const gamesResponse = await fetch(
          `${API_BASE_URL}/api/steam/games/${responseData.steamId}`
        )
        if (!gamesResponse.ok) {
          const gamesError = await gamesResponse.json()
          throw new Error(gamesError.error || 'Failed to fetch Steam games')
        }
        const games = await gamesResponse.json()
        setSteamGames(games)
      }
    } catch (error) {
      console.error('Error handling OpenID response:', error)
      setError(error.message || 'Failed to handle OpenID response')
    } finally {
      setLoadingGames(false) // ✅ Stop loading spinner
    }
  }

  const toggleGameSelection = (appId: string) => {
    setSelectedGames((prevSelected) => {
      const newSelected = new Set(prevSelected)
      if (newSelected.has(appId)) {
        newSelected.delete(appId)
      } else {
        newSelected.add(appId)
      }
      return newSelected
    })
  }

  // Helper function to process game genres
  const processGameGenres = async (gameData: any, game: any) => {
    // Only process games that have genres from IGDB
    if (!gameData.genres || gameData.genres.length === 0) {
      return false
    }

    // First, check if the genres already exist in the database
    const { data: existingGenres, error: genresError } = await supabase
      .from('genres')
      .select('id, name')
      .in(
        'name',
        gameData.genres.map((g: any) => g.name)
      )

    if (genresError) {
      console.error('Error fetching existing genres:', genresError)
      return false
    }

    // Find genres that don't exist yet
    const existingNames = new Set(existingGenres?.map((g: any) => g.name) || [])
    const newGenres = gameData.genres
      .filter((g: any) => !existingNames.has(g.name))
      .map((g: any) => ({
        name: g.name,
        // Don't include slug if it doesn't exist in the table
      }))

    // Insert new genres if needed
    if (newGenres.length > 0) {
      const { error: insertGenresError } = await supabase
        .from('genres')
        .insert(newGenres)

      if (insertGenresError) {
        console.error('Error inserting new genres:', insertGenresError)
        return false
      }
    }

    // Get all genre IDs (both existing and newly inserted)
    const { data: allGenres, error: allGenresError } = await supabase
      .from('genres')
      .select('id, name')
      .in(
        'name',
        gameData.genres.map((g: any) => g.name)
      )

    if (allGenresError) {
      console.error('Error fetching all genres:', allGenresError)
      return false
    }

    // Check if game_genres associations already exist
    const { data: existingGameGenres, error: checkGameGenresError } =
      await supabase
        .from('game_genres')
        .select('game_id, genre_id')
        .eq('game_id', game.id)

    if (checkGameGenresError) {
      console.error(
        'Error checking existing game_genres:',
        checkGameGenresError
      )
      return false
    }

    // Create game_genres associations for genres that don't already exist
    const existingGenreIds = new Set(
      (existingGameGenres || []).map((gg: any) => gg.genre_id)
    )
    const gameGenres = allGenres
      .filter((genre: any) => !existingGenreIds.has(genre.id))
      .map((genre: any) => ({
        game_id: game.id,
        genre_id: genre.id,
        created_at: new Date().toISOString(),
      }))

    // Insert game_genres associations
    if (gameGenres.length > 0) {
      const { error: gameGenresError } = await supabase
        .from('game_genres')
        .upsert(gameGenres, { onConflict: 'game_id,genre_id' })

      if (gameGenresError) {
        console.error('Error inserting game_genres:', gameGenresError)
        return false
      }

      console.log(
        `Successfully added ${gameGenres.length} genres for ${game.title}`
      )
    } else {
      console.log(`No new genres to add for ${game.title}`)
    }

    return true
  }

  const addSelectedGamesToLibrary = async () => {
    if (!user?.id) {
      console.error('No user ID found')
      return
    }

    try {
      const selectedGamesData = steamGames.filter((game) =>
        selectedGames.has(game.appId.toString())
      )

      const enrichedGamesData = await Promise.all(
        selectedGamesData.map(async (game) => {
          try {
            const searchResult = await gameService.searchGames(game.name)

            if (searchResult.results.length > 0) {
              const normalizedName = (str: string) =>
                str
                  .toLowerCase()
                  .replace(/[^\w\s]/gi, '')
                  .trim()

              const exactMatch = searchResult.results.find(
                (g) => normalizedName(g.name) === normalizedName(game.name)
              )

              if (!exactMatch) {
                console.warn(
                  `⚠️ No exact match for "${game.name}". Using first IGDB result: "${searchResult.results[0].name}"`
                )
              }

              const igdbGame = exactMatch || searchResult.results[0]
              const genres =
                igdbGame.genres?.map((genre) => ({
                  name: genre.name,
                  slug: genre.slug,
                })) || []

              const { data: existingIgdbGame } = await supabase
                .from('games')
                .select('*')
                .eq('igdb_id', igdbGame.id.toString())
                .eq('provider', 'igdb')
                .maybeSingle()

              if (existingIgdbGame) {
                return {
                  steamGame: game,
                  igdbData: existingIgdbGame,
                  genres: genres,
                  existingIgdbGame: true,
                }
              }

              return {
                steamGame: game,
                igdbData: {
                  title: game.name,
                  igdb_id: igdbGame.id.toString(),
                  provider: 'igdb',
                  background_image: igdbGame.background_image || game.iconUrl,
                  metacritic_rating: igdbGame.metacritic,
                  release_date: igdbGame.released,
                  created_at: new Date().toISOString(),
                },
                genres: genres,
                existingIgdbGame: false,
              }
            } else {
              return {
                steamGame: game,
                igdbData: {
                  title: game.name,
                  igdb_id: game.appId.toString(),
                  provider: 'steam',
                  background_image: game.iconUrl,
                  description: game.description || null,
                  created_at: new Date().toISOString(),
                },
                genres: [],
              }
            }
          } catch (error) {
            console.error(`Error fetching IGDB data for ${game.name}:`, error)
            return {
              steamGame: game,
              igdbData: {
                title: game.name,
                igdb_id: game.appId.toString(),
                provider: 'steam',
                background_image: game.iconUrl,
                description: game.description || null,
                created_at: new Date().toISOString(),
              },
            }
          }
        })
      )

      const gamesToInsert = enrichedGamesData
        .filter((data) => !data.existingIgdbGame)
        .map((data) => data.igdbData)

      const existingIgdbGames = enrichedGamesData
        .filter((data) => data.existingIgdbGame)
        .map((data) => data.igdbData)

      let insertedGames = []
      let gamesError = null

      if (gamesToInsert.length > 0) {
        const { data, error } = await supabase
          .from('games')
          .upsert(gamesToInsert, { onConflict: 'igdb_id,provider' })
          .select()

        if (error) {
          gamesError = error
          console.error('Error inserting games:', error)
        } else {
          insertedGames = data || []
        }
      }

      insertedGames = [...insertedGames, ...existingIgdbGames]

      if (gamesError) {
        throw gamesError
      }

      // Process genres
      for (let i = 0; i < enrichedGamesData.length; i++) {
        const gameData = enrichedGamesData[i]
        const insertedGame = insertedGames.find((game) => {
          if (gameData.existingIgdbGame) {
            return game.id === gameData.igdbData.id
          }
          return (
            game.igdb_id === gameData.igdbData.igdb_id &&
            game.provider === gameData.igdbData.provider &&
            game.title === gameData.igdbData.title
          )
        })

        if (!insertedGame) {
          const lenientMatch = insertedGames.find(
            (game) =>
              game.title === gameData.igdbData.title ||
              game.igdb_id === gameData.igdbData.igdb_id
          )

          if (lenientMatch) {
            await processGameGenres(gameData, lenientMatch)
            continue
          } else {
            continue
          }
        }

        await processGameGenres(gameData, insertedGame)
      }

      // Link games to user
      const userGamesData = insertedGames.map((game: any) => {
        const steamGamesArray = Array.from(selectedGames)
        const steamGame = steamGamesArray.find(
          (g) =>
            g &&
            typeof g === 'object' &&
            g.appId &&
            g.appId.toString() === game.igdb_id
        )

        const playtime = steamGame ? steamGame.playtime : 0

        return {
          user_id: user.id,
          game_id: game.id,
          status: 'Owned',
          steam_playtime: playtime,
          platforms: ['Steam'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          progress: 0,
        }
      })

      // Process user games
      const { data: existingUserGames, error: checkError } = await supabase
        .from('user_games')
        .select('id, user_id, game_id, platforms')
        .in(
          'game_id',
          insertedGames.map((game) => game.id)
        )
        .eq('user_id', user.id)

      if (checkError) throw checkError

      const newUserGames: any[] = []
      const existingGamesToUpdate: any[] = []

      for (const newGame of userGamesData) {
        const existingGame = existingUserGames?.find(
          (existing: any) =>
            existing.game_id === newGame.game_id &&
            existing.user_id === newGame.user_id
        )

        if (existingGame) {
          const currentPlatforms = existingGame.platforms || []
          const newPlatform = 'Steam'

          if (!currentPlatforms.includes(newPlatform)) {
            existingGamesToUpdate.push({
              id: existingGame.id,
              game_id: existingGame.game_id,
              platforms: [...currentPlatforms, newPlatform],
              updated_at: new Date().toISOString(),
            })
          }
        } else {
          newUserGames.push(newGame)
        }
      }

      // Insert and update games
      if (newUserGames.length > 0) {
        const { error } = await supabase.from('user_games').insert(newUserGames)
        if (error) throw error
      }

      if (existingGamesToUpdate.length > 0) {
        for (const game of existingGamesToUpdate) {
          const { error } = await supabase
            .from('user_games')
            .update({
              platforms: game.platforms,
              updated_at: new Date().toISOString(),
            })
            .eq('id', game.id)
            .eq('user_id', user.id)

          if (error) throw error
        }
      }

      await fetchUserLibrary()
      // Show success toast for added games
      const addToast = document.getElementById('success-toast')
      if (addToast) addToast.classList.remove('hidden')
      setTimeout(() => {
        const addToast = document.getElementById('success-toast')
        if (addToast) addToast.classList.add('hidden')
      }, 3000)
      setSelectedGames(new Set())
    } catch (error) {
      console.error('Error adding games to library:', error)
      const errorToast = document.getElementById('error-toast')
      if (errorToast) errorToast.classList.remove('hidden')
      setTimeout(() => {
        const errorToast = document.getElementById('error-toast')
        if (errorToast) errorToast.classList.add('hidden')
      }, 3000)
    }
  }

  const fetchUserLibrary = async () => {
    try {
      const { data, error } = await supabase
        .from('user_games')
      .select(
          `
          game_id,
          platforms,
          games:game_id (
            id,
            igdb_id,
            provider,
            title
          )
        `
        )
        .eq('user_id', user.id)

      if (error) throw error

      const normalizeTitle = (title: string) =>
        title
          .toLowerCase()
          .replace(/[^\w\s]/gi, '')
          .trim()

      const gameMap = new Map<number, string[]>()

      data.forEach((item) => {
        let appId: number | null = null

        if (item.games?.provider === 'steam') {
          appId = parseInt(item.games.igdb_id, 10)
        } else if (item.games?.provider === 'igdb') {
          const match = steamGames.find(
            (g) => normalizeTitle(g.name) === normalizeTitle(item.games.title)
          )
          appId = match?.appId ?? null
        }

        if (appId && !isNaN(appId)) {
          const existingPlatforms = gameMap.get(appId) || []
          gameMap.set(appId, [
            ...new Set([...existingPlatforms, ...(item.platforms || [])]),
          ])
        }
      })

      setUserLibraryGames(gameMap)
    } catch (error) {
      console.error('Error fetching user library:', error)
      setError('Failed to fetch user library')
    }
  }

  useEffect(() => {
    if (user?.id && steamGames.length > 0) {
      fetchUserLibrary()
    }
  }, [user, steamGames])

  // Update the useEffect that handles the OpenID response
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    // Check if we have an OpenID response from Steam
    if (urlParams.has('openid.claimed_id')) {
      handleOpenIDResponse()
    }
  }, [])

  const handleDisconnectSteam = async () => {
    try {
      // Remove Steam profile from database
      const { error } = await supabase
        .from('user_steam_profiles')
        .delete()
        .eq('user_id', user.id)

      if (error) throw error

      // Clear Steam games from state
      setSteamGames([])
      setSelectedGames(new Set())

      // Update user state to remove Steam info
      setUser({
        ...user,
        steamId: null,
      })
    } catch (error) {
      console.error('Error disconnecting Steam:', error)
      setError('Failed to disconnect Steam account')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="alert alert-error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
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
          <span>{error}</span>
          <button
            className="btn btn-sm"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="alert alert-warning">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>No user data found. Try signing out and back in.</span>
          <button className="btn btn-sm" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Success Toast */}
      <div id="success-toast" className="toast toast-top toast-end hidden">
        <div className="alert alert-success">
          <span>Games added to your library!</span>
        </div>
      </div>

      {/* Error Toast */}
      <div id="error-toast" className="toast toast-top toast-end hidden">
        <div className="alert alert-error">
          <span>
            Something went wrong while adding your games. Please try again.
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">User Profile</h1>

        {/* User Info Section */}
        <div className="card bg-base-200 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title mb-4">Account Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <div className="flex items-center gap-2">
                  {isEditingName ? (
                    <>
                      <input
                        type="text"
                        className="input input-bordered w-full max-w-xs"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        placeholder="Enter your name"
                        autoFocus
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={async () => {
                          try {
                            const { error } = await supabase.auth.updateUser({
                              data: { full_name: editedName },
                            })
                            if (error) throw error

                            // Update local user state
                            setUser({
                              ...user,
                              user_metadata: {
                                ...user.user_metadata,
                                full_name: editedName,
                              },
                            })

                            // Exit edit mode
                            setIsEditingName(false)

                            // Show success toast
                            const toast =
                              document.getElementById('success-toast')
                            if (toast) toast.classList.remove('hidden')
                            setTimeout(() => {
                              const toast =
                                document.getElementById('success-toast')
                              if (toast) toast.classList.add('hidden')
                            }, 3000)
                          } catch (error) {
                            console.error('Error updating name:', error)
                            // Show error toast
                            const toast = document.getElementById('error-toast')
                            if (toast) toast.classList.remove('hidden')
                            setTimeout(() => {
                              const toast =
                                document.getElementById('error-toast')
                              if (toast) toast.classList.add('hidden')
                            }, 3000)
                          }
                        }}
                      >
                        Save
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setIsEditingName(false)
                          setEditedName(user.user_metadata?.full_name || '')
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-lg">
                        {user.user_metadata?.full_name || 'No name set'}
                      </p>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setEditedName(user.user_metadata?.full_name || '')
                          setIsEditingName(true)
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <p className="text-lg">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Member Since</label>
                <p className="text-lg">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Connect to Steam Section */}
        <div className="card bg-base-200 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title mb-4">Steam Connection</h2>
            {loadingGames ? (
              <div className="flex justify-center">
                <div className="loading loading-spinner loading-lg"></div>
              </div>
            ) : steamGames.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-success">✓ Connected to Steam</p>
                    <p className="text-sm opacity-70">
                      {steamGames.length} games found
                    </p>
                  </div>
                  <button
                    className="btn btn-error btn-sm"
                    onClick={handleDisconnectSteam}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleConnectToSteam}
              >
                Connect to Steam
              </button>
            )}
          </div>
        </div>

        {/* Steam Games Section */}
        {user.steamId && (
          <div className="card bg-base-200 shadow-xl mb-8">
            <div className="card-body">
              <h2 className="card-title mb-4">Steam Games</h2>
              <p className="text-sm opacity-70 mb-4">
                These are the games from your connected Steam account. You can
                add them to your Backlog Explorer library to track them here. If
                a game is already in your library from another platform, you can
                still click it to include Steam as well.
              </p>
              {loadingGames ? (
                <div className="flex justify-center">
                  <div className="loading loading-spinner loading-lg"></div>
                </div>
              ) : steamGames.length > 0 ? (
                <>
                  <input
                    type="text"
                    className="input input-bordered w-full max-w-xs mb-4"
                    placeholder="Search your Steam games..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {steamGames
                      .filter((game) =>
                        game.name
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase())
                      )
                      .slice(0, visibleCount)
                      .map((game) => {
                        const platforms = userLibraryGames.get(game.appId)
                        const hasSteam = platforms?.includes('Steam')
                        const inLibrary = Boolean(platforms)

                        return (
                          <div
                            key={game.appId}
                            className={`card bg-base-100 shadow-sm ${
                              hasSteam
                                ? 'opacity-50 cursor-not-allowed'
                                : 'cursor-pointer'
                            } ${
                              selectedGames.has(game.appId.toString())
                                ? 'ring-2 ring-primary'
                                : ''
                            }`}
                            onClick={() => {
                              if (!hasSteam) {
                                toggleGameSelection(game.appId.toString())
                              }
                            }}
                          >
                            <div className="card-body p-4">
                              <div className="flex items-center space-x-4">
                                <img
                                  src={game.iconUrl}
                                  alt={game.name}
                                  className="w-16 h-16 object-cover"
                                />
                                <div>
                                  <h3 className="font-medium">{game.name}</h3>
                                  <p className="text-sm opacity-70">
                                    Playtime: {Math.round(game.playtime / 60)}{' '}
                                    hours
                                  </p>
                                  {inLibrary && !hasSteam && platforms && (
                                    <p className="text-xs opacity-60">
                                      Owned on:{' '}
                                      {platforms
                                        .filter((p) => p !== 'Steam')
                                        .join(', ')}
                                    </p>
                                  )}
                                  {hasSteam && (
                                    <span className="badge badge-secondary text-xs px-2 py-1 rounded-full">
                                      In library
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                  {visibleCount <
                    steamGames.filter((game) =>
                      game.name.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length && (
                    <div className="mt-4 flex justify-center">
                      <button
                        className="btn btn-outline"
                        onClick={() => setVisibleCount((prev) => prev + 30)}
                      >
                        Load More
                      </button>
                    </div>
                  )}
                  {selectedGames.size > 0 && (
                    <div className="mt-4 flex justify-end">
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          addSelectedGamesToLibrary()
                        }}
                      >
                        Add {selectedGames.size} Games to Library
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="alert alert-info">
                  <span>No Steam games found in your library.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Section */}
        <div className="card bg-base-200 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title mb-4">Settings</h2>
            <div className="space-y-4">
              <div className="form-control w-full max-w-xs">
                <label className="label">
                  <span className="label-text">Theme</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={theme}
                  onChange={(e) => handleThemeChange(e.target.value)}
                >
                  {themes.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
                <label className="label">
                  <span className="label-text-alt">
                    Choose your preferred theme
                  </span>
                  <span className="label-text-alt text-xs opacity-50">
                    Powered by DaisyUI
                  </span>
                </label>
              </div>

              <div className="divider"></div>

              <button className="btn btn-error" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
