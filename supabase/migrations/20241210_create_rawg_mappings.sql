-- Create rawg_genre_mappings table
CREATE TABLE IF NOT EXISTS rawg_genre_mappings (
    rawg_id INTEGER NOT NULL,
    genre_id INTEGER NOT NULL REFERENCES genres(id),
    rawg_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (rawg_id, genre_id)
);

-- Create rawg_platform_mappings table
CREATE TABLE IF NOT EXISTS rawg_platform_mappings (
    rawg_id INTEGER NOT NULL,
    platform_id INTEGER NOT NULL REFERENCES platforms(id),
    rawg_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (rawg_id, platform_id)
);

-- Add RLS policies
ALTER TABLE rawg_genre_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rawg_platform_mappings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read mappings
CREATE POLICY "Allow authenticated users to read genre mappings"
    ON rawg_genre_mappings
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to read platform mappings"
    ON rawg_platform_mappings
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to create mappings
CREATE POLICY "Allow authenticated users to create genre mappings"
    ON rawg_genre_mappings
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to create platform mappings"
    ON rawg_platform_mappings
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
