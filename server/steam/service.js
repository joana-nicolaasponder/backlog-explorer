const axios = require('axios');
const { supabase } = require('../supabase');
const { searchGameByName } = require('../igdb/service');

const STEAM_API_URL = 'https://api.steampowered.com';

async function fetchAndEnrichSteamGames(steamId) {
  const response = await axios.get(
    `${STEAM_API_URL}/IPlayerService/GetOwnedGames/v1/`,
    {
      params: {
        key: process.env.STEAM_API_KEY,
        steamid: steamId,
        include_appinfo: true,
        include_played_free_games: true,
      },
    }
  );

  const { games } = response.data.response;
  if (!games) return [];

  const enrichedGames = [];
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  for (const game of games) {
    const baseGame = {
      appId: game.appid,
      name: game.name,
      playtime: game.playtime_forever,
      iconUrl: `http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`,
      lastPlayed: game.rtime_last_played,
    };

    try {
      const { data: existingGames, error } = await supabase
        .from('games')
        .select('*')
        .eq('steam_app_id', game.appid)
        .limit(1);
      let dbGame;
      if (error) throw error;
      if (existingGames.length > 0) {
        dbGame = existingGames[0];
      } else {
        await delay(1000);
        const igdbData = await searchGameByName(game.name);
        const match = igdbData[0];
        const insertGame = {
          title: game.name,
          steam_app_id: game.appid,
          description: match?.summary || null,
          background_image: match?.cover?.url || null,
          igdb_id: match?.id || null,
          provider: 'steam',
          created_at: new Date().toISOString(),
        };
        const { data: newGames, error: insertError } = await supabase
          .from('games')
          .insert(insertGame)
          .select();
        if (insertError) throw insertError;
        dbGame = newGames[0];
      }
      enrichedGames.push({
        ...baseGame,
        igdb_id: dbGame.igdb_id,
        description: dbGame.description,
        background_image: dbGame.background_image,
      });
    } catch (err) {
      console.error(`Error enriching game ${game.name}:`, err.message);
      enrichedGames.push(baseGame);
    }
  }

  enrichedGames.sort((a, b) => b.playtime - a.playtime);
  return enrichedGames;
}

async function addGamesToLibrary(userId, games) {
  const { data: insertedGames, error: gamesError } = await supabase
    .from('games')
    .upsert(
      games.map((game) => ({
        title: game.name,
        steam_app_id: game.appId,
        cover_image: game.iconUrl,
        background_image: game.background_image || null,
        description: game.description || null,
        igdb_id: game.igdb_id || null,
        provider: 'steam',
        rawg_id: game.rawg_id || null,
        rawg_slug: game.rawg_slug || null,
        metacritic_rating: game.metacritic_rating || null,
        release_date: game.release_date || null,
      })),
      { onConflict: 'steam_app_id' }
    )
    .select();
  if (gamesError) throw gamesError;
  const userGamesData = insertedGames.map((game) => ({
    user_id: userId,
    game_id: game.id,
    status: 'backlog',
    playtime_minutes: games.find((g) => g.appId === game.steam_app_id)?.playtime || 0,
    date_added: new Date().toISOString(),
  }));
  const { error: userGamesError } = await supabase
    .from('user_games')
    .upsert(userGamesData, { onConflict: 'user_id,game_id' });
  if (userGamesError) throw userGamesError;
  return { success: true, gamesAdded: insertedGames.length };
}

module.exports = { fetchAndEnrichSteamGames, addGamesToLibrary };
