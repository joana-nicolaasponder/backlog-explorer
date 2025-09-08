#!/usr/bin/env node

/**
 * Migration Script: RAWG to IGDB
 * 
 * This script migrates games that still use RAWG as their provider to IGDB.
 * It searches for matching games in IGDB and updates the database records.
 * 
 * Usage: node scripts/migrate-rawg-to-igdb.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// IGDB API configuration
const IGDB_PROXY_URL = process.env.VITE_API_URL + '/api/igdb';

async function fetchIGDB(endpoint, query) {
  const response = await fetch(IGDB_PROXY_URL + endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`IGDB API error: ${response.statusText}`);
  }

  return response.json();
}

async function searchIGDBGame(title) {
  try {
    // Clean up the title for better matching
    const cleanTitle = title
      .replace(/\([^)]*\)$/, '') // Remove year/platform suffixes like "(1991)"
      .replace(/:\s*$/, '')      // Remove trailing colons
      .trim();

    const searchQuery = `search "${cleanTitle.replace(/"/g, '\\"')}";
fields name,slug,first_release_date,cover.url,aggregated_rating,platforms.name,platforms.slug,genres.name,genres.slug,summary;
limit 5;`;

    const data = await fetchIGDB('/games', searchQuery);
    
    if (data.length === 0) {
      console.log(`  ❌ No IGDB match found for: ${title}`);
      return null;
    }

    // Find the best match - prioritize exact name matches
    let bestMatch = data[0];
    for (const game of data) {
      if (game.name.toLowerCase() === cleanTitle.toLowerCase()) {
        bestMatch = game;
        break;
      }
    }

    console.log(`  ✅ Found IGDB match: ${bestMatch.name} (ID: ${bestMatch.id})`);
    
    return {
      igdb_id: bestMatch.id,
      title: bestMatch.name,
      release_date: bestMatch.first_release_date 
        ? new Date(bestMatch.first_release_date * 1000).toISOString().split('T')[0]
        : null,
      background_image: bestMatch.cover?.url
        ? `https:${bestMatch.cover.url.replace('t_thumb', 't_screenshot_big')}`
        : null,
      cover_image: bestMatch.cover?.url
        ? `https:${bestMatch.cover.url.replace('t_thumb', 't_cover_big')}`
        : null,
      metacritic_rating: bestMatch.aggregated_rating
        ? Math.round(bestMatch.aggregated_rating)
        : null,
      description: bestMatch.summary || null,
      external_id: bestMatch.id.toString()
    };
  } catch (error) {
    console.error(`  ❌ Error searching for ${title}:`, error.message);
    return null;
  }
}

async function updateGameToIGDB(gameId, igdbData) {
  try {
    const { error } = await supabase
      .from('games')
      .update({
        provider: 'igdb',
        igdb_id: igdbData.igdb_id,
        title: igdbData.title,
        release_date: igdbData.release_date,
        background_image: igdbData.background_image,
        cover_image: igdbData.cover_image,
        metacritic_rating: igdbData.metacritic_rating,
        description: igdbData.description,
        external_id: igdbData.external_id
      })
      .eq('id', gameId);

    if (error) {
      console.error(`  ❌ Failed to update game ${gameId}:`, error.message);
      return false;
    }

    console.log(`  ✅ Successfully updated game ${gameId}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error updating game ${gameId}:`, error.message);
    return false;
  }
}

async function migrateRAWGGames(options = {}) {
  console.log('🚀 Starting RAWG to IGDB migration...\n');

  try {
    // Get all games that still use RAWG as provider
    const { data: rawgGames, error } = await supabase
      .from('games')
      .select('id, title, rawg_id, igdb_id')
      .eq('provider', 'rawg')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch RAWG games: ${error.message}`);
    }

    if (!rawgGames || rawgGames.length === 0) {
      console.log('✅ No RAWG games found. Migration complete!');
      return;
    }

    console.log(`📊 Found ${rawgGames.length} games to migrate:\n`);

    // Filter options
    let gamesToProcess = rawgGames;
    
    if (options.withRawgIdOnly) {
      gamesToProcess = rawgGames.filter(game => game.rawg_id !== null);
      console.log(`🔍 Filtering to ${gamesToProcess.length} games with rawg_id only\n`);
    }

    if (options.limit) {
      gamesToProcess = gamesToProcess.slice(0, options.limit);
      console.log(`🔍 Processing only first ${options.limit} games\n`);
    }

    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < gamesToProcess.length; i++) {
      const game = gamesToProcess[i];
      console.log(`🔄 Processing (${i + 1}/${gamesToProcess.length}): ${game.title} (ID: ${game.id})`);
      
      // Skip if already has IGDB ID
      if (game.igdb_id) {
        console.log('  ⏭️  Already has IGDB ID, updating provider only...');
        const success = await supabase
          .from('games')
          .update({ provider: 'igdb' })
          .eq('id', game.id);
        
        if (success.error) {
          console.error(`  ❌ Failed to update provider: ${success.error.message}`);
          failureCount++;
        } else {
          console.log('  ✅ Provider updated to IGDB');
          successCount++;
        }
      } else {
        // Search for IGDB match
        const igdbData = await searchIGDBGame(game.title);
        
        if (igdbData) {
          // Update the game record
          const success = await updateGameToIGDB(game.id, igdbData);
          if (success) {
            successCount++;
          } else {
            failureCount++;
          }
        } else {
          failureCount++;
        }
      }
      
      console.log(''); // Empty line for readability
      
      // Add a small delay to be respectful to the IGDB API
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    console.log('📈 Migration Summary:');
    console.log(`✅ Successfully migrated: ${successCount} games`);
    console.log(`❌ Failed to migrate: ${failureCount} games`);
    console.log(`⏭️  Skipped: ${skippedCount} games`);
    
    if (failureCount > 0) {
      console.log('\n⚠️  Some games could not be migrated automatically.');
      console.log('You may need to handle these manually through your UI.');
    }

  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  }
}

// Command line options parsing
const args = process.argv.slice(2);
const options = {};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--rawg-id-only':
      options.withRawgIdOnly = true;
      break;
    case '--limit':
      options.limit = parseInt(args[i + 1]);
      i++; // Skip next argument as it's the limit value
      break;
    case '--help':
      console.log(`
RAWG to IGDB Migration Script

Usage: node scripts/migrate-rawg-to-igdb.mjs [options]

Options:
  --rawg-id-only    Only migrate games that have a rawg_id (skip manual entries)
  --limit N         Only process the first N games
  --help           Show this help message

Examples:
  node scripts/migrate-rawg-to-igdb.mjs
  node scripts/migrate-rawg-to-igdb.mjs --limit 10
  node scripts/migrate-rawg-to-igdb.mjs --rawg-id-only --limit 20
`);
      process.exit(0);
      break;
  }
}

// Run the migration
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateRAWGGames(options)
    .then(() => {
      console.log('\n🎉 Migration script completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateRAWGGames };