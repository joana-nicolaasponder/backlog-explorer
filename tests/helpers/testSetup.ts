import supabase, { supabaseAdmin } from './supabaseTestClient';

export async function setupTestUser() {
  // Get user data directly using the admin client
  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', 'joanaponder@gmail.com')
    .single();

  if (userError) throw userError;
  
  return userData;
}

export async function setupTestData() {
  // Create test mood if none exists
  const { data: existingMoods } = await supabaseAdmin
    .from('moods')
    .select('id')
    .eq('name', 'Test Mood');

  if (!existingMoods?.length) {
    const { error: moodError } = await supabaseAdmin
      .from('moods')
      .insert([{ name: 'Test Mood', category: 'primary' }])
      .select();
    if (moodError) throw moodError;
  }

  // Verify mood was created
  const { data: verifyMood, error: verifyMoodError } = await supabaseAdmin
    .from('moods')
    .select('id')
    .eq('name', 'Test Mood')
    .single();
  if (verifyMoodError) throw verifyMoodError;
  if (!verifyMood) throw new Error('Failed to create test mood');

  // Create test platform if none exists
  const { data: existingPlatforms } = await supabaseAdmin
    .from('platforms')
    .select('id')
    .eq('name', 'Test Platform');

  if (!existingPlatforms?.length) {
    const { error: platformError } = await supabaseAdmin
      .from('platforms')
      .insert([{ name: 'Test Platform' }])
      .select();
    if (platformError) throw platformError;
  }

  // Verify platform was created
  const { data: verifyPlatform, error: verifyPlatformError } = await supabaseAdmin
    .from('platforms')
    .select('id')
    .eq('name', 'Test Platform')
    .single();
  if (verifyPlatformError) throw verifyPlatformError;
  if (!verifyPlatform) throw new Error('Failed to create test platform');

  // Create test genre if none exists
  const { data: existingGenres } = await supabaseAdmin
    .from('genres')
    .select('id')
    .eq('name', 'Test Genre');

  if (!existingGenres?.length) {
    const { error: genreError } = await supabaseAdmin
      .from('genres')
      .insert([{ name: 'Test Genre' }])
      .select();
    if (genreError) throw genreError;
  }

  // Verify genre was created
  const { data: verifyGenre, error: verifyGenreError } = await supabaseAdmin
    .from('genres')
    .select('id')
    .eq('name', 'Test Genre')
    .single();
  if (verifyGenreError) throw verifyGenreError;
  if (!verifyGenre) throw new Error('Failed to create test genre');

  // Verify that test data exists
  const { data: verifyData, error: verifyError } = await supabaseAdmin
    .from('platforms')
    .select('id')
    .limit(1);
  
  if (verifyError) throw verifyError;
  if (!verifyData?.length) throw new Error('Failed to create test data');
}

export async function cleanupTestData(userId: string) {
  // First get all games associated with the user
  const { data: userGames } = await supabase
    .from('user_games')
    .select('game_id')
    .eq('user_id', userId);

  if (userGames && userGames.length > 0) {
    const gameIds = userGames.map(ug => ug.game_id);

    // Delete related records first
    await supabase.from('game_moods').delete().in('game_id', gameIds);
    await supabase.from('game_platforms').delete().in('game_id', gameIds);
    await supabase.from('game_genres').delete().in('game_id', gameIds);
    await supabase.from('user_games').delete().in('game_id', gameIds);
    
    // Finally delete the games
    await supabase.from('games').delete().in('id', gameIds);
  }
}
