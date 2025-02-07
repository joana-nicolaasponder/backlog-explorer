import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.validate') });

// Create Supabase clients for dev and prod environments
const devClient = createClient(
  process.env.DEV_SUPABASE_URL,
  process.env.DEV_SUPABASE_SERVICE_KEY
);

const prodClient = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

// Function to extract table and column names from a Supabase query
function extractQueryDetails(content) {
  const queries = [];
  const selectRegex = /\.from\(['"]([^'"]+)['"]\)[^)]*\.select\(['"]([^'"]+)['"]\)/g;
  let match;

  while ((match = selectRegex.exec(content)) !== null) {
    const [_, table, columns] = match;
    queries.push({
      table,
      columns: columns.split(',').map(col => col.trim())
    });
  }

  return queries;
}

async function validateQueries() {
  try {
    // Get all TypeScript/JavaScript files
    const files = glob.sync('src/**/*.{ts,tsx,js,jsx}', { cwd: process.cwd() });
    const queries = [];

    // Extract queries from all files
    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const fileQueries = extractQueryDetails(content);
      queries.push(...fileQueries.map(q => ({ ...q, file })));
    });

    // Get table info from both environments
    const getTableInfo = async (client, table) => {
      const { data, error } = await client
        .from('columns')
        .select('column_name, data_type')
        .eq('table_schema', 'public')
        .eq('table_name', table);
      if (error) throw error;
      return data;
    };

    let hasErrors = false;

    // Validate each query
    for (const query of queries) {
      console.log(`\nValidating query in ${query.file}:`);
      console.log(`Table: ${query.table}`);
      console.log(`Columns: ${query.columns.join(', ')}`);

      const devColumns = await getTableInfo(devClient, query.table);
      const prodColumns = await getTableInfo(prodClient, query.table);

      const devColumnNames = new Set(devColumns.map(c => c.column_name));
      const prodColumnNames = new Set(prodColumns.map(c => c.column_name));

      for (const column of query.columns) {
        if (!devColumnNames.has(column)) {
          console.error(`❌ Column '${column}' not found in development table '${query.table}'`);
          hasErrors = true;
        }
        if (!prodColumnNames.has(column)) {
          console.error(`❌ Column '${column}' not found in production table '${query.table}'`);
          hasErrors = true;
        }
      }
    }

    if (hasErrors) {
      console.error('\n❌ Query validation failed');
      process.exit(1);
    }

    console.log('\n✓ All queries are valid in both environments');
    process.exit(0);
  } catch (error) {
    console.error('Error validating queries:', error);
    process.exit(1);
  }
}

validateQueries();
