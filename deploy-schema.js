#!/usr/bin/env node

/**
 * Deploy AlgoPulse Schema to Supabase
 * This script will deploy the complete database schema to your Supabase project
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function main() {
    log('🚀 AlgoPulse Schema Deployment', 'cyan');
    log('================================', 'cyan');
    
    // Check if .env file exists
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        log('❌ Error: .env file not found!', 'red');
        log('Please create a .env file from env.example and fill in your Supabase credentials.', 'yellow');
        process.exit(1);
    }
    
    // Read environment variables
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            envVars[key.trim()] = value.trim().replace(/"/g, '');
        }
    });
    
    // Validate required environment variables
    const requiredVars = [
        'EXPO_PUBLIC_SUPABASE_URL',
        'EXPO_PUBLIC_SUPABASE_ANON_KEY'
    ];
    
    const missingVars = requiredVars.filter(varName => !envVars[varName]);
    if (missingVars.length > 0) {
        log('❌ Missing required environment variables:', 'red');
        missingVars.forEach(varName => log(`   - ${varName}`, 'red'));
        log('Please update your .env file with the missing variables.', 'yellow');
        process.exit(1);
    }
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'supabase', 'sql', 'complete-schema.sql');
    if (!fs.existsSync(schemaPath)) {
        log('❌ Error: Schema file not found!', 'red');
        log(`Expected: ${schemaPath}`, 'yellow');
        process.exit(1);
    }
    
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    log('✅ Environment variables validated', 'green');
    log('✅ Schema file found', 'green');
    log('', 'reset');
    
    log('📋 Deployment Instructions:', 'yellow');
    log('================================', 'yellow');
    log('', 'reset');
    log('1. Open your Supabase Dashboard:', 'blue');
    log(`   https://supabase.com/dashboard/project/wwstntrikjasjotnrnco`, 'cyan');
    log('', 'reset');
    log('2. Navigate to SQL Editor:', 'blue');
    log('   - Click on "SQL Editor" in the left sidebar', 'cyan');
    log('   - Click "New query"', 'cyan');
    log('', 'reset');
    log('3. Copy and paste the complete schema:', 'blue');
    log('   - Open: supabase/sql/complete-schema.sql', 'cyan');
    log('   - Copy all contents', 'cyan');
    log('   - Paste into the SQL Editor', 'cyan');
    log('', 'reset');
    log('4. Execute the schema:', 'blue');
    log('   - Click "Run" button', 'cyan');
    log('   - Wait for completion (should take 10-30 seconds)', 'cyan');
    log('', 'reset');
    log('5. Verify the deployment:', 'blue');
    log('   - Check that all tables are created in the Table Editor', 'cyan');
    log('   - Verify RLS policies are enabled', 'cyan');
    log('', 'reset');
    
    log('🎯 What this schema includes:', 'green');
    log('================================', 'green');
    log('✅ User profiles with spaced repetition settings', 'green');
    log('✅ Problems table with multiple language solutions', 'green');
    log('✅ Attempts tracking with execution results', 'green');
    log('✅ Spaced repetition recalls with SM-2 algorithm', 'green');
    log('✅ Study sessions and progress tracking', 'green');
    log('✅ Achievements and collections system', 'green');
    log('✅ Row Level Security (RLS) policies', 'green');
    log('✅ Performance indexes', 'green');
    log('✅ Automatic triggers and functions', 'green');
    log('✅ Sample problems for testing', 'green');
    log('', 'reset');
    
    log('🔧 Next Steps After Deployment:', 'yellow');
    log('================================', 'yellow');
    log('1. Update your .env file with your Supabase Anon Key', 'blue');
    log('2. Test the app with: npm start', 'blue');
    log('3. Try creating a user account', 'blue');
    log('4. Test problem generation with OpenAI', 'blue');
    log('', 'reset');
    
    log('📞 Need Help?', 'magenta');
    log('=============', 'magenta');
    log('If you encounter any issues:', 'blue');
    log('1. Check the Supabase logs in the dashboard', 'cyan');
    log('2. Verify your environment variables are correct', 'cyan');
    log('3. Ensure your Supabase project is active', 'cyan');
    log('', 'reset');
    
    log('🎉 Ready to deploy! Follow the instructions above.', 'green');
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { main };


