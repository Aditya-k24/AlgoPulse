# AlgoPulse

A spaced-repetition algorithm problem-solving trainer for DSA built with Expo, Supabase, and OpenAI.

## Quick Start

```bash
npm install
npm start
```

## Features

- ✅ User authentication with Supabase
- ✅ Algorithm problem database
- ✅ Spaced repetition scheduling
- ✅ Code execution testing
- ✅ Progress tracking
- ✅ Dark theme UI

## Test Accounts

- Email: `test@algopulse.com`, Password: `test123456`
- Email: `demo@algopulse.com`, Password: `demo123456`
- Email: `user@algopulse.com`, Password: `user123456`

## Tech Stack

- React Native with Expo
- Supabase (Auth & Database)
- TypeScript
- Tailwind CSS

## Database

The database schema is automatically deployed. Run `npm run db:clean-seed` to refresh sample problems.

## Environment

Configure `.env` with your Supabase and OpenAI credentials.

## Security

Never commit API keys. `.gitignore` excludes `.env`.
