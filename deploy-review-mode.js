/**
 * Deploy Review Mode database changes
 * Run with: node deploy-review-mode.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
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
// Use service role key for migrations (not anon key)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env');
  console.log('\n💡 Make sure you have:');
  console.log('   - EXPO_PUBLIC_SUPABASE_URL');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY (or EXPO_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Deploying Review Mode Database Changes');
  console.log('='.repeat(50));

  const sqlPath = path.join(__dirname, 'supabase/sql/add-review-mode-tables-fixed.sql');
  
  if (!fs.existsSync(sqlPath)) {
    console.error('❌ SQL file not found:', sqlPath);
    process.exit(1);
  }

  console.log('📄 Reading SQL file...');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('🔧 Running migration...');
  console.log('⚠️  Note: This script uses the Supabase client, which has limitations.');
  console.log('   For best results, run the SQL directly in Supabase SQL Editor.');
  console.log('');

  try {
    // Note: The Supabase JS client can't run complex SQL with multiple statements
    // This is just a helper - users should run SQL in Supabase Dashboard
    
    console.log('📋 Migration Steps:');
    console.log('');
    console.log('1. Go to: https://supabase.com/dashboard/project/wwstntrikjasjotnrnco/sql/new');
    console.log('2. Copy the contents of: supabase/sql/add-review-mode-tables-fixed.sql');
    console.log('3. Paste into the SQL editor');
    console.log('4. Click "Run" to execute the migration');
    console.log('');
    console.log('⚠️  NOTE: Use add-review-mode-tables-FIXED.sql (not the original)');
    console.log('');
    
    console.log('📊 Tables that will be created:');
    console.log('   - problem_explanations (multi-approach explanations)');
    console.log('   - problem_references (video/article links)');
    console.log('   - ai_generated_problems (AI practice problems)');
    console.log('   - concept_stats (user tracking per concept)');
    console.log('');
    console.log('📝 Columns added to problems table:');
    console.log('   - quick_refresh (TEXT[])');
    console.log('   - pattern_name (TEXT)');
    console.log('   - visual_breakdown (TEXT)');
    console.log('');
    
    // Verify if tables already exist
    console.log('🔍 Checking existing tables...');
    
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['problem_explanations', 'problem_references', 'ai_generated_problems', 'concept_stats']);
    
    if (error) {
      console.log('   Unable to check tables (this is normal with anon key)');
    } else if (tables && tables.length > 0) {
      console.log(`   ✅ Found ${tables.length} existing Review Mode tables`);
      tables.forEach(t => console.log(`      - ${t.table_name}`));
    } else {
      console.log('   ⚠️  Review Mode tables not found - migration needed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('');
  console.log('='.repeat(50));
  console.log('✅ Review Mode deployment guide complete!');
  console.log('');
  console.log('🎯 Next Steps:');
  console.log('   1. Run the SQL migration in Supabase Dashboard');
  console.log('   2. Start the app: npm start');
  console.log('   3. Test the new Review Mode on any problem');
  console.log('   4. Generate AI practice problems');
}

runMigration()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

