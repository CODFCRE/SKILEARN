# Deployment

## Vercel Services

The repository root contains `vercel.json` with two services:

- `client` builds from `client/` using Vite and serves the application routes.
- `server` runs from `server/` using Express and receives `/api/*` traffic.

The client catch-all rewrite must remain after the API rewrite so API requests are not sent to the frontend.

## Required Environment Variables

Configure these in the Vercel project settings for the server service:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
```

Do not configure or expose the Supabase service role key in the browser.

## Dashboard Deployment

1. Import the repository into Vercel.
2. Keep the project root at the repository root where `vercel.json` is located.
3. Add the Supabase environment variables for the required environments.
4. Deploy and inspect the build logs for both services.
5. Verify `/api/health` and the client root route.

## CLI Deployment

Run these commands separately from the repository root after authenticating:

```powershell
npx vercel login
npx vercel link
npx vercel env add SUPABASE_URL
npx vercel env add SUPABASE_ANON_KEY
npx vercel --prod
```

Interactive commands should not be chained into one command because login, linking, and environment setup require prompts.

## Release Checklist

- Client lint passes.
- Client production build passes.
- Server syntax checks pass.
- Supabase variables exist in the target environment.
- `/api/health` returns a connected response.
- No `.env`, key, or credential files are staged.