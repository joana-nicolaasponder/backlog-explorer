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

export interface GameBasic {
  id: string;
  slug: string;
  name: string;
  released?: string;
  background_image?: string;
  metacritic?: number;
  platforms: Platform[];
  genres: Genre[];
  igdb_id: number; 
}

export interface GameDetailed extends GameBasic {
  description?: string;
  description_raw?: string;
  website?: string;
}

export interface GameSearchResult {
  count: number;
  results: GameBasic[];
}

export interface GameProvider {
  searchGames(query: string): Promise<GameSearchResult>;
  getGameDetails(id: string): Promise<GameDetailed>;
  getGameScreenshots?(id: string): Promise<string[]>;
}
