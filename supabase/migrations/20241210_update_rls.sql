-- Enable RLS (if not already enabled)
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Games can be inserted by authenticated users
CREATE POLICY "Games can be inserted by authenticated users"
    ON games
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Games can be updated by authenticated users
CREATE POLICY "Games can be updated by authenticated users"
    ON games
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Ensure game_platforms and game_genres tables have RLS
ALTER TABLE game_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_genres ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert into game_platforms
CREATE POLICY "Game platforms can be inserted by authenticated users"
    ON game_platforms
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to insert into game_genres
CREATE POLICY "Game genres can be inserted by authenticated users"
    ON game_genres
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to view game_platforms
CREATE POLICY "Game platforms are viewable by authenticated users"
    ON game_platforms
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to view game_genres
CREATE POLICY "Game genres are viewable by authenticated users"
    ON game_genres
    FOR SELECT
    TO authenticated
    USING (true);
