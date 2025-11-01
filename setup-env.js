#!/usr/bin/env node

/**
 * Environment Setup Helper
 * Helps you configure your .env file with the correct Supabase credentials
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

async function main() {
    log('🔧 AlgoPulse Environment Setup', 'cyan');
    log('==============================', 'cyan');
    log('');
    
    log('📋 To get your Supabase Anon Key:', 'yellow');
    log('1. Go to: https://supabase.com/dashboard/project/wwstntrikjasjotnrnco', 'blue');
    log('2. Click "Settings" → "API"', 'blue');
    log('3. Copy the "anon public" key (starts with eyJ...)', 'blue');
    log('');
    
    const anonKey = await askQuestion('🔑 Paste your Supabase Anon Key here: ');
    
    if (!anonKey || !anonKey.startsWith('eyJ')) {
        log('❌ Invalid anon key format. Please try again.', 'red');
        process.exit(1);
    }
    
    log('');
    log('🔐 To get your database password:', 'yellow');
    log('1. Go to: https://supabase.com/dashboard/project/wwstntrikjasjotnrnco', 'blue');
    log('2. Click "Settings" → "Database"', 'blue');
    log('3. Look for "Connection string" or "Database password"', 'blue');
    log('');
    
    const dbPassword = await askQuestion('🔐 Enter your database password: ');
    
    if (!dbPassword) {
        log('❌ Database password is required.', 'red');
        process.exit(1);
    }
    
    // Update .env file
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent = envContent.replace('YOUR_SUPABASE_ANON_KEY_HERE', anonKey);
    envContent = envContent.replace('[YOUR-PASSWORD]', dbPassword);
    
    fs.writeFileSync(envPath, envContent);
    
    log('');
    log('✅ .env file updated successfully!', 'green');
    log('');
    
    log('🧪 Testing the connection...', 'cyan');
    
    // Test the connection
    try {
        const response = await fetch(`https://wwstntrikjasjotnrnco.supabase.co/rest/v1/profiles?select=count`, {
            headers: {
                'apikey': anonKey,
                'Authorization': `Bearer ${anonKey}`
            }
        });
        
        if (response.ok) {
            log('✅ Supabase connection successful!', 'green');
        } else {
            log(`❌ Supabase connection failed: ${response.status}`, 'red');
            log('Please check your anon key and try again.', 'yellow');
        }
    } catch (error) {
        log(`❌ Connection error: ${error.message}`, 'red');
    }
    
    rl.close();
    
    log('');
    log('🚀 Next steps:', 'cyan');
    log('1. Deploy the database schema: node deploy-schema.js', 'blue');
    log('2. Test the app: node test-app.js', 'blue');
    log('3. Start the app: npm start', 'blue');
}

main().catch(console.error);


