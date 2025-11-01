-- =====================================================
-- AlgoPulse Complete Database Schema
-- Foolproof setup for spaced-repetition DSA training
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUMS
-- =====================================================

-- User plans for spaced repetition
CREATE TYPE user_plan AS ENUM ('baseline', 'time_crunch');

-- Difficulty levels
CREATE TYPE difficulty_level AS ENUM ('Easy', 'Medium', 'Hard');

-- Programming languages
CREATE TYPE programming_language AS ENUM ('python', 'java', 'cpp', 'javascript');

-- Problem categories
CREATE TYPE problem_category AS ENUM (
    'Array', 'String', 'Hash Table', 'Linked List', 'Stack', 'Queue',
    'Tree', 'Graph', 'Dynamic Programming', 'Greedy', 'Backtracking',
    'Binary Search', 'Two Pointers', 'Sliding Window', 'Sorting',
    'Heap', 'Union Find', 'Trie', 'Segment Tree', 'Math', 'Geometry'
);

-- Attempt status
CREATE TYPE attempt_status AS ENUM ('pending', 'running', 'completed', 'failed');

-- Recall status
CREATE TYPE recall_status AS ENUM ('scheduled', 'completed', 'skipped', 'failed');

-- =====================================================
-- TABLES
-- =====================================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    email TEXT NOT NULL,
    preferred_languages programming_language[] DEFAULT ARRAY['python'::programming_language, 'java'::programming_language, 'cpp'::programming_language],
    plan user_plan DEFAULT 'baseline',
    timezone TEXT DEFAULT 'UTC',
    notification_settings JSONB DEFAULT '{
        "email_notifications": true,
        "push_notifications": true,
        "daily_reminders": true,
        "recall_reminders": true,
        "reminder_time": "09:00"
    }',
    study_stats JSONB DEFAULT '{
        "total_problems_solved": 0,
        "total_time_spent": 0,
        "streak_days": 0,
        "last_activity": null,
        "difficulty_distribution": {"Easy": 0, "Medium": 0, "Hard": 0},
        "category_distribution": {},
        "average_solve_time": 0
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Problems table
CREATE TABLE problems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    category problem_category NOT NULL,
    difficulty difficulty_level NOT NULL,
    description TEXT NOT NULL,
    sample_input TEXT,
    sample_output TEXT,
    constraints TEXT,
    solutions JSONB NOT NULL DEFAULT '{}', -- {language: code}
    methods TEXT[] DEFAULT ARRAY[]::TEXT[], -- Problem-solving approaches
    tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- Additional tags for filtering
    source TEXT DEFAULT 'generated', -- 'generated', 'leetcode', 'custom', etc.
    external_id TEXT, -- ID from external sources
    metadata JSONB DEFAULT '{}', -- Additional problem metadata
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Problem attempts (user submissions)
CREATE TABLE attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    problem_id UUID REFERENCES problems(id) ON DELETE CASCADE NOT NULL,
    code TEXT NOT NULL,
    language programming_language NOT NULL,
    status attempt_status DEFAULT 'pending',
    execution_result JSONB, -- {output, error, execution_time, memory_used}
    test_results JSONB, -- Results of test cases
    verdict TEXT, -- 'accepted', 'wrong_answer', 'time_limit', 'runtime_error', etc.
    score INTEGER DEFAULT 0, -- 0-100 score based on performance
    execution_time INTEGER, -- Time in milliseconds
    memory_used INTEGER, -- Memory in KB
    feedback TEXT, -- AI-generated feedback
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Spaced repetition recalls
CREATE TABLE recalls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    problem_id UUID REFERENCES problems(id) ON DELETE CASCADE NOT NULL,
    attempt_id UUID REFERENCES attempts(id) ON DELETE SET NULL, -- Original successful attempt
    status recall_status DEFAULT 'scheduled',
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    interval_days INTEGER NOT NULL, -- Days until next recall
    ease_factor DECIMAL(3,2) DEFAULT 2.50, -- SM-2 algorithm ease factor
    repetition_count INTEGER DEFAULT 0,
    quality_score INTEGER, -- User's self-assessment (0-5)
    notes TEXT, -- User's notes about the problem
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, problem_id, scheduled_for)
);

-- Study sessions
CREATE TABLE study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    session_type TEXT DEFAULT 'practice', -- 'practice', 'review', 'recall'
    problems_solved INTEGER DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0, -- Time in seconds
    session_data JSONB DEFAULT '{}', -- Additional session metadata
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- User achievements/badges
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    achievement_type TEXT NOT NULL, -- 'streak', 'problems_solved', 'category_master', etc.
    achievement_data JSONB NOT NULL, -- Achievement-specific data
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    points INTEGER DEFAULT 0
);

-- Problem collections (for custom problem sets)
CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    problem_ids UUID[] DEFAULT ARRAY[]::UUID[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collection problems junction table
CREATE TABLE collection_problems (
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
    problem_id UUID REFERENCES problems(id) ON DELETE CASCADE NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (collection_id, problem_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Profiles indexes
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_email ON profiles(email);

-- Problems indexes
CREATE INDEX idx_problems_category ON problems(category);
CREATE INDEX idx_problems_difficulty ON problems(difficulty);
CREATE INDEX idx_problems_category_difficulty ON problems(category, difficulty);
CREATE INDEX idx_problems_created_at ON problems(created_at DESC);
CREATE INDEX idx_problems_is_active ON problems(is_active);
CREATE INDEX idx_problems_tags ON problems USING GIN(tags);
CREATE INDEX idx_problems_methods ON problems USING GIN(methods);

-- Attempts indexes
CREATE INDEX idx_attempts_user_id ON attempts(user_id);
CREATE INDEX idx_attempts_problem_id ON attempts(problem_id);
CREATE INDEX idx_attempts_user_problem ON attempts(user_id, problem_id);
CREATE INDEX idx_attempts_submitted_at ON attempts(submitted_at DESC);
CREATE INDEX idx_attempts_status ON attempts(status);

-- Recalls indexes
CREATE INDEX idx_recalls_user_id ON recalls(user_id);
CREATE INDEX idx_recalls_problem_id ON recalls(problem_id);
CREATE INDEX idx_recalls_scheduled_for ON recalls(scheduled_for);
CREATE INDEX idx_recalls_user_scheduled ON recalls(user_id, scheduled_for);
CREATE INDEX idx_recalls_status ON recalls(status);

-- Study sessions indexes
CREATE INDEX idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX idx_study_sessions_started_at ON study_sessions(started_at DESC);
CREATE INDEX idx_study_sessions_is_active ON study_sessions(is_active);

-- Achievements indexes
CREATE INDEX idx_achievements_user_id ON achievements(user_id);
CREATE INDEX idx_achievements_earned_at ON achievements(earned_at DESC);

-- Collections indexes
CREATE INDEX idx_collections_user_id ON collections(user_id);
CREATE INDEX idx_collections_is_public ON collections(is_public);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_problems_updated_at BEFORE UPDATE ON problems
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recalls_updated_at BEFORE UPDATE ON recalls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTIONS FOR SPACED REPETITION
-- =====================================================

-- Function to calculate next recall interval (SM-2 algorithm)
CREATE OR REPLACE FUNCTION calculate_next_recall_interval(
    p_ease_factor DECIMAL,
    p_repetition_count INTEGER,
    p_quality_score INTEGER
) RETURNS INTEGER AS $$
BEGIN
    IF p_quality_score < 3 THEN
        -- Failed recall, reset
        RETURN 1;
    ELSIF p_repetition_count = 0 THEN
        RETURN 1;
    ELSIF p_repetition_count = 1 THEN
        RETURN 6;
    ELSE
        RETURN ROUND(p_ease_factor * p_repetition_count)::INTEGER;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update ease factor (SM-2 algorithm)
CREATE OR REPLACE FUNCTION update_ease_factor(
    p_current_ease DECIMAL,
    p_quality_score INTEGER
) RETURNS DECIMAL AS $$
BEGIN
    RETURN GREATEST(1.3, p_current_ease + (0.1 - (5 - p_quality_score) * (0.08 + (5 - p_quality_score) * 0.02)));
END;
$$ LANGUAGE plpgsql;

-- Function to update user stats after successful attempt
CREATE OR REPLACE FUNCTION update_user_stats_after_attempt()
RETURNS TRIGGER AS $$
DECLARE
    v_problem_difficulty difficulty_level;
    v_problem_category problem_category;
    v_solve_time INTEGER;
BEGIN
    -- Only update stats for successful attempts
    IF NEW.verdict = 'accepted' AND (OLD IS NULL OR OLD.verdict != 'accepted') THEN
        -- Get problem details
        SELECT difficulty, category INTO v_problem_difficulty, v_problem_category
        FROM problems WHERE id = NEW.problem_id;
        
        -- Calculate solve time
        v_solve_time := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.submitted_at))::INTEGER;
        
        -- Update user stats
        UPDATE profiles
        SET study_stats = jsonb_set(
            jsonb_set(
                jsonb_set(
                    study_stats,
                    '{total_problems_solved}',
                    ((study_stats->>'total_problems_solved')::INTEGER + 1)::TEXT::JSONB
                ),
                '{total_time_spent}',
                ((study_stats->>'total_time_spent')::INTEGER + v_solve_time)::TEXT::JSONB
            ),
            '{last_activity}',
            NOW()::TEXT::JSONB
        )
        WHERE id = NEW.user_id;
        
        -- Schedule recall for this problem
        INSERT INTO recalls (user_id, problem_id, attempt_id, scheduled_for, interval_days)
        VALUES (
            NEW.user_id,
            NEW.problem_id,
            NEW.id,
            NOW() + INTERVAL '1 day',
            1
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats after attempt completion
CREATE TRIGGER trigger_update_user_stats_after_attempt
    AFTER INSERT OR UPDATE ON attempts
    FOR EACH ROW EXECUTE FUNCTION update_user_stats_after_attempt();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recalls ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_problems ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Problems policies
CREATE POLICY "Anyone can view active problems" ON problems
    FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can create problems" ON problems
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Problem creators can update their problems" ON problems
    FOR UPDATE USING (auth.uid() = created_by);

-- Attempts policies
CREATE POLICY "Users can view own attempts" ON attempts
    FOR SELECT USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = attempts.user_id));

CREATE POLICY "Users can insert own attempts" ON attempts
    FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM profiles WHERE id = attempts.user_id));

CREATE POLICY "Users can update own attempts" ON attempts
    FOR UPDATE USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = attempts.user_id));

-- Recalls policies
CREATE POLICY "Users can view own recalls" ON recalls
    FOR SELECT USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = recalls.user_id));

CREATE POLICY "Users can insert own recalls" ON recalls
    FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM profiles WHERE id = recalls.user_id));

CREATE POLICY "Users can update own recalls" ON recalls
    FOR UPDATE USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = recalls.user_id));

-- Study sessions policies
CREATE POLICY "Users can view own study sessions" ON study_sessions
    FOR SELECT USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = study_sessions.user_id));

CREATE POLICY "Users can insert own study sessions" ON study_sessions
    FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM profiles WHERE id = study_sessions.user_id));

CREATE POLICY "Users can update own study sessions" ON study_sessions
    FOR UPDATE USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = study_sessions.user_id));

-- Achievements policies
CREATE POLICY "Users can view own achievements" ON achievements
    FOR SELECT USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = achievements.user_id));

-- Collections policies
CREATE POLICY "Users can view public collections and own collections" ON collections
    FOR SELECT USING (
        is_public = true OR 
        auth.uid() = (SELECT user_id FROM profiles WHERE id = collections.user_id)
    );

CREATE POLICY "Users can insert own collections" ON collections
    FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM profiles WHERE id = collections.user_id));

CREATE POLICY "Users can update own collections" ON collections
    FOR UPDATE USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = collections.user_id));

CREATE POLICY "Users can delete own collections" ON collections
    FOR DELETE USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = collections.user_id));

-- Collection problems policies
CREATE POLICY "Users can view collection problems for accessible collections" ON collection_problems
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM collections c 
            WHERE c.id = collection_problems.collection_id 
            AND (c.is_public = true OR auth.uid() = (SELECT user_id FROM profiles WHERE id = c.user_id))
        )
    );

CREATE POLICY "Collection owners can manage collection problems" ON collection_problems
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM collections c 
            WHERE c.id = collection_problems.collection_id 
            AND auth.uid() = (SELECT user_id FROM profiles WHERE id = c.user_id)
        )
    );

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert sample problems
INSERT INTO problems (title, category, difficulty, description, sample_input, sample_output, constraints, solutions, methods, tags) VALUES
(
    'Two Sum',
    'Array',
    'Easy',
    'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    'nums = [2,7,11,15], target = 9',
    '[0,1]',
    '2 <= nums.length <= 10^4',
    $JSON${"python":"def twoSum(nums, target):\n    hashmap = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in hashmap:\n            return [hashmap[complement], i]\n        hashmap[num] = i\n    return []","java":"public int[] twoSum(int[] nums, int target){\n    Map<Integer,Integer> map=new HashMap<>();\n    for(int i=0;i<nums.length;i++){\n        int complement=target-nums[i];\n        if(map.containsKey(complement)){\n            return new int[]{map.get(complement),i};\n        }\n        map.put(nums[i],i);\n    }\n    return new int[0];\n}","cpp":"vector<int> twoSum(vector<int>& nums, int target){\n    unordered_map<int,int> map;\n    for(int i=0;i<nums.size();i++){\n        int complement=target-nums[i];\n        if(map.find(complement)!=map.end()){\n            return {map[complement],i};\n        }\n        map[nums[i]]=i;\n    }\n    return {};\n}","javascript":"function twoSum(nums,target){\n    const map=new Map();\n    for(let i=0;i<nums.length;i++){\n        const complement=target-nums[i];\n        if(map.has(complement)){\n            return [map.get(complement),i];\n        }\n        map.set(nums[i],i);\n    }\n    return [];\n}"}$JSON$::jsonb,
    ARRAY['Hash Table', 'Two Pointers'],
    ARRAY['array', 'hash-table', 'two-pointers']
),
(
    'Valid Parentheses',
    'Stack',
    'Easy',
    'Given a string s containing just the characters ( ), { }, [ ], determine if the input string is valid.',
    's = "()"',
    'true',
    '1 <= s.length <= 10^4',
    $JSON${"python":"def isValid(s):\n    stack = []\n    mapping = {\")\":\"(\",\"}\":\"{\",\"]\":\"[\"}\n    for char in s:\n        if char in mapping:\n            if not stack or stack.pop() != mapping[char]:\n                return False\n        else:\n            stack.append(char)\n    return not stack","java":"public boolean isValid(String s){\n    Stack<Character> stack=new Stack<>();\n    Map<Character,Character> map=new HashMap<>();\n    map.put(')','(');map.put('}','{');map.put(']','[');\n    for(char c:s.toCharArray()){\n        if(map.containsKey(c)){\n            if(stack.isEmpty()||stack.pop()!=map.get(c))return false;\n        }else{\n            stack.push(c);\n        }\n    }\n    return stack.isEmpty();\n}","cpp":"bool isValid(string s){\n    stack<char> st;\n    unordered_map<char,char> map={{')','('},{'}','{'},{']','['}};\n    for(char c:s){\n        if(map.count(c)){\n            if(st.empty()||st.top()!=map[c])return false;\n            st.pop();\n        }else{\n            st.push(c);\n        }\n    }\n    return st.empty();\n}","javascript":"function isValid(s){\n    const stack=[];\n    const map={')':'(','}':'{',']':'['};\n    for(const char of s){\n        if(char in map){\n            if(!stack.length||stack.pop()!==map[char])return false;\n        }else{\n            stack.push(char);\n        }\n    }\n    return !stack.length;\n}"}$JSON$::jsonb,
    ARRAY['Stack'],
    ARRAY['string', 'stack']
);

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for user progress summary
CREATE VIEW user_progress_summary AS
SELECT 
    p.id as profile_id,
    p.user_id,
    p.email,
    p.plan,
    p.study_stats->>'total_problems_solved' as total_problems_solved,
    p.study_stats->>'total_time_spent' as total_time_spent,
    p.study_stats->>'streak_days' as streak_days,
    COUNT(DISTINCT a.problem_id) as unique_problems_solved,
    COUNT(DISTINCT CASE WHEN a.verdict = 'accepted' THEN a.problem_id END) as problems_solved_correctly,
    COUNT(DISTINCT r.id) as total_recalls_scheduled,
    COUNT(DISTINCT CASE WHEN r.status = 'completed' THEN r.id END) as recalls_completed
FROM profiles p
LEFT JOIN attempts a ON p.id = a.user_id
LEFT JOIN recalls r ON p.id = r.user_id
GROUP BY p.id, p.user_id, p.email, p.plan, p.study_stats;

-- View for problems with attempt statistics
CREATE VIEW problems_with_stats AS
SELECT 
    pr.*,
    COUNT(a.id) as total_attempts,
    COUNT(CASE WHEN a.verdict = 'accepted' THEN 1 END) as successful_attempts,
    ROUND(
        COUNT(CASE WHEN a.verdict = 'accepted' THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(a.id), 0) * 100, 2
    ) as success_rate,
    AVG(a.execution_time) as avg_execution_time
FROM problems pr
LEFT JOIN attempts a ON pr.id = a.problem_id
GROUP BY pr.id;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 AlgoPulse database schema created successfully!';
    RAISE NOTICE '📊 Tables created: profiles, problems, attempts, recalls, study_sessions, achievements, collections';
    RAISE NOTICE '🔐 Row Level Security enabled on all tables';
    RAISE NOTICE '⚡ Performance indexes created';
    RAISE NOTICE '🤖 Spaced repetition functions implemented';
    RAISE NOTICE '📈 Sample data inserted';
    RAISE NOTICE '✅ Ready for production use!';
END $$;

