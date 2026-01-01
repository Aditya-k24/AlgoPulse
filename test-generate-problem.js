/**
 * Test script to verify generate-problem Edge Function
 * Tests the full flow: authentication → Edge Function → OpenAI → response
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
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
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function authenticate() {
  console.log('🔐 Authenticating...');
  
  const testEmail = 'test@algopulse.com';
  const testPassword = 'test123456';
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  
  if (error) {
    console.error('❌ Authentication failed:', error.message);
    return null;
  }
  
  console.log('✅ Authenticated as:', data.user.email);
  return data.session;
}

async function testGenerateProblem(session) {
  console.log('\n🧪 Testing generate-problem Edge Function...');
  console.log('─'.repeat(50));
  
  try {
    if (!session) {
      console.error('❌ No session provided');
      return false;
    }

    console.log('📤 Sending request to generate-problem...');
    const startTime = Date.now();
    
    const response = await fetch(
      `${supabaseUrl}/functions/v1/generate-problem`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          category: 'Array',
          difficulty: 'Easy',
          languages: ['python'], // Python only for now
        }),
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Edge Function failed: HTTP ${response.status}`);
      console.error(`   Error: ${errorText}`);
      return false;
    }

    const result = await response.json();
    
    console.log(`\n✅ Problem Generated Successfully! (${duration}s)`);
    console.log('─'.repeat(50));
    
    if (result.problem) {
      const p = result.problem;
      console.log(`📝 Title: ${p.title}`);
      console.log(`📂 Category: ${p.category}`);
      console.log(`⚡ Difficulty: ${p.difficulty}`);
      console.log(`📖 Description: ${p.description.substring(0, 100)}...`);
      console.log(`🔢 Sample Input: ${p.sample_input.substring(0, 50)}...`);
      console.log(`✨ Sample Output: ${p.sample_output.substring(0, 50)}...`);
      console.log(`🎯 Methods: ${p.methods?.join(', ') || 'N/A'}`);
      console.log(`🧪 Test Cases: ${p.test_cases?.length || 0} total`);
      
      if (p.test_cases) {
        const visible = p.test_cases.filter(tc => tc.isVisible).length;
        const hidden = p.test_cases.filter(tc => !tc.isVisible).length;
        console.log(`   - ${visible} visible, ${hidden} hidden`);
      }
      
      if (p.solutions) {
        console.log(`💻 Solutions:`);
        if (p.solutions.python) console.log(`   - Python: ${p.solutions.python.length} chars`);
        if (p.solutions.java) console.log(`   - Java: ${p.solutions.java.length} chars`);
        if (p.solutions.cpp) console.log(`   - C++: ${p.solutions.cpp.length} chars`);
      }
    } else {
      console.log('⚠️  Response missing problem data');
      console.log('Response:', JSON.stringify(result, null, 2));
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error testing generate-problem:`, error.message);
    return false;
  }
}

async function runTest() {
  console.log('🚀 Testing Generate Problem Edge Function');
  console.log('='.repeat(50));
  
  // Authenticate
  const session = await authenticate();
  if (!session) {
    console.error('❌ Cannot proceed without authentication');
    return false;
  }
  
  // Test problem generation
  const success = await testGenerateProblem(session);
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('='.repeat(50));
  
  if (success) {
    console.log('🎉 Generate-problem Edge Function is working!');
    console.log('\n✅ Next Steps:');
    console.log('   1. Start the app: npm start');
    console.log('   2. Login with test@algopulse.com / test123456');
    console.log('   3. Click the "Generate Problem" button');
    console.log('   4. Test the code editor with Python');
  } else {
    console.log('⚠️  Test failed. Check the errors above.');
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure OPENAI_API_KEY is set in Supabase Dashboard');
    console.log('   2. Verify generate-problem function is deployed');
    console.log('   3. Check Supabase function logs for errors');
  }
  
  return success;
}

// Run test
runTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

