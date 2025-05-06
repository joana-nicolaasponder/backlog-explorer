import React, { useState } from 'react'
import supabase from '../supabaseClient'

const BacklogBuddy = () => {
  const [consideringGame, setConsideringGame] = useState('')
  const [mode, setMode] = useState('purchase_alternative') // Default to 'purchase_alternative'
  const [recommendedGames, setRecommendedGames] = useState<any[]>([])
  const [introLine, setIntroLine] = useState('')
  const [outroLine, setOutroLine] = useState('')
  const [isLoading, setIsLoading] = useState(false)
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

    // Fetch backlog from Supabase
    const { data: userGames, error } = await supabase
      .from('user_games')
      .select(`
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
      `)
      .eq('user_id', userId)
      .not('status', 'in.("Done","Endless","Satisfied","DNF")')

    if (error || !userGames) {
      console.error('Failed to fetch backlog:', error)
      setIsLoading(false)
      return
    }

    const payload = {
      mode,
      consideringGame,
      backlog: userGames.map((entry) => ({
        title: entry.games?.title || '',
        genre: entry.games?.game_genres?.map((g) => g.genres.name).join(', ') || '',
        playStyle: '',
        playtime: '',
      })),
    }
    const res = await fetch('http://localhost:3001/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const result = await res.json()
    console.log('GPT Recommendation:', result.recommendation)

    const lines = result.recommendation.split('\n').map(line => line.trim())

    const intro = lines.find(line => /^instead of picking/i.test(line))
    const outro = lines.find(line => /^give one of these/i.test(line) || /enjoy these games/i.test(line))

    setIntroLine(intro || '')
    setOutroLine(outro || '')

    const numberedLines = result.recommendation.split('\n').filter((line) =>
      /^\d+\.\s+\*\*/.test(line.trim())
    )

    const matches = numberedLines.map((line) => {
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
        genres: matchedGame.games.game_genres?.map((g) => g.genres.name) || [],
        recommendationNote: note.trim(),
      }
    }).filter(Boolean)

    setRecommendedGames(matches as any)
    setIsLoading(false)
  }

  return (
    <div>
      {/* other UI elements */}
      {mode === 'purchase_alternative' && (
        <div className="mb-6">
          <label className="label">
            <span className="label-text text-lg">🎮 What game are you thinking of buying?</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full max-w-md mr-2"
            value={consideringGame}
            onChange={(e) => setConsideringGame(e.target.value)}
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
              <span className="text-sm text-base-content">Searching for alternatives...</span>
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
                <div key={index} className="p-4 border rounded-lg bg-base-100 shadow flex gap-4">
                  <img src={game.image || '/default-image.jpg'} alt={game.title} className="w-24 h-24 object-cover rounded" />
                  <div>
                    <h3 className="text-lg font-bold">{game.title}</h3>
                    <p className="text-sm text-base-content italic">{game.recommendationNote}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {game.genres.map((genre: string) => (
                        <span key={genre} className="badge badge-accent">{genre}</span>
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
