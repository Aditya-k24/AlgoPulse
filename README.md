# AlgoPulse (MVP)

A spaced-repetition + problem-solving trainer for DSA built with Expo, Supabase, and OpenAI.

## Setup

1) Create your environment file from the example and fill values:
```bash
cp env.example .env
```

2) Supabase
- Create a new project
- Run SQL in `supabase/sql/schema.sql` via SQL Editor
- Copy project URL and anon key into `.env`

3) OpenAI
- Add `OPENAI_API_KEY` to `.env`

4) Code execution provider
- JDoodle (client id/secret) or Sphere Engine token and set envs accordingly

5) Install dependencies and run (after app init):
```bash
npm install
npm run start
```

## Security
- Never commit real API keys. `.gitignore` excludes `.env` and `env.txt`.
- Edge functions should use service role keys securely via Supabase secrets.

## Next Steps
- Deploy edge functions: `supabase functions deploy generate-problem` and `execute-code`
- Implement UI screens and notification scheduling
