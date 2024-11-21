-- Create Users Table
CREATE TABLE Users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT now()
);

-- Create Games Table
CREATE TABLE Games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES Users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  platform TEXT,
  genre TEXT,
  tags JSON,
  status TEXT,
  progress FLOAT,
  created_at TIMESTAMP DEFAULT now()
);

-- Create Playlists Table
CREATE TABLE Playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES Users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Create Playlist_Games Table
CREATE TABLE Playlist_Games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES Playlists (id) ON DELETE CASCADE,
  game_id UUID REFERENCES Games (id) ON DELETE CASCADE
);

-- Create Reflections Table
CREATE TABLE Reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES Games (id) ON DELETE CASCADE,
  user_id UUID REFERENCES Users (id) ON DELETE CASCADE,
  reflection TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);