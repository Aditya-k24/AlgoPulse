-- =====================================================
-- AlgoPulse Review Mode Tables (FIXED)
-- Add retention-first learning features
-- =====================================================

-- 1. Add explanation fields to problems table
ALTER TABLE problems
ADD COLUMN IF NOT EXISTS quick_refresh TEXT[],
ADD COLUMN IF NOT EXISTS pattern_name TEXT,
ADD COLUMN IF NOT EXISTS visual_breakdown TEXT,
ADD COLUMN IF NOT EXISTS test_cases JSONB; -- Store test cases as JSON

-- 2. Create problem_explanations table for multi-approach explanations
CREATE TABLE IF NOT EXISTS problem_explanations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE NOT NULL,
  approach_name TEXT NOT NULL,
  approach_type TEXT CHECK (approach_type IN ('brute-force', 'intermediate', 'optimal')) NOT NULL,
  when_to_use TEXT NOT NULL,
  core_intuition TEXT NOT NULL,
  steps TEXT[] NOT NULL,
  time_complexity TEXT NOT NULL,
  space_complexity TEXT NOT NULL,
  pitfalls TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_problem_explanations_problem_id ON problem_explanations(problem_id);

-- 3. Create problem_references table
CREATE TABLE IF NOT EXISTS problem_references (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE NOT NULL,
  reference_type TEXT CHECK (reference_type IN ('video', 'article')) NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  author TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_problem_references_problem_id ON problem_references(problem_id);

-- 4. Create ai_generated_problems table
CREATE TABLE IF NOT EXISTS ai_generated_problems (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_problem_id UUID REFERENCES problems(id) ON DELETE SET NULL,
  concept TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')) NOT NULL,
  problem_statement TEXT NOT NULL,
  hints TEXT[],
  expected_time_complexity TEXT,
  expected_space_complexity TEXT,
  sample_input TEXT,
  sample_output TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_generated_problems_user_id ON ai_generated_problems(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generated_problems_concept ON ai_generated_problems(concept);

-- 5. Create concept_stats table for tracking
CREATE TABLE IF NOT EXISTS concept_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  concept TEXT NOT NULL,
  generated_count INT DEFAULT 0,
  reviewed_count INT DEFAULT 0,
  last_generated_at TIMESTAMP WITH TIME ZONE,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, concept)
);

CREATE INDEX IF NOT EXISTS idx_concept_stats_user_id ON concept_stats(user_id);

-- 6. Add review_count to recalls table (tracks spaced repetition reviews)
ALTER TABLE recalls
ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;

-- 7. Create function to update concept stats
CREATE OR REPLACE FUNCTION update_concept_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'ai_generated_problems' THEN
    INSERT INTO concept_stats (user_id, concept, generated_count, last_generated_at)
    VALUES (NEW.user_id, NEW.concept, 1, NEW.created_at)
    ON CONFLICT (user_id, concept)
    DO UPDATE SET
      generated_count = concept_stats.generated_count + 1,
      last_generated_at = NEW.created_at,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger for concept stats
DROP TRIGGER IF EXISTS trigger_update_concept_stats ON ai_generated_problems;
CREATE TRIGGER trigger_update_concept_stats
AFTER INSERT ON ai_generated_problems
FOR EACH ROW
EXECUTE FUNCTION update_concept_stats();

-- 9. Enable RLS (Row Level Security)
ALTER TABLE problem_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generated_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_stats ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies (drop first to avoid conflicts)

-- Everyone can read problem explanations and references
DROP POLICY IF EXISTS "Public read access for problem_explanations" ON problem_explanations;
CREATE POLICY "Public read access for problem_explanations"
ON problem_explanations FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Public read access for problem_references" ON problem_references;
CREATE POLICY "Public read access for problem_references"
ON problem_references FOR SELECT
USING (true);

-- Users can only access their own AI generated problems
DROP POLICY IF EXISTS "Users can read own ai_generated_problems" ON ai_generated_problems;
CREATE POLICY "Users can read own ai_generated_problems"
ON ai_generated_problems FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ai_generated_problems" ON ai_generated_problems;
CREATE POLICY "Users can insert own ai_generated_problems"
ON ai_generated_problems FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own ai_generated_problems" ON ai_generated_problems;
CREATE POLICY "Users can update own ai_generated_problems"
ON ai_generated_problems FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own ai_generated_problems" ON ai_generated_problems;
CREATE POLICY "Users can delete own ai_generated_problems"
ON ai_generated_problems FOR DELETE
USING (auth.uid() = user_id);

-- Users can only access their own concept stats
DROP POLICY IF EXISTS "Users can read own concept_stats" ON concept_stats;
CREATE POLICY "Users can read own concept_stats"
ON concept_stats FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own concept_stats" ON concept_stats;
CREATE POLICY "Users can insert own concept_stats"
ON concept_stats FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own concept_stats" ON concept_stats;
CREATE POLICY "Users can update own concept_stats"
ON concept_stats FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can manage explanations and references (allow authenticated users for now)
DROP POLICY IF EXISTS "Authenticated users can insert problem_explanations" ON problem_explanations;
CREATE POLICY "Authenticated users can insert problem_explanations"
ON problem_explanations FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update problem_explanations" ON problem_explanations;
CREATE POLICY "Authenticated users can update problem_explanations"
ON problem_explanations FOR UPDATE
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert problem_references" ON problem_references;
CREATE POLICY "Authenticated users can insert problem_references"
ON problem_references FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update problem_references" ON problem_references;
CREATE POLICY "Authenticated users can update problem_references"
ON problem_references FOR UPDATE
USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT ALL ON problem_explanations TO authenticated;
GRANT ALL ON problem_references TO authenticated;
GRANT ALL ON ai_generated_problems TO authenticated;
GRANT ALL ON concept_stats TO authenticated;

-- Comment tables
COMMENT ON TABLE problem_explanations IS 'Stores multiple solution approaches for each problem';
COMMENT ON TABLE problem_references IS 'Stores video and article references for problems';
COMMENT ON TABLE ai_generated_problems IS 'Stores AI-generated practice problems for users';
COMMENT ON TABLE concept_stats IS 'Tracks user stats per concept (generated count, reviews)';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Review Mode tables created successfully!';
    RAISE NOTICE '📊 Tables: problem_explanations, problem_references, ai_generated_problems, concept_stats';
    RAISE NOTICE '🔐 RLS enabled and policies configured';
    RAISE NOTICE '⚡ Indexes created for performance';
    RAISE NOTICE '🎯 Ready for retention-first learning!';
END $$;

