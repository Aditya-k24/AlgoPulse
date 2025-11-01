import { Problem, ProblemFilter, ProblemGenerationRequest, Language, Difficulty } from '../models/Problem';
import { ProblemService } from '../services/problemService';

export class ProblemController {
  private static instance: ProblemController;
  private problems: Problem[] = [];

  private constructor() {}

  static getInstance(): ProblemController {
    if (!ProblemController.instance) {
      ProblemController.instance = new ProblemController();
    }
    return ProblemController.instance;
  }

  async fetchProblems(filter?: ProblemFilter): Promise<Problem[]> {
    try {
      // Try to fetch from Supabase first
      try {
        const problems = await ProblemService.getProblems(
          filter?.category,
          filter?.difficulty,
          50 // limit
        );
        
        if (problems.length > 0) {
          this.problems = problems;
          return problems;
        }
      } catch (error) {
        console.warn('Failed to fetch from Supabase, falling back to sample problems:', error);
      }

      // Fallback to sample problems if Supabase is not available
      const sampleProblems: Problem[] = [
        {
          id: '1',
          title: 'Two Sum',
          category: 'Array',
          difficulty: 'Easy',
          description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
          sample_input: 'nums = [2,7,11,15], target = 9',
          sample_output: '[0,1]',
          constraints: '2 <= nums.length <= 10^4',
          solutions: {
            python: 'def twoSum(nums, target):\n    hashmap = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in hashmap:\n            return [hashmap[complement], i]\n        hashmap[num] = i\n    return []',
            java: 'public int[] twoSum(int[] nums, int target) {\n    Map<Integer, Integer> map = new HashMap<>();\n    for (int i = 0; i < nums.length; i++) {\n        int complement = target - nums[i];\n        if (map.containsKey(complement)) {\n            return new int[]{map.get(complement), i};\n        }\n        map.put(nums[i], i);\n    }\n    return new int[0];\n}',
            cpp: 'vector<int> twoSum(vector<int>& nums, int target) {\n    unordered_map<int, int> map;\n    for (int i = 0; i < nums.size(); i++) {\n        int complement = target - nums[i];\n        if (map.find(complement) != map.end()) {\n            return {map[complement], i};\n        }\n        map[nums[i]] = i;\n    }\n    return {};\n}',
            javascript: 'function twoSum(nums, target) {\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const complement = target - nums[i];\n        if (map.has(complement)) {\n            return [map.get(complement), i];\n        }\n        map.set(nums[i], i);\n    }\n    return [];\n}'
          },
          methods: ['Hash Table', 'Two Pointers'],
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Valid Parentheses',
          category: 'Stack',
          difficulty: 'Easy',
          description: 'Given a string s containing just the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid.',
          sample_input: 's = "()"',
          sample_output: 'true',
          constraints: '1 <= s.length <= 10^4',
          solutions: {
            python: 'def isValid(s):\n    stack = []\n    mapping = {")": "(", "}": "{", "]": "["}\n    for char in s:\n        if char in mapping:\n            if not stack or stack.pop() != mapping[char]:\n                return False\n        else:\n            stack.append(char)\n    return not stack',
            java: 'public boolean isValid(String s) {\n    Stack<Character> stack = new Stack<>();\n    Map<Character, Character> map = new HashMap<>();\n    map.put(\')\', \'(\'); map.put(\'}\', \'{\'); map.put(\']\', \'[\');\n    for (char c : s.toCharArray()) {\n        if (map.containsKey(c)) {\n            if (stack.isEmpty() || stack.pop() != map.get(c)) return false;\n        } else {\n            stack.push(c);\n        }\n    }\n    return stack.isEmpty();\n}',
            cpp: 'bool isValid(string s) {\n    stack<char> st;\n    unordered_map<char, char> map = {{")", "("}, {"}", "{"}, {"]", "["}};\n    for (char c : s) {\n        if (map.count(c)) {\n            if (st.empty() || st.top() != map[c]) return false;\n            st.pop();\n        } else {\n            st.push(c);\n        }\n    }\n    return st.empty();\n}',
            javascript: 'function isValid(s) {\n    const stack = [];\n    const map = { ")": "(", "}": "{", "]": "[" };\n    for (const char of s) {\n        if (char in map) {\n            if (!stack.length || stack.pop() !== map[char]) return false;\n        } else {\n            stack.push(char);\n        }\n    }\n    return !stack.length;\n}'
          },
          methods: ['Stack'],
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          title: 'Maximum Subarray',
          category: 'Array',
          difficulty: 'Medium',
          description: 'Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.',
          sample_input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]',
          sample_output: '6',
          constraints: '1 <= nums.length <= 10^5',
          solutions: {
            python: 'def maxSubArray(nums):\n    max_sum = current_sum = nums[0]\n    for num in nums[1:]:\n        current_sum = max(num, current_sum + num)\n        max_sum = max(max_sum, current_sum)\n    return max_sum',
            java: 'public int maxSubArray(int[] nums) {\n    int maxSum = nums[0], currentSum = nums[0];\n    for (int i = 1; i < nums.length; i++) {\n        currentSum = Math.max(nums[i], currentSum + nums[i]);\n        maxSum = Math.max(maxSum, currentSum);\n    }\n    return maxSum;\n}',
            cpp: 'int maxSubArray(vector<int>& nums) {\n    int maxSum = nums[0], currentSum = nums[0];\n    for (int i = 1; i < nums.size(); i++) {\n        currentSum = max(nums[i], currentSum + nums[i]);\n        maxSum = max(maxSum, currentSum);\n    }\n    return maxSum;\n}',
            javascript: 'function maxSubArray(nums) {\n    let maxSum = nums[0], currentSum = nums[0];\n    for (let i = 1; i < nums.length; i++) {\n        currentSum = Math.max(nums[i], currentSum + nums[i]);\n        maxSum = Math.max(maxSum, currentSum);\n    }\n    return maxSum;\n}'
          },
          methods: ['Dynamic Programming', 'Divide and Conquer'],
          created_at: new Date().toISOString()
        }
      ];

      // Apply filters to sample problems
      let filteredProblems = sampleProblems.filter(problem => {
        if (filter?.category && problem.category !== filter.category) {
          return false;
        }
        if (filter?.difficulty && problem.difficulty !== filter.difficulty) {
          return false;
        }
        if (filter?.search && !problem.title.toLowerCase().includes(filter.search.toLowerCase())) {
          return false;
        }
        return true;
      });

      this.problems = filteredProblems;
      return filteredProblems;
    } catch (error) {
      console.error('Error fetching problems:', error);
      return [];
    }
  }

  async getProblemById(id: string): Promise<Problem | null> {
    try {
      // Try to get from Supabase first
      const problem = await ProblemService.getProblemById(id);
      if (problem) return problem;
    } catch (error) {
      console.warn('Failed to fetch from Supabase, checking local cache:', error);
    }

    // Fallback to local cache
    return this.problems.find(problem => problem.id === id) || null;
  }

  async generateNewProblem(request?: ProblemGenerationRequest): Promise<Problem> {
    try {
      // Use real OpenAI integration via Supabase Edge Function
      const category = request?.category || 'Array';
      const difficulty = request?.difficulty || 'Medium';
      const languages = request?.languages || ['python', 'java', 'cpp'];
      
      const newProblem = await ProblemService.generateProblem(category, difficulty, languages);
      
      // Add to local cache
      this.problems.unshift(newProblem);
      
      return newProblem;
    } catch (error: any) {
      console.error('Error generating problem:', error);
      throw new Error(error.message || 'Failed to generate new problem. Please check your OpenAI API key and Supabase configuration.');
    }
  }

  async submitSolution(
    problemId: string,
    code: string,
    language: Language,
    input?: string,
    expectedOutput?: string
  ): Promise<{ verdict: 'pass' | 'fail'; message: string }> {
    try {
      // Demo mode - simulate submission
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            verdict: 'pass',
            message: 'Your solution is correct!'
          });
        }, 1000);
      });
    } catch (error) {
      throw new Error('Failed to submit solution');
    }
  }

  getDifficultyColor(difficulty: Difficulty): string {
    switch (difficulty) {
      case 'Easy': return '#10B981';
      case 'Medium': return '#F59E0B';
      case 'Hard': return '#EF4444';
      default: return '#6B7280';
    }
  }

  getCategories(): string[] {
    const categories = [...new Set(this.problems.map(problem => problem.category))];
    return ['All', ...categories.sort()];
  }

  getDifficulties(): string[] {
    return ['All', 'Easy', 'Medium', 'Hard'];
  }

  getLanguages(): Language[] {
    return ['python', 'java', 'cpp', 'javascript'];
  }

  getCurrentProblems(): Problem[] {
    return this.problems;
  }
}