import { NextApiRequest, NextApiResponse } from 'next'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { mode, backlog, season, holidays, preferences } = req.body

  try {
    const formattedBacklog = backlog
      .map((game: any) => {
        return `${game.title} - Genre: ${game.genre || 'N/A'}, Mood: ${game.mood || 'N/A'}`
      })
      .join('\n')

    const messages = [
      {
        role: 'system',
        content: `You are a helpful assistant that recommends video games based on seasons and user preferences.`,
      },
      {
        role: 'user',
        content: `Backlog:\n${formattedBacklog}\n\nSeason: ${season}\n` +
          (holidays?.length ? `Events: ${holidays.map((h: any) => h.name).join(', ')}\n` : '') +
          `Recommend games that fit the current season and events.`,
      },
    ]

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.7,
      max_tokens: 400,
    })

    const reply = response.choices[0]?.message?.content ?? 'No recommendation available.'
    res.status(200).json({ recommendation: reply })
  } catch (error: any) {
    console.error('Recommendation error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
}