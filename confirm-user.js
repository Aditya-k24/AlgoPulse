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

async function confirmUser() {
    log('🔓 Confirming User Access', 'cyan');
    log('========================\n', 'cyan');

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
        log('📝 Attempting to sign in with existing credentials...', 'yellow');
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword,
        });

        if (error) {
            log(`❌ Error: ${error.message}`, 'red');
            
            if (error.message.includes('Email not confirmed')) {
                log('\n💡 To fix this issue:', 'yellow');
                log('   1. Go to your Supabase Dashboard', 'cyan');
                log('   2. Navigate to Authentication > Users', 'cyan');
                log('   3. Find the user: test@algopulse.com', 'cyan');
                log('   4. Click on the user and click "Confirm Email"', 'cyan');
                log('   5. OR go to Authentication > Settings and disable email confirmation', 'cyan');
                log('   6. Then run this script again', 'cyan');
            }
            process.exit(1);
        }

        if (data && data.user) {
            log('✅ Login successful!', 'green');
            log(`   Email: ${data.user.email}`, 'cyan');
            log(`   User ID: ${data.user.id}`, 'cyan');
            log(`   Email confirmed: ${data.user.email_confirmed_at ? 'Yes ✓' : 'No ✗'}`, 'cyan');
            
            log('\n📋 Login Credentials for the App:', 'yellow');
            log(`   Email: ${testEmail}`, 'green');
            log(`   Password: ${testPassword}`, 'green');
            
            log('\n🎉 You can now use these credentials to login in the app!', 'green');
        }

    } catch (error) {
        log(`\n❌ Test failed: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    }
}

confirmUser();

