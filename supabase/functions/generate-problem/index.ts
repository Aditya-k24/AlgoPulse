import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

interface GenerateRequest {
  category?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  languages?: Array<"python" | "java" | "cpp">; // Currently only Python is supported
  existingTitles?: string[];
  creativeHint?: string;
}

const SYSTEM_PROMPT = `You are a DSA educator creating retention-focused learning content. Generate comprehensive, detailed content.

CRITICAL: Generate ALL sections completely. Problem statement must be FIRST and DETAILED.

GENERATE IN THIS ORDER:

1. PROBLEM STATEMENT (FIRST - Must be detailed):
- Title: Unique, descriptive problem name
- Category: One of the standard DSA categories
- Difficulty: Easy, Medium, or Hard
- Description: DETAILED problem statement (4-6 sentences). MUST INCLUDE:
  * Clear problem scenario/context
  * What input is given (format and example)
  * What output is expected (format and example)
  * Example walkthrough with actual input/output values
  * Edge cases to consider
- Sample input/output: Clear examples (will be displayed separately)
- Constraints: Detailed constraints

2. QUICK REFRESH (5-6 bullets, 30 sec read):
- Pattern name, key idea, when to use, edge cases, complexity

3. APPROACHES (MUST generate 2-3 UNIQUE solution approaches):
- Brute Force: when_to_use, intuition, 4-5 detailed steps, complexity, pitfalls
  * MUST use a completely different algorithm/method than optimal (e.g., nested loops vs two pointers, DFS vs BFS, etc.)
- Optimal: same structure, mark as recommended, MUST use a DIFFERENT algorithm than brute force
  * Must be a fundamentally different approach (different data structure, different algorithm paradigm)
- Intermediate (if applicable): Another approach between brute force and optimal with yet another unique method

4. VISUAL BREAKDOWN (Diagrammatic representation):
- ASCII diagram showing optimal approach step-by-step
- Use visual elements: arrows (→), pointers (↑), arrays ([1,2,3]), trees, graphs
- Show 4-6 steps with clear visual progression
- Make it easy to understand the algorithm flow

5. REFERENCES (2-3 YouTube videos with actual URLs):
- Format: {type: "video", title: "...", url: "https://www.youtube.com/watch?v=...", author: "NeetCode" or "Abdul Bari" or similar}
- Must provide real YouTube URLs (you can use common patterns or generate realistic ones)
- Focus on the specific pattern/algorithm used in the problem

JSON SCHEMA (ALL FIELDS REQUIRED):
{
  "title": string (unique, descriptive),
  "category": string (standard DSA category),
  "difficulty": "Easy"|"Medium"|"Hard",
  "description": string (4-6 DETAILED sentences - MUST include example input/output walkthrough),
  "sample_input": string,
  "sample_output": string,
  "constraints": string (detailed, 1-2 lines),
  
  "quick_refresh": [5-6 bullets - REQUIRED],
  "pattern_name": string (REQUIRED),
  "approaches": [
    {
      "name": string (REQUIRED - must be unique per approach),
      "type": "brute-force"|"intermediate"|"optimal" (REQUIRED),
      "when_to_use": string (1-2 sentences - REQUIRED),
      "core_intuition": string (1-2 sentences - REQUIRED),
      "steps": [4-5 detailed strings - REQUIRED, must be different for each approach],
      "time_complexity": string (REQUIRED - e.g., "O(n log n)"),
      "space_complexity": string (REQUIRED - e.g., "O(1)"),
      "pitfalls": string (1-2 sentences - REQUIRED for brute-force, optional for optimal)
    }
  ] (MUST have 2-3 approaches with DIFFERENT solutions),
  
  "visual_breakdown": string (REQUIRED - ASCII diagram, 5-8 lines, diagrammatic),
  "references": [
    {
      "type": "video" (REQUIRED),
      "title": string (REQUIRED),
      "url": string (REQUIRED - actual YouTube URL format: https://www.youtube.com/watch?v=...),
      "author": string (REQUIRED - e.g., "NeetCode", "Abdul Bari", "Back To Back SWE")
    }
  ] (MUST have 2-3 videos with URLs),
  
  "solutions": {
    "python": string (REQUIRED - unique solution, executable),
    "java": string (can be empty for now),
    "cpp": string (can be empty for now),
    "javascript": string (can be empty for now)
  },
  "methods": [1-2 strings, max 3 words each - REQUIRED],
  "test_cases": [5 objects with input, expectedOutput, isVisible - REQUIRED]
}

EXAMPLE (COMPLETE):
{
  "title": "Find Pair Sum in Sorted Array",
  "category": "Array",
  "difficulty": "Easy",
  "description": "Given a sorted array of integers and a target sum, determine if there exists a pair of distinct elements that sum to the target. The array is sorted in non-decreasing order. You need to return true if such a pair exists, false otherwise. For example, with input array [1, 2, 3, 4, 5] and target 7, the output is true because the pair (2, 5) sums to 7. Another example: input array [1, 3, 5, 7] with target 10 returns false since no pair sums to 10. Consider edge cases like empty arrays, arrays with one element, and cases where no valid pair exists.",
  "sample_input": "5\\n1 2 3 4 5\\n7",
  "sample_output": "true",
  "constraints": "2 ≤ n ≤ 10^5, -10^9 ≤ arr[i] ≤ 10^9, -10^9 ≤ target ≤ 10^9",
  "quick_refresh": [
    "Pattern: Two Pointers technique for sorted arrays",
    "Key idea: Use two pointers from opposite ends, move based on sum comparison",
    "When to use: Sorted arrays, pair/triplet problems, searching problems",
    "Edge cases: Empty array, single element, no valid pair, negative numbers",
    "Time complexity: O(n) optimal vs O(n²) brute force",
    "Space complexity: O(1) for both approaches"
  ],
  "pattern_name": "Two Pointers",
  "approaches": [
    {
      "name": "Brute Force - Check All Pairs",
      "type": "brute-force",
      "when_to_use": "Use only for very small inputs (n < 100) or when array is not sorted",
      "core_intuition": "Check every possible pair of elements to see if their sum equals the target",
      "steps": [
        "Initialize two nested loops: outer loop i from 0 to n-1, inner loop j from i+1 to n-1",
        "For each pair (arr[i], arr[j]), calculate sum = arr[i] + arr[j]",
        "If sum equals target, return true immediately",
        "If no pair found after checking all combinations, return false"
      ],
      "time_complexity": "O(n²)",
      "space_complexity": "O(1)",
      "pitfalls": "Time Limit Exceeded (TLE) for large inputs (n > 10,000), inefficient use of sorted property"
    },
    {
      "name": "Two Pointers - Optimal",
      "type": "optimal",
      "when_to_use": "Best for sorted arrays, provides O(n) time complexity",
      "core_intuition": "Use two pointers starting from both ends, move them based on whether current sum is less than, equal to, or greater than target",
      "steps": [
        "Initialize left pointer at index 0 and right pointer at index n-1",
        "While left < right, calculate current_sum = arr[left] + arr[right]",
        "If current_sum == target, return true (pair found)",
        "If current_sum < target, increment left pointer (need larger sum)",
        "If current_sum > target, decrement right pointer (need smaller sum)",
        "If pointers meet without finding pair, return false"
      ],
      "time_complexity": "O(n)",
      "space_complexity": "O(1)",
      "pitfalls": "Only works on sorted arrays, requires sorting step if input is unsorted (adds O(n log n) overhead)"
    }
  ],
  "visual_breakdown": "Two Pointers Algorithm Visualization:\\n\\nInitial: [1, 2, 3, 4, 5], target = 7\\n          ↑           ↑\\n         left       right\\n         sum = 1 + 5 = 6 < 7\\n\\nStep 1:  [1, 2, 3, 4, 5]\\n             ↑        ↑\\n            left    right\\n            sum = 2 + 5 = 7 ✓ (FOUND!)\\n\\nAlgorithm Flow:\\n1. Start with pointers at ends\\n2. Compare sum with target\\n3. Move left if sum too small\\n4. Move right if sum too large\\n5. Return true when sum matches",
  "references": [
    {
      "type": "video",
      "title": "Two Pointers Technique Explained",
      "url": "https://www.youtube.com/watch?v=-gjxg6Pln50",
      "author": "NeetCode"
    },
    {
      "type": "video",
      "title": "Two Sum II - LeetCode Problem",
      "url": "https://www.youtube.com/watch?v=cQ1Oz4ckceM",
      "author": "Abdul Bari"
    }
  ],
  "solutions": {
    "python": "def solve(input_data):\\n    lines = input_data.strip().split('\\\\n')\\n    n = int(lines[0])\\n    arr = list(map(int, lines[1].split()))\\n    target = int(lines[2])\\n    \\n    left, right = 0, n - 1\\n    while left < right:\\n        current_sum = arr[left] + arr[right]\\n        if current_sum == target:\\n            return 'true'\\n        elif current_sum < target:\\n            left += 1\\n        else:\\n            right -= 1\\n    return 'false'\\n\\nif __name__ == '__main__':\\n    import sys\\n    print(solve(sys.stdin.read()))",
    "java": "",
    "cpp": "",
    "javascript": ""
  },
  "methods": ["Two Pointers"],
  "test_cases": [
    {"input": "5\\n1 2 3 4 5\\n7", "expectedOutput": "true", "isVisible": true},
    {"input": "4\\n1 3 5 7\\n10", "expectedOutput": "false", "isVisible": true},
    {"input": "3\\n2 4 6\\n6", "expectedOutput": "true", "isVisible": true},
    {"input": "1\\n5\\n10", "expectedOutput": "false", "isVisible": false},
    {"input": "6\\n-3 -1 0 2 4 6\\n3", "expectedOutput": "true", "isVisible": false}
  ]
}

CRITICAL REQUIREMENTS:
- Description MUST be 4-6 detailed sentences, placed FIRST, and MUST include example input/output walkthrough
- MUST generate 2-3 DIFFERENT solution approaches (brute force + optimal + optional intermediate)
- Visual breakdown MUST be diagrammatic with arrows, pointers, arrays shown visually
- References MUST include actual YouTube URLs (use realistic patterns like /watch?v=...)
- Solutions.python MUST be a complete, executable solution (not empty)
- Each approach MUST have unique steps and different time/space complexity
- All fields are REQUIRED - do not skip any section`;

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
      temperature: 0.8, // Slightly higher for more creative, unique problems
      max_tokens: 3000, // Increased to allow detailed descriptions and multiple approaches
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
  
  // ═════════════════════════════════════════════
  // REVIEW MODE VALIDATIONS (NEW - REQUIRED)
  // ═════════════════════════════════════════════
  
  // 1. Quick Refresh (5-6 bullets - optimized for conciseness)
  const hasQuickRefresh = Array.isArray(p.quick_refresh) && 
    p.quick_refresh.length >= 4 && 
    p.quick_refresh.length <= 6 &&
    p.quick_refresh.every((b: any) => typeof b === "string" && b.trim().length > 0);
  
  // 2. Pattern Name
  const hasPatternName = typeof p.pattern_name === "string" && p.pattern_name.trim().length > 0;
  
  // 3. Approaches (must have 2-3 approaches with unique names and different methods)
  const hasValidApproaches = Array.isArray(p.approaches) && 
    p.approaches.length >= 2 && 
    p.approaches.length <= 3 &&
    p.approaches.every((a: any) =>
      typeof a === "object" &&
      typeof a.name === "string" && a.name.trim().length > 0 &&
      typeof a.type === "string" && ['brute-force', 'intermediate', 'optimal'].includes(a.type) &&
      typeof a.when_to_use === "string" && a.when_to_use.trim().length > 0 &&
      typeof a.core_intuition === "string" && a.core_intuition.trim().length > 0 &&
      Array.isArray(a.steps) && a.steps.length >= 4 && // At least 4 steps for detailed approach
      typeof a.time_complexity === "string" && a.time_complexity.trim().length > 0 &&
      typeof a.space_complexity === "string" && a.space_complexity.trim().length > 0
    ) &&
    // Ensure approaches have unique names
    new Set(p.approaches.map((a: any) => a.name)).size === p.approaches.length &&
    // Ensure at least one optimal approach exists
    p.approaches.some((a: any) => a.type === 'optimal');
  
  // 4. Visual Breakdown (must be diagrammatic - at least 50 chars for proper diagram)
  const hasVisualBreakdown = typeof p.visual_breakdown === "string" && p.visual_breakdown.trim().length >= 50;
  
  // 5. References (2-3 videos with URLs minimum)
  const hasValidReferences = Array.isArray(p.references) && 
    p.references.length >= 2 &&
    p.references.every((r: any) =>
      typeof r === "object" &&
      r.type === "video" &&
      typeof r.title === "string" && r.title.trim().length > 0 &&
      typeof r.url === "string" && r.url.trim().length > 0 && r.url.includes('youtube.com') &&
      typeof r.author === "string" && r.author.trim().length > 0
    );
  
  // ═════════════════════════════════════════════
  // STANDARD FIELD VALIDATIONS
  // ═════════════════════════════════════════════
  
  // Solutions (Python required - must be non-empty and executable)
  const hasSolutions = p.solutions && typeof p.solutions.python === "string";
  const hasValidSolutions = hasSolutions && p.solutions.python?.trim() && p.solutions.python.trim().length > 50; // At least 50 chars for a real solution
  
  // Test cases (5 required: 3 visible, 2 hidden)
  const hasValidTestCases = Array.isArray(p.test_cases) && 
    p.test_cases.length === 5 &&
    p.test_cases.every((tc: any) => 
      typeof tc === "object" &&
      typeof tc.input === "string" &&
      typeof tc.expectedOutput === "string" &&
      (tc.isVisible === true || tc.isVisible === false)
    );
  
  // Methods array
  const hasMethods = Array.isArray(p.methods) && p.methods.length > 0;
  
  // Basic fields (description must be detailed - 4-6 sentences)
  const hasBasicFields = (
    typeof p.title === "string" && p.title.trim().length > 0 &&
    typeof p.category === "string" && p.category.trim().length > 0 &&
    typeof p.difficulty === "string" && ['Easy', 'Medium', 'Hard'].includes(p.difficulty) &&
    typeof p.description === "string" && p.description.trim().length > 100 // Must be detailed (at least 100 chars)
  );
  
  const isValid = (
    hasBasicFields &&
    hasQuickRefresh &&
    hasPatternName &&
    hasValidApproaches &&
    hasVisualBreakdown &&
    hasValidReferences &&
    hasValidSolutions &&
    hasMethods &&
    hasValidTestCases
  );
  
  if (!isValid) {
    console.error('❌ Validation failed - Review Mode content missing or invalid:', {
      // Basic fields
      hasTitle: typeof p.title === "string" && p.title?.trim().length > 0,
      hasCategory: typeof p.category === "string" && p.category?.trim().length > 0,
      hasDifficulty: typeof p.difficulty === "string" && ['Easy', 'Medium', 'Hard'].includes(p.difficulty),
      hasDescription: typeof p.description === "string" && p.description?.trim().length >= 100,
      descriptionLength: p.description?.trim().length,
      
      // Review Mode fields
      hasQuickRefresh,
      quickRefreshCount: p.quick_refresh?.length,
      hasPatternName,
      patternName: p.pattern_name,
      hasValidApproaches,
      approachesCount: p.approaches?.length,
      hasVisualBreakdown,
      visualBreakdownLength: p.visual_breakdown?.length,
      hasValidReferences,
      referencesCount: p.references?.length,
      
      // Standard fields
      hasValidSolutions,
      pythonSolutionLength: p.solutions?.python?.trim().length,
      pythonSolutionPreview: p.solutions?.python?.substring(0, 100),
      hasMethods,
      methodsCount: p.methods?.length,
      hasValidTestCases,
      testCasesCount: p.test_cases?.length,
      
      // Sample data for debugging
      firstQuickRefresh: p.quick_refresh?.[0],
      firstApproach: p.approaches?.[0]?.name,
      firstReference: p.references?.[0]?.title,
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
      ...(finalDifficulty ? { difficulty: finalDifficulty } : {}),
      // Explicit instructions for generation
      instructions: "Generate a COMPLETE problem with: 1) Detailed problem statement (4-6 sentences) FIRST with example input/output walkthrough, 2) 2-3 UNIQUE solution approaches (brute force + optimal + optional intermediate), 3) Diagrammatic visual breakdown, 4) 2-3 YouTube video references with actual URLs, 5) Complete executable Python solution (at least 50 characters). Ensure each approach uses a DIFFERENT algorithm/method. ALL fields are REQUIRED."
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
