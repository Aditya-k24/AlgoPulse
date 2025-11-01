#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function fixUser() {
    log('🔧 Fixing User Configuration', 'cyan');
    log('============================\n', 'cyan');

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        log('❌ Missing Supabase credentials in .env file', 'red');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const testEmail = 'test@algopulse.com';
    const testPassword = 'TestPassword123!';

    try {
        // Try to sign in with password
        log('📝 Attempting to sign in...', 'yellow');
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword,
        });

        if (signInError) {
            log(`❌ Sign in error: ${signInError.message}`, 'red');
            
            if (signInError.message.includes('Email not confirmed')) {
                log('\n💡 SOLUTIONS TO FIX THIS:', 'yellow');
                log('\n📍 OPTION 1: Disable Email Confirmation (Recommended for Development)', 'cyan');
                log('   1. Go to: https://supabase.com/dashboard/project/wwstntrikjasjotnrnco', 'cyan');
                log('   2. Click "Authentication" in the left sidebar', 'cyan');
                log('   3. Click "Settings" tab', 'cyan');
                log('   4. Scroll to "Email Auth" section', 'cyan');
                log('   5. Toggle OFF "Enable email confirmations"', 'cyan');
                log('   6. Click "Save"', 'cyan');
                log('   7. Run: npm run test:confirm', 'cyan');
                
                log('\n📍 OPTION 2: Confirm Email Manually', 'cyan');
                log('   1. Go to: https://supabase.com/dashboard/project/wwstntrikjasjotnrnco', 'cyan');
                log('   2. Click "Authentication" > "Users"', 'cyan');
                log('   3. Find: test@algopulse.com', 'cyan');
                log('   4. Click on the user row', 'cyan');
                log('   5. Click "Confirm Email" button', 'cyan');
                log('   6. Run: npm run test:confirm', 'cyan');

                log('\n📍 OPTION 3: Create a New Account in the App', 'cyan');
                log('   1. Open the Expo app', 'cyan');
                log('   2. Click "Sign Up"', 'cyan');
                log('   3. Enter a NEW email address', 'cyan');
                log('   4. Enter a password (twice)', 'cyan');
                log('   5. If email confirmation is OFF, you can login immediately', 'cyan');
                log('   6. If email confirmation is ON, check your email', 'cyan');
            }
        } else if (signInData) {
            log('\n✅ SUCCESS! Login works!', 'green');
            log(`   Email: ${signInData.user.email}`, 'cyan');
            log(`   Confirmed: ${signInData.user.email_confirmed_at ? 'Yes ✓' : 'No ✗'}`, 'cyan');
            log('\n🎉 You can now login in the Expo app!', 'green');
        }

        // Also check if we can get a session from signup
        log('\n📝 Testing signup flow...', 'yellow');
        
        const newTestEmail = `test-${Date.now()}@algopulse.com`;
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: newTestEmail,
            password: testPassword,
        });

        if (signUpError) {
            log(`⚠️  Signup error: ${signUpError.message}`, 'yellow');
        } else if (signUpData) {
            log(`✅ New user created: ${newTestEmail}`, 'green');
            if (signUpData.session) {
                log('   ✓ Session available immediately (email confirmation is OFF)', 'cyan');
                log('\n💡 This means email confirmation is DISABLED for new users', 'cyan');
                log('   But the OLD user (test@algopulse.com) still needs confirmation', 'cyan');
            } else {
                log('   ⚠️  No session available (email confirmation is ON)', 'yellow');
                log('   You need to confirm the email before logging in', 'yellow');
            }
        }

    } catch (error) {
        log(`\n❌ Error: ${error.message}`, 'red');
        console.error(error);
    }
}

fixUser();

