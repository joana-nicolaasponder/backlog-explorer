require('dotenv').config()
const OpenAI = require('openai')
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const express = require('express')
const cors = require('cors')
const fetch = require('node-fetch')
const axios = require('axios')
const querystring = require('querystring')
const { supabase, upsertGame } = require('./supabase')
const {
  purchaseAlternativePrompt,
  chatPrompt,
  seasonalPrompt,
} = require('./prompts')

const app = express()
const port = process.env.PORT || 3001

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Configure CORS
const allowedOrigins = process.env.CORS_ORIGINS
  ? JSON.parse(process.env.CORS_ORIGINS)
  : ['http://localhost:5173', 'https://backlogexplorer.com']

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'sentry-trace', 'baggage'],
  credentials: true,
}

app.options('*', cors(corsOptions));
app.use(cors(corsOptions))

// IGDB API endpoints
const IGDB_API_URL = 'https://api.igdb.com/v4'

// Steam OpenID verification endpoint
const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'
const STEAM_API_URL = 'https://api.steampowered.com'

app.post('/api/igdb/:endpoint', async (req, res) => {
  // Removed verbose IGDB proxy log for production
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
      console.error('IGDB API error:', response.statusText)
      throw new Error(`IGDB API error: ${response.statusText}`)
    }

    const data = await response.json()
    res.json(data)
  } catch (error) {
    console.error('Error proxying IGDB request:', error.message)
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
    console.error('Error in verify-openid:', error.message)
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
        console.error(`Error enriching game ${game.name}:`, err.message)
        enrichedGames.push(baseGame)
      }
    }

    enrichedGames.sort((a, b) => b.playtime - a.playtime)
    res.json(enrichedGames)
  } catch (error) {
    console.error('Error fetching Steam games:', error.message)
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
    console.error('Error adding games to library:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// Game recommendation endpoint using OpenAI
app.post('/api/recommend', async (req, res) => {
  const { mode, backlog, season, holidays, preferences } = req.body

  try {
    const formattedBacklog = backlog
      .map(
        (game) =>
          `${game.title} - Genre: ${game.genre || 'N/A'}, Mood: ${
            game.mood || 'N/A'
          }`
      )
      .join('\n')

    let systemPrompt = ''
    let messages = []

    if (mode === 'purchase_alternative') {
      systemPrompt = purchaseAlternativePrompt
      const userPrompt = `The user is thinking about buying "${req.body.consideringGame}". Their backlog:\n\n${formattedBacklog}`
      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]
    } else if (mode === 'chat') {
      console.log('[chat mode triggered]', req.body.userMessage)
      const chatHistory = req.body.messages || []
      const formattedHistory = chatHistory.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }))
      systemPrompt = chatPrompt
      const userMessage = req.body.userMessage
      messages = [
        { role: 'system', content: systemPrompt },
        ...formattedHistory,
        {
          role: 'user',
          content: `My backlog:\n${formattedBacklog}\n\n${userMessage}`,
        },
      ]
    } else {
      systemPrompt = seasonalPrompt
      messages = [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content:
            `Backlog:\n${formattedBacklog}\n\nSeason: ${season}\n` +
            (holidays?.length
              ? `Events: ${holidays.map((h) => h.name).join(', ')}\n`
              : '') +
            `Recommend games that fit the current season and events.`,
        },
      ]
    }

    console.log('[messages]', JSON.stringify(messages, null, 2))
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.7,
      max_tokens: 800,
    })

    let content = response.choices?.[0]?.message?.content || ''

    if (
      !content ||
      content.toLowerCase().includes("couldn't think of anything") ||
      content.trim().length < 20
    ) {
      content =
        "Hmm, that’s a tricky one. It sounds like you're going through something deeper right now. Can you tell me more about what you're feeling when you reach for games lately?"
    }

    const messageChunks = content
      .split(/\n{2,}/) // split on paragraph breaks
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => ({ role: 'assistant', content: chunk }))

    res.json({ messages: messageChunks })
  } catch (error) {
    console.error('Error generating recommendation:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

// Feedback email endpoint
const { sendFeedbackMail } = require('./feedbackMailer')

app.post('/api/feedback', async (req, res) => {
  const { name, email, message } = req.body
  if (!message || typeof message !== 'string' || message.trim().length < 5) {
    return res.status(400).json({ error: 'Feedback message is required.' })
  }
  try {
    await sendFeedbackMail({ name, email, message })
    res.json({ success: true })
  } catch (error) {
    console.error('Error sending feedback email:', error)
    res.status(500).json({ error: 'Failed to send feedback email.' })
  }
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
