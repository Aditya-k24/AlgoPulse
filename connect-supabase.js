#!/usr/bin/env node

/**
 * Supabase Connection Helper
 * Helps you connect Supabase to your AlgoPulse app
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

async function testSupabaseConnection(anonKey) {
    try {
        log('🔗 Testing Supabase connection...', 'cyan');
        
        const response = await fetch('https://wwstntrikjasjotnrnco.supabase.co/rest/v1/profiles?select=count', {
            headers: {
                'apikey': anonKey,
                'Authorization': `Bearer ${anonKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            log('✅ Supabase connection successful!', 'green');
            return true;
        } else {
            log(`❌ Supabase connection failed: ${response.status}`, 'red');
            const errorText = await response.text();
            log(`Error details: ${errorText}`, 'red');
            return false;
        }
    } catch (error) {
        log(`❌ Connection error: ${error.message}`, 'red');
        return false;
    }
}

function updateEnvFile(anonKey) {
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace the placeholder with the actual key
    envContent = envContent.replace('YOUR_SUPABASE_ANON_KEY_HERE', anonKey);
    
    fs.writeFileSync(envPath, envContent);
    log('✅ .env file updated with your Supabase Anon Key', 'green');
}

async function main() {
    log('🚀 Connecting Supabase to AlgoPulse', 'cyan');
    log('===================================', 'cyan');
    log('');
    
    log('📋 Step 1: Get your Supabase Anon Key', 'yellow');
    log('=====================================', 'yellow');
    log('');
    log('1. Open your Supabase Dashboard:', 'blue');
    log('   https://supabase.com/dashboard/project/wwstntrikjasjotnrnco', 'cyan');
    log('');
    log('2. Navigate to Settings:', 'blue');
    log('   - Click "Settings" in the left sidebar', 'cyan');
    log('   - Click "API" in the settings menu', 'cyan');
    log('');
    log('3. Copy the Anon Key:', 'blue');
    log('   - Look for "Project API keys"', 'cyan');
    log('   - Copy the "anon public" key (starts with eyJ...)', 'cyan');
    log('');
    
    // Check if .env file exists
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        log('❌ .env file not found. Creating it...', 'red');
        fs.copyFileSync(path.join(__dirname, 'env.example'), envPath);
        log('✅ .env file created', 'green');
    }
    
    // Read current .env content
    let envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            envVars[key.trim()] = value.trim().replace(/"/g, '');
        }
    });
    
    // Check if anon key is already set
    if (envVars['EXPO_PUBLIC_SUPABASE_ANON_KEY'] && 
        envVars['EXPO_PUBLIC_SUPABASE_ANON_KEY'] !== 'YOUR_SUPABASE_ANON_KEY_HERE') {
        
        log('🔍 Found existing Supabase Anon Key in .env file', 'yellow');
        
        // Test the existing key
        const isConnected = await testSupabaseConnection(envVars['EXPO_PUBLIC_SUPABASE_ANON_KEY']);
        
        if (isConnected) {
            log('🎉 Supabase is already connected and working!', 'green');
            log('');
            log('📋 Next steps:', 'yellow');
            log('1. Deploy the database schema: node deploy-schema.js', 'blue');
            log('2. Test the app: node test-app.js', 'blue');
            log('3. Start the app: npm start', 'blue');
            return;
        } else {
            log('⚠️  The existing key is not working. Please get a new one.', 'yellow');
        }
    }
    
    log('📝 Step 2: Update your .env file', 'yellow');
    log('===============================', 'yellow');
    log('');
    log('Please manually edit your .env file and replace:', 'blue');
    log('EXPO_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY_HERE"', 'cyan');
    log('with:', 'blue');
    log('EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJ...your_actual_key_here"', 'cyan');
    log('');
    log('📍 File location: /Users/apple/Desktop/Projects/AlgoPulse/.env', 'magenta');
    log('');
    
    log('📝 Step 3: Test the connection', 'yellow');
    log('=============================', 'yellow');
    log('');
    log('After updating your .env file, run:', 'blue');
    log('node connect-supabase.js', 'cyan');
    log('');
    
    log('📝 Step 4: Deploy the database schema', 'yellow');
    log('===================================', 'yellow');
    log('');
    log('Once connected, deploy the schema:', 'blue');
    log('node deploy-schema.js', 'cyan');
    log('');
    
    log('📝 Step 5: Start the app', 'yellow');
    log('=======================', 'yellow');
    log('');
    log('Finally, start your app:', 'blue');
    log('npm start', 'cyan');
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testSupabaseConnection, updateEnvFile };


