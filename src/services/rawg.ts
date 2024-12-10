import { RAWGGameDetailed, RAWGGameShort, RAWGSearchResponse } from '../types/rawg';

const RAWG_API_KEY = import.meta.env.VITE_RAWG_API_KEY;
const BASE_URL = 'https://api.rawg.io/api';

export class RAWGError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RAWGError';
  }
}

export const searchGames = async (query: string): Promise<RAWGGameShort[]> => {
  try {
    const response = await fetch(
      `${BASE_URL}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(
        query
      )}&page_size=10`
    );

    if (!response.ok) {
      throw new RAWGError(`RAWG API error: ${response.statusText}`);
    }

    const data: RAWGSearchResponse = await response.json();
    return data.results;
  } catch (error) {
    console.error('Error searching games:', error);
    throw error;
  }
};

export const getGameDetails = async (id: number): Promise<RAWGGameDetailed> => {
  try {
    const response = await fetch(
      `${BASE_URL}/games/${id}?key=${RAWG_API_KEY}`
    );

    if (!response.ok) {
      throw new RAWGError(`RAWG API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting game details:', error);
    throw error;
  }
};

export const getGameScreenshots = async (id: number): Promise<string[]> => {
  try {
    const response = await fetch(
      `${BASE_URL}/games/${id}/screenshots?key=${RAWG_API_KEY}`
    );

    if (!response.ok) {
      throw new RAWGError(`RAWG API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results.map((screenshot: { image: string }) => screenshot.image);
  } catch (error) {
    console.error('Error getting game screenshots:', error);
    throw error;
  }
};
