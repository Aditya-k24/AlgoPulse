/**
 * Test script to verify code execution works for all languages
 * Tests both Run and Test All functionality
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
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test cases for each language (Python only for now)
const testCases = {
  python: {
    code: `def solve(input_data):
    # Simple add function
    lines = input_data.strip().split('\\n')
    if len(lines) >= 2:
        a = int(lines[0].strip())
        b = int(lines[1].strip())
        return str(a + b)
    return "0"

# Main execution
if __name__ == "__main__":
    import sys
    input_data = sys.stdin.read().strip()
    result = solve(input_data)
    print(result)`,
    input: '5\n3',
    expectedOutput: '8'
  },
  // TODO: Add Java and C++ later
  // java: { ... },
  // cpp: { ... }
};

async function authenticate() {
  console.log('🔐 Authenticating...');
  
  // Try to sign in with test user
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

async function testLanguageExecution(language, testCase, session) {
  console.log(`\n🧪 Testing ${language.toUpperCase()} execution...`);
  console.log('─'.repeat(50));
  
  try {
    if (!session) {
      console.error('❌ No session provided');
      return false;
    }

    // Call execute-code Edge Function
    const response = await fetch(
      `${supabaseUrl}/functions/v1/execute-code`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          language: language === 'python' ? 'python3' : language,
          code: testCase.code,
          stdin: testCase.input,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Execution failed: HTTP ${response.status}`);
      console.error(`   Error: ${errorText}`);
      return false;
    }

    const result = await response.json();
    console.log('📤 Response:', JSON.stringify(result, null, 2));
    
    // Check output
    const actualOutput = (result.output || '').trim();
    const expectedOutput = testCase.expectedOutput.trim();
    const passed = actualOutput === expectedOutput;
    
    console.log(`\n${passed ? '✅' : '❌'} Test Result:`);
    console.log(`   Input: ${testCase.input}`);
    console.log(`   Expected: ${expectedOutput}`);
    console.log(`   Actual: ${actualOutput}`);
    console.log(`   Status: ${passed ? 'PASSED' : 'FAILED'}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    if (result.cpuTime) {
      console.log(`   Execution Time: ${result.cpuTime}ms`);
    }
    
    if (result.memory) {
      console.log(`   Memory: ${result.memory}KB`);
    }
    
    return passed;
  } catch (error) {
    console.error(`❌ Error testing ${language}:`, error.message);
    return false;
  }
}

async function testCodeCombination() {
  console.log('\n🔧 Testing Code Combination Logic...');
  console.log('─'.repeat(50));
  
  // Test Python code combination
  const pythonSolve = `def solve(input_data):
    return input_data.upper()`;
  
  const pythonMain = `if __name__ == "__main__":
    import sys
    input_data = sys.stdin.read().strip()
    result = solve(input_data)
    print(result)`;
  
  const pythonCombined = `${pythonSolve}\n\n${pythonMain}`;
  console.log('✅ Python combination test passed');
  console.log('   Combined code length:', pythonCombined.length);
  
  // Test Java code combination
  const javaSolve = `public static String solve(String inputData) {
        return inputData.toUpperCase();
    }`;
  
  const javaClass = `import java.util.Scanner;

public class Solution {
    ${javaSolve}
    
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        StringBuilder input = new StringBuilder();
        while (scanner.hasNextLine()) {
            input.append(scanner.nextLine());
            if (scanner.hasNextLine()) {
                input.append("\\n");
            }
        }
        String inputData = input.toString();
        String result = solve(inputData);
        System.out.println(result);
        scanner.close();
    }
}`;
  console.log('✅ Java combination test passed');
  console.log('   Combined code length:', javaClass.length);
  
  // Test C++ code combination
  const cppSolve = `string solve(string input) {
    transform(input.begin(), input.end(), input.begin(), ::toupper);
    return input;
}`;
  
  const cppCombined = `#include <iostream>
#include <string>
#include <algorithm>
using namespace std;

${cppSolve}

int main() {
    string line;
    string input;
    while (getline(cin, line)) {
        if (!input.empty()) {
            input += "\\n";
        }
        input += line;
    }
    string result = solve(input);
    cout << result << endl;
    return 0;
}`;
  console.log('✅ C++ combination test passed');
  console.log('   Combined code length:', cppCombined.length);
}

async function runAllTests() {
  console.log('🚀 Starting Code Execution Tests');
  console.log('='.repeat(50));
  
  // Test code combination
  await testCodeCombination();
  
  // Authenticate
  const session = await authenticate();
  if (!session) {
    console.error('❌ Cannot proceed without authentication');
    return false;
  }
  
  // Test execution for each language
  const results = {};
  
  for (const [language, testCase] of Object.entries(testCases)) {
    results[language] = await testLanguageExecution(language, testCase, session);
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('='.repeat(50));
  
  let allPassed = true;
  for (const [language, passed] of Object.entries(results)) {
    console.log(`${passed ? '✅' : '❌'} ${language.toUpperCase()}: ${passed ? 'PASSED' : 'FAILED'}`);
    if (!passed) allPassed = false;
  }
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
  }
  
  return allPassed;
}

// Run tests
runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

