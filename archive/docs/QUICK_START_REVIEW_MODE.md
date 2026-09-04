# Quick Start: Review Mode

## 🚀 Get Started in 3 Steps

### Step 1: Run Database Migration

Open Supabase SQL Editor:
```
https://supabase.com/dashboard/project/wwstntrikjasjotnrnco/sql/new
```

Copy and paste the contents of:
```
supabase/sql/add-review-mode-tables-fixed.sql
```

**Note:** Use the `-fixed.sql` version which works with your existing schema!

Click **"Run"** to execute.

**Or** run the helper script:
```bash
node deploy-review-mode.js
```

---

### Step 2: Start the App

```bash
npm start
```

---

### Step 3: Test Review Mode

1. **Login** with test account:
   - Email: `test@algopulse.com`
   - Password: `test123456`

2. **Browse problems** on Home screen

3. **Tap any problem** → Opens in Review Mode

4. **Verify 5 sections display**:
   - ⚡ Quick Refresh
   - 💡 Solution Approaches
   - 🎨 Visual/Mental Model
   - 📚 References
   - 🤖 AI Practice Generator

5. **Test features**:
   - Expand/collapse approaches
   - Generate AI practice problem
   - Mark as reviewed

---

## ✅ What Changed

### Removed:
- ❌ Code Editor
- ❌ Run/Test/Submit buttons
- ❌ Code execution UI

### Added:
- ✅ Quick Refresh bullets
- ✅ Multi-approach explanations
- ✅ Visual diagrams
- ✅ Reference links
- ✅ AI Practice Generator
- ✅ "Mark as Reviewed" button

---

## 📝 Current Limitations

**Mock Data:** The new Review Mode currently shows mock/example data for:
- Quick Refresh bullets
- Approaches
- Visual diagrams
- References

**Next Step:** You need to either:
1. Update the `ProblemReviewScreen.tsx` to fetch real data from database
2. Or populate the database with real content using admin tools

---

## 🎯 How to Add Real Content

### Option 1: Update Existing Problems
Use `reviewContentService.ts`:

```typescript
import { ReviewContentService } from './src/services/reviewContentService';

const content = {
  problemId: 'your-problem-id',
  quickRefresh: [
    'Pattern: Two Pointers',
    'Key idea: Move pointers based on condition',
    // ...
  ],
  patternName: 'Two Pointers',
  approaches: [
    {
      name: 'Brute Force',
      type: 'brute-force',
      whenToUse: '...',
      coreIntuition: '...',
      steps: ['...'],
      timeComplexity: 'O(n²)',
      spaceComplexity: 'O(1)',
    },
    // ...
  ],
  visualBreakdown: `ASCII diagram here`,
  references: [
    {
      type: 'video',
      title: 'Two Pointers Explained',
      url: 'https://youtube.com/...',
      author: 'NeetCode',
    },
  ],
};

await ReviewContentService.saveReviewContent(content);
```

### Option 2: Use OpenAI to Generate Content
Modify `generate-problem` Edge Function to also generate:
- Quick refresh bullets
- Multiple approaches
- Visual diagrams
- References

---

## 🐛 Troubleshooting

### App won't start
```bash
npm install
npm start
```

### "Cannot find module" errors
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
```

### Navigation errors
Make sure `App.tsx` is updated to use `ProblemReviewScreen` instead of `ProblemDetailScreen`.

### Database errors
Run the migration SQL in Supabase Dashboard.

---

## 📚 Documentation

- **Full Product Pivot Doc:** `PRODUCT_PIVOT.md`
- **Database Schema:** `supabase/sql/add-review-mode-tables.sql`
- **Component Docs:** See `src/components/` for individual components
- **Service Docs:** See `src/services/reviewContentService.ts`

---

## 🎉 You're Ready!

The app is now a **retention-first DSA learning system** instead of a mobile coding platform.

**Focus:** Understanding, pattern recognition, and spaced repetition.

**Next:** Test the app and start adding real review content to problems!

---

*Need help? Check `PRODUCT_PIVOT.md` for detailed information.*

