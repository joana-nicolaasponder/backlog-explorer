import supabase from '../supabaseClient'
import { Game } from '../types'
import { gameService } from './gameService'

export class IGDBMigrationService {
  static async migrateToIGDB(game: Game): Promise<Game | null> {
    try {
      // Search for game in IGDB
      const searchResult = await gameService.searchGames(game.title)
      if (searchResult.results.length === 0) return null

      const normalize = (str: string) =>
        str.toLowerCase().replace(/[^a-z0-9]/gi, '')

      const normalizedTitle = normalize(game.title)

      const igdbGame = searchResult.results.find((g) =>
        g.name && normalize(g.name).includes(normalizedTitle)
      )

      if (!igdbGame) {
        console.warn('No good IGDB match found for', game.title)
        return null
      }
      console.log('Found IGDB match:', igdbGame)

      // Check if a game with this IGDB ID already exists
      const { data: existingIgdbGame, error: checkError } = await supabase
        .from('games')
        .select('*')
        .eq('provider', 'igdb')
        .eq('igdb_id', igdbGame.id)
        .maybeSingle()

      if (checkError) {
        console.error('Error checking for existing IGDB game:', checkError)
        return null
      }

      let targetGameId

      if (existingIgdbGame) {
        // If the IGDB game already exists, we'll use that one
        targetGameId = existingIgdbGame.id
        console.log(
          'Found existing IGDB game, will use that instead of migrating'
        )
      } else {
        // Otherwise, create a new game with IGDB data
        const gameData = {
          provider: 'igdb',
          igdb_id: igdbGame.id,
          title: igdbGame.name || game.title,
          description: igdbGame.summary || game.description,
          metacritic_rating: igdbGame.metacritic || game.metacritic_rating,
          release_date: igdbGame.released || game.release_date,
          background_image: igdbGame.background_image || game.background_image,
          created_at: new Date().toISOString(),
        }

        // Use upsert to handle potential race conditions
        const { data: newIgdbGame, error: insertError } = await supabase
          .from('games')
          .upsert([gameData], { onConflict: 'igdb_id,provider' })
          .select()
          .single()

        if (insertError) {
          console.error('Error inserting new IGDB game:', insertError)
          return null
        }

        targetGameId = newIgdbGame.id
        console.log('Created new IGDB game')
      }

      // Update user_games relationships
      await this.migrateUserGames(game.id, targetGameId)

      // Handle genres if available
      if (igdbGame.genres && igdbGame.genres.length > 0) {
        await this.migrateGenres(igdbGame.genres, targetGameId, game.title)
      }

      // Fetch the newly created/existing IGDB game to return it
      const { data: newGame, error: fetchNewGameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', targetGameId)
        .single()

      if (fetchNewGameError) {
        console.error('Error fetching new IGDB game:', fetchNewGameError)
        return null
      }

      console.log('Successfully migrated to IGDB game:', newGame)
      return newGame
    } catch (error) {
      console.error('Error in IGDB migration:', error)
      return null
    }
  }

  private static async migrateUserGames(oldGameId: string, newGameId: string): Promise<void> {
    // Get all user_game records for this game
    const { data: userGames, error: userGamesError } = await supabase
      .from('user_games')
      .select('*')
      .eq('game_id', oldGameId)

    if (userGamesError) {
      console.error('Error fetching user_games:', userGamesError)
      return
    }

    if (userGames && userGames.length > 0) {
      console.log(`Found ${userGames.length} user_games entries to update`)

      // Process each user_game entry
      for (const userGame of userGames) {
        // Check if the user already has this IGDB game
        const { data: existingUserIgdbGame, error: checkExistingError } =
          await supabase
            .from('user_games')
            .select('id')
            .eq('user_id', userGame.user_id)
            .eq('game_id', newGameId)
            .maybeSingle()

        if (checkExistingError) {
          console.error(
            'Error checking if user already has IGDB game:',
            checkExistingError
          )
          continue
        }

        if (existingUserIgdbGame) {
          // User already has this IGDB game, delete the old version
          console.log(
            `User ${userGame.user_id} already has IGDB game ${newGameId}, deleting old version`
          )
          const { error: deleteError } = await supabase
            .from('user_games')
            .delete()
            .eq('id', userGame.id)
            .eq('user_id', userGame.user_id)

          if (deleteError) {
            console.error(
              'Error deleting duplicate user_game entry:',
              deleteError
            )
          }
        } else {
          // Update the user_game record to point to the IGDB game
          const { error: updateUserGameError } = await supabase
            .from('user_games')
            .update({
              game_id: newGameId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userGame.id)
            .eq('user_id', userGame.user_id)

          if (updateUserGameError) {
            console.error(
              `Error updating user_game for user ${userGame.user_id}:`,
              updateUserGameError
            )
          } else {
            console.log(
              `Successfully updated user_game for user ${userGame.user_id} to IGDB game`
            )
          }
        }
      }
    } else {
      console.log('No user_games entries found for this game')
    }
  }

  private static async migrateGenres(genres: any[], targetGameId: string, gameTitle: string): Promise<void> {
    console.log(`Adding ${genres.length} genres for ${gameTitle}`)

    try {
      // Prepare genre data for upsert
      const genresToUpsert = genres.map((g) => ({
        name: g.name,
        created_at: new Date().toISOString(),
      }))

      // Upsert genres to handle potential conflicts
      const { error: upsertError } = await supabase
        .from('genres')
        .upsert(genresToUpsert, {
          onConflict: 'name',
          ignoreDuplicates: true,
        })

      if (upsertError) {
        console.error('Error upserting genres:', upsertError)
      }

      // Get all genre IDs based on names
      const { data: allGenres, error: allGenresError } = await supabase
        .from('genres')
        .select('id, name')
        .in(
          'name',
          genres.map((g) => g.name)
        )

      if (allGenresError) {
        console.error('Error fetching all genres:', allGenresError)
      } else if (allGenres && allGenres.length > 0) {
        console.log(`Found ${allGenres.length} genres for association`)

        // Check for existing game_genres associations to avoid duplicates
        const { data: existingAssociations, error: checkAssocError } =
          await supabase
            .from('game_genres')
            .select('genre_id')
            .eq('game_id', targetGameId)

        if (checkAssocError) {
          console.error(
            'Error checking existing game_genres associations:',
            checkAssocError
          )
        }

        // Create a set of existing genre IDs for this game
        const existingGenreIds = new Set(
          existingAssociations?.map((assoc) => assoc.genre_id) || []
        )

        // Filter out genres that are already associated with this game
        const newGameGenres = allGenres
          .filter((genre) => !existingGenreIds.has(genre.id))
          .map((genre) => ({
            game_id: targetGameId,
            genre_id: genre.id,
            created_at: new Date().toISOString(),
          }))

        if (newGameGenres.length > 0) {
          // Insert new game_genres associations
          const { error: gameGenresError } = await supabase
            .from('game_genres')
            .insert(newGameGenres)

          if (gameGenresError) {
            console.error('Error inserting game_genres:', gameGenresError)
          } else {
            console.log(
              `Successfully added ${newGameGenres.length} genres for ${gameTitle}`
            )
          }
        } else {
          console.log('No new genres to associate with this game')
        }
      } else {
        console.log('No genres found for association')
      }
    } catch (genreError) {
      console.error('Error in genre processing:', genreError)
    }
  }
}
