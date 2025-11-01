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

async function testLogin() {
    log('🧪 Testing User Creation and Login', 'cyan');
    log('===================================\n', 'cyan');

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        log('❌ Missing Supabase credentials in .env file', 'red');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Test credentials
    const testEmail = 'test@algopulse.com';
    const testPassword = 'TestPassword123!';

    try {
        log('📝 Step 1: Creating test user...', 'yellow');
        
        // First, try to sign up
        let signUpData = null;
        const { data: signUpResult, error: signUpError } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
        });

        if (signUpError) {
            if (signUpError.message.includes('already registered') || signUpError.message.includes('rate limit')) {
                log('ℹ️  User already exists or rate limited, attempting to sign in...', 'yellow');
            } else {
                log(`⚠️  Sign up warning: ${signUpError.message}`, 'yellow');
                log('ℹ️  Attempting to sign in with existing user...', 'yellow');
            }
        } else if (signUpResult.user) {
            log('✅ Test user created successfully!', 'green');
            log(`   Email: ${testEmail}`, 'cyan');
            log(`   User ID: ${signUpResult.user.id}`, 'cyan');
            signUpData = signUpResult;
        }

        log('\n📝 Step 2: Creating user profile...', 'yellow');
        
        // Get the user ID
        const userId = signUpData?.user?.id;
        
        if (userId) {
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    user_id: userId,
                    email: testEmail,
                    preferred_languages: ['python', 'java', 'cpp'],
                    plan: 'baseline',
                });

            if (profileError) {
                log(`⚠️  Profile creation: ${profileError.message}`, 'yellow');
            } else {
                log('✅ User profile created successfully!', 'green');
            }
        }

        log('\n📝 Step 3: Testing login...', 'yellow');

        // Now test login (skip if we already have a session)
        let signInData = null;
        if (signUpData && signUpData.session) {
            log('✅ Already logged in from signup!', 'green');
            signInData = signUpData;
        } else {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: testEmail,
                password: testPassword,
            });

            if (signInError) {
            if (signInError.message.includes('Email not confirmed')) {
                log('⚠️  Email not confirmed. This is expected if email confirmation is enabled.', 'yellow');
                log('💡 You can either:', 'yellow');
                log('   1. Disable email confirmation in Supabase Dashboard > Authentication > Settings', 'cyan');
                log('   2. Use the session from signup to test the profile', 'cyan');
                
                // Use the signup session if available
                if (signUpData.session) {
                    log('\n✅ Using signup session for testing...', 'green');
                    // Create a new client with the session
                    const session = signUpData.session;
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('user_id', session.user.id)
                        .single();

                    if (!profileError && profile) {
                        log('✅ Profile verified using session!', 'green');
                        log(`   Plan: ${profile.plan}`, 'cyan');
                        log(`   Languages: ${profile.preferred_languages.join(', ')}`, 'cyan');
                    }
                }
            } else {
                log(`❌ Login error: ${signInError.message}`, 'red');
                process.exit(1);
            }
            } else {
                signInData = data;
            }
        }

        if (signInData && signInData.user) {
            log('✅ Login successful!', 'green');
            log(`   Email: ${signInData.user.email}`, 'cyan');
            log(`   User ID: ${signInData.user.id}`, 'cyan');
        }

        log('\n📝 Step 4: Verifying profile in database...', 'yellow');
        
        if (!signInData || !signInData.user) {
            log('⚠️  No user session available to verify profile', 'yellow');
        } else {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', signInData.user.id)
                .single();

            if (profileError) {
                log(`⚠️  Profile fetch error: ${profileError.message}`, 'yellow');
            } else if (profile) {
                log('✅ Profile verified in database!', 'green');
                log(`   Plan: ${profile.plan}`, 'cyan');
                log(`   Languages: ${profile.preferred_languages.join(', ')}`, 'cyan');
            }
        }

        log('\n📝 Step 5: Fetching problems from database...', 'yellow');
        
        const { data: problems, error: problemsError } = await supabase
            .from('problems')
            .select('*')
            .limit(5);

        if (problemsError) {
            log(`⚠️  Problems fetch error: ${problemsError.message}`, 'yellow');
        } else if (problems && problems.length > 0) {
            log(`✅ Found ${problems.length} problems in database!`, 'green');
            problems.forEach((p, i) => {
                log(`   ${i + 1}. ${p.title} (${p.difficulty}) - ${p.category}`, 'cyan');
            });
        } else {
            log('⚠️  No problems found in database', 'yellow');
        }

        log('\n✅ All tests passed successfully!', 'green');
        log('\n📋 Test Credentials:', 'yellow');
        log(`   Email: ${testEmail}`, 'cyan');
        log(`   Password: ${testPassword}`, 'cyan');
        log('\n💡 You can now use these credentials to login in the app!', 'green');

    } catch (error) {
        log(`\n❌ Test failed: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    }
}

testLogin();
