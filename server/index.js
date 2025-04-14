const express = require('express')
const cors = require('cors')
const fetch = require('node-fetch')
require('dotenv').config()
const axios = require('axios')
const querystring = require('querystring')
const { supabase, upsertGame } = require('./supabase')

const app = express()
const port = process.env.PORT || 3001

// Configure CORS
// Configure CORS
const allowedOrigins = process.env.CORS_ORIGINS
  ? JSON.parse(process.env.CORS_ORIGINS)
  : ['http://localhost:5173', 'https://backlogexplorer.com']

console.log('⚙️ Final allowedOrigins:', allowedOrigins)

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}

app.use(cors(corsOptions))

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

    console.log('TWITCH_CLIENT_ID:', process.env.TWITCH_CLIENT_ID)
    console.log(
      'TWITCH_APP_ACCESS_TOKEN:',
      process.env.TWITCH_APP_ACCESS_TOKEN?.slice(0, 10)
    )
    console.log('👉 IGDB Request:', {
      endpoint: igdbEndpoint,
      query,
      clientId: process.env.TWITCH_CLIENT_ID,
      hasAccessToken: !!process.env.TWITCH_APP_ACCESS_TOKEN,
    })

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
    if (!games) return res.json([])

    const enrichedGames = []
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    for (const game of games) {
      console.log('➡️ Checking game:', game.name, game.appid)

      const baseGame = {
        appId: game.appid,
        name: game.name,
        playtime: game.playtime_forever,
        iconUrl: `http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`,
        lastPlayed: game.rtime_last_played,
      }

      try {
        // Check if the game already exists
        const { data: existingGames, error } = await supabase
          .from('games')
          .select('*')
          .eq('steam_app_id', game.appid)
          .limit(1)

        let dbGame

        if (error) throw error

        if (existingGames.length > 0) {
          dbGame = existingGames[0]
        } else {
          // Enrich via IGDB
          await delay(1000) // throttle IGDB to 1 request per second
          console.log(`⏳ Enriching from IGDB: ${game.name}`)
          console.log('🔍 IGDB fetch from /steam/games:')

          console.log('🚨 Debug IGDB Request')
          console.log(
            'TWITCH_CLIENT_ID (from env):',
            process.env.TWITCH_CLIENT_ID
          )
          console.log(
            'TWITCH_APP_ACCESS_TOKEN (first 10 chars):',
            process.env.TWITCH_APP_ACCESS_TOKEN?.slice(0, 10)
          )
          console.log(
            'IGDB query:',
            `search "${game.name}"; fields id,name,summary,cover.url; limit 1;`
          )

          console.log(
            '🔑 Supabase Key from env:',
            process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 10)
          )
          console.log('🪪 Supabase URL from env:', process.env.SUPABASE_URL)

          const igdbResponse = await fetch(`${IGDB_API_URL}/games`, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Client-ID': process.env.TWITCH_CLIENT_ID,
              Authorization: `Bearer ${process.env.TWITCH_APP_ACCESS_TOKEN}`,
              'Content-Type': 'text/plain',
            },
            body: `search "${game.name}"; fields id,name,summary,cover.url; limit 1;`,
          })

          let igdbData = []
          if (igdbResponse.ok) {
            igdbData = await igdbResponse.json()
          }

          const match = igdbData[0]

          const insertGame = {
            title: game.name,
            steam_app_id: game.appid,
            description: match?.summary || null,
            background_image: match?.cover?.url || null,
            igdb_id: match?.id || null,
            provider: 'steam',
            created_at: new Date().toISOString(),
          }

          const { data: newGames, error: insertError } = await supabase
            .from('games')
            .insert(insertGame)
            .select()

          if (insertError) throw insertError
          dbGame = newGames[0]
        }

        enrichedGames.push({
          ...baseGame,
          igdb_id: dbGame.igdb_id,
          description: dbGame.description,
          background_image: dbGame.background_image,
        })
      } catch (err) {
        console.error(`❌ Error enriching ${game.name}:`, {
          message: err.message,
          stack: err.stack,
          ...(err.response?.data && { response: err.response.data }),
        })
        enrichedGames.push(baseGame)
      }
    }

    enrichedGames.sort((a, b) => b.playtime - a.playtime)
    res.json(enrichedGames)
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
          rawg_id: game.rawg_id || null,
          rawg_slug: game.rawg_slug || null,
          metacritic_rating: game.metacritic_rating || null,
          release_date: game.release_date || null,
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
