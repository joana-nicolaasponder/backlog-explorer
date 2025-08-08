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
} = require('./openai/prompts')
const { searchGameByName } = require('./igdb/service')

const app = express()
const port = process.env.PORT || 3001

// // Global request logger for debugging
// app.use((req, res, next) => {
//   console.log('Incoming request:', req.method, req.url);
//   next();
// });

app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true }))

// Configure CORS EARLY so it applies to all routes
const allowedOrigins = process.env.CORS_ORIGINS
  ? JSON.parse(process.env.CORS_ORIGINS)
  : [
      'http://localhost:5173',
      'http://localhost:4173',
      'https://backlogexplorer.com',
      'https://www.backlogexplorer.com',
    ]

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser or same-origin requests (no Origin header)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('Not allowed by CORS'))
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'sentry-trace', 'baggage'],
  credentials: true,
}

app.options('*', cors(corsOptions))
app.use(cors(corsOptions))

// Option A: Ensure a row exists in public.users for FK logging (no placeholders)
async function ensurePublicUserExists(supabase, userId, userEmail) {
  try {
    if (!userId) return false
    // Already exists?
    const { data: existing, error: selErr } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
    if (!selErr && existing?.id) return true

    if (!userEmail) {
      console.warn(
        '[mood-recommend] public.users missing and no userEmail provided; cannot create profile'
      )
      return false
    }
    const { error: insErr } = await supabase
      .from('users')
      .insert([{ id: userId, email: userEmail }], { returning: 'minimal' })
    if (insErr) {
      if (insErr.code === '23505') {
        // Unique email or id exists; recheck by id
        const { data: after, error: afterErr } = await supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .maybeSingle()
        return !afterErr && !!after?.id
      }
      console.warn(
        '[mood-recommend] ensurePublicUserExists warning:',
        insErr.message || insErr
      )
      return false
    }
    return true
  } catch (e) {
    console.warn(
      '[mood-recommend] ensurePublicUserExists exception:',
      e?.message || e
    )
    return false
  }
}

// Diagnostics: verify userId format and FK target existence (auth.users)
async function diagnoseUserFK(supabase, userId) {
  try {
    if (!userId) return
    const uuidV4 =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const looksUUIDv4 = uuidV4.test(userId)
    // Check auth.users via Admin API
    let authExists = false
    try {
      const { data: adminUser, error: adminErr } =
        await supabase.auth.admin.getUserById(userId)
      if (!adminErr && adminUser?.user?.id) authExists = true
    } catch (e) {
      console.warn(
        '[mood-recommend] auth.admin.getUserById check failed:',
        e?.message || e
      )
    }
    const status = { userId, looksUUIDv4, authExists }
    console.log('[mood-recommend][FK-diagnose]', status)
    return status
  } catch (e) {
    console.warn('[mood-recommend] diagnoseUserFK exception:', e?.message || e)
    return undefined
  }
}

// Quota endpoint handler: returns today's usage for a user (optionally by feature)
async function handleQuota(req, res) {
  try {
    const userId = req.query.userId
    const feature = req.query.feature // optional
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    const dailyLimit = Number(process.env.DAILY_RECOMMENDATION_LIMIT || 5)

    // Start of today in UTC
    const now = new Date()
    const utcStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0
      )
    )
    const utcStartIso = utcStart.toISOString()

    // Count using requested_at (canonical timestamp column)
    let query = supabase
      .from('recommendation_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('requested_at', utcStartIso)
    if (feature) query = query.eq('feature', feature)
    const { error, count } = await query
    if (error) {
      console.error('[quota] count error:', error)
      return res.status(500).json({ error: 'Failed to fetch quota' })
    }
    const used = count || 0

    const remaining = Math.max(0, dailyLimit - used)
    const resetAt = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0
      )
    ).toISOString()

    return res.json({ used, limit: dailyLimit, remaining, resetAt })
  } catch (e) {
    console.error('[quota] exception:', e?.message || e)
    return res.status(500).json({ error: 'Quota error' })
  }
}

// Mount quota under both base API and OpenAI namespace to satisfy prod proxies
app.get('/api/usage/quota', handleQuota)
app.get('/api/openai/quota', handleQuota)

const igdbRoutes = require('./igdb/routes')
app.use('/api/igdb', igdbRoutes)

const steamRoutes = require('./steam/routes')
const openaiRoutes = require('./openai/routes')
app.use('/api/steam', steamRoutes)
app.use('/api/openai', openaiRoutes)
// Mood recommender helper
const { reRankAndComment } = require('./openai/moodRecommender')

// Steam OpenID verification endpoint
const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'
const STEAM_API_URL = 'https://api.steampowered.com'

console.log('=== SERVER STARTED ===')
// Feedback email endpoint
const { sendFeedbackMail } = require('./feedbackMailer')

app.post('/api/feedback', async (req, res) => {
  const { user_id, name, email, content, category } = req.body
  // Debug: log incoming feedback payload
  console.log('Feedback payload:', { name, email, content, category, user_id })
  if (!content || typeof content !== 'string' || content.trim().length < 5) {
    return res.status(400).json({ error: 'Feedback message is required.' })
  }
  if (!category) {
    return res.status(400).json({ error: 'Missing content or category' })
  }
  try {
    // Insert into feedback table
    const { data, error } = await supabase
      .from('feedback')
      .insert([{ user_id, content, category }])
    console.log('Supabase insert result:', { data, error })
    if (error) {
      console.error('Supabase insert error:', error)
      return res.status(500).json({ error: error.message })
    }

    // Send feedback email
    await sendFeedbackMail({ name, email, message: content })
    res.json({ success: true })
  } catch (error) {
    console.error('Error sending feedback email:', error)
    res.status(500).json({ error: 'Failed to send feedback email.' })
  }
})

// Feature usage logging endpoint
app.post('/api/log-usage', async (req, res) => {
  const { user_id, feature, metadata } = req.body
  if (!feature) {
    return res.status(400).json({ error: 'Missing feature name.' })
  }
  try {
    const { error } = await supabase
      .from('feature_usage')
      .insert([{ user_id, feature, metadata }])
    if (error) {
      console.error('Supabase feature usage insert:', error)
      return res.status(500).json({ error: error.message })
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Error logging feature usage:', err)
    res.status(500).json({ error: 'Failed to log feature usage.' })
  }
})

// --- Simple in-memory cache for mood recommendations ---
// Keyed by userId|moods|status|date|gameIds
const moodCache = new Map()
const moodUsageCount = new Map() // key: userId|YYYY-MM-DD -> count

// --- /api/mood-recommend ---
// Accepts: { userId, isDevUser, selectedMoodNames: string[], status: string, games: [{ game_id, title, description, matched_moods: string[] }] }
app.post('/api/mood-recommend', async (req, res) => {
  try {
    const { userId, userEmail, isDevUser, selectedMoodNames, status, games } =
      req.body || {}

    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    if (!Array.isArray(selectedMoodNames) || selectedMoodNames.length === 0) {
      return res.status(400).json({ error: 'selectedMoodNames required' })
    }
    if (!Array.isArray(games) || games.length === 0) {
      return res.status(400).json({ error: 'games required' })
    }

    // Quota enforcement (skip for dev users)
    if (!isDevUser) {
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)
      const utcStart = today.toISOString()
      const { error: usageError, count } = await supabase
        .from('recommendation_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('requested_at', utcStart)
      if (usageError) {
        console.error('[mood-recommend] Usage check failed:', usageError)
        return res.status(500).json({ error: 'Usage check failed' })
      }
      const DAILY_LIMIT = 5
      const dateKey = new Date().toISOString().slice(0, 10)
      const memKey = `${userId}|${dateKey}`
      const memCount = moodUsageCount.get(memKey) || 0
      if ((count ?? 0) + memCount >= DAILY_LIMIT) {
        return res.status(429).json({
          error:
            'You have reached your daily limit for recommendations. Please try again tomorrow!',
        })
      }
    }

    // Cache key: user + moods + status + date + game ids (order-insensitive)
    const dateKey = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const moodKey = [...selectedMoodNames].sort().join('|')
    const gameIds = games
      .map((g) => g.game_id)
      .sort()
      .join(',')
    const cacheKey = `${userId}|${moodKey}|${
      status || 'all'
    }|${dateKey}|${gameIds}`
    if (moodCache.has(cacheKey)) {
      const cached = moodCache.get(cacheKey)
      return res.json(cached)
    }

    // Trim to top N to control token usage
    const MAX_CANDIDATES = 20
    const candidates = games.slice(0, MAX_CANDIDATES).map((g) => ({
      game_id: g.game_id,
      title: g.title,
      description: (g.description || '').slice(0, 400),
      matched_moods: Array.isArray(g.matched_moods) ? g.matched_moods : [],
    }))

    // Call OpenAI helper to re-rank and produce reasons
    const result = await reRankAndComment({
      moods: selectedMoodNames,
      candidates,
    })

    // Validate response
    const allowedIds = new Set(candidates.map((c) => c.game_id))
    const items = Array.isArray(result?.items)
      ? result.items.filter((it) => allowedIds.has(it.game_id))
      : []

    const responsePayload = { items }

    // Cache for the day
    moodCache.set(cacheKey, responsePayload)

    // Ensure public.users row exists for FK (current FK points to public.users)
    const ensured = await ensurePublicUserExists(supabase, userId, userEmail)
    if (ensured) {
      const insertPayload = {
        user_id: userId,
        feature: 'mood',
        details: {
          selectedMoodNames,
          status,
          candidates: candidates.map((c) => ({
            game_id: c.game_id,
            title: c.title,
          })),
          // Align with other routes by providing a 'recommendations' field
          recommendations: items.map((it) => ({
            game_id: it.game_id,
            reason: it.reason,
            score: it.score,
          })),
          isDevUser,
        },
        // rely on DB default created_at
      }
      const { error: insertError } = await supabase
        .from('recommendation_history')
        .insert([insertPayload])
      if (insertError) {
        console.error('[mood-recommend] Insert failed:', insertError)
      }
    } else {
      console.warn(
        '[mood-recommend] Skipping recommendation_history insert: missing public.users row and cannot create without email'
      )
    }

    // Bump in-memory usage counter (does not persist)
    if (!isDevUser) {
      const dateKey = new Date().toISOString().slice(0, 10)
      const memKey = `${userId}|${dateKey}`
      moodUsageCount.set(memKey, (moodUsageCount.get(memKey) || 0) + 1)
    }

    return res.json(responsePayload)
  } catch (err) {
    console.error('Error in /api/mood-recommend:', err)
    return res
      .status(500)
      .json({ error: err.message || 'Internal server error' })
  }
})

// --- /api/recommend endpoint (deprecated) ---
// Forward to unified OpenAI route to avoid duplicate logic.
app.post('/api/recommend', (req, res) => {
  console.log('[recommend] Forwarding to /api/openai/recommend')
  // Preserve method and body using 307 Temporary Redirect
  res.redirect(307, '/api/openai/recommend')
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
