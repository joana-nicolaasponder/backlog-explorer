const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Create Supabase clients for both environments
const prodClient = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

const devClient = createClient(
  process.env.DEV_SUPABASE_URL,
  process.env.DEV_SUPABASE_SERVICE_KEY
);

// Read and parse the validation SQL
const sqlPath = path.join(__dirname, 'validate-db.sql');
const validationSQL = fs.readFileSync(sqlPath, 'utf8');

// Split the SQL into two queries
const [structureSQL, policiesSQL] = validationSQL.split('-- RLS Policies');

async function compareEnvironments() {
  try {
    // Get structure from both environments
    const { data: prodStructure } = await prodClient.rpc('exec_sql', { sql: structureSQL });
    const { data: devStructure } = await devClient.rpc('exec_sql', { sql: structureSQL });

    // Get policies from both environments
    const { data: prodPolicies } = await prodClient.rpc('exec_sql', { sql: policiesSQL });
    const { data: devPolicies } = await devClient.rpc('exec_sql', { sql: policiesSQL });

    // Compare results
    const structureDiffs = compareResults(prodStructure, devStructure, 'table structure');
    const policyDiffs = compareResults(prodPolicies, devPolicies, 'RLS policies');

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

function compareResults(prod, dev, type) {
  const differences = [];
  
  // Convert results to strings for comparison, ignoring constraint names
  const normalizedProd = JSON.stringify(prod, (key, value) => {
    if (key === 'constraint_name') return '[normalized]';
    return value;
  });
  
  const normalizedDev = JSON.stringify(dev, (key, value) => {
    if (key === 'constraint_name') return '[normalized]';
    return value;
  });

  if (normalizedProd !== normalizedDev) {
    differences.push(`Differences found in ${type}`);
    
    // Add detailed comparison
    const prodObj = JSON.parse(normalizedProd);
    const devObj = JSON.parse(normalizedDev);
    
    // Compare each entry
    prodObj.forEach((prodItem, index) => {
      const devItem = devObj[index];
      if (!devItem || JSON.stringify(prodItem) !== JSON.stringify(devItem)) {
        differences.push(`  Production: ${JSON.stringify(prodItem)}`);
        differences.push(`  Development: ${JSON.stringify(devItem || 'missing')}`);
      }
    });
  }

  return differences;
}

compareEnvironments();
