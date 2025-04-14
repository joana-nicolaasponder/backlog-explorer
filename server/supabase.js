const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // ✅ use service role

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function upsertGame({ steamAppId, gameTitle, igdbId, coverUrl, summary }) {
  const { error: upsertError } = await supabase
    .from('games')
    .upsert([
      {
        steam_app_id: steamAppId,
        title: gameTitle,
        igdb_id: igdbId,
        background_image: coverUrl,
        description: summary,
        provider: 'steam'
        // add other fields as necessary
      }
    ], { onConflict: ['steam_app_id'] }); // make sure this matches your unique constraint
  if (upsertError) {
    console.error(`❌ Upsert failed for ${gameTitle}:`, upsertError);
  }
}

module.exports = { supabase, upsertGame }
