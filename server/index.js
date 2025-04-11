const express = require('express')
const cors = require('cors')
const fetch = require('node-fetch')
require('dotenv').config()
const axios = require('axios')
const querystring = require('querystring')
const supabase = require('./supabase')

const app = express()
const port = process.env.PORT || 3001

// Configure CORS
const corsOptions = {
  origin: 'http://localhost:5173', // Your frontend URL
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}

app.use(cors(corsOptions))
app.use(express.json())

// IGDB API endpoints
const IGDB_API_URL = 'https://api.igdb.com/v4'

// Steam OpenID verification endpoint
const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'
const STEAM_API_URL = 'https://api.steampowered.com'

app.post('/api/igdb/:endpoint', async (req, res) => {
  try {
    const { endpoint } = req.params
    const { query } = req.body

    // Map client-side endpoint names to IGDB API endpoints
    const endpointMap = {
      time_to_beats: 'game_time_to_beats',
      games: 'games',
      screenshots: 'screenshots',
    }

    const igdbEndpoint = endpointMap[endpoint]
    if (!igdbEndpoint) {
      throw new Error(`Invalid endpoint: ${endpoint}`)
    }

    const response = await fetch(`${IGDB_API_URL}/${igdbEndpoint}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${process.env.TWITCH_APP_ACCESS_TOKEN}`,
        'Content-Type': 'text/plain',
      },
      body: query,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('IGDB Error Response:', errorText)
      throw new Error(`IGDB API error: ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    res.json(data)
  } catch (error) {
    console.error('Error proxying IGDB request:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/verify-openid', async (req, res) => {
  try {
    const params = req.body.openidResponse

    // Check if we have the necessary parameters
    if (!params['openid.claimed_id']) {
      return res.status(400).json({ error: 'Missing OpenID parameters' })
    }

    // Extract Steam ID first to check if it's valid
    const matches = params['openid.claimed_id'].match(/\/id\/(7[0-9]{15,25})/)
    if (!matches) {
      return res.status(400).json({ error: 'Could not extract Steam ID' })
    }

    const steamId = matches[1]

    // Get user details from Steam API first
    const steamUserResponse = await axios.get(
      `${STEAM_API_URL}/ISteamUser/GetPlayerSummaries/v2/`,
      {
        params: {
          key: process.env.STEAM_API_KEY,
          steamids: steamId,
        },
      }
    )

    if (!steamUserResponse.data.response.players.length) {
      return res.status(404).json({ error: 'Steam user not found' })
    }

    const userData = steamUserResponse.data.response.players[0]

    // Return the user data without OpenID validation for now
    res.json({
      steamId: userData.steamid,
      nickname: userData.personaname,
      avatar: userData.avatarfull,
      profileUrl: userData.profileurl,
    })
  } catch (error) {
    console.error('Error in verify-openid:', error)
    res.status(500).json({
      error: 'Failed to verify Steam OpenID response',
      details: error.message,
    })
  }
})

// Steam games endpoint
app.get('/api/steam/games/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params

    // Get owned games from Steam API
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
    )

    const { games } = response.data.response

    if (!games) {
      return res.json([])
    }

    const enrichedGames = await Promise.all(
      games.map(async (game) => {
        const baseGame = {
          appId: game.appid,
          name: game.name,
          playtime: game.playtime_forever,
          iconUrl: `http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`,
          lastPlayed: game.rtime_last_played,
        };

        try {
          const igdbResponse = await fetch(`${IGDB_API_URL}/games`, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Client-ID': process.env.TWITCH_CLIENT_ID,
              Authorization: `Bearer ${process.env.TWITCH_APP_ACCESS_TOKEN}`,
              'Content-Type': 'text/plain',
            },
            body: `search "${game.name}"; fields id,name,summary,cover.url; limit 1;`,
          });

          if (igdbResponse.ok) {
            const igdbData = await igdbResponse.json();
            if (igdbData.length > 0) {
              const match = igdbData[0];
              return {
                ...baseGame,
                igdb_id: match.id,
                description: match.summary || null,
                background_image: match.cover?.url || null,
              };
            }
          }
        } catch (err) {
          console.error(`Error fetching IGDB data for ${game.name}:`, err);
        }

        return baseGame;
      })
    );

    enrichedGames.sort((a, b) => b.playtime - a.playtime);
    res.json(enrichedGames);
  } catch (error) {
    console.error('Error fetching Steam games:', error)
    res.status(500).json({ error: 'Failed to fetch Steam games' })
  }
})

// Add new endpoint to handle adding games to library
app.post('/api/steam/add-games', async (req, res) => {
  const { userId, games } = req.body

  try {
    // 1. First, insert all games into the games table (if they don't exist)
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
        })),
        { onConflict: 'steam_app_id' }
      )
      .select()

    if (gamesError) throw gamesError

    // 2. Link games to user in user_games table
    const userGamesData = insertedGames.map((game) => ({
      user_id: userId,
      game_id: game.id,
      status: 'backlog',
      playtime_minutes:
        games.find((g) => g.appId === game.steam_app_id)?.playtime || 0,
      date_added: new Date().toISOString(),
    }))

    const { error: userGamesError } = await supabase
      .from('user_games')
      .upsert(userGamesData, { onConflict: 'user_id,game_id' })

    if (userGamesError) throw userGamesError

    res.json({ success: true, gamesAdded: insertedGames.length })
  } catch (error) {
    console.error('Error adding games to library:', error)
    res.status(500).json({ error: error.message })
  }
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
