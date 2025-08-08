const OpenAI = require('openai')
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * Re-rank provided candidates and generate one-sentence reasons.
 * @param {{ moods: string[], candidates: { game_id: string, title: string, description: string, matched_moods: string[] }[] }} params
 * @returns {Promise<{ items: { game_id: string, score: number, reason: string }[] }>}
 */
async function reRankAndComment({ moods, candidates }) {
  const system = [
    "You help a user pick what to play from their own backlog.",
    'ONLY re-order the provided candidates. Do not add or remove items.',
    'Optimize purely for FIT with the selected moods. Prefer matched_moods; use description only for light cues—no invented facts.',
    'Output STRICT JSON: { "items": [ { "game_id": string, "score": number (0-100), "reason": string } ] }',
    'Reason style: second-person, warm, non-spoilery, 1–2 short sentences (max ~40 words total).',
    'Each reason MUST: (1) mention the game by title once, (2) reference at least one selected mood by NAME, (3) include one concrete hook (mechanic, pacing, vibe).',
    'Do NOT repeat the same sentence across items. Vary the language. No templates. No spoilers.',
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
      { role: 'user', content: `Rank these games for the user's current moods and craft personal reasons. Return STRICT JSON only.\n${user}` },
    ],
    temperature: 0.2,
    max_tokens: 800,
    response_format: { type: 'json_object' },
  })

  const content = resp.choices?.[0]?.message?.content || '{}'
  try {
    const parsed = JSON.parse(content)
    // Validate structure
    if (!parsed || !Array.isArray(parsed.items)) return { items: [] }
    // Sanitize items
    const allowed = new Set(candidates.map((c) => c.game_id))
    let items = parsed.items
      .filter((it) => allowed.has(it.game_id))
      .map((it) => ({
        game_id: String(it.game_id),
        score: Math.max(0, Math.min(100, Number(it.score) || 0)),
        reason: typeof it.reason === 'string' ? it.reason.trim() : '',
      }))
    // Enforce uniqueness and title mention as a safeguard
    const titleById = new Map(candidates.map((c) => [c.game_id, c.title]))
    const seen = new Map()
    items = items.map((it, idx) => {
      const title = titleById.get(it.game_id) || ''
      let r = it.reason || ''
      if (title && !r.toLowerCase().includes(title.toLowerCase())) {
        r = `${title}: ${r}`
      }
      const key = r.toLowerCase()
      if (seen.has(key)) {
        // append a tiny title-specific clause to differentiate
        r = `${r} (especially if "${title}" appeals today)`
      }
      seen.set(r.toLowerCase(), true)
      return { ...it, reason: r }
    })
    return { items }
  } catch (e) {
    // Log truncated content for debugging
    console.warn('[moodRecommender] JSON parse failed; content (trunc):', content.slice(0, 300))

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

    // Retry once with stricter instructions to return ONLY JSON
    try {
      const retry = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system + '\nReturn ONLY a single JSON object. No prose.' },
          { role: 'user', content: user },
        ],
        temperature: 0.0,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      })
      const retryContent = retry.choices?.[0]?.message?.content || '{}'
      const parsedRetry = JSON.parse(retryContent)
      if (parsedRetry && Array.isArray(parsedRetry.items)) {
        const allowed = new Set(candidates.map((c) => c.game_id))
        const items = parsedRetry.items
          .filter((it) => allowed.has(it.game_id))
          .map((it) => ({
            game_id: String(it.game_id),
            score: Math.max(0, Math.min(100, Number(it.score) || 0)),
            reason: typeof it.reason === 'string' ? it.reason.trim() : '',
          }))
        return { items }
      }
    } catch (e2) {
      console.warn('[moodRecommender] Retry also failed to produce JSON')
    }

    // Fallback: keep original order with personal, mood-grounded reasons
    return {
      items: candidates.map((c, idx) => ({
        game_id: c.game_id,
        score: 50 - idx, // descending
        reason: (() => {
          const mm = Array.isArray(c.matched_moods) ? c.matched_moods : []
          const m1 = (moods && moods[0]) || mm[0]
          const m2 = (moods && moods[1]) || mm[1]
          const moodLine = m1 && m2
            ? `Since you’re feeling ${m1} and ${m2},`
            : m1
              ? `Since you’re feeling ${m1},`
              : `Given your mood,`
          const desc = (c.description || '').trim()
          const snippet = desc
            ? (desc.split(/\.|!|\?/)[0] || desc).slice(0, 120)
            : ''
          const hook = snippet
            ? `Here’s why: ${snippet}.`
            : 'Its overall vibe matches that headspace.'
          return `${moodLine} ${c.title} can meet you where you are. ${hook}`
        })(),
      })),
    }
  }
}

module.exports = { reRankAndComment }
