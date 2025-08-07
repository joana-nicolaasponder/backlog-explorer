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

// Global request logger for debugging
app.use((req, res, next) => {
  console.log('Incoming request:', req.method, req.url);
  next();
});

app.use(express.json({ limit: '5mb' }))
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

app.options('*', cors(corsOptions))
app.use(cors(corsOptions))

const igdbRoutes = require('./igdb/routes')
app.use('/api/igdb', igdbRoutes)

const steamRoutes = require('./steam/routes')
const openaiRoutes = require('./openai/routes')
app.use('/api/steam', steamRoutes)
app.use('/api/openai', openaiRoutes)

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
      .insert([{ user_id, content, category }]);
    console.log('Supabase insert result:', { data, error });
    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: error.message });
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

// --- /api/recommend endpoint ---
const { getRecommendation } = require('./openai/recommendation');

const DAILY_LIMIT = 5;

app.post('/api/recommend', async (req, res) => {
  const { backlog, season, holidays, userId, mode, isDevUser } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }
  console.log('[recommend] Incoming payload:', req.body);

  try {
    if (!isDevUser) {
      // Check daily usage (count recommendations for this user today)
      const today = new Date();
      today.setHours(0,0,0,0);
      const { count, error: countError } = await supabase
        .from('recommendation_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', today.toISOString());
      if (countError) {
        console.error('Supabase count error:', countError);
        return res.status(500).json({ error: 'Database error.' });
      }
      if (count >= DAILY_LIMIT) {
        return res.status(429).json({ error: 'Daily recommendation limit reached.' });
      }
    }

    // Format backlog for prompt
    const formattedBacklog = Array.isArray(backlog)
      ? backlog.map(game => `${game.title} - Genre: ${game.genre || 'N/A'}${game.mood ? `, Mood: ${game.mood}` : ''}`).join('\n')
      : '';

    let systemPrompt, userPrompt;
    if (mode === 'purchase_alternative') {
      systemPrompt = purchaseAlternativePrompt;
      userPrompt = `The user is considering buying: ${req.body.consideringGame || ''}\n\nBacklog:\n${formattedBacklog}`;
    } else {
      systemPrompt = seasonalPrompt;
      userPrompt = `Backlog:\n${formattedBacklog}\n\nSeason: ${season}\n` +
        (holidays?.length ? `Events: ${holidays.map(h => h.name).join(', ')}\n` : '') +
        `Recommend games that fit the current season and events.`;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];
    console.log('Outgoing prompt to OpenAI:', JSON.stringify(messages, null, 2));

    // Call OpenAI directly here instead of getRecommendation to use custom messages
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.7,
      max_tokens: 400,
    });
    console.log('Raw OpenAI response:', JSON.stringify(response, null, 2));
    const recommendation = response.choices[0]?.message?.content ?? 'No recommendation available.';
    console.log('Sending recommendation to client:', recommendation);

    // Log usage
    await supabase.from('recommendation_history').insert([
      {
        user_id: userId,
        mode,
        considering_game: req.body.consideringGame || null,
        created_at: new Date().toISOString(),
      }
    ]);

    res.json({ recommendation });
  } catch (err) {
    console.error('Error in /api/recommend:', err);
    res.status(500).json({ error: 'Failed to generate recommendation.' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
