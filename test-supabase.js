// Simple test script to verify Supabase connection
// Run with: node test-supabase.js

const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual values
const supabaseUrl = 'https://wwstntrikjasjotnrnco.supabase.co';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY_HERE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
    } else {
      console.log('✅ Supabase connection successful!');
      console.log('📊 Database accessible, profiles table exists');
    }
  } catch (err) {
    console.error('❌ Connection error:', err.message);
  }
}

testConnection();


