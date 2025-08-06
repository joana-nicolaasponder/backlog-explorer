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

app.use(express.json({ limit: '5mb' })); 
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

app.get('/api/test', (req, res) => {
  console.log('Test route hit!');
  res.json({ ok: true });
});

// Feedback email endpoint
const { sendFeedbackMail } = require('./feedbackMailer')

app.post('/api/feedback', async (req, res) => {
  // Always log the received body for debugging
  console.log('Received feedback body:', req.body);

  const { user_id, name, email, content, category } = req.body;
  if (!content || typeof content !== 'string' || content.trim().length < 5) {
    return res.status(400).json({ error: 'Feedback message is required.' });
  }
  if (!category) {
    return res.status(400).json({ error: 'Missing content or category' });
  }
  try {
    // Insert into feedback table
    console.log('Attempting to insert feedback:', { user_id, content, category });
    const { error } = await supabase
      .from('feedback')
      .insert([{ user_id, content, category }]);
    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Send feedback email
    await sendFeedbackMail({ name, email, message: content });
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending feedback email:', error);
    res.status(500).json({ error: 'Failed to send feedback email.' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
