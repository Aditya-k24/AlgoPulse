/**
 * Script to delete all problems from the database
 * Run with: node delete-all-problems.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deleteAllProblems() {
  console.log('🗑️  Deleting all problems from database...');
  console.log('='.repeat(50));
  
  try {
    // First, get count of problems
    const { count: beforeCount, error: countError } = await supabase
      .from('problems')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error counting problems:', countError.message);
      return false;
    }
    
    console.log(`📊 Found ${beforeCount} problems in database`);
    
    if (beforeCount === 0) {
      console.log('✅ Database is already empty!');
      return true;
    }
    
    // Delete all problems
    const { error: deleteError } = await supabase
      .from('problems')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a condition that matches everything)
    
    if (deleteError) {
      console.error('❌ Error deleting problems:', deleteError.message);
      return false;
    }
    
    // Verify deletion
    const { count: afterCount, error: verifyError } = await supabase
      .from('problems')
      .select('*', { count: 'exact', head: true });
    
    if (verifyError) {
      console.error('❌ Error verifying deletion:', verifyError.message);
      return false;
    }
    
    console.log(`\n✅ Successfully deleted ${beforeCount} problems!`);
    console.log(`📊 Remaining problems: ${afterCount}`);
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

async function run() {
  console.log('🚀 Delete All Problems Script');
  console.log('='.repeat(50));
  
  const success = await deleteAllProblems();
  
  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('🎉 Database cleared successfully!');
    console.log('\n💡 Next steps:');
    console.log('   - Generate new problems with: npm start (then use Generate button)');
    console.log('   - Or seed sample problems with: npm run db:seed');
  } else {
    console.log('⚠️  Failed to delete problems. Check errors above.');
  }
  
  process.exit(success ? 0 : 1);
}

run();

