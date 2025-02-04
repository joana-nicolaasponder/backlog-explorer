import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

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

console.log('Comparing development and production environments...');

// Read and parse the validation SQL
const sqlPath = path.join(__dirname, 'validate-db.sql');
const validationSQL = fs.readFileSync(sqlPath, 'utf8');

// Split the SQL into two queries
const [structureSQL, policiesSQL] = validationSQL.split('-- RLS Policies');

async function compareEnvironments() {
  try {
    // Get structure from both environments
    const { data: devStructure } = await devClient.rpc('exec_sql', { sql: structureSQL });
    const { data: prodStructure } = await prodClient.rpc('exec_sql', { sql: structureSQL });

    // Get policies from both environments
    const { data: devPolicies } = await devClient.rpc('exec_sql', { sql: policiesSQL });
    const { data: prodPolicies } = await prodClient.rpc('exec_sql', { sql: policiesSQL });

    // Compare results
    const structureDiffs = compareResults(devStructure, prodStructure, 'table structure');
    const policyDiffs = compareResults(devPolicies, prodPolicies, 'RLS policies');

    if (structureDiffs.length > 0 || policyDiffs.length > 0) {
      console.error('Environment differences found:');
      if (structureDiffs.length > 0) {
        console.error('\nTable Structure Differences:');
        structureDiffs.forEach(diff => console.error(diff));
      }
      if (policyDiffs.length > 0) {
        console.error('\nRLS Policy Differences:');
        policyDiffs.forEach(diff => console.error(diff));
      }
      process.exit(1);
    }

    console.log('✓ Environments are in sync');
    process.exit(0);
  } catch (error) {
    console.error('Error comparing environments:', error);
    process.exit(1);
  }
}

function compareResults(dev, prod, type) {
  const differences = [];
  
  // Convert results to strings for comparison, ignoring constraint names
  const normalizedDev = JSON.stringify(dev, (key, value) => {
    if (key === 'constraint_name') return '[normalized]';
    return value;
  });
  
  const normalizedProd = JSON.stringify(prod, (key, value) => {
    if (key === 'constraint_name') return '[normalized]';
    return value;
  });

  if (normalizedDev !== normalizedProd) {
    differences.push(`Differences found in ${type} between development and production`);
    
    // Add detailed comparison
    const devObj = JSON.parse(normalizedDev);
    const prodObj = JSON.parse(normalizedProd);
    
    // Compare each entry
    devObj.forEach((devItem, index) => {
      const prodItem = prodObj[index];
      if (!prodItem || JSON.stringify(devItem) !== JSON.stringify(prodItem)) {
        differences.push(`  Development: ${JSON.stringify(devItem)}`);
        differences.push(`  Production: ${JSON.stringify(prodItem || 'missing')}`);
      }
    });

    // Check for extra items in production that don't exist in development
    if (prodObj.length > devObj.length) {
      prodObj.slice(devObj.length).forEach(prodItem => {
        differences.push(`  Development: missing`);
        differences.push(`  Production: ${JSON.stringify(prodItem)}`);
      });
    }
  }

  return differences;
}

compareEnvironments();
