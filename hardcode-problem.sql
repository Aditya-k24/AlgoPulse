-- Hardcoded problem for screenshot
-- Run this via: supabase db execute --file hardcode-problem.sql
-- Or via the Supabase SQL Editor

-- Insert the problem
INSERT INTO problems (
  title, category, difficulty, description, 
  sample_input, sample_output, constraints, 
  solutions, methods, test_cases,
  quick_refresh, pattern_name, visual_breakdown
) VALUES (
  'Two Sum - Find Pair with Target',
  'Array',
  'Easy',
  'Given an array of integers **nums** and an integer **target**, return the indices of the two numbers such that they add up to target.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

**Example Walkthrough:**
- **Input:** `nums = [2, 7, 11, 15]`, `target = 9`
- **Explanation:** Since `nums[0] + nums[1] = 2 + 7 = 9`, we return `[0, 1]`
- **Output:** `[0, 1]`

**Edge Cases:**
- Array with only 2 elements
- Negative numbers in array
- Target is sum of first and last elements',
  '4\n2 7 11 15\n9',
  '[0, 1]',
  '2 ≤ nums.length ≤ 10⁴, -10⁹ ≤ nums[i] ≤ 10⁹, -10⁹ ≤ target ≤ 10⁹, Only one valid answer exists',
  '{"python": "def solve(input_data):\n    lines = input_data.strip().split(''\\n'')\n    n = int(lines[0])\n    nums = list(map(int, lines[1].split()))\n    target = int(lines[2])\n    \n    # Hash map approach - O(n) time\n    hashmap = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in hashmap:\n            return f\"[{hashmap[complement]}, {i}]\"\n        hashmap[num] = i\n    return \"[]\"\n\nif __name__ == ''__main__'':\n    import sys\n    print(solve(sys.stdin.read()))", "java": "", "cpp": "", "javascript": ""}'::jsonb,
  ARRAY['HashMap', 'Two Pointers'],
  '[
    {"input": "4\n2 7 11 15\n9", "expectedOutput": "[0, 1]", "isVisible": true},
    {"input": "3\n3 2 4\n6", "expectedOutput": "[1, 2]", "isVisible": true},
    {"input": "2\n3 3\n6", "expectedOutput": "[0, 1]", "isVisible": true},
    {"input": "5\n-1 -2 -3 -4 -5\n-8", "expectedOutput": "[2, 4]", "isVisible": false},
    {"input": "10\n1 2 3 4 5 6 7 8 9 10\n19", "expectedOutput": "[8, 9]", "isVisible": false}
  ]'::jsonb,
  ARRAY[
    '**Pattern:** HashMap/Dictionary for O(1) lookups',
    '**Key Idea:** Store each number and its index, check if complement exists',
    '**When to Use:** Finding pairs/triplets, need fast lookups, unsorted arrays',
    '**Edge Cases:** Duplicate numbers, negative targets, array with 2 elements',
    '**Time:** O(n) optimal vs O(n²) brute force',
    '**Space:** O(n) for hash map'
  ],
  'HashMap / Hash Table',
  '**Two Sum Algorithm Visualization:**

```
Array: [2, 7, 11, 15], Target: 9

Step 1: i=0, num=2
  hashmap = {}
  complement = 9 - 2 = 7
  7 not in hashmap → add {2: 0}

Step 2: i=1, num=7
  hashmap = {2: 0}
  complement = 9 - 7 = 2
  2 in hashmap! → return [0, 1] ✓

Visual Flow:
[2, 7, 11, 15]  target=9
 ↑
 i=0, need 7 → not found → store {2:0}

[2, 7, 11, 15]  target=9
    ↑
    i=1, need 2 → found at index 0 → return [0,1]
```'
)
RETURNING id;

-- Note: After running the above, you'll get a problem ID
-- Then run the following with that ID (replace 'PROBLEM_ID_HERE' with actual ID):

-- Insert approaches (replace PROBLEM_ID_HERE with actual problem ID from above)
DO $$
DECLARE
  problem_uuid UUID;
BEGIN
  -- Get the most recently inserted problem
  SELECT id INTO problem_uuid FROM problems 
  WHERE title = 'Two Sum - Find Pair with Target' 
  ORDER BY created_at DESC LIMIT 1;

  -- Insert approaches
  INSERT INTO problem_explanations (
    problem_id, approach_name, approach_type, when_to_use, 
    core_intuition, steps, time_complexity, space_complexity, pitfalls, display_order
  ) VALUES
  (
    problem_uuid,
    'Brute Force - Check All Pairs',
    'brute-force',
    'Use only for very small inputs (n < 100) or when learning the problem for the first time.',
    'Check every possible pair of elements to see if their sum equals the target.',
    ARRAY[
      '**Step 1:** Initialize two nested loops: outer loop `i` from `0` to `n-2`, inner loop `j` from `i+1` to `n-1`',
      '**Step 2:** For each pair `(nums[i], nums[j])`, calculate `sum = nums[i] + nums[j]`',
      '**Step 3:** If `sum == target`, return `[i, j]` immediately',
      '**Step 4:** If no pair found after checking all combinations, return empty array'
    ],
    'O(n²)',
    'O(1)',
    '**Time Limit Exceeded (TLE)** for large inputs (n > 10,000). Does not leverage any data structure optimizations.',
    0
  ),
  (
    problem_uuid,
    'HashMap - Optimal Solution',
    'optimal',
    '**Best approach** for unsorted arrays. Provides O(n) time complexity with O(n) space.',
    'Use a hash map to store each number and its index. For each number, check if its complement (target - num) exists in the map.',
    ARRAY[
      '**Step 1:** Initialize an empty hash map `hashmap = {}`',
      '**Step 2:** Iterate through array with index `i` and value `num`',
      '**Step 3:** Calculate `complement = target - num`',
      '**Step 4:** If `complement` exists in hashmap, return `[hashmap[complement], i]`',
      '**Step 5:** Otherwise, store `hashmap[num] = i` and continue'
    ],
    'O(n)',
    'O(n)',
    NULL,
    1
  );

  -- Insert references
  INSERT INTO problem_references (
    problem_id, reference_type, title, url, author, display_order
  ) VALUES
  (
    problem_uuid,
    'video',
    'Two Sum - LeetCode 1',
    'https://www.youtube.com/watch?v=KLlXCFG5TnA',
    'NeetCode',
    0
  ),
  (
    problem_uuid,
    'video',
    'Two Sum Problem Explained',
    'https://www.youtube.com/watch?v=BoHO04xVeU0',
    'Abdul Bari',
    1
  );

  RAISE NOTICE 'Problem created with ID: %', problem_uuid;
END $$;

