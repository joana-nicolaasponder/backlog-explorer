import {
  GameBasic,
  GameDetailed,
  GameProvider,
  GameSearchResult,
  Platform,
  Genre,
} from '../types/game'

export class IGDBError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IGDBError'
  }
}

// You'll need to get these from your Twitch Developer Console
const TWITCH_CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID
const TWITCH_APP_ACCESS_TOKEN = import.meta.env.VITE_TWITCH_APP_ACCESS_TOKEN

// We'll need to proxy these requests through our backend to avoid CORS issues
const IGDB_PROXY_URL = import.meta.env.VITE_API_URL + '/api/igdb'

const mapPlatform = (platform: any): Platform => ({
  id: platform.id.toString(),
  name: platform.name,
  slug: platform.slug,
})

const mapGenre = (genre: any): Genre => ({
  id: genre.id.toString(),
  name: genre.name,
  slug: genre.slug,
})

const mapGameBasic = (game: any): GameBasic => ({
  id: game.id.toString(),
  slug: game.slug,
  name: game.name,
  released: game.first_release_date
    ? new Date(game.first_release_date * 1000).toISOString().split('T')[0]
    : undefined,
  background_image: game.cover?.url
    ? `https:${game.cover.url.replace('t_thumb', 't_screenshot_big')}`
    : undefined,
  metacritic: game.aggregated_rating
    ? Math.round(game.aggregated_rating)
    : undefined,
  platforms: (game.platforms || []).map(mapPlatform),
  genres: (game.genres || []).map(mapGenre),
})

const fetchIGDB = async (endpoint: string, query: string) => {
  console.log('Sending IGDB request:', { endpoint, query })
  const response = await fetch(`${IGDB_PROXY_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: query.trim().replace(/\n/g, ' ') }),
  })

  if (!response.ok) {
    throw new IGDBError(`IGDB API error: ${response.statusText}`)
  }

  return response.json()
}

export class IGDBProvider implements GameProvider {
  async searchGames(query: string): Promise<GameSearchResult> {
    try {
      const searchQuery = `search "${query.replace(/"/g, '"')}";
fields name,slug,first_release_date,cover.url,aggregated_rating,platforms.name,platforms.slug,genres.name,genres.slug;
limit 10;`

      const data = await fetchIGDB('/games', searchQuery)
      const games = data.map(mapGameBasic)

      return {
        count: games.length,
        results: games,
      }
    } catch (error) {
      console.error('Error searching games:', error)
      throw new IGDBError(
        error instanceof Error ? error.message : 'Unknown error occurred'
      )
    }
  }

  async getGameDetails(id: string): Promise<GameDetailed> {
    try {
      // Convert string ID back to number for IGDB
      const numericId = parseInt(id)
      if (isNaN(numericId)) {
        throw new IGDBError('Invalid game ID')
      }

      const detailsQuery = `fields name,slug,first_release_date,cover.url,aggregated_rating,platforms.name,platforms.slug,genres.name,genres.slug,summary,storyline,url,game_modes.name,game_modes.slug,game_engines.name,game_engines.slug;
where id = ${numericId};`

      const [gameData, timeToBeatData] = await Promise.all([
        fetchIGDB('/games', detailsQuery),
        fetchIGDB('/time_to_beats', `fields *; where game_id = ${numericId};`)
      ])

      if (!gameData[0]) {
        throw new IGDBError('Game not found')
      }

      const game = gameData[0]
      const timeToBeat = timeToBeatData[0]
      console.log('Raw IGDB game data:', game)
      console.log('Raw IGDB time to beat data:', timeToBeat)

      return {
        ...mapGameBasic(game),
        description: game.storyline || game.summary || '',
        description_raw: game.storyline || game.summary || '',
        storyline: game.storyline || '',
        summary: game.summary || '',
        website: game.url,
        time_to_beat: timeToBeat ? {
          hastily: timeToBeat.hastily,
          normally: timeToBeat.normally,
          completely: timeToBeat.completely
        } : null,
      }
    } catch (error) {
      console.error('Error getting game details:', error)
      throw new IGDBError(
        error instanceof Error ? error.message : 'Unknown error occurred'
      )
    }
  }

  async getGameScreenshots(id: string): Promise<string[]> {
    try {
      // Convert string ID back to number for IGDB
      const numericId = parseInt(id);
      if (isNaN(numericId)) {
        throw new IGDBError('Invalid game ID');
      }

      const screenshotsQuery = `fields url;
where game = ${numericId};`

      const data = await fetchIGDB('/screenshots', screenshotsQuery)
      return data.map(
        (screenshot: any) =>
          `https:${screenshot.url.replace('t_thumb', 't_screenshot_huge')}`
      )
    } catch (error) {
      console.error('Error getting game screenshots:', error)
      throw new IGDBError(
        error instanceof Error ? error.message : 'Unknown error occurred'
      )
    }
  }
}
