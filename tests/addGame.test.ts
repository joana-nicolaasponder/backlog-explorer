import supabase, { supabaseAdmin } from './helpers/supabaseTestClient';
import { setupTestUser, setupTestData, cleanupTestData } from './helpers/testSetup';

describe('Game Addition Flow', () => {
  let testUserId: string;
  let testMoodId: string;
  let testPlatformId: string;
  let testGenreId: string;

  beforeAll(async () => {
    // Set up test user and data
    const user = await setupTestUser();
    testUserId = user.id;
    await setupTestData();

    // Get test mood
    const { data: moodData, error: moodError } = await supabaseAdmin
      .from('moods')
      .select('id')
      .eq('name', 'Test Mood')
      .single();
    if (moodError) throw moodError;
    testMoodId = moodData.id;

    // Get test platform
    const { data: platformData, error: platformError } = await supabaseAdmin
      .from('platforms')
      .select('id')
      .eq('name', 'Test Platform')
      .single();
    if (platformError) throw platformError;
    testPlatformId = platformData.id;

    // Get test genre
    const { data: genreData, error: genreError } = await supabaseAdmin
      .from('genres')
      .select('id')
      .eq('name', 'Test Genre')
      .single();
    if (genreError) throw genreError;
    testGenreId = genreData.id;
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.auth.signOut();
  });

  afterEach(async () => {
    await cleanupTestData(testUserId);
  });

  it('should successfully add a game with moods, platforms, and genres', async () => {
    // 1. Add a game
    const { data: gameData, error: gameError } = await supabaseAdmin
      .from('games')
      .insert([{
        title: 'Test Game',
        rawg_id: Math.floor(Math.random() * 1000000)
      }])
      .select()
      .single();
    
    expect(gameError).toBeNull();
    expect(gameData).toBeTruthy();
    const gameId = gameData.id;

    // 2. Add user_games entry
    const { error: userGameError } = await supabaseAdmin
      .from('user_games')
      .insert([{
        user_id: testUserId,
        game_id: gameId
      }]);
    
    expect(userGameError).toBeNull();

    // 3. Add game mood
    const { error: moodError } = await supabaseAdmin
      .from('game_moods')
      .insert([{
        user_id: testUserId,
        game_id: gameId,
        mood_id: testMoodId,
        weight: 1
      }]);
    
    expect(moodError).toBeNull();

    // 4. Add game platform
    const { error: platformError } = await supabaseAdmin
      .from('game_platforms')
      .insert([{
        game_id: gameId,
        platform_id: testPlatformId
      }]);
    
    expect(platformError).toBeNull();

    // 5. Add game genre
    const { error: genreError } = await supabaseAdmin
      .from('game_genres')
      .insert([{
        game_id: gameId,
        genre_id: testGenreId
      }]);
    
    expect(genreError).toBeNull();

    // 6. Verify all relationships exist
    const { data: finalGame, error: finalError } = await supabaseAdmin
      .from('games')
      .select(`
        *,
        user_games!inner (*),
        game_moods!inner (*),
        game_platforms!inner (*),
        game_genres!inner (*)
      `)
      .eq('id', gameId)
      .single();
    
    expect(finalError).toBeNull();
    expect(finalGame).toBeTruthy();
    expect(finalGame.user_games).toHaveLength(1);
    expect(finalGame.game_moods).toHaveLength(1);
    expect(finalGame.game_platforms).toHaveLength(1);
    expect(finalGame.game_genres).toHaveLength(1);
  });

  it('should fail to add game_moods without valid user_id', async () => {
    // 1. Add a game
    const { data: gameData, error: gameError } = await supabaseAdmin
      .from('games')
      .insert([{
        title: 'Test Game',
        rawg_id: Math.floor(Math.random() * 1000000)
      }])
      .select()
      .single();
    
    expect(gameError).toBeNull();
    const gameId = gameData.id;

    // 2. Try to add game mood with invalid user_id
    const { error: moodError } = await supabaseAdmin
      .from('game_moods')
      .insert([{
        user_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID
        game_id: gameId,
        mood_id: testMoodId,
        weight: 1
      }]);
    
    expect(moodError).toBeTruthy();
    expect(moodError.code).toBe('23503'); // Foreign key violation
  });

  it('should fail to add game without required fields', async () => {
    const { error } = await supabase
      .from('games')
      .insert([{
        // Missing required fields
      }]);
    
    expect(error).toBeTruthy();
  });

  it('should respect RLS policies', async () => {
    // 1. Sign out to test unauthenticated access
    await supabase.auth.signOut();

    // 2. Try to add a game while signed out
    const { error: gameError } = await supabase
      .from('games')
      .insert([{
        title: 'Test Game',
        rawg_id: Math.floor(Math.random() * 1000000)
      }]);
    
    expect(gameError).toBeTruthy();

    // Sign back in for cleanup
    await supabase.auth.signInWithPassword({
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'testpassword'
    });
  });
});
