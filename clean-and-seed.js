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

async function cleanAndSeed() {
    log('🧹 Cleaning and Seeding Database', 'cyan');
    log('=================================\n', 'cyan');

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        log('❌ Missing Supabase credentials in .env file', 'red');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    try {
        // Step 1: Get existing problems
        log('📝 Checking existing problems...', 'yellow');
        const { data: existingProblems, error: fetchError } = await supabase
            .from('problems')
            .select('id, title')
            .order('created_at', { ascending: true });

        if (fetchError) {
            log(`❌ Error fetching problems: ${fetchError.message}`, 'red');
            process.exit(1);
        }

        log(`Found ${existingProblems.length} existing problems`, 'cyan');

        // Step 2: Delete all existing problems
        if (existingProblems.length > 0) {
            log('\n🗑️  Deleting all existing problems...', 'yellow');
            
            // Delete in chunks to avoid issues
            const problemIds = existingProblems.map(p => p.id);
            const { error: deleteError } = await supabase
                .from('problems')
                .delete()
                .in('id', problemIds);

            if (deleteError) {
                log(`❌ Error deleting problems: ${deleteError.message}`, 'red');
                process.exit(1);
            }

            log(`✅ Deleted ${problemIds.length} problems`, 'green');
        }

        // Step 3: Insert fresh seed data
        log('\n🌱 Inserting fresh seed data...', 'yellow');
        
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

        const { data: insertedProblems, error: insertError } = await supabase
            .from('problems')
            .insert(sampleProblems)
            .select('title, difficulty, category');

        if (insertError) {
            log(`❌ Error inserting problems: ${insertError.message}`, 'red');
            process.exit(1);
        }

        log(`✅ Successfully inserted ${insertedProblems.length} problems:`, 'green');
        insertedProblems.forEach((p, i) => {
            log(`   ${i + 1}. ${p.title} (${p.difficulty}) - ${p.category}`, 'cyan');
        });

        log('\n🎉 Database cleaned and seeded successfully!', 'green');
        log('\n📊 Summary:', 'yellow');
        log(`   - Deleted: ${existingProblems.length} old problems`, 'cyan');
        log(`   - Inserted: ${insertedProblems.length} fresh problems`, 'cyan');

    } catch (error) {
        log(`\n❌ Operation failed: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    }
}

cleanAndSeed();

