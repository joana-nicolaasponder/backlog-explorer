import { GameProvider } from '../types/game';
import { IGDBProvider } from './igdb';

export const GAME_PROVIDER = 'igdb';
export const gameService: GameProvider = new IGDBProvider();
