const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey || !openaiKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateTestCasesForProblem(problem) {
  // Use OpenAI to generate test cases
  const systemPrompt = `You are an expert assistant that generates test cases for programming problems.
Always return a JSON object with a "test_cases" array containing exactly 5 test cases.
3 must have isVisible: true, 2 must have isVisible: false.`;

  const prompt = `Generate exactly 5 test cases for this problem:

Title: ${problem.title}
Description: ${problem.description}
Sample Input: ${problem.sample_input || 'N/A'}
Sample Output: ${problem.sample_output || 'N/A'}
Constraints: ${problem.constraints || 'N/A'}

Requirements:
- Generate exactly 5 test cases
- 3 visible test cases (isVisible: true) - basic and common cases
- 2 hidden test cases (isVisible: false) - edge cases and corner cases
- Each test case must have valid input and expectedOutput
- Test cases should cover different scenarios

Return ONLY valid JSON array in this format:
[
  { "input": "...", "expectedOutput": "...", "isVisible": true },
  { "input": "...", "expectedOutput": "...", "isVisible": true },
  { "input": "...", "expectedOutput": "...", "isVisible": true },
  { "input": "...", "expectedOutput": "...", "isVisible": false },
  { "input": "...", "expectedOutput": "...", "isVisible": false }
]`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);
    
    // Extract test cases from response
    let testCases = content.test_cases || content.testCases || (Array.isArray(content) ? content : []);
    
    // Validate and add IDs
    if (testCases.length === 5) {
      return testCases.map((tc, index) => ({
        id: `test-${index + 1}`,
        input: tc.input || '',
        expectedOutput: tc.expectedOutput || '',
        isVisible: tc.isVisible === true || tc.isVisible === false ? tc.isVisible : index < 3,
      }));
    }
    
    return null;
  } catch (error) {
    console.error(`Error generating test cases for ${problem.title}:`, error.message);
    return null;
  }
}

async function addTestCasesToProblems() {
  console.log('🚀 Starting to add test cases to existing problems...\n');

  // Fetch all problems without test cases
  const { data: problems, error } = await supabase
    .from('problems')
    .select('id, title, description, sample_input, sample_output, constraints, test_cases')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching problems:', error);
    return;
  }

  console.log(`Found ${problems.length} problems\n`);

  let successCount = 0;
  let failCount = 0;

  for (const problem of problems) {
    // Skip if already has test cases
    if (problem.test_cases && Array.isArray(problem.test_cases) && problem.test_cases.length >= 5) {
      console.log(`⏭️  Skipping "${problem.title}" - already has test cases`);
      continue;
    }

    console.log(`📝 Generating test cases for: "${problem.title}"...`);

    const testCases = await generateTestCasesForProblem(problem);

    if (!testCases || testCases.length !== 5) {
      console.log(`❌ Failed to generate valid test cases for "${problem.title}"`);
      failCount++;
      continue;
    }

    // Update the problem with test cases
    const { error: updateError } = await supabase
      .from('problems')
      .update({ test_cases: testCases })
      .eq('id', problem.id);

    if (updateError) {
      console.log(`❌ Error updating "${problem.title}":`, updateError.message);
      failCount++;
    } else {
      console.log(`✅ Successfully added test cases to "${problem.title}"`);
      successCount++;
    }

    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Successfully updated: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⏭️  Skipped: ${problems.length - successCount - failCount}`);
}

// Run the script
addTestCasesToProblems()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error:', error);
    process.exit(1);
  });
