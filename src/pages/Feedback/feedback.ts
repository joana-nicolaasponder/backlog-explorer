import type { NextApiRequest, NextApiResponse } from 'next'
import supabase from '../../supabaseClient.js'

// @ts-expect-error: importing CommonJS JS mailer without type declarations
import { sendFeedbackMail } from '../../../server/feedbackMailer.js';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') return res.status(405).end()

  // console.log('Received body:', req.body, 'Type:', typeof req.body);

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
      // console.log('Parsed body:', body);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  const { user_id, name, email, content, category } = body;
  if (!content || !category) {
    return res.status(400).json({ error: 'Missing content or category' });
  }

  // 1. Insert into feedback table
  // console.log('Attempting to insert feedback:', { user_id, content, category });
  const { error } = await supabase
    .from('feedback')
    .insert([{ user_id, content, category }]);
  if (error) {
    // console.error('Supabase insert error:', error);
    return res.status(500).json({ error: error.message });
  }

  // 2. Send notification email using your mailer
  try {
    await sendFeedbackMail({ name, email, message: content })
  } catch (mailErr) {
    // console.error('Feedback email failed:', mailErr)
  }

  res.status(200).json({ success: true })
}
