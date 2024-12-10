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

export interface GameNote {
  id: string;
  game_id: string;
  user_id: string;
  content: string;
  mood: 'Excited' | 'Satisfied' | 'Frustrated' | 'Confused' | 'Nostalgic' | 'Impressed' | 'Disappointed' | null;
  rating: number | null;
  play_session_date: string | null;
  hours_played: number | null;
  is_completion_entry: boolean;
  completion_date: string | null;
  created_at: string;
  duration?: number;
}
