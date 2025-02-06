export interface RawgGameDetails {
  description_raw: string
  metacritic: number
  playtime: number
  background_image: string
  screenshots: RawgScreenshot[]
}

export interface RawgScreenshot {
  id: number
  image: string
  width: number
  height: number
}

export interface Genre {
  id: number;
  name: string;
}

export interface Platform {
  id: number;
  name: string;
}

export interface GameGenre {
  genres: Genre;
}

export interface GamePlatform {
  platforms: Platform;
}

export interface Mood {
  id: string;
  name: string;
  category: 'primary' | 'secondary';
  description: string;
  created_at: string;
}

export interface GameMood {
  moods: Mood;
}

export interface Game {
  id: string;
  title: string;
  platform: string;
  genre: string;
  status: string;
  external_id?: string;
  provider?: string;
  progress: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  game_genres: GameGenre[];
  game_platforms: GamePlatform[];
  game_moods?: GameMood[];
  moods?: string[];
  image?: string;
  rawg_id?: string;
}

export interface UserGameResponse {
  status: string;
  progress: number;
  game_id: string;
  updated_at: string;
  game: {
    id: string;
    title: string;
    game_genres: {
      genres: {
        name: string;
      };
    }[];
    game_platforms: {
      platforms: {
        name: string;
      };
    }[];
    game_moods?: {
      moods: {
        name: string;
      };
    }[];
  };
}

export interface UserGame {
  id: string;
  user_id: string;
  game_id: string;
  status: string;
  progress: number;
  created_at: string;
  updated_at: string;
  game: Game;
}

export type SessionAccomplishment =
  | 'Story Progress'
  | 'Side Quest'
  | 'Exploration'
  | 'Challenge Completed'
  | 'Just Messing Around'
  | 'Grinding'
  | 'Boss Fight'
  | 'Achievement Hunting'
  | 'Learning Game Mechanics';

export type SessionMood =
  | 'Amazing'
  | 'Great'
  | 'Good'
  | 'Relaxing'
  | 'Mixed'
  | 'Frustrating'
  | 'Meh'
  | 'Regret'
  | 'Impressed'
  | 'Disappointed'

export type SessionIntent =
  | 'Continue Story'
  | 'Try Different Build'
  | 'Explore New Area'
  | 'Beat That Boss'
  | 'Grind Items/Levels'
  | 'Try Different Character'
  | 'Complete Side Content';

export interface GameNote {
  // Required fields
  id: string;
  game_id: string;
  user_id: string;
  content: string;
  created_at: string;

  // Session Context
  play_session_date: string | null;
  duration: number | null; // in minutes
  accomplishments: string[];
  
  // Reflection & Future Intent
  mood: SessionMood | null;
  next_session_plan: {
    intent: string | null;
    note: string | null;
  };
  
  // Media
  screenshots: string[];
  
  // Metadata
  is_completion_entry: boolean;
  completion_date: string | null;
}
