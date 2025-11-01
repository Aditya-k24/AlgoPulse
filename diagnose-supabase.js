#!/usr/bin/env node

/**
 * Supabase Connection Diagnostic Tool
 * Helps identify exactly what's wrong with the Supabase connection
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

function diagnoseEnvFile() {
    log('🔍 Diagnosing Supabase Configuration', 'cyan');
    log('===================================', 'cyan');
    log('');
    
    // Check if .env file exists
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        log('❌ .env file not found!', 'red');
        log('Solution: Run "cp env.example .env"', 'yellow');
        return false;
    }
    
    log('✅ .env file exists', 'green');
    
    // Read .env file
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            envVars[key.trim()] = value.trim().replace(/"/g, '');
        }
    });
    
    // Check each required variable
    const requiredVars = {
        'EXPO_PUBLIC_SUPABASE_URL': 'https://wwstntrikjasjotnrnco.supabase.co',
        'EXPO_PUBLIC_SUPABASE_ANON_KEY': 'Should start with "eyJ"',
        'SUPABASE_DB_URL': 'Should contain your password',
        'OPENAI_API_KEY': 'Should start with "sk-"'
    };
    
    let allGood = true;
    
    Object.entries(requiredVars).forEach(([key, expected]) => {
        const value = envVars[key];
        
        if (!value) {
            log(`❌ ${key}: Missing`, 'red');
            allGood = false;
        } else if (key === 'EXPO_PUBLIC_SUPABASE_ANON_KEY') {
            if (value.includes('YOUR_') || value.includes('HERE')) {
                log(`❌ ${key}: Still contains placeholder text`, 'red');
                log(`   Current value: ${value.substring(0, 50)}...`, 'yellow');
                allGood = false;
            } else if (!value.startsWith('eyJ')) {
                log(`❌ ${key}: Invalid format (should start with "eyJ")`, 'red');
                log(`   Current value: ${value.substring(0, 50)}...`, 'yellow');
                allGood = false;
            } else {
                log(`✅ ${key}: Valid format`, 'green');
            }
        } else if (key === 'EXPO_PUBLIC_SUPABASE_URL') {
            if (value === expected) {
                log(`✅ ${key}: Correct`, 'green');
            } else {
                log(`❌ ${key}: Incorrect URL`, 'red');
                log(`   Expected: ${expected}`, 'yellow');
                log(`   Current: ${value}`, 'yellow');
                allGood = false;
            }
        } else if (key === 'SUPABASE_DB_URL') {
            if (value.includes('[YOUR-PASSWORD]')) {
                log(`❌ ${key}: Still contains placeholder password`, 'red');
                allGood = false;
            } else {
                log(`✅ ${key}: Password configured`, 'green');
            }
        } else if (key === 'OPENAI_API_KEY') {
            if (value.startsWith('sk-')) {
                log(`✅ ${key}: Valid format`, 'green');
            } else {
                log(`❌ ${key}: Invalid format (should start with "sk-")`, 'red');
                allGood = false;
            }
        }
    });
    
    log('');
    
    if (allGood) {
        log('🎉 All environment variables look correct!', 'green');
        log('The 401 error might be due to:', 'yellow');
        log('1. Supabase project is paused/inactive', 'blue');
        log('2. Anon key is expired or revoked', 'blue');
        log('3. Network connectivity issues', 'blue');
    } else {
        log('⚠️  Found issues with environment variables:', 'yellow');
        log('Please fix the issues above and try again.', 'blue');
    }
    
    return allGood;
}

async function testSupabaseEndpoints() {
    log('\n🔗 Testing Supabase Endpoints', 'cyan');
    log('============================', 'cyan');
    
    try {
        // Test 1: Basic connectivity
        log('Testing basic connectivity...', 'blue');
        const response1 = await fetch('https://wwstntrikjasjotnrnco.supabase.co/rest/v1/', {
            method: 'HEAD'
        });
        
        if (response1.ok) {
            log('✅ Supabase endpoint is reachable', 'green');
        } else {
            log(`❌ Supabase endpoint unreachable: ${response1.status}`, 'red');
            return false;
        }
        
        // Test 2: With anon key (if available)
        const envPath = path.join(__dirname, '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const envVars = {};
            envContent.split('\n').forEach(line => {
                const [key, value] = line.split('=');
                if (key && value) {
                    envVars[key.trim()] = value.trim().replace(/"/g, '');
                }
            });
            
            const anonKey = envVars['EXPO_PUBLIC_SUPABASE_ANON_KEY'];
            if (anonKey && !anonKey.includes('YOUR_') && anonKey.startsWith('eyJ')) {
                log('Testing with anon key...', 'blue');
                
                const response2 = await fetch('https://wwstntrikjasjotnrnco.supabase.co/rest/v1/profiles?select=count', {
                    headers: {
                        'apikey': anonKey,
                        'Authorization': `Bearer ${anonKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response2.ok) {
                    log('✅ Supabase connection with anon key successful!', 'green');
                    return true;
                } else {
                    log(`❌ Supabase connection failed: ${response2.status}`, 'red');
                    
                    if (response2.status === 401) {
                        log('This means your anon key is invalid or expired.', 'yellow');
                        log('Please get a fresh anon key from your Supabase dashboard.', 'yellow');
                    }
                    
                    return false;
                }
            } else {
                log('⚠️  Cannot test with anon key (invalid or missing)', 'yellow');
                return false;
            }
        }
        
    } catch (error) {
        log(`❌ Network error: ${error.message}`, 'red');
        return false;
    }
}

async function main() {
    const envOk = diagnoseEnvFile();
    
    if (envOk) {
        await testSupabaseEndpoints();
    }
    
    log('\n📋 Summary', 'cyan');
    log('==========', 'cyan');
    
    if (!envOk) {
        log('❌ Environment configuration issues found', 'red');
        log('Fix the .env file issues above first.', 'yellow');
    } else {
        log('✅ Environment configuration looks good', 'green');
        log('If connection still fails, check your Supabase project status.', 'yellow');
    }
    
    log('\n🔧 Next Steps:', 'cyan');
    log('1. Fix any .env file issues', 'blue');
    log('2. Get a fresh Supabase anon key if needed', 'blue');
    log('3. Ensure your Supabase project is active', 'blue');
    log('4. Run: node test-app.js', 'blue');
}

// Run the diagnostic
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { diagnoseEnvFile, testSupabaseEndpoints };


