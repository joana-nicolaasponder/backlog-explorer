import type { NextApiRequest, NextApiResponse } from 'next'
import { getRecommendation } from '../../../server/openai/recommendation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const DAILY_LIMIT = 5

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { backlog, season, holidays, userId, mode, isDevUser } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  console.log('[recommend] Incoming payload:', req.body);

  // Bypass daily usage limit for dev users
  if (!isDevUser) {
    // Check daily usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count, error: usageError } = await supabase
      .from('recommendation_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('requested_at', today.toISOString());

    if (usageError) {
      console.error('[recommend] Usage check failed:', usageError);
      return res.status(500).json({ error: 'Usage check failed' });
    }
    if ((count ?? 0) >= DAILY_LIMIT) {
      return res.status(429).json({ error: 'You have reached your daily limit for recommendations. Please try again tomorrow!' });
    }
  }

  try {
    const reply = await getRecommendation({ backlog, season, holidays })
    // Log the request
    const insertPayload = {
      user_id: userId,
      feature: mode || 'unknown',
      details: { backlog, season, holidays },
      requested_at: new Date().toISOString(),
    };
    const { error: insertError } = await supabase.from('recommendation_history').insert([insertPayload]);
    if (insertError) {
      console.error('[recommend] Insert failed:', insertError, 'Payload:', insertPayload);
      return res.status(500).json({ error: 'Failed to log recommendation request', details: insertError.message });
    } else {
      console.log('[recommend] Inserted recommendation_history row:', insertPayload);
    }
    res.status(200).json({ recommendation: reply })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Internal server error';
    console.error('Recommendation error:', error);
    res.status(500).json({ error: errMsg });
  }
}
