# Setup Test Cases for Problems

Follow these steps to enable test cases in your AlgoPulse app:

## Step 1: Add Database Column

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/wwstntrikjasjotnrnco
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New query**
4. Copy and paste the contents of `supabase/sql/add-test-cases-column.sql`:
   ```sql
   ALTER TABLE problems 
   ADD COLUMN IF NOT EXISTS test_cases JSONB DEFAULT NULL;
   
   COMMENT ON COLUMN problems.test_cases IS 'Array of test cases: [{id, input, expectedOutput, isVisible}] - 3 visible + 2 hidden test cases';
   ```
5. Click **Run** to execute the SQL
6. Wait for confirmation that the column was added

## Step 2: Deploy Updated Edge Function

The Edge Function has been updated to generate test cases. You need to deploy it:

### Option A: Using Supabase CLI (Recommended)

1. Install Supabase CLI if you haven't:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link to your project:
   ```bash
   supabase link --project-ref wwstntrikjasjotnrnco
   ```

4. Deploy the function:
   ```bash
   supabase functions deploy generate-problem
   ```

### Option B: Using Supabase Dashboard

1. Go to Supabase Dashboard → **Edge Functions**
2. Find `generate-problem` function
3. Click **Edit** or **Redeploy**
4. Copy the contents of `supabase/functions/generate-problem/mod.ts`
5. Paste and save

## Step 3: Add Test Cases to Existing Problems

Run the script to generate test cases for all existing problems:

1. Make sure your `.env` file has:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`

2. Run the script:
   ```bash
   node add-test-cases-to-problems.js
   ```

   This will:
   - Fetch all problems from the database
   - Generate 5 test cases (3 visible + 2 hidden) for each problem using OpenAI
   - Update the database with test cases
   - Skip problems that already have test cases
   - Show progress and summary

3. Wait for completion (may take a few minutes depending on number of problems)

## Step 4: Verify Everything Works

1. **Test new problem generation:**
   - Open your app
   - Generate a new problem
   - Open the code editor
   - You should see 3 visible test cases + "+2 Hidden" indicator

2. **Test existing problems:**
   - Open any existing problem
   - Open the code editor
   - You should see test cases (either from database or generated fallback)

3. **Test test execution:**
   - Click "🧪 Test All" button
   - All 5 test cases should run
   - You should see pass/fail indicators

## Troubleshooting

### If test cases don't appear:
- Check that the database column was added successfully
- Verify the Edge Function was deployed
- Check browser/console logs for errors

### If script fails:
- Verify your `.env` file has all required keys
- Check that OpenAI API key is valid and has credits
- Make sure you're connected to the internet

### If Edge Function deployment fails:
- Make sure Supabase CLI is installed and logged in
- Verify project reference is correct: `wwstntrikjasjotnrnco`
- Check that you have deployment permissions

## What's Changed

✅ New problems will automatically include 5 test cases (3 visible + 2 hidden)
✅ Existing problems can be updated with the script
✅ Test cases are validated before allowing submission
✅ All test cases must pass before solution is accepted

## Next Steps

After completing these steps:
- New problems will have test cases automatically
- Existing problems will have test cases added
- Users must pass all test cases to submit solutions

