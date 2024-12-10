-- Begin transaction
BEGIN;

-- 1. Create new games table structure
CREATE TABLE IF NOT EXISTS new_games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    rawg_id INTEGER,
    rawg_slug TEXT,
    metacritic_rating INTEGER,
    release_date DATE,
    background_image TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(rawg_id)
);

-- 2. Create user_games table
CREATE TABLE IF NOT EXISTS user_games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES new_games(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'Not Started',
    progress INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, game_id)
);

-- 3. Migrate existing data
-- First, insert games with rawg_id
INSERT INTO new_games (title, rawg_id, rawg_slug, metacritic_rating, release_date, background_image, description)
SELECT DISTINCT ON (rawg_id)
    title,
    rawg_id,
    rawg_slug,
    metacritic_rating,
    release_date,
    background_image,
    description
FROM games
WHERE rawg_id IS NOT NULL;

-- Then insert games without rawg_id
INSERT INTO new_games (title, rawg_id, rawg_slug, metacritic_rating, release_date, background_image, description)
SELECT DISTINCT ON (title)
    title,
    rawg_id,
    rawg_slug,
    metacritic_rating,
    release_date,
    background_image,
    description
FROM games
WHERE rawg_id IS NULL;

-- Then, create user_games entries
INSERT INTO user_games (user_id, game_id, status, progress)
SELECT DISTINCT ON (g.user_id, ng.id)
    g.user_id,
    ng.id,
    g.status,
    COALESCE(g.progress, 0) as progress
FROM games g
JOIN new_games ng ON 
    (g.rawg_id IS NOT NULL AND g.rawg_id = ng.rawg_id) OR 
    (g.rawg_id IS NULL AND g.title = ng.title)
ORDER BY g.user_id, ng.id, g.created_at DESC;

-- 4. Store relationships in temp tables
CREATE TEMP TABLE temp_game_platforms AS
SELECT DISTINCT g.rawg_id, gp.platform_id
FROM games g
JOIN game_platforms gp ON g.id = gp.game_id
WHERE g.rawg_id IS NOT NULL;

CREATE TEMP TABLE temp_game_genres AS
SELECT DISTINCT g.rawg_id, gg.genre_id
FROM games g
JOIN game_genres gg ON g.id = gg.game_id
WHERE g.rawg_id IS NOT NULL;

-- 5. Set up RLS policies
ALTER TABLE new_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_games ENABLE ROW LEVEL SECURITY;

-- Games are readable by all authenticated users
CREATE POLICY "Games are viewable by all authenticated users"
    ON new_games
    FOR SELECT
    TO authenticated
    USING (true);

-- User games are only viewable by the owner
CREATE POLICY "User games are viewable by owner"
    ON user_games
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- User games can be inserted by the owner
CREATE POLICY "User games can be inserted by owner"
    ON user_games
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- User games can be updated by the owner
CREATE POLICY "User games can be updated by owner"
    ON user_games
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- User games can be deleted by the owner
CREATE POLICY "User games can be deleted by owner"
    ON user_games
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- 6. Create updated_at trigger for user_games
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_games_updated_at
    BEFORE UPDATE ON user_games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Drop existing foreign key constraints
ALTER TABLE game_platforms DROP CONSTRAINT IF EXISTS game_platforms_game_id_fkey;
ALTER TABLE game_genres DROP CONSTRAINT IF EXISTS game_genres_game_id_fkey;

-- 8. Rename tables
ALTER TABLE games RENAME TO games_old;
ALTER TABLE new_games RENAME TO games;

-- 9. Update game relationships
-- Clear existing relationships
TRUNCATE game_platforms, game_genres;

-- Recreate relationships with new game IDs
INSERT INTO game_platforms (game_id, platform_id)
SELECT DISTINCT ng.id, tp.platform_id
FROM games ng
JOIN temp_game_platforms tp ON ng.rawg_id = tp.rawg_id
WHERE ng.rawg_id IS NOT NULL;

INSERT INTO game_genres (game_id, genre_id)
SELECT DISTINCT ng.id, tg.genre_id
FROM games ng
JOIN temp_game_genres tg ON ng.rawg_id = tg.rawg_id
WHERE ng.rawg_id IS NOT NULL;

-- 10. Recreate foreign key constraints
ALTER TABLE game_platforms 
    ADD CONSTRAINT game_platforms_game_id_fkey 
    FOREIGN KEY (game_id) 
    REFERENCES games(id) 
    ON DELETE CASCADE;

ALTER TABLE game_genres 
    ADD CONSTRAINT game_genres_game_id_fkey 
    FOREIGN KEY (game_id) 
    REFERENCES games(id) 
    ON DELETE CASCADE;

-- 11. Create views for backward compatibility (optional)
CREATE VIEW games_with_user_data AS
SELECT 
    g.*,
    ug.user_id,
    ug.status,
    ug.progress,
    ug.created_at as user_game_created_at,
    ug.updated_at as user_game_updated_at
FROM games g
JOIN user_games ug ON g.id = ug.game_id;

COMMIT;
