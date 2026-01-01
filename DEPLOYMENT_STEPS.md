# AlgoPulse - Complete Deployment Steps

## ✅ Current Status

1. ✅ Supabase project is **RESUMED** and accessible
2. ✅ Authentication is **WORKING** (test@algopulse.com can login)
3. ✅ Supabase CLI is **INSTALLED** (v2.67.1)
4. ✅ App simplified to **PYTHON ONLY** (Java/C++ coming later)
5. ❌ Edge Function `execute-code` needs to be **DEPLOYED**

## 🚀 Next Steps to Get Running

### Step 1: Login to Supabase CLI

Open a new terminal and run:

```bash
supabase login
```

This will open a browser window for you to authenticate with Supabase.

### Step 2: Link Your Project

```bash
cd /Users/apple/Desktop/Projects/AlgoPulse
supabase link --project-ref wwstntrikjasjotnrnco
```

### Step 3: Deploy the Edge Function

Deploy the `execute-code` function:

```bash
supabase functions deploy execute-code
```

### Step 4: Set Environment Variables in Supabase Dashboard

The `execute-code` function needs JDoodle API credentials:

1. Go to: https://supabase.com/dashboard/project/wwstntrikjasjotnrnco/functions
2. Click on **Settings** (or Configuration)
3. Add these environment variables:
   - `JDOODLE_CLIENT_ID` - Your JDoodle client ID
   - `JDOODLE_CLIENT_SECRET` - Your JDoodle client secret
   - `OPENAI_API_KEY` - Your OpenAI API key (for problem generation)

**Don't have JDoodle credentials?**
- Sign up at: https://www.jdoodle.com/compiler-api
- Free tier gives you 200 calls/day

### Step 5: Test the Deployment

Run the automated test:

```bash
cd /Users/apple/Desktop/Projects/AlgoPulse
node test-code-execution.js
```

Expected output:
```
✅ PYTHON: PASSED
🎉 All tests passed!
```

(Java and C++ tests are disabled for now)

### Step 6: Start the Expo App

```bash
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Press `w` for web browser
- Scan QR code with Expo Go app on your phone

### Step 7: Login and Test

Use one of these test accounts:
- Email: `test@algopulse.com`, Password: `test123456`
- Email: `demo@algopulse.com`, Password: `demo123456`
- Email: `user@algopulse.com`, Password: `user123456`

## 📝 Test the Code Editor

Once logged in:

1. Navigate to any problem
2. Click "Open Code Editor"
3. Write code in Python (Java and C++ support coming later)
4. Click "▶ Run" to test with sample input
5. Click "Test All" to run all test cases
6. Click "Submit" when all tests pass

## 🔧 Troubleshooting

### Issue: "Server Misconfigured" error
**Solution**: Set `JDOODLE_CLIENT_ID` and `JDOODLE_CLIENT_SECRET` in Supabase Dashboard

### Issue: "Execution failed: HTTP 404"
**Solution**: Deploy the Edge Function with `supabase functions deploy execute-code`

### Issue: "Not authenticated"
**Solution**: Make sure you're logged in with one of the test accounts

### Issue: Test cases not running
**Solution**: Run `npm run db:seed` to populate the database with problems

## 📚 Additional Resources

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [JDoodle API Docs](https://docs.jdoodle.com/compiler-api/compiler-api)

---

**Quick Command Reference:**

```bash
# Login to Supabase
supabase login

# Link project
supabase link --project-ref wwstntrikjasjotnrnco

# Deploy function
supabase functions deploy execute-code

# Test execution
node test-code-execution.js

# Start app
npm start

# Seed database
npm run db:seed
```

