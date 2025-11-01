#!/usr/bin/env node

/**
 * Comprehensive App Test Script
 * Tests all major functionality of AlgoPulse
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

async function testEnvironmentVariables() {
    log('\n🔧 Testing Environment Variables...', 'cyan');
    
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        log('❌ .env file not found', 'red');
        return false;
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            envVars[key.trim()] = value.trim().replace(/"/g, '');
        }
    });
    
    const requiredVars = [
        'EXPO_PUBLIC_SUPABASE_URL',
        'EXPO_PUBLIC_SUPABASE_ANON_KEY',
        'OPENAI_API_KEY'
    ];
    
    let allPresent = true;
    requiredVars.forEach(varName => {
        if (envVars[varName] && envVars[varName] !== `YOUR_${varName}_HERE`) {
            log(`✅ ${varName}`, 'green');
        } else {
            log(`❌ ${varName} (missing or placeholder)`, 'red');
            allPresent = false;
        }
    });
    
    return allPresent;
}

async function testSupabaseConnection() {
    log('\n🔗 Testing Supabase Connection...', 'cyan');
    
    try {
        // Read environment variables
        const envPath = path.join(__dirname, '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envVars = {};
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                envVars[key.trim()] = value.trim().replace(/"/g, '');
            }
        });
        
        const supabaseUrl = envVars['EXPO_PUBLIC_SUPABASE_URL'];
        const supabaseKey = envVars['EXPO_PUBLIC_SUPABASE_ANON_KEY'];
        
        if (!supabaseUrl || !supabaseKey) {
            log('❌ Supabase credentials not found', 'red');
            return false;
        }
        
        // Test connection
        const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=count`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        if (response.ok) {
            log('✅ Supabase connection successful', 'green');
            return true;
        } else {
            log(`❌ Supabase connection failed: ${response.status}`, 'red');
            return false;
        }
    } catch (error) {
        log(`❌ Supabase connection error: ${error.message}`, 'red');
        return false;
    }
}

async function testOpenAIConnection() {
    log('\n🤖 Testing OpenAI Connection...', 'cyan');
    
    try {
        // Read environment variables
        const envPath = path.join(__dirname, '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envVars = {};
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                envVars[key.trim()] = value.trim().replace(/"/g, '');
            }
        });
        
        const openaiKey = envVars['OPENAI_API_KEY'];
        
        if (!openaiKey) {
            log('❌ OpenAI API key not found', 'red');
            return false;
        }
        
        // Test OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'user', content: 'Say "Hello" in one word.' }
                ],
                max_tokens: 10
            }),
        });
        
        if (response.ok) {
            log('✅ OpenAI connection successful', 'green');
            return true;
        } else {
            log(`❌ OpenAI connection failed: ${response.status}`, 'red');
            return false;
        }
    } catch (error) {
        log(`❌ OpenAI connection error: ${error.message}`, 'red');
        return false;
    }
}

async function testProjectStructure() {
    log('\n📁 Testing Project Structure...', 'cyan');
    
    const requiredFiles = [
        'package.json',
        'app.json',
        'App.tsx',
        'src/lib/supabase.ts',
        'src/contexts/AuthContext.tsx',
        'src/views/AuthScreen.tsx',
        'src/views/HomeScreen.tsx',
        'src/components/Logo.tsx',
        'src/styles/tailwind.ts',
        'supabase/sql/complete-schema.sql'
    ];
    
    let allFilesExist = true;
    requiredFiles.forEach(filePath => {
        const fullPath = path.join(__dirname, filePath);
        if (fs.existsSync(fullPath)) {
            log(`✅ ${filePath}`, 'green');
        } else {
            log(`❌ ${filePath} (missing)`, 'red');
            allFilesExist = false;
        }
    });
    
    return allFilesExist;
}

async function testPackageDependencies() {
    log('\n📦 Testing Package Dependencies...', 'cyan');
    
    try {
        const packageJsonPath = path.join(__dirname, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        const requiredDeps = [
            '@supabase/supabase-js',
            '@react-navigation/native',
            '@react-navigation/native-stack',
            '@react-navigation/bottom-tabs',
            'expo',
            'react-native'
        ];
        
        let allDepsPresent = true;
        requiredDeps.forEach(dep => {
            if (packageJson.dependencies && packageJson.dependencies[dep]) {
                log(`✅ ${dep}`, 'green');
            } else {
                log(`❌ ${dep} (missing)`, 'red');
                allDepsPresent = false;
            }
        });
        
        return allDepsPresent;
    } catch (error) {
        log(`❌ Error reading package.json: ${error.message}`, 'red');
        return false;
    }
}

async function runAllTests() {
    log('🧪 AlgoPulse Comprehensive Test Suite', 'bright');
    log('====================================', 'bright');
    
    const tests = [
        { name: 'Environment Variables', fn: testEnvironmentVariables },
        { name: 'Project Structure', fn: testProjectStructure },
        { name: 'Package Dependencies', fn: testPackageDependencies },
        { name: 'Supabase Connection', fn: testSupabaseConnection },
        { name: 'OpenAI Connection', fn: testOpenAIConnection }
    ];
    
    const results = {};
    
    for (const test of tests) {
        try {
            results[test.name] = await test.fn();
        } catch (error) {
            log(`❌ ${test.name} test failed: ${error.message}`, 'red');
            results[test.name] = false;
        }
    }
    
    // Summary
    log('\n📊 Test Results Summary:', 'yellow');
    log('========================', 'yellow');
    
    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;
    
    Object.entries(results).forEach(([testName, passed]) => {
        if (passed) {
            log(`✅ ${testName}`, 'green');
        } else {
            log(`❌ ${testName}`, 'red');
        }
    });
    
    log(`\n🎯 Overall Score: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');
    
    if (passed === total) {
        log('\n🎉 All tests passed! Your AlgoPulse app is ready to run!', 'green');
        log('\n🚀 Next steps:', 'cyan');
        log('1. Deploy the database schema using: node deploy-schema.js', 'blue');
        log('2. Start the app with: npm start', 'blue');
        log('3. Open Expo Go on your phone and scan the QR code', 'blue');
    } else {
        log('\n⚠️  Some tests failed. Please fix the issues above before running the app.', 'yellow');
        log('\n🔧 Common fixes:', 'cyan');
        log('1. Create .env file from env.example', 'blue');
        log('2. Install dependencies: npm install', 'blue');
        log('3. Check your API keys are correct', 'blue');
        log('4. Ensure Supabase project is active', 'blue');
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { runAllTests };


