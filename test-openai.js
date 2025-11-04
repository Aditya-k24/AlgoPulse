// Test script to verify OpenAI API integration
// Run with: node test-openai.js

require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function testOpenAI() {
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    return;
  }
  console.log('Testing OpenAI API integration...');
  
  const SYSTEM_PROMPT = `You are an assistant that generates DSA problems.
Return strict JSON matching this schema:
{
  "title": string,
  "category": string,
  "difficulty": "Easy" | "Medium" | "Hard",
  "description": string,
  "sample_input": string,
  "sample_output": string,
  "constraints": string,
  "solutions": { "python": string, "java": string, "cpp": string, "javascript": string },
  "methods": string[]
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify({
            category: 'Array',
            difficulty: 'Easy'
          }) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API Error:', response.status, errorText);
      return;
    }

    const data = await response.json();
    const problemData = JSON.parse(data.choices[0].message.content);
    
    console.log('✅ OpenAI API connection successful!');
    console.log('📊 Generated problem:');
    console.log(`   Title: ${problemData.title}`);
    console.log(`   Category: ${problemData.category}`);
    console.log(`   Difficulty: ${problemData.difficulty}`);
    console.log(`   Description: ${problemData.description.substring(0, 100)}...`);
    console.log('🎯 Problem generation is working correctly!');
    
  } catch (error) {
    console.error('❌ OpenAI API Error:', error.message);
  }
}

testOpenAI();


