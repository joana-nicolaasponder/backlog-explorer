import supabase from '../supabaseClient';
import { RAWGGame } from '../types/rawg';

interface PlatformMapping {
  rawg_id: number;
  platform_id: string;
  rawg_name: string;
}

interface GenreMapping {
  rawg_id: number;
  genre_id: string;
  rawg_name: string;
}

export async function syncPlatformMapping(rawgPlatform: { id: number; name: string }): Promise<string | null> {
  // Check if mapping already exists
  const { data: existingMapping } = await supabase
    .from('rawg_platform_mappings')
    .select('platform_id')
    .eq('rawg_id', rawgPlatform.id)
    .single();

  if (existingMapping) {
    return existingMapping.platform_id;
  }

  // Look for a matching platform in our database
  const { data: platforms } = await supabase
    .from('platforms')
    .select('id, name')
    .ilike('name', `%${rawgPlatform.name}%`);

  let platformId: string;

  if (!platforms || platforms.length === 0) {
    // Create new platform if no match found
    const { data: newPlatform } = await supabase
      .from('platforms')
      .insert({ name: rawgPlatform.name })
      .select()
      .single();

    if (!newPlatform) {
      console.error('Failed to create new platform:', rawgPlatform.name);
      return null;
    }

    platformId = newPlatform.id;
  } else {
    platformId = platforms[0].id;
  }

  // Create mapping
  const { error } = await supabase
    .from('rawg_platform_mappings')
    .insert({
      rawg_id: rawgPlatform.id,
      platform_id: platformId,
      rawg_name: rawgPlatform.name
    });

  if (error) {
    console.error('Failed to create platform mapping:', error);
    return null;
  }

  return platformId;
}

export async function syncGenreMapping(rawgGenre: { id: number; name: string }): Promise<string | null> {
  // Check if mapping already exists
  const { data: existingMapping } = await supabase
    .from('rawg_genre_mappings')
    .select('genre_id')
    .eq('rawg_id', rawgGenre.id)
    .single();

  if (existingMapping) {
    return existingMapping.genre_id;
  }

  // Look for a matching genre in our database
  const { data: genres } = await supabase
    .from('genres')
    .select('id, name')
    .ilike('name', `%${rawgGenre.name}%`);

  let genreId: string;

  if (!genres || genres.length === 0) {
    // Create new genre if no match found
    const { data: newGenre } = await supabase
      .from('genres')
      .insert({ name: rawgGenre.name })
      .select()
      .single();

    if (!newGenre) {
      console.error('Failed to create new genre:', rawgGenre.name);
      return null;
    }

    genreId = newGenre.id;
  } else {
    genreId = genres[0].id;
  }

  // Create mapping
  const { error } = await supabase
    .from('rawg_genre_mappings')
    .insert({
      rawg_id: rawgGenre.id,
      genre_id: genreId,
      rawg_name: rawgGenre.name
    });

  if (error) {
    console.error('Failed to create genre mapping:', error);
    return null;
  }

  return genreId;
}

export async function mapRAWGGameToIds(game: RAWGGame) {
  const platformIds = await Promise.all(
    game.platforms.map(async (p) => await syncPlatformMapping(p.platform))
  );

  const genreIds = await Promise.all(
    game.genres.map(async (g) => await syncGenreMapping(g))
  );

  return {
    platformIds: platformIds.filter((id): id is string => id !== null),
    genreIds: genreIds.filter((id): id is string => id !== null)
  };
}
