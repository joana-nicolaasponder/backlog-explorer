-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.created_at
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for email/password sign ups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create sequences
CREATE SEQUENCE IF NOT EXISTS tags_id_seq;

-- Create enum types
DO $$ BEGIN
    CREATE TYPE note_mood AS ENUM (
        'Amazing',
        'Great',
        'Good',
        'Relaxing',
        'Mixed',
        'Frustrating',
        'Meh',
        'Regret',
        'Excited',
        'Nostalgic',
        'Satisfied',
        'Confused',
        'Impressed',
        'Disappointed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create core tables
CREATE TABLE IF NOT EXISTS users (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    email text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS games (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    title text NOT NULL,
    rawg_id integer,
    metacritic_rating integer,
    release_date date,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    description text,
    background_image text,
    rawg_slug text
);

CREATE TABLE IF NOT EXISTS game_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now(),
    user_id uuid REFERENCES users(id),
    game_id uuid REFERENCES games(id),
    content text NOT NULL,
    mood note_mood,
    play_session_date date,
    duration integer,
    accomplishments text[] DEFAULT '{}',
    next_session_plan jsonb,
    is_completion_entry boolean DEFAULT false,
    completion_date date,
    screenshots text[] DEFAULT '{}'
);

-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_notes ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies
DO $$ BEGIN
    CREATE POLICY "Allow Supabase service role to insert" ON users
        FOR INSERT TO public
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Games are viewable by all authenticated users" ON games
        FOR SELECT TO authenticated
        USING (true);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can view their own notes" ON game_notes
        FOR SELECT TO public
        USING (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create their own notes" ON game_notes
        FOR INSERT TO public
        WITH CHECK (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update their own notes" ON game_notes
        FOR UPDATE TO public
        USING (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete their own notes" ON game_notes
        FOR DELETE TO public
        USING (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create core gaming tables
CREATE TABLE IF NOT EXISTS genres (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platforms (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS moods (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    category text NOT NULL,
    description text
);

CREATE TABLE IF NOT EXISTS game_genres (
    genre_id uuid NOT NULL REFERENCES genres(id),
    game_id uuid NOT NULL REFERENCES games(id),
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (genre_id, game_id)
);

-- RAWG Mapping Tables
CREATE TABLE IF NOT EXISTS rawg_platform_mappings (
    id bigint NOT NULL PRIMARY KEY,
    rawg_id integer NOT NULL,
    platform_id uuid NOT NULL REFERENCES platforms(id),
    rawg_name text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(rawg_id, platform_id)
);

CREATE TABLE IF NOT EXISTS rawg_genre_mappings (
    id bigint NOT NULL PRIMARY KEY,
    rawg_id integer NOT NULL,
    genre_id uuid NOT NULL REFERENCES genres(id),
    rawg_name text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(rawg_id, genre_id)
);

-- Enable RLS on mapping tables
ALTER TABLE rawg_platform_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rawg_genre_mappings ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for platform mappings
DO $$ BEGIN
    CREATE POLICY "Allow authenticated users to read platform mappings" ON rawg_platform_mappings
        FOR SELECT TO authenticated
        USING (true);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow authenticated users to insert platform mappings" ON rawg_platform_mappings
        FOR INSERT TO authenticated
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add RLS policies for genre mappings
DO $$ BEGIN
    CREATE POLICY "Allow authenticated users to read genre mappings" ON rawg_genre_mappings
        FOR SELECT TO authenticated
        USING (true);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow authenticated users to insert genre mappings" ON rawg_genre_mappings
        FOR INSERT TO authenticated
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS game_platforms (
    platform_id uuid NOT NULL REFERENCES platforms(id),
    game_id uuid NOT NULL REFERENCES games(id),
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_platforms ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for genres
DO $$ BEGIN
    CREATE POLICY "Allow authenticated users to read genres" ON genres
        FOR SELECT TO authenticated
        USING (true);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow authenticated users to insert genres" ON genres
        FOR INSERT TO authenticated
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add RLS policies for platforms
DO $$ BEGIN
    CREATE POLICY "Allow authenticated users to read platforms" ON platforms
        FOR SELECT TO authenticated
        USING (true);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow authenticated users to insert platforms" ON platforms
        FOR INSERT TO authenticated
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add RLS policies for game relationships
DO $$ BEGIN
    CREATE POLICY "Game genres are viewable by authenticated users" ON game_genres
        FOR SELECT TO authenticated
        USING (true);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Game genres can be inserted by authenticated users" ON game_genres
        FOR INSERT TO authenticated
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Game platforms are viewable by authenticated users" ON game_platforms
        FOR SELECT TO authenticated
        USING (true);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Game platforms can be inserted by authenticated users" ON game_platforms
        FOR INSERT TO authenticated
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add RLS policies for moods
DO $$ BEGIN
    CREATE POLICY "Anyone can read moods" ON moods
        FOR SELECT TO anon, authenticated
        USING (true);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create user interaction tables
CREATE TABLE IF NOT EXISTS user_games (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id),
    game_id uuid NOT NULL REFERENCES games(id),
    status text DEFAULT 'Not Started'::text NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    platforms text[] DEFAULT '{}',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS game_moods (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id),
    game_id uuid NOT NULL REFERENCES games(id),
    mood_id uuid NOT NULL REFERENCES moods(id),
    weight integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recommendation_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES users(id),
    game_id uuid REFERENCES games(id),
    created_at timestamp with time zone DEFAULT now(),
    context jsonb,
    recommendation_type text NOT NULL
);

-- Enable RLS on new tables
ALTER TABLE user_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_history ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for user_games
DO $$ BEGIN
    CREATE POLICY "User games are viewable by owner" ON user_games
        FOR SELECT TO authenticated
        USING (user_id = auth.uid());
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "User games can be inserted by owner" ON user_games
        FOR INSERT TO authenticated
        WITH CHECK (user_id = auth.uid());
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "User games can be updated by owner" ON user_games
        FOR UPDATE TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "User games can be deleted by owner" ON user_games
        FOR DELETE TO authenticated
        USING (user_id = auth.uid());
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add RLS policies for game_moods
DO $$ BEGIN
    CREATE POLICY "Users can view their own game moods" ON game_moods
        FOR SELECT TO public
        USING (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert their own game moods" ON game_moods
        FOR INSERT TO public
        WITH CHECK (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete their own game moods" ON game_moods
        FOR DELETE TO public
        USING (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add RLS policies for recommendation_history
DO $$ BEGIN
    CREATE POLICY "Users can view their own recommendation history" ON recommendation_history
        FOR SELECT TO authenticated
        USING (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert their own recommendations" ON recommendation_history
        FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create playlist tables
CREATE TABLE IF NOT EXISTS playlists (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id),
    name text NOT NULL,
    description text,
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS playlist_games (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    game_id uuid NOT NULL REFERENCES games(id),
    position integer NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(playlist_id, game_id)
);

-- Create feedback and access control tables
CREATE TABLE IF NOT EXISTS feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES users(id),
    content text NOT NULL,
    category text NOT NULL,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS allowed_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    email text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS waitlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    email text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT now(),
    invited_at timestamp with time zone,
    status text DEFAULT 'pending'::text
);

-- Enable RLS on new tables
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for playlists
DO $$ BEGIN
    CREATE POLICY "Users can view their own playlists" ON playlists
        FOR SELECT TO authenticated
        USING (user_id = auth.uid() OR is_public = true);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create their own playlists" ON playlists
        FOR INSERT TO authenticated
        WITH CHECK (user_id = auth.uid());
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update their own playlists" ON playlists
        FOR UPDATE TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete their own playlists" ON playlists
        FOR DELETE TO authenticated
        USING (user_id = auth.uid());
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add RLS policies for playlist_games
DO $$ BEGIN
    CREATE POLICY "Users can view games in visible playlists" ON playlist_games
        FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM playlists
                WHERE playlists.id = playlist_games.playlist_id
                AND (playlists.user_id = auth.uid() OR playlists.is_public = true)
            )
        );
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can manage games in their playlists" ON playlist_games
        FOR ALL TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM playlists
                WHERE playlists.id = playlist_games.playlist_id
                AND playlists.user_id = auth.uid()
            )
        );
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add RLS policies for feedback
DO $$ BEGIN
    CREATE POLICY "Users can view their own feedback" ON feedback
        FOR SELECT TO authenticated
        USING (user_id = auth.uid());
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can submit feedback" ON feedback
        FOR INSERT TO authenticated
        WITH CHECK (user_id = auth.uid());
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add RLS policies for allowed_emails
DO $$ BEGIN
    CREATE POLICY "Allowed emails are viewable by authenticated users" ON allowed_emails
        FOR SELECT TO authenticated
        USING (true);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add RLS policies for waitlist
DO $$ BEGIN
    CREATE POLICY "Waitlist entries are viewable by authenticated users" ON waitlist
        FOR SELECT TO authenticated
        USING (true);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Anyone can join waitlist" ON waitlist
        FOR INSERT TO anon
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN null;
END $$;
