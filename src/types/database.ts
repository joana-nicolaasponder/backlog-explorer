export interface Game {
  id: string;
  title: string;
  rawg_id?: number;
  external_id?: number;  // Only in dev
  provider?: string;     // Only in dev
  rawg_slug?: string;
  metacritic_rating?: number;
  release_date?: string;
  background_image?: string;
  description?: string;
  game_genres?: GameGenre[];
}

export interface UserGame {
  id: string;
  user_id: string;
  game_id: string;
  status: string;
  progress: number;
  platforms: string[];
  image?: string;
  game?: Game;
}

export interface GameGenre {
  genre_id: string;
  genres: {
    id: string;
    name: string;
  };
}

export interface GameMood {
  id: string;
  game_id: string;
  user_id: string;
  mood_id: string;
  weight: number;
  mood?: {
    id: string;
    name: string;
  };
}

// Add more interfaces as needed
