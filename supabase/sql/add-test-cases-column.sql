-- Add test_cases column to problems table
-- This column stores test cases as JSONB array
-- Each test case has: { id, input, expectedOutput, isVisible }

ALTER TABLE problems 
ADD COLUMN IF NOT EXISTS test_cases JSONB DEFAULT NULL;

-- Add comment to document the structure
COMMENT ON COLUMN problems.test_cases IS 'Array of test cases: [{id, input, expectedOutput, isVisible}] - 3 visible + 2 hidden test cases';

