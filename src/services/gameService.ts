import { GameProvider } from '../types/game';
import { IGDBProvider } from './igdb';

// We'll use this to gradually migrate from RAWG to IGDB
export const GAME_PROVIDER = 'igdb';

// Export a single instance to use throughout the app
export const gameService: GameProvider = new IGDBProvider();
