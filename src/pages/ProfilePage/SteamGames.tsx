import { useState, useEffect } from 'react'
import supabase from '../../supabaseClient'

interface Game {
  id: number
  name: string
  steam_appid: number
  img_icon_url: string
  playtime_minutes: number
  platform_name: string
}

interface UserGame {
  game_id: number
  platform_id: number
  playtime_minutes: number
  platform: {
    name: string
  }
  games: {
    name: string
    steam_appid: number
    img_icon_url: string
  }
}

interface SteamGamesProps {
  userId: string
}

const SteamGames = ({ userId }: SteamGamesProps) => {
  const [games, setGames] = useState<Game[]>([])
  const [selectedGames, setSelectedGames] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const { data, error } = await supabase
          .from('user_games')
          .select(
            `
            game_id,
            platform_id,
            playtime_minutes,
            platform:platform_id (name),
            games:game_id (
              name,
              steam_appid,
              img_icon_url
            )
          `
          )
          .eq('user_id', userId)
          // Only get Steam games
          .eq('platform:name', 'Steam')

        if (error) throw error

        const formattedGames = (data as unknown as UserGame[]).map((item) => ({
          id: item.game_id,
          name: item.games.name,
          steam_appid: item.games.steam_appid,
          img_icon_url: item.games.img_icon_url,
          playtime_minutes: item.playtime_minutes,
          platform_name: item.platform.name,
        }))

        setGames(formattedGames)
      } catch (err) {
        console.error('Error fetching games:', err)
        setError(err instanceof Error ? err.message : 'Failed to load games')
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchGames()
    }
  }, [userId])

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    )
  }

  if (error) {
    return (
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
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4">
      <h2 className="text-2xl font-bold mb-4">Your Steam Games</h2>
      <div className="flex items-center mb-4 gap-4">
        <input
          type="checkbox"
          checked={games.length > 0 && selectedGames.length === games.length}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedGames(games.map((g) => g.id))
            } else {
              setSelectedGames([])
            }
          }}
          className="checkbox checkbox-primary"
          aria-label="Select all games"
        />
        <span className="font-medium">Select All</span>
        <button
          className="btn btn-primary btn-sm ml-4"
          disabled={selectedGames.length === 0}
          onClick={() => {
            /* TODO: add selected games to library */
          }}
        >
          Add Selected to Library ({selectedGames.length})
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {games.map((game) => (
          <div key={game.id} className="card bg-base-200 shadow-xl relative">
            {/* DEBUG: Inline styled checkbox to verify rendering */}
            <input
              type="checkbox"
              style={{ position: 'relative', zIndex: 1000, left: 0, top: 0, border: '2px solid red', background: 'yellow', marginBottom: 4 }}
              aria-label={`Debug: Select ${game.name}`}
            />
            <input
              type="checkbox"
              className="checkbox checkbox-primary absolute top-2 left-2 z-10"
              checked={selectedGames.includes(game.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedGames((prev) => [...prev, game.id])
                } else {
                  setSelectedGames((prev) =>
                    prev.filter((id) => id !== game.id)
                  )
                }
              }}
              aria-label={`Select ${game.name}`}
            />
            <figure className="px-4 pt-4">
              <img
                src={`http://media.steampowered.com/steamcommunity/public/images/apps/${game.steam_appid}/${game.img_icon_url}.jpg`}
                alt={game.name}
                className="rounded-xl w-16 h-16"
              />
            </figure>
            <div className="card-body py-4">
              <h3 className="card-title text-lg">{game.name}</h3>
              <p className="text-sm">
                Playtime: {Math.round(game.playtime_minutes / 60)} hours
              </p>
              <div className="flex flex-wrap gap-1">
                <span className="badge badge-primary badge-sm">
                  {game.platform_name}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SteamGames
