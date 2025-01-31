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

export interface HowLongToBeatInfo {
  gameplayMain: number | null;
  gameplayMainExtra: number | null;
  gameplayCompletionist: number | null;
}

export interface Game {
  id: string;
  title: string;
  platform: string;
  genre: string;
  status: string;
  progress: number;
  user_id: string;
  created_at: string;
  updated_at: string;
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
  | 'Regret';
  | 'Impressed'
  | 'Disappointed';

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
