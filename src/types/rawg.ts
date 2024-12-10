export interface RAWGPlatform {
  platform: {
    id: number;
    name: string;
    slug: string;
  };
  released_at?: string;
  requirements?: {
    minimum?: string;
    recommended?: string;
  };
}

export interface RAWGGenre {
  id: number;
  name: string;
  slug: string;
}

export interface RAWGGameShort {
  id: number;
  slug: string;
  name: string;
  released: string;
  background_image: string | null;
  rating: number;
  metacritic: number | null;
  platforms: RAWGPlatform[];
  genres: RAWGGenre[];
}

export interface RAWGGameDetailed extends RAWGGameShort {
  description: string;
  description_raw: string;
  website: string;
  playtime: number;
  screenshots_count: number;
  movies_count: number;
  creators_count: number;
  achievements_count: number;
  parent_achievements_count: number;
  reddit_url: string;
  reddit_name: string;
  reddit_description: string;
  reddit_logo: string;
  reddit_count: number;
  twitch_count: number;
  youtube_count: number;
  reviews_text_count: number;
  ratings_count: number;
  suggestions_count: number;
  alternative_names: string[];
  metacritic_url: string;
  parents_count: number;
  additions_count: number;
  game_series_count: number;
}

export interface RAWGSearchResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: RAWGGameShort[];
}
