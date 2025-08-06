// Define a Game interface for type safety and consistency
interface Game {
  gameId: string
  title: string
  genre: string
  mood: string
  status: string
  image: string
  recommendationNote: string
}

import { useState } from 'react'
import supabase from '../../supabaseClient'
import { getSeasonalContext } from './seasonUtils' 

const SeasonRecommendations = ({ isDevUser }: { isDevUser: boolean }) => {
  const [recommendation, setRecommendation] = useState('')
  const [loading, setLoading] = useState(false)
  const [recommendedGames, setRecommendedGames] = useState<Game[]>([])

  const handleGetRecommendation = async () => {
    setLoading(true)
    setRecommendation('')
    setRecommendedGames([])

    // Fetch games from Supabase
    const { data: games, error } = await supabase
      .from('user_games')
      .select(`
        *,
        game:games (
          id,
          title,
          background_image,
          game_genres (
            genres (
              name
            )
          ),
          game_moods (
            moods (
              name
            )
          )
        )
      `)
      .not('status', 'in.("Done","Endless","Satisfied","DNF")')

    if (error) {
      console.error('Error fetching games:', error.message)
      setLoading(false)
      return
    }

    console.log('Fetched games:', games)

    // Get seasonal context
    const { season, holidays } = getSeasonalContext()

    const enrichedBacklog = games.map((entry) => ({
      gameId: entry.game?.id || entry.game_id,
      title: entry.game?.title || 'Unknown Title',
      genre: entry.game?.game_genres?.map(g => g.genres?.name).join(', ') || 'N/A',
      mood: entry.game?.game_moods?.map(m => m.moods?.name).join(', ') || 'N/A',
      status: entry.status,
      image: entry.game?.background_image || '',
      recommendationNote: '', // placeholder to be filled after parsing
    }))

    // Fetch current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User not logged in or failed to fetch user:', userError);
      setLoading(false);
      return;
    }
    const userId = user.id;

    const payload = { mode: 'seasonal', backlog: enrichedBacklog, season, holidays, userId, isDevUser };
    console.log('Payload sent to backend:', JSON.stringify(payload, null, 2));

    // Call your API
    const res = await fetch('http://localhost:3001/api/openai/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status === 429) {
      const { error } = await res.json();
      setRecommendation(error || "You've reached your daily limit for recommendations. Please try again tomorrow!");
      setLoading(false);
      return;
    }

    const result = await res.json();
    console.log('Full recommendation text:', result.recommendation)
    setRecommendation(result.recommendation || 'Error generating recommendation')

    const recommendedTitles = result.recommendation
      .split('\n')
      .filter(line => /^\d+\./.test(line)) // lines starting with "1.", "2.", etc.
      .map(line => {
        const match = line.match(/\*\*(.*?)\*\*/)
        return match?.[1] || ''
      })
      .filter(Boolean)

    const matchedGames = recommendedTitles
      .map((title) =>
        enrichedBacklog.find((game) =>
          game.title.toLowerCase().includes(title.toLowerCase())
        )
      )
      .filter(Boolean) as Game[]

    const enriched = matchedGames.map((game) => {
      const noteMatch = result.recommendation
        .split('\n')
        .find(line => line.toLowerCase().includes(game.title.toLowerCase()))
        ?.replace(/\*\*.*?\*\*\s*[-:]?\s*/g, '') // removes **Title** and dash or colon after
        .replace(/^\d+\.\s*/, '') // removes the leading number
      return { ...game, recommendationNote: noteMatch || '' }
    })

    setRecommendedGames(enriched)
    setLoading(false);
  }

  return (
    <section className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">🎮 Seasonal Game Recommendation</h1>
      <button
        onClick={handleGetRecommendation}
        disabled={loading}
        className="btn btn-primary"
      >
        {loading ? 'Analyzing...' : 'Get Seasonal Recommendation'}
      </button>
      {recommendedGames.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Your Seasonal Picks:</h2>

          {/* Intro line */}
          <div className="mb-4 p-4 bg-base-200 rounded-lg whitespace-pre-wrap">
            {(() => {
              const introLine = recommendation
                .split('\n')
                .find(line => line.trim().length > 0)
              return introLine || null
            })()}
          </div>

          {/* Game Cards */}
          <div className="flex flex-col gap-4">
            {recommendedGames.map((game) => (
              <div
                key={game.gameId}
                className="card bg-base-100 shadow-xl overflow-hidden"
              >
                <figure className="h-48 overflow-hidden bg-base-200">
                  <img
                    src={game.image || '/default-image.jpg'}
                    alt={game.title}
                    className="w-full h-full object-cover"
                  />
                </figure>
                <div className="card-body">
                  <div className="flex justify-between items-start">
                    <h2 className="card-title">{game.title}</h2>
                    <div className="badge badge-outline">{game.status}</div>
                  </div>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {game.genre.split(', ').map((genre) => (
                      <span key={genre} className="badge badge-accent">
                        {genre}
                      </span>
                    ))}
                  </div>
                  {game.recommendationNote && (
                    <p className="text-sm italic mt-3 text-base-content">
                      💡 {game.recommendationNote.replace(/\*\*/g, '')}
                    </p>
                  )}
                  <button
                    className="btn btn-sm btn-success mt-4"
                    onClick={async (e) => {
                      e.stopPropagation()
                      const { error } = await supabase
                        .from('user_games')
                        .update({ status: 'Currently Playing' })
                        .eq('game_id', game.gameId)

                      if (error) {
                        console.error('Error updating status:', error.message)
                      } else {
                        setRecommendedGames((prev) =>
                          prev.map((g) =>
                            g.gameId === game.gameId ? { ...g, status: 'Currently Playing' } : g
                          )
                        )
                      }
                    }}
                  >
                    Start Playing
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Outro line */}
          <div className="mt-4 p-4 bg-base-200 rounded-lg whitespace-pre-wrap">
            {(() => {
              const paragraphs = recommendation.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
              return paragraphs.length > 1 ? paragraphs[paragraphs.length - 1] : '';
            })()}
          </div>
        </div>
      )}
    </section>
  )
}

export default SeasonRecommendations