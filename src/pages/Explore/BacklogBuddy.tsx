import React, { useState } from 'react'
import { logFeatureUsage } from '../../utils/logger'
import supabase from '../../supabaseClient'

const BacklogBuddy = ({ isDevUser }: { isDevUser: boolean }) => {
  const [consideringGame, setConsideringGame] = useState('')
  const [mode, setMode] = useState('purchase_alternative') // Default to 'purchase_alternative'
  const [recommendedGames, setRecommendedGames] = useState<any[]>([])
  const [introLine, setIntroLine] = useState('')
  const [outroLine, setOutroLine] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [rawRecommendation, setRawRecommendation] = useState('')
  const [bypassOwnershipCheck, setBypassOwnershipCheck] = useState(false)
  // other states and logic ...

  const handleGetRecommendation = async () => {
    setIsLoading(true)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('User not logged in or failed to fetch user:', userError)
      setIsLoading(false)
      return
    }

    const userId = user.id

    // Fetch ALL user games (for ownership check)
    const { data: allUserGames, error: allGamesError } = await supabase
      .from('user_games')
      .select(
        `
        game_id,
        status,
        progress,
        games (
          id,
          title,
          background_image,
          game_genres (
            genres (
              name
            )
          )
        )
      `
      )
      .eq('user_id', userId)

    if (allGamesError) {
      console.error('Error fetching user games:', allGamesError)
      setIsLoading(false)
      return
    }


    // Fetch backlog (filtered, for GPT)
    const { data: userGames, error } = await supabase
      .from('user_games')
      .select(
        `
        game_id,
        status,
        progress,
        games (
          id,
          title,
          background_image,
          game_genres (
            genres (
              name
            )
          )
        )
      `
      )
      .eq('user_id', userId)
      .not('status', 'in.("Done","Endless","Satisfied","DNF")')

    if (error || !userGames) {
      console.error('Failed to fetch backlog:', error)
      setIsLoading(false)
      return
    }

    // Check if the user already owns the game they're considering
    function normalize(str: string) {
      return str
        .toLowerCase()
        .replace(/[^a-z0-9]/gi, '') // remove punctuation and spaces
        .trim();
    }
    const normalizedConsidering = normalize(consideringGame);
    console.log('consideringGame:', consideringGame, 'normalized:', normalizedConsidering);
    userGames.forEach(entry => {
      const backlogTitle = entry.games?.title || '';
      const normalizedBacklogTitle = normalize(backlogTitle);
      console.log('Backlog title:', backlogTitle, 'normalized:', normalizedBacklogTitle);
    });
    const alreadyOwned = allUserGames.some((entry) => {
      const backlogTitle = entry.games?.title || '';
      const normalizedBacklogTitle = normalize(backlogTitle);
      // Match if either title contains the other
      return (
        normalizedBacklogTitle.includes(normalizedConsidering) ||
        normalizedConsidering.includes(normalizedBacklogTitle)
      );
    });

    if (alreadyOwned && !bypassOwnershipCheck) {
      console.log('Already owned detected!');
      setRawRecommendation(
        `Hey! You already own "${consideringGame}". Maybe give it a try before buying it again? If you want, I can still recommend some similar games from your backlog!`
      )
      setRecommendedGames([])
      setIsLoading(false)
      setTimeout(() => {
        console.log('rawRecommendation:', rawRecommendation);
        console.log('recommendedGames:', recommendedGames);
        console.log('isLoading:', isLoading);
      }, 100);
      return
    }

    const payload = {
      mode,
      consideringGame,
      backlog: userGames.map((entry) => ({
        title: entry.games?.title || '',
        genre:
          entry.games?.game_genres?.map((g) => g.genres.name).join(', ') || '',
        playStyle: '',
        playtime: '',
      })),
      userId,
      isDevUser,
    }
    const res = await fetch('http://localhost:3001/api/openai/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.status === 429) {
      const { error } = await res.json();
      setRawRecommendation(error || "You've reached your daily limit for recommendations. Please try again tomorrow!");
      setIsLoading(false);
      return;
    }

    const result = await res.json()
    console.log('GPT Recommendation:', result.recommendation)
    setRawRecommendation(result.recommendation || '')

    const lines = result.recommendation.split('\n').map((line) => line.trim())

    const intro = lines.find((line) => /^instead of picking/i.test(line))
    const outro = lines.find(
      (line) =>
        /^give one of these/i.test(line) || /enjoy these games/i.test(line)
    )

    setIntroLine(intro || '')
    setOutroLine(outro || '')

    const numberedLines = result.recommendation
      .split('\n')
      .filter((line) => /^\d+\.\s+\*\*/.test(line.trim()))

    const matches = numberedLines
      .map((line) => {
        const match = line.match(/^\d+\.\s+\*\*(.+?)\*\*\s*[-:]?\s*(.*)/)
        if (!match) return null
        const [_, title, note] = match

        const matchedGame = userGames.find((g) =>
          g.games?.title.toLowerCase().includes(title.toLowerCase())
        )

        if (!matchedGame) return null

        return {
          gameId: matchedGame.game_id,
          title: matchedGame.games.title,
          status: matchedGame.status,
          image: matchedGame.games.background_image,
          genres:
            matchedGame.games.game_genres?.map((g) => g.genres.name) || [],
          recommendationNote: note.trim(),
        }
      })
      .filter(Boolean)

    setRecommendedGames(matches as any)
    setIsLoading(false)

    // Enhanced feature usage logging: include considered game and actual recommendations
    logFeatureUsage({
      user_id: userId,
      feature: 'backlog_buddy',
      metadata: {
        backlogSize: allUserGames.length,
        consideringGame,
        recommendedGames: (matches || []).map(g => ({
          title: g.title,
          gameId: g.gameId,
          genres: g.genres,
          note: g.recommendationNote,
        })),
        timestamp: new Date().toISOString(),
        isDevUser,
      }
    })
  }

  return (
    <div>
      {/* other UI elements */}
      {mode === 'purchase_alternative' && (
        <div className="mb-6">
          <label className="label">
            <span className="label-text text-lg">
              🎮 What game are you thinking of buying?
            </span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full max-w-md mr-2"
            value={consideringGame}
            onChange={(e) => {
              setConsideringGame(e.target.value);
              setBypassOwnershipCheck(false); // Reset bypass on input change
            }}
            placeholder="Enter the game title"
          />
          <button
            className="btn btn-primary mt-4"
            onClick={handleGetRecommendation}
            disabled={!consideringGame.trim()}
          >
            Find Alternatives
          </button>
          {isLoading && (
            <div className="flex items-center gap-2 mt-4">
              <span className="loading loading-spinner text-primary"></span>
              <span className="text-sm text-base-content">
                Searching for alternatives...
              </span>
            </div>
          )}
          {!isLoading && !recommendedGames.length && rawRecommendation && (
            <div className="mt-6 p-4 bg-base-200 rounded-lg whitespace-pre-wrap text-sm">
              <div>{rawRecommendation}</div>
              {rawRecommendation.includes('You already own') && (
                <div className="mt-6">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setBypassOwnershipCheck(true);
                      setIsLoading(true);
                      setRawRecommendation('');
                      // Ensure bypassOwnershipCheck is true before running recommendation
                      Promise.resolve().then(() => handleGetRecommendation());
                    }}
                  >
                    Recommend anyway
                  </button>
                </div>
              )}
            </div>
          )}
          {recommendedGames.length > 0 && (
            <div className="mt-6 space-y-4">
              {introLine && (
                <div className="mb-4 p-4 bg-base-200 rounded-lg whitespace-pre-wrap text-sm">
                  {introLine}
                </div>
              )}

              {recommendedGames.map((game, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg bg-base-100 shadow flex gap-4"
                >
                  <img
                    src={game.image || '/default-image.jpg'}
                    alt={game.title}
                    className="w-24 h-24 object-cover rounded"
                  />
                  <div>
                    <h3 className="text-lg font-bold">{game.title}</h3>
                    <p className="text-sm text-base-content italic">
                      {game.recommendationNote}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {game.genres.map((genre: string) => (
                        <span key={genre} className="badge badge-accent">
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {outroLine && (
                <div className="mt-4 p-4 bg-base-200 rounded-lg whitespace-pre-wrap text-sm">
                  {outroLine}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* other UI elements */}
    </div>
  )
}

export default BacklogBuddy
