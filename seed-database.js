#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function seedDatabase() {
    log('🌱 Seeding Database with Sample Data', 'cyan');
    log('====================================\n', 'cyan');

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        log('❌ Missing Supabase credentials in .env file', 'red');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const sampleProblems = [
        {
            title: 'Two Sum',
            category: 'Array',
            difficulty: 'Easy',
            description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
            sample_input: 'nums = [2,7,11,15], target = 9',
            sample_output: '[0,1]',
            constraints: '2 <= nums.length <= 10^4',
            solutions: {
                python: `def twoSum(nums, target):
    hashmap = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in hashmap:
            return [hashmap[complement], i]
        hashmap[num] = i
    return []`,
                java: `public int[] twoSum(int[] nums, int target){
    Map<Integer,Integer> map=new HashMap<>();
    for(int i=0;i<nums.length;i++){
        int complement=target-nums[i];
        if(map.containsKey(complement)){
            return new int[]{map.get(complement),i};
        }
        map.put(nums[i],i);
    }
    return new int[0];
}`,
                cpp: `vector<int> twoSum(vector<int>& nums, int target){
    unordered_map<int,int> map;
    for(int i=0;i<nums.size();i++){
        int complement=target-nums[i];
        if(map.find(complement)!=map.end()){
            return {map[complement],i};
        }
        map[nums[i]]=i;
    }
    return {};
}`
            },
            methods: ['Hash Table', 'Two Pointers'],
            tags: ['array', 'hash-table', 'two-pointers']
        },
        {
            title: 'Valid Parentheses',
            category: 'Stack',
            difficulty: 'Easy',
            description: 'Given a string s containing just the characters ( ), { }, [ ], determine if the input string is valid.',
            sample_input: 's = "()"',
            sample_output: 'true',
            constraints: '1 <= s.length <= 10^4',
            solutions: {
                python: `def isValid(s):
    stack = []
    mapping = {")":"(","}":"{","]":"["}
    for char in s:
        if char in mapping:
            if not stack or stack.pop() != mapping[char]:
                return False
        else:
            stack.append(char)
    return not stack`,
                java: `public boolean isValid(String s){
    Stack<Character> stack=new Stack<>();
    Map<Character,Character> map=new HashMap<>();
    map.put(')','(');map.put('}','{');map.put(']','[');
    for(char c:s.toCharArray()){
        if(map.containsKey(c)){
            if(stack.isEmpty()||stack.pop()!=map.get(c))return false;
        }else{
            stack.push(c);
        }
    }
    return stack.isEmpty();
}`,
                cpp: `bool isValid(string s){
    stack<char> st;
    unordered_map<char,char> map={{')','('},{'}','{'},{']','['}};
    for(char c:s){
        if(map.count(c)){
            if(st.empty()||st.top()!=map[c])return false;
            st.pop();
        }else{
            st.push(c);
        }
    }
    return st.empty();
}`
            },
            methods: ['Stack'],
            tags: ['string', 'stack']
        }
    ];

    try {
        log('📝 Inserting sample problems...', 'yellow');
        
        for (const problem of sampleProblems) {
            const { data, error } = await supabase
                .from('problems')
                .insert([{
                    title: problem.title,
                    category: problem.category,
                    difficulty: problem.difficulty,
                    description: problem.description,
                    sample_input: problem.sample_input,
                    sample_output: problem.sample_output,
                    constraints: problem.constraints,
                    solutions: problem.solutions,
                    methods: problem.methods,
                    tags: problem.tags
                }]);

            if (error) {
                if (error.message.includes('duplicate') || error.message.includes('unique')) {
                    log(`ℹ️  Problem "${problem.title}" already exists, skipping...`, 'yellow');
                } else {
                    log(`❌ Error inserting "${problem.title}": ${error.message}`, 'red');
                }
            } else {
                log(`✅ Successfully inserted: ${problem.title} (${problem.difficulty})`, 'green');
            }
        }

        log('\n📊 Fetching all problems from database...', 'yellow');
        
        const { data: problems, error: fetchError } = await supabase
            .from('problems')
            .select('title, category, difficulty')
            .order('created_at', { ascending: true });

        if (fetchError) {
            log(`❌ Error fetching problems: ${fetchError.message}`, 'red');
        } else {
            log(`\n✅ Database now contains ${problems.length} problems:\n`, 'green');
            problems.forEach((p, i) => {
                log(`   ${i + 1}. ${p.title} (${p.difficulty}) - ${p.category}`, 'cyan');
            });
        }

        log('\n🎉 Database seeding completed!', 'green');

    } catch (error) {
        log(`\n❌ Seeding failed: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    }
}

seedDatabase();

