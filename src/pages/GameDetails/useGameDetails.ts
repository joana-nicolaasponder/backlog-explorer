import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import supabase from '../../supabaseClient'
import { Game, RawgGameDetails } from '../../types'
import { gameService } from '../../services/gameService'
import { IGDBMigrationService } from '../../services/igdbMigrationService'

export const useGameDetails = () => {
  const { id } = useParams()
  const [userId, setUserId] = useState<string>('')
  const [game, setGame] = useState<Game | null>(null)
  const [rawgDetails, setRawgDetails] = useState<RawgGameDetails | null>(null)
  const [details, setDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
        const rawgDetails: RawgGameDetails = {
          description_raw: (gameDetails as any).summary || '',
          metacritic: (gameDetails as any).total_rating || 0,
          playtime: 0,
          background_image: (gameDetails as any).background_image || '',
          screenshots: screenshots.map((url, index) => ({
            id: index,
            image: url,
            width: 1920,
            height: 1080,
          })),
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
        const migratedGame = await IGDBMigrationService.migrateToIGDB(game)
        if (migratedGame) {
          console.log('Successfully migrated Steam game to IGDB')
          // Redirect to the new IGDB game page
          window.location.href = `${migratedGame.id}`
          return
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
      const migratedGame = await IGDBMigrationService.migrateToIGDB(game)
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

      const gameData: Game = {
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
      console.log('Fetched game from backend:', gameData)

      // Fetch additional details from external provider
      if (userGameData.game) {
        await fetchGameDetails(userGameData.game)
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userId])

  return {
    game,
    rawgDetails,
    details,
    loading,
    userId,
    fetchGameAndNotes,
  }
}
