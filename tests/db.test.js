import supabase from '../src/supabaseClient'

describe('Supabase Database Tests', () => {
  let testUserId, testGameId, testPlaylistId

  beforeAll(async () => {
    // Insert a test user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([{ email: '1@example.com' }])
      .select()

    if (userError) throw new Error(userError.message)
    testUserId = user[0].id

    // Insert a test game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert([
        {
          user_id: testUserId,
          title: 'Test Game',
          platform: 'PC',
          genre: 'Adventure',
          tags: JSON.stringify([{ mood: 'relaxing' }]),
          status: 'Unplayed',
          progress: 0,
        },
      ])
      .select()

    if (gameError) throw new Error(gameError.message)
    testGameId = game[0].id

    // Insert a test playlist
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .insert([
        {
          user_id: testUserId,
          name: 'Test Playlist',
          description: 'A playlist for testing.',
        },
      ])
      .select()

    if (playlistError) throw new Error(playlistError.message)
    testPlaylistId = playlist[0].id

    // Link game to playlist
    await supabase
      .from('playlist_games')
      .insert([{ playlist_id: testPlaylistId, game_id: testGameId }])
  })

  afterAll(async () => {
    // Clean up the test data
    await supabase
      .from('playlist_games')
      .delete()
      .eq('playlist_id', testPlaylistId)
    await supabase.from('Playlists').delete().eq('id', testPlaylistId)
    await supabase.from('Games').delete().eq('id', testGameId)
    await supabase.from('Users').delete().eq('id', testUserId)
  })

  it('Should fetch all games for the test user', async () => {
    const { data, error } = await supabase
      .from('games')
      .select()
      .eq('user_id', testUserId)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data[0].title).toBe('Test Game')
  })

  it('Should fetch all playlists for the test user', async () => {
    const { data, error } = await supabase
      .from('playlists')
      .select()
      .eq('user_id', testUserId)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data[0].name).toBe('Test Playlist')
  })

  it('Should fetch games in a playlist', async () => {
    const { data, error } = await supabase
      .from('playlist_games')
      .select('game_id')
      .eq('playlist_id', testPlaylistId)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data[0].game_id).toBe(testGameId)
  })

  it('Should add a reflection for a game', async () => {
    const { data: reflection, error: reflectionError } = await supabase
      .from('reflections')
      .insert([
        {
          game_id: testGameId,
          user_id: testUserId,
          reflection: 'This is a test reflection.',
        },
      ])
      .select()

    expect(reflectionError).toBeNull()
    expect(reflection[0].reflection).toBe('This is a test reflection.')

    // Clean up reflection
    await supabase.from('reflections').delete().eq('id', reflection[0].id)
  })
})
