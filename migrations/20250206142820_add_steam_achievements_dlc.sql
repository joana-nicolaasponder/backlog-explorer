-- Add Steam achievements and DLC columns
ALTER TABLE user_games
ADD COLUMN IF NOT EXISTS steam_achievements jsonb,
ADD COLUMN IF NOT EXISTS steam_total_achievements integer,
ADD COLUMN IF NOT EXISTS steam_dlc jsonb,
ADD COLUMN IF NOT EXISTS steam_total_dlc integer;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_games_steam_achievements ON user_games USING gin (steam_achievements);
CREATE INDEX IF NOT EXISTS idx_user_games_steam_dlc ON user_games USING gin (steam_dlc);

-- Add column comments
COMMENT ON COLUMN user_games.steam_achievements IS 'JSON array of achievement objects containing name, displayName, description, icon, and icongray';
COMMENT ON COLUMN user_games.steam_total_achievements IS 'Total number of achievements available for the game';
COMMENT ON COLUMN user_games.steam_dlc IS 'JSON array of DLC objects containing id, name, description, price, and release_date';
COMMENT ON COLUMN user_games.steam_total_dlc IS 'Total number of DLC available for the game';

-- Update existing rows with empty arrays for JSON columns
UPDATE user_games
SET 
  steam_achievements = '[]'::jsonb,
  steam_dlc = '[]'::jsonb
WHERE steam_achievements IS NULL OR steam_dlc IS NULL;
