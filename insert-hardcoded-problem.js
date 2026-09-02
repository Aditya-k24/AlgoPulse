#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function main() {
  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      process.exit(1);
    }

    console.log('📝 Inserting hardcoded problem...\n');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert problem
    const { data: problem, error: pErr } = await supabase
      .from('problems')
      .insert({
        title: 'Two Sum - Find Pair with Target',
        category: 'Array',
        difficulty: 'Easy',
        description: `Given an array of integers **nums** and an integer **target**, return the indices of the two numbers such that they add up to target.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

**Example Walkthrough:**
- **Input:** \`nums = [2, 7, 11, 15]\`, \`target = 9\`
- **Explanation:** Since \`nums[0] + nums[1] = 2 + 7 = 9\`, we return \`[0, 1]\`
- **Output:** \`[0, 1]\`

**Edge Cases:**
- Array with only 2 elements
- Negative numbers in array
- Target is sum of first and last elements`,
        sample_input: '4\n2 7 11 15\n9',
        sample_output: '[0, 1]',
        constraints: '2 ≤ nums.length ≤ 10⁴, -10⁹ ≤ nums[i] ≤ 10⁹, -10⁹ ≤ target ≤ 10⁹, Only one valid answer exists',
        solutions: {
          python: `def solve(input_data):
    lines = input_data.strip().split('\\n')
    n = int(lines[0])
    nums = list(map(int, lines[1].split()))
    target = int(lines[2])
    
    hashmap = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in hashmap:
            return f"[{hashmap[complement]}, {i}]"
        hashmap[num] = i
    return "[]"

if __name__ == '__main__':
    import sys
    print(solve(sys.stdin.read()))`,
          java: '',
          cpp: '',
          javascript: ''
        },
        methods: ['HashMap', 'Two Pointers'],
        test_cases: [
          { input: '4\n2 7 11 15\n9', expectedOutput: '[0, 1]', isVisible: true },
          { input: '3\n3 2 4\n6', expectedOutput: '[1, 2]', isVisible: true },
          { input: '2\n3 3\n6', expectedOutput: '[0, 1]', isVisible: true },
          { input: '5\n-1 -2 -3 -4 -5\n-8', expectedOutput: '[2, 4]', isVisible: false },
          { input: '10\n1 2 3 4 5 6 7 8 9 10\n19', expectedOutput: '[8, 9]', isVisible: false }
        ],
        quick_refresh: [
          '**Pattern:** HashMap/Dictionary for O(1) lookups',
          '**Key Idea:** Store each number and its index, check if complement exists',
          '**When to Use:** Finding pairs/triplets, need fast lookups, unsorted arrays',
          '**Edge Cases:** Duplicate numbers, negative targets, array with 2 elements',
          '**Time:** O(n) optimal vs O(n²) brute force',
          '**Space:** O(n) for hash map'
        ],
        pattern_name: 'HashMap / Hash Table',
        visual_breakdown: `**Two Sum Algorithm Visualization:**

\`\`\`
Array: [2, 7, 11, 15], Target: 9

Step 1: i=0, num=2
  hashmap = {}
  complement = 9 - 2 = 7
  7 not in hashmap → add {2: 0}

Step 2: i=1, num=7
  hashmap = {2: 0}
  complement = 9 - 7 = 2
  2 in hashmap! → return [0, 1] ✓
\`\`\``
      })
      .select()
      .single();

    if (pErr) {
      console.error('❌ Problem insert error:', pErr);
      return;
    }

    console.log('✅ Problem created:', problem.id);

    // Insert approaches
    const { error: aErr } = await supabase
      .from('problem_explanations')
      .insert([
        {
          problem_id: problem.id,
          approach_name: 'Brute Force - Check All Pairs',
          approach_type: 'brute-force',
          when_to_use: 'Use only for very small inputs (n < 100) or when learning the problem for the first time.',
          core_intuition: 'Check every possible pair of elements to see if their sum equals the target.',
          steps: [
            '**Step 1:** Initialize two nested loops: outer loop `i` from `0` to `n-2`, inner loop `j` from `i+1` to `n-1`',
            '**Step 2:** For each pair `(nums[i], nums[j])`, calculate `sum = nums[i] + nums[j]`',
            '**Step 3:** If `sum == target`, return `[i, j]` immediately',
            '**Step 4:** If no pair found after checking all combinations, return empty array'
          ],
          time_complexity: 'O(n²)',
          space_complexity: 'O(1)',
          pitfalls: '**Time Limit Exceeded (TLE)** for large inputs (n > 10,000). Does not leverage any data structure optimizations.',
          display_order: 0
        },
        {
          problem_id: problem.id,
          approach_name: 'HashMap - Optimal Solution',
          approach_type: 'optimal',
          when_to_use: '**Best approach** for unsorted arrays. Provides O(n) time complexity with O(n) space.',
          core_intuition: 'Use a hash map to store each number and its index. For each number, check if its complement (target - num) exists in the map.',
          steps: [
            '**Step 1:** Initialize an empty hash map `hashmap = {}`',
            '**Step 2:** Iterate through array with index `i` and value `num`',
            '**Step 3:** Calculate `complement = target - num`',
            '**Step 4:** If `complement` exists in hashmap, return `[hashmap[complement], i]`',
            '**Step 5:** Otherwise, store `hashmap[num] = i` and continue'
          ],
          time_complexity: 'O(n)',
          space_complexity: 'O(n)',
          pitfalls: null,
          display_order: 1
        }
      ]);

    if (aErr) {
      console.error('❌ Approaches insert error:', aErr);
    } else {
      console.log('✅ Approaches created');
    }

    // Insert references
    const { error: rErr } = await supabase
      .from('problem_references')
      .insert([
        {
          problem_id: problem.id,
          reference_type: 'video',
          title: 'Two Sum - LeetCode 1',
          url: 'https://www.youtube.com/watch?v=KLlXCFG5TnA',
          author: 'NeetCode',
          display_order: 0
        },
        {
          problem_id: problem.id,
          reference_type: 'video',
          title: 'Two Sum Problem Explained',
          url: 'https://www.youtube.com/watch?v=BoHO04xVeU0',
          author: 'Abdul Bari',
          display_order: 1
        }
      ]);

    if (rErr) {
      console.error('❌ References insert error:', rErr);
    } else {
      console.log('✅ References created');
    }

    console.log('\n🎉 Hardcoded problem ready for screenshot!');
    console.log(`📱 Problem ID: ${problem.id}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

