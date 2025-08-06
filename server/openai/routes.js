const { supabase } = require('../supabase')
const DAILY_LIMIT = 5

const express = require('express')
const {
  purchaseAlternativePrompt,
  chatPrompt,
  seasonalPrompt,
} = require('./prompts')
const OpenAI = require('openai')
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const router = express.Router()

// POST /api/openai/recommend
router.post('/recommend', async (req, res) => {
  const { mode, backlog, season, holidays, preferences, userId, isDevUser } =
    req.body

  // Quota enforcement (skip for dev users)
  if (!isDevUser) {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const utcStart = today.toISOString()
    const { count, error: usageError } = await supabase
      .from('recommendation_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('requested_at', utcStart)

    if (usageError) {
      console.error('[openai/recommend] Usage check failed:', usageError)
      return res.status(500).json({ error: 'Usage check failed' })
    }
    if ((count ?? 0) >= DAILY_LIMIT) {
      return res.status(429).json({
        error:
          'You have reached your daily limit for recommendations. Please try again tomorrow!',
      })
    }
  }

  try {
    // Only include title, genre, and mood, and sample up to 50 games if backlog is large
    let sampledBacklog = backlog
    if (Array.isArray(backlog) && backlog.length > 50) {
      // Randomly sample 50 games
      sampledBacklog = backlog.sort(() => 0.5 - Math.random()).slice(0, 50)
    }
    const formattedBacklog = sampledBacklog
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

    res.json({ recommendation: content })

    // Log to Supabase after successful recommendation
    if (userId && !isDevUser) {
      const insertPayload = {
        user_id: userId,
        feature: mode || 'unknown',
        details: { backlog, season, holidays },
        requested_at: new Date().toISOString(),
      }
      const { error: insertError } = await supabase
        .from('recommendation_history')
        .insert([insertPayload])
      if (insertError) {
        console.error(
          '[openai/recommend] Insert failed:',
          insertError,
          'Payload:',
          insertPayload
        )
      } else {
        console.log(
          '[openai/recommend] Inserted recommendation_history row:',
          insertPayload
        )
      }
    }
  } catch (error) {
    console.error('Error generating recommendation:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

module.exports = router
