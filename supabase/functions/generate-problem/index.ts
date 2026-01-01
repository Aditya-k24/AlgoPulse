import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

interface GenerateRequest {
  category?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  languages?: Array<"python" | "java" | "cpp">; // Currently only Python is supported
  existingTitles?: string[];
  creativeHint?: string;
}

const SYSTEM_PROMPT = `You are an expert assistant that generates unique, creative DSA problems.
IMPORTANT: Each problem must be completely different and original. Avoid generating variations of classic problems like "Two Sum", "Valid Parentheses", etc.
Be creative with problem scenarios, themes, and edge cases.
If provided with existingTitles in the request, you MUST avoid creating any problem with a similar title or concept.
If provided with a creativeHint in the request, use it as inspiration to create a truly unique problem.
If category is specified, create a problem in that category. If not, choose any appropriate category.
If difficulty is specified, create a problem of that difficulty. If not, choose a difficulty that matches the problem's complexity.

CRITICAL REQUIREMENTS FOR SOLUTIONS:
Each solution MUST be a complete, executable program that can run and produce output:
- Python: Must include "if __name__ == '__main__':" with main execution code that reads from stdin and prints output
- Java: Must include "public static void main(String[] args)" that reads from stdin using Scanner and prints output
- C++: Must include "int main()" that reads from stdin using getline/cin and prints output using cout
- JavaScript: Must include execution code that processes input and outputs result
- All solutions should read input from stdin (standard input)
- All solutions should print output to stdout (standard output)
- Solutions should parse the input format described in the problem
- Solutions should handle the sample_input correctly

CRITICAL: You MUST generate exactly 5 test cases in the test_cases array:
  - 3 visible test cases (isVisible: true) that should be shown to users
  - 2 hidden test cases (isVisible: false) that test edge cases and should not be shown
  - Test cases should cover different scenarios: basic cases, edge cases, and boundary conditions
  - Each test case must have valid input and expectedOutput
  - Hidden test cases should be more challenging or test corner cases
  - NEVER omit the test_cases field - it must always be present with exactly 5 test cases

CRITICAL: You MUST include a "methods" array with at least 1-3 solution approaches:
  - Each approach name must be maximum 3 words (e.g., "Two Pointers", "Hash Map", "Dynamic Programming", "Binary Search")
  - Concise and descriptive
  - Typically 1-3 words per method name
  - Examples: ["Sliding Window"], ["Hash Map", "Sorting"], ["Dynamic Programming", "Recursion"]
  - NEVER omit the methods field - it must always be present as an array

Return strict JSON matching this schema (ALL FIELDS ARE REQUIRED):
{
  "title": string,
  "category": string,
  "difficulty": "Easy" | "Medium" | "Hard",
  "description": string,
  "sample_input": string,
  "sample_output": string,
  "constraints": string,
  "solutions": { 
    "python": string (REQUIRED - complete executable program with if __name__ == "__main__" block),
    "java": string (optional - but include empty string "" if not generating),
    "cpp": string (optional - but include empty string "" if not generating),
    "javascript": string (optional - but include empty string "" if not generating)
  },
  "methods": ["Method 1", "Method 2"] (REQUIRED - array with 1-3 solution approaches, max 3 words each),
  "test_cases": [
    { "input": "test input 1", "expectedOutput": "expected output 1", "isVisible": true },
    { "input": "test input 2", "expectedOutput": "expected output 2", "isVisible": true },
    { "input": "test input 3", "expectedOutput": "expected output 3", "isVisible": true },
    { "input": "edge case input", "expectedOutput": "edge case output", "isVisible": false },
    { "input": "corner case input", "expectedOutput": "corner case output", "isVisible": false }
  ] (REQUIRED - exactly 5 test cases)
}

EXAMPLE of valid response structure:
{
  "title": "Find Maximum Sum Subarray",
  "category": "Array",
  "difficulty": "Easy",
  "methods": ["Sliding Window", "Two Pointers"],
  "test_cases": [
    { "input": "5\\n1 2 3 4 5", "expectedOutput": "15", "isVisible": true },
    { "input": "3\\n-1 2 -1", "expectedOutput": "2", "isVisible": true },
    { "input": "4\\n5 5 5 5", "expectedOutput": "20", "isVisible": true },
    { "input": "1\\n-10", "expectedOutput": "-10", "isVisible": false },
    { "input": "6\\n-2 -3 4 -1 -2 1", "expectedOutput": "4", "isVisible": false }
  ]
}`;

async function callOpenAI(apiKey: string, body: unknown): Promise<any> {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(body) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.9,
    }),
  });
  
  if (!resp.ok) {
    const errorText = await resp.text();
    console.error('OpenAI API error:', resp.status, errorText);
    throw new Error(`OpenAI error: ${resp.status} - ${errorText}`);
  }
  
  const json = await resp.json();
  const content = json.choices?.[0]?.message?.content;
  
  if (!content) {
    console.error('No content in OpenAI response:', JSON.stringify(json, null, 2));
    throw new Error('No content received from OpenAI');
  }
  
  try {
    const parsed = JSON.parse(content);
    console.log('Parsed OpenAI response keys:', Object.keys(parsed));
    return parsed;
  } catch (parseError) {
    console.error('Failed to parse OpenAI response:', content);
    throw new Error(`Failed to parse OpenAI response: ${parseError}`);
  }
}

function validatePayload(p: any): boolean {
  if (!p || typeof p !== "object") {
    console.error('Validation: payload is not an object');
    return false;
  }
  
  const hasSolutions = p.solutions && 
    typeof p.solutions.python === "string" && 
    typeof p.solutions.java === "string" && 
    typeof p.solutions.cpp === "string" && 
    typeof p.solutions.javascript === "string";
  
  // Test cases are optional - if missing, we'll generate them later
  // If present, they should be valid, but we'll be lenient
  let hasValidTestCases = true;
  if (p.test_cases !== undefined && p.test_cases !== null) {
    const testCasesArray = Array.isArray(p.test_cases);
    if (testCasesArray && p.test_cases.length > 0) {
      // At least check that they have the right structure
      const allValid = p.test_cases.every((tc: any) => 
        typeof tc === "object" &&
        typeof tc.input === "string" &&
        typeof tc.expectedOutput === "string" &&
        (tc.isVisible === true || tc.isVisible === false)
      );
      hasValidTestCases = allValid;
      
      if (!hasValidTestCases) {
        console.error('Test cases validation failed:', {
          isArray: testCasesArray,
          count: p.test_cases?.length,
          firstCase: p.test_cases?.[0],
        });
      }
    } else if (testCasesArray && p.test_cases.length === 0) {
      // Empty array is okay - we'll generate test cases
      hasValidTestCases = true;
    }
  }
  // If test_cases is missing entirely, that's also okay
  
  // Methods should be an array, but allow empty array (we can add defaults)
  const hasMethods = Array.isArray(p.methods);
  
  // Make solutions more lenient - check if they exist and are strings (non-empty)
  // Currently only Python is required (Java, C++, JS coming later)
  const hasValidSolutions = hasSolutions && 
    p.solutions.python?.trim();
  
  const isValid = (
    typeof p.title === "string" && p.title.trim().length > 0 &&
    typeof p.category === "string" && p.category.trim().length > 0 &&
    typeof p.difficulty === "string" && ['Easy', 'Medium', 'Hard'].includes(p.difficulty) &&
    typeof p.description === "string" && p.description.trim().length > 0 &&
    hasValidSolutions &&
    hasMethods &&
    hasValidTestCases
  );
  
  if (!isValid) {
    console.error('Validation failed:', {
      hasTitle: typeof p.title === "string" && p.title?.trim().length > 0,
      title: p.title?.substring(0, 50),
      hasCategory: typeof p.category === "string" && p.category?.trim().length > 0,
      category: p.category,
      hasDifficulty: typeof p.difficulty === "string" && ['Easy', 'Medium', 'Hard'].includes(p.difficulty),
      difficulty: p.difficulty,
      hasDescription: typeof p.description === "string" && p.description?.trim().length > 0,
      descriptionLength: p.description?.length,
      hasSolutions: hasSolutions,
      pythonLength: p.solutions?.python?.length,
      javaLength: p.solutions?.java?.length,
      cppLength: p.solutions?.cpp?.length,
      jsLength: p.solutions?.javascript?.length,
      hasMethods: hasMethods,
      methodsCount: p.methods?.length,
      methods: p.methods,
      hasValidTestCases,
      testCasesCount: p.test_cases?.length,
      testCases: p.test_cases?.slice(0, 2),
    });
  }
  
  return isValid;
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });

  const { category, difficulty, languages, existingTitles }: GenerateRequest = await req.json();
  
  // Default to random if not specified
  const finalCategory = category;
  const finalDifficulty = difficulty;

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) return new Response("Server Misconfigured", { status: 500 });

  try {
    const creativeHints = [
      "Create a problem with a unique real-world scenario (e.g., scheduling, routing, resource allocation)",
      "Design a problem involving graph traversal with unusual constraints",
      "Generate a problem about array manipulation with creative edge cases",
      "Create a problem about string processing with interesting patterns",
      "Design a problem that requires multiple data structures working together",
      "Generate a problem inspired by a specific domain (gaming, networking, logistics, etc.)",
      "Create a problem with time/space optimization constraints",
      "Design a problem about mathematical sequences or number theory",
      "Generate a problem involving dynamic state tracking",
      "Create a problem with parallel or concurrent processing themes"
    ];
    
    const randomHint = creativeHints[Math.floor(Math.random() * creativeHints.length)];
    const requestBody: Record<string, unknown> = { 
      languages,
      creativeHint: randomHint,
      ...(existingTitles && existingTitles.length > 0 ? { existingTitles } : {}),
      ...(finalCategory ? { category: finalCategory } : {}),
      ...(finalDifficulty ? { difficulty: finalDifficulty } : {})
    };
    
    const data = await callOpenAI(openaiKey, requestBody);
    
    // Log the raw response for debugging
    console.log('OpenAI response:', JSON.stringify(data, null, 2));
    
    if (!validatePayload(data)) {
      console.error('Payload validation failed. Payload:', JSON.stringify(data, null, 2));
      return new Response(
        JSON.stringify({ 
          error: "Invalid AI payload", 
          details: "Check server logs for validation details",
          receivedData: {
            hasTitle: !!data?.title,
            hasCategory: !!data?.category,
            hasDifficulty: !!data?.difficulty,
            hasDescription: !!data?.description,
            hasSolutions: !!data?.solutions,
            hasMethods: Array.isArray(data?.methods),
            hasTestCases: Array.isArray(data?.test_cases),
            testCasesCount: data?.test_cases?.length,
          }
        }), 
        { 
          status: 502,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    return new Response(JSON.stringify({ problem: data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
