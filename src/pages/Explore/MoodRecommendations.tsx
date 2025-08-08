import { useState, useEffect, useRef } from 'react'
import { logFeatureUsage } from '../../utils/logger'
import { Link } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import supabase from '../../supabaseClient'
import { Game, Mood } from '../../types/database'
import { gameService } from '../../services/gameService'

// Accepts optional cache Map
const fetchExternalDescription = async (
  gameId: string,
  cache?: Map<string, string>
): Promise<string | null> => {
  if (cache && cache.has(gameId)) {
    return cache.get(gameId) || null;
  }

  const { data, error } = await supabase
    .from('games')
    .select('igdb_id, provider')
    .eq('id', gameId)
    .single()

  if (error || !data) return null

  if (data.provider === 'igdb' && data.igdb_id) {
    try {
      const gameDetails = await gameService.getGameDetails(
        data.igdb_id.toString()
      )
      const desc = gameDetails.summary || null;
      if (cache && desc) cache.set(gameId, desc);
      return desc
    } catch (error) {
      console.error('Error fetching IGDB details:', error)
      return null
    }
  }

  return null
}

interface UserGameWithGame {
  game_id: string
  game: {
    id: string
    title: string
    igdb_id: string
    provider: string
    background_image?: string
    description?: string
  }
}

interface MoodRecommendationsProps {
  isDevUser: boolean;
}

const MoodRecommendations = ({ isDevUser }: MoodRecommendationsProps) => {
  // In-memory cache for IGDB descriptions (gameId -> description)
  const igdbDescriptionCache = useRef<Map<string, string>>(new Map());
  const [user, setUser] = useState<User | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [selectedMoods, setSelectedMoods] = useState<string[]>([])
  const [recommendedGames, setRecommendedGames] = useState<Game[]>([])
  const [aiReasons, setAiReasons] = useState<Record<string, string>>({})
  const [availableMoods, setAvailableMoods] = useState<Mood[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [gameMoods, setGameMoods] = useState<
    { game_id: string; mood_id: string }[]
  >([])
  const [showResults, setShowResults] = useState(false)
  const [primaryMood, setPrimaryMood] = useState<Mood | null>(null)
  const [secondaryMood, setSecondaryMood] = useState<Mood | null>(null)
  const [showAllPrimary, setShowAllPrimary] = useState(false)
  const [showAllSecondary, setShowAllSecondary] = useState(false)
  const [showPrimaryMoreMessage, setShowPrimaryMoreMessage] = useState(false)
  const [showSecondaryMoreMessage, setShowSecondaryMoreMessage] =
    useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new content appears
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [selectedMoods, recommendedGames, isLoading])

  // Get the current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const firstName = user.user_metadata?.full_name?.split(' ')[0] || ''
        setUserName(firstName)
      }
    }

    getCurrentUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const firstName =
          session.user.user_metadata?.full_name?.split(' ')[0] || ''
        setUserName(firstName)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Load available moods
  useEffect(() => {
    const loadMoods = async () => {
      try {
        const { data: moods, error: moodsError } = await supabase
          .from('moods')
          .select('*')
          .throwOnError()

        if (moodsError) throw moodsError

        if (!moods) {
          console.warn('No moods data received')
          return
        }

        // Sort moods by category (primary first) and then by name
        const sortedMoods = [...moods].sort((a, b) => {
          if (a.category === 'primary' && b.category !== 'primary') return -1
          if (a.category !== 'primary' && b.category === 'primary') return 1
          return a.name.localeCompare(b.name)
        })

        setAvailableMoods(sortedMoods)
      } catch (error) {
        console.error('Error loading moods:', error)
        setError('Failed to load moods')
      }
    }

    loadMoods()
  }, [])

  // Fetch recommended games when selected moods change
  useEffect(() => {
    const fetchRecommendedGames = async () => {
  if (!user || selectedMoods.length === 0) {
    setRecommendedGames([])
    setAiReasons({})
    return
  }

      try {
        setIsLoading(true)
        setError(null)

        // First, get all games the user has added
        const { data: userGames, error: userGamesError } = await supabase
          .from('user_games')
          .select('game_id, status')
          .eq('user_id', user.id)
          .throwOnError()

        if (userGamesError) throw userGamesError

        // Log feature usage AFTER fetching userGames
        logFeatureUsage({
          user_id: user.id,
          feature: 'mood_recommendation',
          metadata: {
            selectedMoods,
            isDevUser,
            status: selectedStatus,
            backlogSize: userGames.length,
          },
        })

        // ...continue with the rest of the recommendation logic (no duplicate fetch)

        // Filter by status if specified
        const filteredGameIds =
          selectedStatus === 'all'
            ? userGames.map((ug) => ug.game_id)
            : userGames
                .filter((ug) => ug.status === selectedStatus)
                .map((ug) => ug.game_id)

        if (filteredGameIds.length === 0) {
          setRecommendedGames([])
          return
        }

        // Get all game_moods entries for these games
        const { data: gameMoods, error: gameMoodsError } = await supabase
          .from('game_moods')
          .select('game_id, mood_id')
          .in('game_id', filteredGameIds)
          .throwOnError()

        if (gameMoodsError) throw gameMoodsError

        setGameMoods(gameMoods)

        // Calculate match scores for each game
        const gameScores = new Map<string, number>()
        gameMoods.forEach((gm) => {
          if (selectedMoods.includes(gm.mood_id)) {
            const currentScore = gameScores.get(gm.game_id) || 0
            gameScores.set(gm.game_id, currentScore + 1)
          }
        })

        // Get game details for games with matches
        const matchedGameIds = Array.from(gameScores.entries())
          .filter(([_, score]) => score > 0)
          .sort((a, b) => b[1] - a[1]) // Sort by match score descending
          .map(([gameId]) => gameId)
          .slice(0, 10) // Limit to top 10 matches

        if (matchedGameIds.length === 0) {
          setRecommendedGames([])
          return
        }

        const { data: gamesWithDescriptions, error: gamesError } =
          await supabase
            .from('user_games')
            .select(
              `
    game_id,
    game:games (
      id,
      title,
      igdb_id,
      provider,
      background_image,
      description
    )
  `
            )
            .eq('user_id', user.id)
            .in('game_id', matchedGameIds)
            .throwOnError()

        if (gamesError) throw gamesError

        const games: Game[] = (
          (gamesWithDescriptions || []) as unknown as UserGameWithGame[]
        ).map((entry) => ({
          id: entry.game.id,
          title: entry.game.title,
          igdb_id: entry.game.igdb_id,
          provider: entry.game.provider,
          background_image: entry.game.background_image,
          description: entry.game.description,
        }))

        // Sort games by match score
        const sortedGames: Game[] = games.sort((a, b) => {
          const scoreA = gameScores.get(a.id) || 0
          const scoreB = gameScores.get(b.id) || 0
          return scoreB - scoreA
        })

        // Attempt LLM re-rank + reasons BEFORE fetching external descriptions
        try {
          const selectedMoodNames = getMoodNames(selectedMoods)
          if (!user?.id) {
            console.warn('[MoodRecommendations] Missing auth user.id; skipping mood-recommend call to avoid FK error')
            setRecommendedGames(sortedGames)
            setTimeout(() => setShowResults(true), 600)
            return
          }
          const payload = {
            userId: user.id,
            userEmail: user.email,
            isDevUser,
            selectedMoodNames,
            status: selectedStatus,
            games: sortedGames.slice(0, 20).map((g) => ({
              game_id: g.id,
              title: g.title,
              description: g.description || '',
              matched_moods: getMatchedMoodsForGame(g.id),
            })),
          }

          const res = await fetch('/api/mood-recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

          // Default to deterministic order
          let finalOrdered: Game[] = [...sortedGames]
          if (res.ok) {
            const data = await res.json()
            const items: { game_id: string; score: number; reason: string }[] =
              Array.isArray(data?.items) ? data.items : []

            // Build reason map and reorder according to items if provided
            const reasonMap: Record<string, string> = {}
            items.forEach((it) => {
              if (it.reason) reasonMap[it.game_id] = it.reason
            })
            setAiReasons(reasonMap)

            if (items.length > 0) {
              const order = new Map(items.map((it, idx) => [it.game_id, idx]))
              const reOrdered = [...sortedGames].sort((a, b) => {
                const ia = order.has(a.id) ? order.get(a.id)! : 9999
                const ib = order.has(b.id) ? order.get(b.id)! : 9999
                return ia - ib
              })
              finalOrdered = reOrdered
            }
          }
          // After final order is decided, fetch external descriptions for TOP 6 only
          const TOP_DESC = 6
          const withTopDescriptions: Game[] = []
          for (let i = 0; i < finalOrdered.length; i++) {
            const g = finalOrdered[i]
            if (!g.description && i < TOP_DESC) {
              try {
                const fallbackDescription = await fetchExternalDescription(
                  g.id,
                  igdbDescriptionCache.current
                )
                withTopDescriptions.push({ ...g, description: fallbackDescription || '' })
              } catch {
                withTopDescriptions.push(g)
              }
            } else {
              // Populate cache if not present
              if (g.description && !igdbDescriptionCache.current.has(g.id)) {
                igdbDescriptionCache.current.set(g.id, g.description)
              }
              withTopDescriptions.push(g)
            }
          }
          setRecommendedGames(withTopDescriptions)
        } catch (e) {
          // Network/parse issues -> fallback to deterministic order and avoid mass IGDB calls
          setRecommendedGames(sortedGames)
        }
        setTimeout(() => setShowResults(true), 600)
      } catch (error) {
        console.error('Error fetching recommended games:', error)
        setError('Failed to fetch recommended games')
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecommendedGames()
  }, [user, selectedMoods, selectedStatus])

  const getMoodNames = (moodIds: string[]) => {
    return moodIds
      .map((id) => {
        const mood = availableMoods.find((m) => m.id === id)
        return mood?.name || ''
      })
      .filter(Boolean)
  }

  const getPersonalizedComment = (
    game: Game,
    matchedMoods: string[]
  ): string => {
    const lowerMoods = matchedMoods.map((m) => m.toLowerCase())
    if (lowerMoods.includes('cozy')) return 'feels like a hug in game form ☕️'
    if (lowerMoods.includes('chaotic')) return 'might get a little wild 😈'
    if (lowerMoods.includes('cute')) return 'prepare for cuteness overload 🐣'
    if (lowerMoods.includes('relaxing')) return 'a peaceful little escape 🌿'
    if (lowerMoods.includes('narrative'))
      return 'looks like a story worth getting lost in 📖'
    return 'looks like a solid match 🎯'
  }

  const getMatchedMoodsForGame = (gameId: string) => {
    return gameMoods
      .filter(
        (gm) => gm.game_id === gameId && selectedMoods.includes(gm.mood_id)
      )
      .map((gm) => {
        const mood = availableMoods.find((m) => m.id === gm.mood_id)
        return mood?.name || ''
      })
      .filter(Boolean)
  }

  const handleSurpriseMe = () => {
    if (availableMoods.length === 0) return

    const primaryMoods = availableMoods.filter((m) => m.category === 'primary')
    const secondaryMoods = availableMoods.filter(
      (m) => m.category === 'secondary'
    )

    const randomPrimary =
      primaryMoods[Math.floor(Math.random() * primaryMoods.length)]
    const randomSecondary =
      secondaryMoods[Math.floor(Math.random() * secondaryMoods.length)]

    setSelectedMoods([randomPrimary.id, randomSecondary.id])
  }

  const statusOptions = [
    { value: 'all', label: 'All Games' },
    { value: 'Wishlist', label: 'Wishlist' },
    { value: 'Currently Playing', label: 'Currently Playing' },
    { value: 'Owned', label: 'Owned' },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">
        MoodBot - Your Game Recommender
      </h1>

      <div
        ref={chatContainerRef}
        className="flex flex-col items-start space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto"
      >
        {/* Initial bot message */}
        <div className="flex items-start gap-2">
          <span className="text-xl mt-1">🤖</span>
          <div className="bg-base-200 rounded-xl p-4 max-w-md shadow">
            <p className="text-sm text-base-content">
              <strong>MoodBot:</strong> {userName ? `Hi ${userName}!` : 'Hi!'}{' '}
              What kind of mood are you in today? I'll help you find the perfect
              game from your backlog!
            </p>
          </div>
        </div>

        {/* User mood selection */}
        {selectedMoods.length === 0 && (
          <div className="flex items-end justify-end w-full">
            <div className="bg-primary border border-base-300 rounded-xl p-4 max-w-md shadow">
              {!primaryMood && (
                <>
                  <p className="text-sm text-primary-content mb-2 font-medium">
                    Choose a mood to start:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableMoods
                      .filter((m) => m.category === 'primary')
                      .slice(0, showAllPrimary ? 999 : 5)
                      .map((mood) => (
                        <button
                          key={mood.id}
                          onClick={() => setPrimaryMood(mood)}
                          className="px-3 py-1 bg-info text-info-content rounded-full text-sm hover:bg-info"
                        >
                          {mood.emoji} {mood.name}
                        </button>
                      ))}
                  </div>
                  {!showAllPrimary && (
                    <button
                      onClick={() => setShowPrimaryMoreMessage(true)}
                      className="btn btn-xs btn-outline btn-accent mt-2"
                    >
                      🙋 Show me more moods
                    </button>
                  )}
                </>
              )}

              {primaryMood && !secondaryMood && (
                <>
                  <p className="text-sm text-primary-content mb-2 font-medium">
                    Add a second flavor?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableMoods
                      .filter((m) => m.category === 'secondary')
                      .slice(0, showAllSecondary ? 999 : 5)
                      .map((mood) => (
                        <button
                          key={mood.id}
                          onClick={() => {
                            setSecondaryMood(mood)
                            setSelectedMoods([primaryMood.id, mood.id])
                          }}
                          className="px-3 py-1 bg-success text-success-content rounded-full text-sm hover:bg-success"
                        >
                          {mood.emoji} {mood.name}
                        </button>
                      ))}
                  </div>
                  {!showAllSecondary && (
                    <button
                      onClick={() => setShowSecondaryMoreMessage(true)}
                      className="btn btn-xs btn-outline btn-accent mt-2"
                    >
                      🙋 Show me more moods
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Chat-style "Show more" messages */}
        {showPrimaryMoreMessage && !primaryMood && (
          <div className="flex items-start gap-2">
            <span className="text-xl mt-1">🤖</span>
            <div className="bg-base-200 rounded-xl p-4 max-w-md shadow">
              <p className="text-sm text-base-content mb-2">
                <strong>MoodBot:</strong> Sure! Here are a few more moods to
                pick from:
              </p>
              <div className="flex flex-wrap gap-2">
                {availableMoods
                  .filter((m) => m.category === 'primary')
                  .slice(5)
                  .map((mood) => (
                    <button
                      key={mood.id}
                      onClick={() => setPrimaryMood(mood)}
                      className="px-3 py-1 bg-info text-info-content rounded-full text-sm hover:bg-info"
                    >
                      {mood.emoji} {mood.name}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {showSecondaryMoreMessage && primaryMood && !secondaryMood && (
          <div className="flex items-start gap-2">
            <span className="text-xl mt-1">🤖</span>
            <div className="bg-base-200 rounded-xl p-4 max-w-md shadow">
              <p className="text-sm text-base-content mb-2">
                <strong>MoodBot:</strong> Here are a few more moods that might
                fit:
              </p>
              <div className="flex flex-wrap gap-2">
                {availableMoods
                  .filter((m) => m.category === 'secondary')
                  .slice(5)
                  .map((mood) => (
                    <button
                      key={mood.id}
                      onClick={() => {
                        setSecondaryMood(mood)
                        setSelectedMoods([primaryMood.id, mood.id])
                      }}
                      className="px-3 py-1 bg-success text-success-content rounded-full text-sm hover:bg-success"
                    >
                      {mood.emoji} {mood.name}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Show selected moods */}
        {selectedMoods.length > 0 && (
          <div className="flex items-end justify-end w-full">
            <div className="bg-primary border border-base-300 rounded-xl p-4 max-w-md shadow">
              <p className="text-sm text-primary-content font-medium">
                {getMoodNames(selectedMoods).join(' + ')}
              </p>
            </div>
          </div>
        )}

        {/* Bot thinking message */}
        {isLoading && (
          <div className="flex items-start gap-2">
            <span className="text-xl mt-1">🤖</span>
            <div className="bg-base-200 rounded-xl p-4 max-w-md shadow">
              <p className="text-sm text-base-content">
                <strong>MoodBot:</strong> Let me check your backlog...
              </p>
              <div className="flex space-x-1 mt-2">
                <div
                  className="w-2 h-2 bg-base-content rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="w-2 h-2 bg-base-content rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="w-2 h-2 bg-base-content rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2">
            <span className="text-xl mt-1">🤖</span>
            <div className="bg-error border border-error rounded-xl p-4 max-w-md shadow">
              <p className="text-sm text-error-content">
                <strong>MoodBot:</strong> Oops! {error}
              </p>
            </div>
          </div>
        )}

        {/* Game recommendations */}
        {!isLoading &&
          !error &&
          selectedMoods.length > 0 &&
          recommendedGames.length > 0 &&
          showResults && (
            <div className="flex items-start gap-2">
              <span className="text-xl mt-1">🎯</span>
              <div className="bg-base-200 rounded-xl p-4 max-w-md shadow">
                <p className="text-sm text-base-content mb-3">
                  {(() => {
                    const names = getMoodNames(selectedMoods)
                    if (names.length === 1) return <>You’re in a <strong>{names[0]}</strong> mood — here are a few picks:</>
                    if (names.length >= 2) return <>You’re in a <strong>{names[0]}</strong> + <strong>{names[1]}</strong> mood — here are a few picks:</>
                    return <>Here are some games that fit your mood:</>
                  })()}
                </p>
                <div className="space-y-4">
                  {recommendedGames.map((game) => (
                    <Link
                      to={`/app/game/${game.id}`}
                      key={game.id}
                      className="block bg-base-100 border p-4 rounded-lg shadow hover:shadow-lg transition-shadow duration-200"
                    >
                      <p className="text-sm text-base-content">
                        <strong>🎮 {game.title}</strong>
                      </p>
                      <img
                        src={game.image || game.background_image}
                        alt={game.title}
                        className="w-full h-40 object-cover rounded my-2"
                      />
                      <p className="text-sm text-base-content mt-1 italic">
                        <span className="opacity-80">Why it fits:</span>{' '}
                        {aiReasons[game.id]
                          ? aiReasons[game.id]
                          : getPersonalizedComment(
                              game,
                              getMatchedMoodsForGame(game.id)
                            )}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {getMatchedMoodsForGame(game.id).map((m) => (
                          <span key={m} className="badge badge-ghost badge-sm">
                            {m}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-base-content mt-2 line-clamp-3">
                        {game.description || 'No description available.'}
                      </p>
                    </Link>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setSelectedMoods([])
                    setPrimaryMood(null)
                    setSecondaryMood(null)
                    setShowResults(false)
                  }}
                  className="btn btn-sm btn-outline btn-info mt-4"
                >
                  🔁 Try another mood
                </button>
              </div>
            </div>
          )}

        {/* No matches message */}
        {!isLoading &&
          !error &&
          selectedMoods.length > 0 &&
          recommendedGames.length === 0 && (
            <div className="flex items-start gap-2">
              <span className="text-xl mt-1">🤖</span>
              <div className="bg-base-200 rounded-xl p-4 max-w-md shadow">
                <p className="text-sm text-base-content mb-4">
                  <strong>MoodBot:</strong> Hmm, I couldn't find any games in
                  your backlog that match your current mood. Maybe try different
                  moods or add more games to your collection?
                </p>
                <button
                  onClick={() => {
                    setSelectedMoods([])
                    setPrimaryMood(null)
                    setSecondaryMood(null)
                    setShowResults(false)
                  }}
                  className="btn btn-sm btn-outline btn-info"
                >
                  🔁 Try another mood
                </button>
              </div>
            </div>
          )}
      </div>
    </div>
  )
}

export default MoodRecommendations
