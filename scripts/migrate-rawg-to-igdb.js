#!/usr/bin/env node

/**
 * Migration Script: RAWG to IGDB
 * 
 * This script migrates games that still use RAWG as their provider to IGDB.
 * It searches for matching games in IGDB and updates the database records.
 * 
 * Usage: node scripts/migrate-rawg-to-igdb.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

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
    const searchQuery = `search "${title.replace(/"/g, '\\"')}";
fields name,slug,first_release_date,cover.url,aggregated_rating,platforms.name,platforms.slug,genres.name,genres.slug,summary;
limit 5;`;

    const data = await fetchIGDB('/games', searchQuery);
    
    if (data.length === 0) {
      console.log(`  ❌ No IGDB match found for: ${title}`);
      return null;
    }

    // Return the best match (first result)
    const match = data[0];
    console.log(`  ✅ Found IGDB match: ${match.name} (ID: ${match.id})`);
    
    return {
      igdb_id: match.id.toString(),
      title: match.name,
      slug: match.slug,
      release_date: match.first_release_date 
        ? new Date(match.first_release_date * 1000).toISOString().split('T')[0]
        : null,
      background_image: match.cover?.url
        ? `https:${match.cover.url.replace('t_thumb', 't_screenshot_big')}`
        : null,
      metacritic_rating: match.aggregated_rating
        ? Math.round(match.aggregated_rating)
        : null,
      description: match.summary || null,
      platforms: match.platforms || [],
      genres: match.genres || []
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
        slug: igdbData.slug,
        release_date: igdbData.release_date,
        background_image: igdbData.background_image,
        metacritic_rating: igdbData.metacritic_rating,
        description: igdbData.description,
        updated_at: new Date().toISOString()
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

async function migrateRAWGGames() {
  console.log('🚀 Starting RAWG to IGDB migration...\n');

  try {
    // Get all games that still use RAWG
    const { data: rawgGames, error } = await supabase
      .from('games')
      .select('id, title, rawg_id')
      .eq('provider', 'rawg');

    if (error) {
      throw new Error(`Failed to fetch RAWG games: ${error.message}`);
    }

    if (!rawgGames || rawgGames.length === 0) {
      console.log('✅ No RAWG games found. Migration complete!');
      return;
    }

    console.log(`📊 Found ${rawgGames.length} games to migrate:\n`);

    let successCount = 0;
    let failureCount = 0;

    for (const game of rawgGames) {
      console.log(`🔄 Processing: ${game.title} (ID: ${game.id})`);
      
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
      
      console.log(''); // Empty line for readability
      
      // Add a small delay to be respectful to the IGDB API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('📈 Migration Summary:');
    console.log(`✅ Successfully migrated: ${successCount} games`);
    console.log(`❌ Failed to migrate: ${failureCount} games`);
    
    if (failureCount > 0) {
      console.log('\n⚠️  Some games could not be migrated automatically.');
      console.log('You may need to handle these manually through your UI.');
    }

  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  migrateRAWGGames()
    .then(() => {
      console.log('\n🎉 Migration script completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateRAWGGames };