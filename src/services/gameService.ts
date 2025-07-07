import { GameProvider } from '../types/game';
import { IGDBProvider } from './igdb';
import { getGameDetails as getRAWGGameDetails, getGameScreenshots } from './rawg';

// We'll use this to gradually migrate from RAWG to IGDB
export const GAME_PROVIDER = 'igdb';

// Export a single instance to use throughout the app
export const gameService: GameProvider = new IGDBProvider();

export { getRAWGGameDetails, getGameScreenshots };
export { getRAWGGameDetails as getGameDetails };
