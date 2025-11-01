#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function createTestUsers() {
    log('\n📝 Creating Test Users for AlgoPulse', 'cyan');
    log('===================================\n', 'cyan');

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        log('❌ Missing Supabase credentials', 'red');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const testUsers = [
        { email: 'test@algopulse.com', password: 'test123456', plan: 'baseline' },
        { email: 'demo@algopulse.com', password: 'demo123456', plan: 'time_crunch' },
        { email: 'user@algopulse.com', password: 'user123456', plan: 'baseline' }
    ];

    log('Creating test users via Supabase signup...', 'yellow');

    for (const user of testUsers) {
        try {
            // Sign up the user
            const { data, error } = await supabase.auth.signUp({
                email: user.email,
                password: user.password,
            });

            if (error) {
                if (error.message.includes('already registered')) {
                    log(`ℹ️  ${user.email} already exists (skipping)`, 'yellow');
                } else {
                    log(`❌ Failed to create ${user.email}: ${error.message}`, 'red');
                }
                continue;
            }

            if (data.user) {
                log(`✅ Created: ${user.email}`, 'green');

                // Create profile with plan
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert({
                        user_id: data.user.id,
                        email: user.email,
                        preferred_languages: ['python', 'java', 'cpp'],
                        plan: user.plan,
                    });

                if (profileError) {
                    log(`   ⚠️  Profile creation error: ${profileError.message}`, 'yellow');
                } else {
                    log(`   ✅ Profile created with ${user.plan} plan`, 'green');
                }
            }
        } catch (error) {
            log(`❌ Error creating ${user.email}: ${error.message}`, 'red');
        }
    }

    log('\n🔑 Test User Credentials:', 'cyan');
    log('========================', 'cyan');
    testUsers.forEach((user, i) => {
        log(`\n${i + 1}. Email: ${user.email}`, 'green');
        log(`   Password: ${user.password}`, 'green');
        log(`   Plan: ${user.plan}`, 'cyan');
    });

    log('\n✅ Test users created! You can now login with these credentials.', 'green');
    log('\n⚠️  Note: Email confirmation may be enabled in Supabase.', 'yellow');
    log('   If login fails, check your Supabase dashboard auth settings.', 'yellow');
}

createTestUsers().catch(console.error);

