# Deploy Supabase Edge Function

To deploy the updated `generate-problem` edge function, follow these steps:

## Prerequisites

Install the Supabase CLI if you haven't already:

```bash
npm install -g supabase
```

Or download from: https://supabase.com/docs/guides/cli

## Login to Supabase

```bash
supabase login
```

## Link to Your Project

```bash
supabase link --project-ref wwstntrikjasjotnrnco
```

## Deploy the Function

Deploy just the generate-problem function:

```bash
supabase functions deploy generate-problem
```

Or deploy all functions:

```bash
supabase functions deploy
```

## Verify Deployment

After deployment, test the function is working by trying to generate a new problem in your app.

## Environment Variables

Make sure your Supabase project has the `OPENAI_API_KEY` environment variable set:

1. Go to your Supabase dashboard
2. Navigate to Edge Functions
3. Go to Settings
4. Add the `OPENAI_API_KEY` environment variable
