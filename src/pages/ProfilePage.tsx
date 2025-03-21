import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../supabaseClient'
import { useTheme } from '../contexts/ThemeContext'

const ProfilePage = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [steamGames, setSteamGames] = useState<any[]>([])
  const [loadingGames, setLoadingGames] = useState(false)
  const [selectedGames, setSelectedGames] = useState<Set<number>>(new Set())
  const [userLibraryGames, setUserLibraryGames] = useState<Set<number>>(
    new Set()
  )

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
      'openid.return_to': 'http://localhost:5173/app/profile',
      'openid.realm': 'http://localhost:5173',
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    }

    const steamLoginUrl = `https://steamcommunity.com/openid/login?${new URLSearchParams(
      params
    )}`
    console.log('Redirecting to Steam:', steamLoginUrl) // Debug log
    window.location.href = steamLoginUrl
  }

  const handleOpenIDResponse = async () => {
    try {
      // Get all URL parameters
      const urlParams = new URLSearchParams(window.location.search)

      // Debug log
      console.log(
        'OpenID response params:',
        Object.fromEntries(urlParams.entries())
      )

      // Send all OpenID parameters to the backend
      const response = await fetch('http://localhost:3001/api/verify-openid', {
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

      console.log('Steam verification response:', responseData) // Debug log

      // After successful verification, fetch the user's Steam games
      if (responseData.steamId) {
        const gamesResponse = await fetch(
          `http://localhost:3001/api/steam/games/${responseData.steamId}`
        )
        if (!gamesResponse.ok) {
          const gamesError = await gamesResponse.json()
          throw new Error(gamesError.error || 'Failed to fetch Steam games')
        }
        const games = await gamesResponse.json()
        setSteamGames(games)
        console.log('Steam games:', games) // Debug log
      }
    } catch (error) {
      console.error('Error handling OpenID response:', error)
      setError(error.message || 'Failed to handle OpenID response')
    }
  }

  const toggleGameSelection = (appId: number) => {
    const newSelected = new Set(selectedGames)
    if (newSelected.has(appId)) {
      newSelected.delete(appId)
    } else {
      newSelected.add(appId)
    }
    setSelectedGames(newSelected)
  }

  const addSelectedGamesToLibrary = async () => {
    try {
      // First, ensure we have the user's Steam profile stored
      const { data: steamProfile, error: steamProfileError } = await supabase
        .from('user_steam_profiles')
        .upsert({
          user_id: user.id,
          steam_id: user.steamId,
          steam_username: user.nickname,
          steam_avatar: user.avatar,
          steam_profile_url: user.profileUrl,
          last_updated: new Date().toISOString(),
        })
        .select()
        .single()

      if (steamProfileError) throw steamProfileError

      // Get the selected games data
      const selectedGamesData = steamGames.filter((game) =>
        selectedGames.has(game.appId)
      )

      // Insert games into games table
      const { data: insertedGames, error: gamesError } = await supabase
        .from('games')
        .upsert(
          selectedGamesData.map((game) => ({
            title: game.name,
            external_id: game.appId,
            provider: 'steam',
            background_image: game.iconUrl,
            created_at: new Date().toISOString(),
          })),
          {
            onConflict: 'external_id,provider',
            ignoreDuplicates: false,
          }
        )
        .select()

      if (gamesError) throw gamesError

      // Link games to user in user_games table
      const userGamesData = insertedGames.map((game) => ({
        user_id: user.id,
        game_id: game.id,
        status: 'backlog',
        playtime_minutes:
          selectedGamesData.find((g) => g.appId === game.external_id)
            ?.playtime || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      const { error: userGamesError } = await supabase
        .from('user_games')
        .upsert(userGamesData, {
          onConflict: 'user_id,game_id',
          ignoreDuplicates: false,
        })

      if (userGamesError) throw userGamesError

      // Show success message
      const toast = document.createElement('div')
      toast.className = 'alert alert-success'
      toast.innerHTML = `Successfully added ${insertedGames.length} games to your library!`
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 3000)

      // Clear selection
      setSelectedGames(new Set())

      // Refresh the games list
      await fetchUserLibrary()
    } catch (error) {
      console.error('Error adding games to library:', error)
      setError('Failed to add games to library')
    }
  }

  const fetchUserLibrary = async () => {
    try {
      const { data, error } = await supabase
        .from('user_games')
        .select(
          `
          game_id,
          games (
            id,
            external_id,
            provider,
            title
          )
        `
        )
        .eq('user_id', user.id)

      if (error) throw error

      // Store Steam games IDs
      const steamGameIds = new Set(
        data
          .filter((item) => item.games?.provider === 'steam')
          .map((item) => item.games.external_id)
      )
      setUserLibraryGames(steamGameIds)
    } catch (error) {
      console.error('Error fetching user library:', error)
      setError('Failed to fetch user library')
    }
  }

  useEffect(() => {
    if (user?.id) {
      fetchUserLibrary()
    }
  }, [user])

  // Update the useEffect that handles the OpenID response
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    // Check if we have an OpenID response from Steam
    if (urlParams.has('openid.claimed_id')) {
      console.log('Detected OpenID response, handling...') // Debug log
      handleOpenIDResponse()
    }
  }, [])

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
          <span>Name updated successfully!</span>
        </div>
      </div>

      {/* Error Toast */}
      <div id="error-toast" className="toast toast-top toast-end hidden">
        <div className="alert alert-error">
          <span>Failed to update name. Please try again.</span>
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
            <h2 className="card-title mb-4">Connect to Steam</h2>
            <button className="btn btn-primary" onClick={handleConnectToSteam}>
              Connect to Steam
            </button>
          </div>
        </div>

        {/* Steam Games Section */}
        {user.steamId && (
          <div className="card bg-base-200 shadow-xl mb-8">
            <div className="card-body">
              <h2 className="card-title mb-4">Steam Games</h2>
              {loadingGames ? (
                <div className="flex justify-center">
                  <div className="loading loading-spinner loading-lg"></div>
                </div>
              ) : steamGames.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {steamGames.map((game) => (
                      <div
                        key={game.appId}
                        className={`card bg-base-100 shadow-sm ${
                          userLibraryGames.has(game.appId)
                            ? 'opacity-50 cursor-not-allowed'
                            : 'cursor-pointer'
                        } ${
                          selectedGames.has(game.appId)
                            ? 'ring-2 ring-primary'
                            : ''
                        }`}
                        onClick={() => {
                          if (!userLibraryGames.has(game.appId)) {
                            toggleGameSelection(game.appId)
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
                                Playtime: {Math.round(game.playtime / 60)} hours
                              </p>
                              {userLibraryGames.has(game.appId) && (
                                <span className="badge badge-secondary">
                                  Already in library
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedGames.size > 0 && (
                    <div className="mt-4 flex justify-end">
                      <button
                        className="btn btn-primary"
                        onClick={addSelectedGamesToLibrary}
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

        {/* Add this section after your existing profile sections */}
        {steamGames.length > 0 && (
          <div className="card bg-base-200 shadow-xl mb-8">
            <div className="card-body">
              <h2 className="card-title mb-4">Your Steam Games</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {steamGames.map((game) => (
                  <div
                    key={game.appId}
                    className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="card-body p-4">
                      <div className="flex items-center space-x-4">
                        {game.iconUrl && (
                          <img
                            src={game.iconUrl}
                            alt={game.name}
                            className="w-16 h-16 object-cover"
                          />
                        )}
                        <div>
                          <h3 className="font-medium">{game.name}</h3>
                          <p className="text-sm opacity-70">
                            Playtime: {Math.round(game.playtime / 60)} hours
                          </p>
                          <button
                            className="btn btn-sm btn-primary mt-2"
                            onClick={() => toggleGameSelection(game.appId)}
                          >
                            {selectedGames.has(game.appId)
                              ? 'Remove'
                              : 'Add to Library'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {selectedGames.size > 0 && (
                <div className="mt-4 flex justify-end">
                  <button
                    className="btn btn-primary"
                    onClick={addSelectedGamesToLibrary}
                  >
                    Add {selectedGames.size} Games to Library
                  </button>
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
