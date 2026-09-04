# OpenAI Problem Generation - Complete Review Mode Content

## 🎯 Overview

The `generate-problem` Edge Function has been **completely rewritten** to generate full Review Mode content, not just basic problem data.

### What Gets Generated Now:

Every problem generation includes **ALL 5 SECTIONS** required for retention-first learning:

1. ⚡ **Quick Refresh** (4-8 bullets)
2. 💡 **Multi-Approach Explanations** (2-3 approaches: brute force, intermediate, optimal)
3. 🎨 **Visual Breakdown** (ASCII diagrams)
4. 📚 **References** (2-3 video/article links)
5. 📋 **Problem Basics** (title, description, solution, test cases)

---

## 🔧 Deployment Steps

### Step 1: Redeploy Edge Function

The `generate-problem` function must be redeployed with the new prompt:

```bash
cd /Users/apple/Desktop/Projects/AlgoPulse
supabase functions deploy generate-problem
```

### Step 2: Verify Environment Variables

Make sure these are set in Supabase Dashboard:
- `OPENAI_API_KEY` - Your OpenAI API key with credits

### Step 3: Test Generation

```bash
node test-generate-problem.js
```

---

## 📋 What OpenAI Will Generate

### Complete JSON Structure:

```json
{
  // Basic Problem Info
  "title": "Find Pair with Target Sum",
  "category": "Array",
  "difficulty": "Easy",
  "description": "...",
  "sample_input": "5\\n1 2 3 4 5\\n7",
  "sample_output": "true",
  "constraints": "...",
  
  // REVIEW MODE CONTENT (NEW):
  "quick_refresh": [
    "Pattern: Two Pointers - use when array is sorted",
    "Key idea: Move pointers from both ends",
    "When to use: Sorted arrays, pair problems",
    "Edge cases: Empty array, no valid pair",
    "Optimal: O(n) time, O(1) space"
  ],
  
  "pattern_name": "Two Pointers",
  
  "approaches": [
    {
      "name": "Brute Force Nested Loop",
      "type": "brute-force",
      "when_to_use": "Only for small inputs or understanding",
      "core_intuition": "Check every pair",
      "steps": ["Step 1...", "Step 2...", "Step 3..."],
      "time_complexity": "O(n²)",
      "space_complexity": "O(1)",
      "pitfalls": "TLE on large inputs"
    },
    {
      "name": "Two Pointers Optimal",
      "type": "optimal",
      "when_to_use": "When array is sorted",
      "core_intuition": "Move pointers based on sum",
      "steps": ["Initialize...", "Compare...", "Move..."],
      "time_complexity": "O(n)",
      "space_complexity": "O(1)",
      "pitfalls": "Requires sorted array"
    }
  ],
  
  "visual_breakdown": "Array: [1, 2, 3, 4, 5]\\n       ↑           ↑\\n      left       right\\n\\nStep 1: sum = 1 + 5 = 6...",
  
  "references": [
    {
      "type": "video",
      "title": "Two Pointers Technique Explained",
      "author": "NeetCode"
    },
    {
      "type": "video",
      "title": "Two Sum II - Two Pointer Approach",
      "author": "Abdul Bari"
    }
  ],
  
  // Standard Fields
  "solutions": {
    "python": "complete executable code..."
  },
  "methods": ["Two Pointers", "Brute Force"],
  "test_cases": [
    // 3 visible, 2 hidden test cases
  ]
}
```

---

## ✅ Validation

The Edge Function now has **strict validation** for all Review Mode fields:

### Required Fields Checked:

1. ✅ `quick_refresh` - Array with 4-8 bullets
2. ✅ `pattern_name` - String (pattern/technique name)
3. ✅ `approaches` - Array with 2-3 approach objects
4. ✅ Each approach must have:
   - name, type, when_to_use, core_intuition
   - steps array (3+ steps)
   - time_complexity, space_complexity
   - pitfalls (optional for optimal)
5. ✅ `visual_breakdown` - ASCII diagram string
6. ✅ `references` - Array with 2-3 video references
7. ✅ Standard fields (title, description, solution, test cases)

### Validation Errors:

If ANY required field is missing, the function returns:
```json
{
  "error": "Invalid AI payload",
  "details": {
    "hasQuickRefresh": false,
    "hasPatternName": true,
    "hasValidApproaches": false,
    // ... detailed breakdown
  }
}
```

This helps debug what OpenAI failed to generate.

---

## 🎓 OpenAI Prompt Philosophy

### Key Points in the Prompt:

1. **Retention-First**: Not a coding platform, but a learning system
2. **ALL Approaches**: Must show brute force, intermediate, and optimal
3. **Visual Learning**: ASCII diagrams required
4. **Quick Refresh**: 30-60 second read for spaced repetition
5. **No Code in Explanations**: Steps explained conceptually, not code
6. **Pattern Recognition**: Focus on when/why to use approaches

### Example Prompt Section:

```
You MUST provide ALL possible approaches (typically 2-3):

1. BRUTE FORCE (always include for intuition)
   - When to use
   - Core intuition
   - Step-by-step idea (3-5 steps, NO CODE)
   - Time/Space complexity
   - Pitfalls (why it fails/TLE)

2. INTERMEDIATE (if applicable)
   - Better approach than brute force

3. OPTIMAL (always mark as recommended)
   - The best solution

IMPORTANT: Users should NEVER think "I didn't know this could be solved with X"
```

---

## 🧪 Testing

### Test Script: `test-generate-problem.js`

Run this to verify OpenAI generates complete content:

```bash
node test-generate-problem.js
```

**Expected Output:**
```
✅ Problem Generated Successfully!
📝 Title: [Generated Problem]
💡 Quick Refresh: 5 bullets
🎯 Approaches: 2 approaches
🎨 Visual Breakdown: [length] chars
📚 References: 2 references
```

---

## 🚨 Common Issues & Solutions

### Issue 1: OpenAI Missing Approaches
**Problem:** OpenAI generates problem but no `approaches` array

**Solution:** 
- Check OpenAI API key has credits
- Verify `temperature` is set correctly (0.9 for creativity)
- Model is `gpt-4o-mini` (cheaper, faster)

### Issue 2: Validation Fails on References
**Problem:** References array empty or invalid

**Solution:**
- OpenAI sometimes forgets references
- Prompt emphasizes "2-3 references REQUIRED"
- Validation will catch this and return error

### Issue 3: Visual Breakdown Too Short
**Problem:** OpenAI returns minimal ASCII diagram

**Solution:**
- Prompt includes detailed example
- Shows 3-5 steps with pointers/arrows
- Model should follow example structure

### Issue 4: Quick Refresh Too Long
**Problem:** More than 8 bullets generated

**Solution:**
- Validation enforces 4-8 bullets
- Prompt says "30-60 second read"
- Model should keep it concise

---

## 📊 Success Metrics

After deploying and testing:

1. **Generation Success Rate**
   - Target: >90% of generations pass validation
   - Monitor errors in Supabase logs

2. **Content Quality**
   - All 3 approaches present (brute, optimal, etc.)
   - Visual diagrams are clear and helpful
   - References are real YouTube videos

3. **User Experience**
   - Problems open in Review Mode instantly
   - All 5 sections display correctly
   - Content is educational and complete

---

## 🔄 Update Cycle

When OpenAI generates content:

1. **Problem Generation** (Button clicked in app)
2. **Edge Function Called** → OpenAI API
3. **JSON Response Validated**
4. **Saved to Database**:
   - Basic fields → `problems` table
   - Quick refresh, pattern, visual → `problems` columns
   - Approaches → `problem_explanations` table
   - References → `problem_references` table
5. **User Sees Review Mode** → Complete content displayed

---

## 📝 Example Generation Output

### What User Sees in App:

**⚡ Quick Refresh:**
- Pattern: Two Pointers - use when array is sorted and finding pairs
- Key idea: Start from both ends, move pointers based on sum comparison
- When to use: Sorted arrays, pair problems, sum/difference targets
- Edge cases: Empty array, single element, no valid pair exists
- Optimal: O(n) time, O(1) space vs O(n²) brute force

**💡 Approach 1: Brute Force Nested Loop** (collapsed by default)
- Type: BRUTE FORCE
- Time: O(n²), Space: O(1)
- When to use: Only for understanding or very small inputs
- [Expand to see full explanation]

**💡 Approach 2: Two Pointers Optimal** (⭐ Recommended, expanded by default)
- Type: OPTIMAL
- Time: O(n), Space: O(1)
- When to use: When array is sorted
- Core Intuition: Use two pointers from ends...
- Steps: 1) Initialize left=0, right=n-1 2) Calculate sum...
- Pitfalls: Only works on sorted arrays

**🎨 Visual Breakdown:**
```
Array: [1, 2, 3, 4, 5]  Target: 7
       ↑           ↑
      left       right

Step 1: sum = 1 + 5 = 6 (< 7) → move left++
Step 2: sum = 2 + 5 = 7 ✓ Found!
```

**📚 References:**
- ▶️ Video: Two Pointers Technique Explained (by NeetCode)
- ▶️ Video: Two Sum II - Two Pointer Approach (by Abdul Bari)

**🤖 AI Practice Generator:**
[Generate Practice Problem button]

---

## 🎉 Summary

**Before:** OpenAI generated basic problem data (title, description, solution)

**After:** OpenAI generates complete Review Mode content:
- Quick Refresh (4-8 bullets)
- Multi-Approach Explanations (2-3 approaches with full details)
- Visual Breakdown (ASCII diagrams)
- References (2-3 video links)
- All standard fields

**Result:** Every generated problem is immediately ready for retention-first learning!

---

## 📞 Support

If OpenAI generation fails:
1. Check Supabase logs for validation errors
2. Verify OpenAI API key has credits
3. Check `supabase/functions/generate-problem/index.ts` for prompt details
4. Test with `node test-generate-problem.js`

---

*Last Updated: ${new Date().toLocaleDateString()}*
*Edge Function: generate-problem v2.0 (Review Mode)*

