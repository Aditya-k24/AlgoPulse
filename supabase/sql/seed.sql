-- Seed sample problem
insert into public.problems (title, category, difficulty, description, sample_input, sample_output, constraints, solutions, methods)
values (
  'Two Sum',
  'Arrays',
  'Easy',
  'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
  'nums = [2,7,11,15], target = 9',
  '[0,1] // since nums[0] + nums[1] == 9',
  '1 <= nums.length <= 10^4; -10^9 <= nums[i] <= 10^9',
  '{"python": "def two_sum(nums, target):\n  lookup = {}\n  for i, v in enumerate(nums):\n    j = lookup.get(target - v)\n    if j is not None:\n      return [j, i]\n    lookup[v] = i\n", "java": "import java.util.*;\nclass Solution {\n  public int[] twoSum(int[] nums, int target) {\n    Map<Integer,Integer> map = new HashMap<>();\n    for (int i=0;i<nums.length;i++){\n      int need = target - nums[i];\n      if(map.containsKey(need)) return new int[]{map.get(need), i};\n      map.put(nums[i], i);\n    }\n    return new int[0];\n  }\n}", "cpp": "#include <bits/stdc++.h>\nusing namespace std;\nvector<int> twoSum(vector<int>& nums, int target){\n  unordered_map<int,int> m;\n  for(int i=0;i<nums.size();++i){\n    int need = target - nums[i];\n    if(m.count(need)) return {m[need], i};\n    m[nums[i]] = i;\n  }\n  return {};\n}"}',
  '{"Brute Force","HashMap"}'
)
ON CONFLICT DO NOTHING;
