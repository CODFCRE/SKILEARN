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

Configure these for the client service:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Add the deployed client URL to the Supabase Auth URL configuration and OAuth redirect allowlists. Successful OAuth login redirects to `/`.

## Google OAuth Setup

1. In Google Cloud Console, create or select a project.
2. Configure the OAuth consent screen with the application name and support details.
3. Create an OAuth client ID for a web application.
4. In Supabase, open **Authentication -> Providers -> Google** and enable Google.
5. Copy the Google client ID and client secret into the Supabase Google provider settings.
6. Copy the Supabase-provided callback URL into the Google OAuth client's authorized redirect URIs. It normally follows this form:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

7. Add these application URLs to Supabase **Authentication -> URL Configuration**:

```text
http://127.0.0.1:5174/
http://localhost:5174/
https://skilearn-tan.vercel.app/
```

The client invokes `supabase.auth.signInWithOAuth({ provider: 'google' })` and uses the current application origin as the redirect target. Google secrets belong in Supabase, not in this repository.

Do not configure or expose the Supabase service role key in the browser.

## Dashboard Deployment

1. Import the repository into Vercel.
2. Keep the project root at the repository root where `vercel.json` is located.
3. Add the server and client Supabase environment variables for the required environments.
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