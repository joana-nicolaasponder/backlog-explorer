const OpenAI = require('openai')
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * Re-rank provided candidates and generate one-sentence reasons.
 * @param {{ moods: string[], candidates: { game_id: string, title: string, description: string, matched_moods: string[] }[] }} params
 * @returns {Promise<{ items: { game_id: string, score: number, reason: string }[] }>}
 */
async function reRankAndComment({ moods, candidates }) {
  const system = [
    "You are a ranking model for games from the user's backlog.",
    'ONLY re-order the provided candidates. Do not add or remove items.',
    'Optimize for FIT with the selected moods. Use matched_moods first; use description only for light cues.',
    'Output STRICT JSON: { "items": [ { "game_id": string, "score": number (0-100), "reason": string } ] }',
    'Reason rules: exactly 1 sentence, ≤ 18 words, friendly, non-spoilery, reference at least one selected mood by name, no invented facts.',
  ].join('\n')

  const user = JSON.stringify({
    selected_moods: moods,
    candidates: candidates.map((c) => ({
      game_id: c.game_id,
      title: c.title,
      description: (c.description || '').slice(0, 400),
      matched_moods: Array.isArray(c.matched_moods) ? c.matched_moods : [],
    })),
  })

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `Rank and justify these games. Return STRICT JSON.\n${user}` },
    ],
    temperature: 0.2,
    max_tokens: 300,
    response_format: { type: 'json_object' },
  })

  const content = resp.choices?.[0]?.message?.content || '{}'
  try {
    const parsed = JSON.parse(content)
    // Validate structure
    if (!parsed || !Array.isArray(parsed.items)) return { items: [] }
    // Sanitize items
    const allowed = new Set(candidates.map((c) => c.game_id))
    const items = parsed.items
      .filter((it) => allowed.has(it.game_id))
      .map((it) => ({
        game_id: String(it.game_id),
        score: Math.max(0, Math.min(100, Number(it.score) || 0)),
        reason: typeof it.reason === 'string' ? it.reason.trim() : '',
      }))
    return { items }
  } catch (e) {
    // Try to extract the first JSON object from the content
    const match = content.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        const parsed = JSON.parse(match[0])
        if (parsed && Array.isArray(parsed.items)) {
          const allowed = new Set(candidates.map((c) => c.game_id))
          const items = parsed.items
            .filter((it) => allowed.has(it.game_id))
            .map((it) => ({
              game_id: String(it.game_id),
              score: Math.max(0, Math.min(100, Number(it.score) || 0)),
              reason: typeof it.reason === 'string' ? it.reason.trim() : '',
            }))
          return { items }
        }
      } catch {}
    }
    // Fallback: keep original order with neutral reasons
    return {
      items: candidates.map((c, idx) => ({
        game_id: c.game_id,
        score: 50 - idx, // descending
        reason: (() => {
          const mm = Array.isArray(c.matched_moods) ? c.matched_moods : []
          const moodSnippet = mm[0] || (moods && moods[0]) || 'your moods'
          return `Fits ${moodSnippet.toLowerCase()} mood with its overall vibe.`
        })(),
      })),
    }
  }
}

module.exports = { reRankAndComment }
