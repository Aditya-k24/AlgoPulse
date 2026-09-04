# Fix: Migration Error - user_problems doesn't exist

## ❌ The Problem

You got this error:
```
ERROR: 42P01: relation "user_problems" does not exist
```

**Cause:** The original migration (`add-review-mode-tables.sql`) tried to add a column to a table called `user_problems`, but your database uses different table names.

---

## ✅ The Solution

Use the **FIXED migration** instead:

### File to Run:
```
supabase/sql/add-review-mode-tables-fixed.sql
```

### What Changed:

**Before (broken):**
```sql
-- This line caused the error:
ALTER TABLE user_problems
ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;
```

**After (fixed):**
```sql
-- Changed to use the correct table name:
ALTER TABLE recalls
ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;
```

---

## 🚀 How to Run the Fixed Migration

### Option 1: Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/wwstntrikjasjotnrnco/sql/new

2. Copy the **entire contents** of:
   ```
   supabase/sql/add-review-mode-tables-fixed.sql
   ```

3. Paste into the SQL editor

4. Click **"Run"**

5. You should see:
   ```
   ✅ Review Mode tables created successfully!
   📊 Tables: problem_explanations, problem_references, ai_generated_problems, concept_stats
   🔐 RLS enabled and policies configured
   ```

### Option 2: Helper Script

```bash
node deploy-review-mode.js
```

This will guide you through the process.

---

## 📊 What Gets Created

### New Tables:
1. **problem_explanations** - Multi-approach solution explanations
2. **problem_references** - Video/article references
3. **ai_generated_problems** - AI practice problems for users
4. **concept_stats** - User progress per concept

### Updated Tables:
1. **problems** - Added columns:
   - `quick_refresh` (TEXT[])
   - `pattern_name` (TEXT)
   - `visual_breakdown` (TEXT)
   - `test_cases` (JSONB)

2. **recalls** - Added column:
   - `review_count` (INT) - tracks how many times reviewed

---

## 🔍 Why This Happened

Your database schema uses these table names:
- `profiles` (not `users`)
- `attempts` (not `submissions`)
- `recalls` (not `user_problems`)

The fixed migration now uses the correct table names that match your schema.

---

## ✅ Verification

After running the migration, verify it worked:

```sql
-- Check if new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('problem_explanations', 'problem_references', 'ai_generated_problems', 'concept_stats');

-- Should return 4 rows ✅
```

Or check in Supabase Dashboard → Table Editor - you should see the new tables!

---

## 🎯 Next Steps

Once migration succeeds:

1. **Redeploy Edge Function:**
   ```bash
   supabase functions deploy generate-problem
   ```

2. **Test Problem Generation:**
   ```bash
   node test-generate-problem.js
   ```

3. **Start the App:**
   ```bash
   npm start
   ```

---

## 📝 Summary

**Problem:** Migration referenced non-existent `user_problems` table  
**Solution:** Use `add-review-mode-tables-fixed.sql` instead  
**Status:** Ready to run! ✅

---

*Fixed: ${new Date().toLocaleDateString()}*

