export interface Game {
  id: string;
  title: string;
  external_id: string;
  provider: string;
  metacritic_rating?: number;
  release_date?: string;
  background_image?: string;
  description?: string;
  image?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserGame {
  id: string;
  user_id: string;
  game_id: string;
  status: string;
  progress: number;
  platforms: string[];
  created_at?: string;
  updated_at?: string;
}

export interface GamePlatform {
  id: string;
  game_id: string;
  platform_id: string;
}

export interface GameGenre {
  id: string;
  game_id: string;
  genre_id: string;
}

export interface Platform {
  id: string;
  name: string;
  slug: string;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
}

export interface Mood {
  id: string;
  name: string;
  description?: string;
}

export interface GameMood {
  id: string;
  game_id: string;
  mood_id: string;
}
