# Supabase Setup

This document describes the database, authentication, storage, and environment setup for Skilearn.

The executable schema is [server/supabase/schema.sql](../server/supabase/schema.sql). Run it in the Supabase SQL Editor for a new project. For an existing project, review each statement against the current schema before applying it as a migration.

## 1. Create a Supabase Project

1. Create a project at [supabase.com](https://supabase.com).
2. Open **Project Settings -> API**.
3. Copy the project URL and anon key.
4. Keep the database password and service role key private.

## 2. Configure Local Environments

Create `server/.env`:

```text
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
PORT=5000
```

Create `client/.env` from [client/.env.example](../client/.env.example):

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

The browser may use the anon key. Never put the Supabase service role key in `client/.env`, `VITE_` variables, source files, or Git.

## 3. Run the Schema

Open **SQL Editor -> New query**, paste [schema.sql](../server/supabase/schema.sql), and run it.

The schema creates:

| Table or view | Used by |
| --- | --- |
| `profiles` | Authenticated account details and verification status |
| `verification_submissions` | Academic email and student ID verification |
| `skills` | Exchange and offer-a-skill screens |
| `skill_availability` | Weekly availability controls |
| `sessions` | Booking, scheduling, and session status |
| `session_messages` | Mentorship chat |
| `credit_ledger` | Credit earning, spending, reservation, and release |
| `credit_balances` | Current balance view |
| `session_ratings` | Post-session ratings and feedback |
| `items` | Compatibility for the current `/api/health` endpoint |

## 4. Authentication

In **Authentication -> Providers**:

- Enable Email provider for email/password login.
- Enable Google provider for Google OAuth.
- Add the Google client ID and secret from Google Cloud Console.

The `profiles` row is created automatically when a new `auth.users` record is created. The trigger copies the user's email and basic name metadata.

## 5. Google OAuth URLs

In Google Cloud Console, add this authorized redirect URI:

```text
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

In Supabase **Authentication -> URL Configuration**, set:

```text
Site URL: https://skilearn-tan.vercel.app/

Additional redirect URLs:
http://127.0.0.1:5173/
http://127.0.0.1:5173/login
http://127.0.0.1:5173/profile
http://localhost:5173/
http://localhost:5173/login
http://localhost:5173/profile
http://127.0.0.1:5174/
http://127.0.0.1:5174/login
http://127.0.0.1:5174/profile
http://localhost:5174/
http://localhost:5174/login
http://localhost:5174/profile
https://skilearn-tan.vercel.app/
https://skilearn-tan.vercel.app/login
https://skilearn-tan.vercel.app/profile
```

The login screen calls `supabase.auth.signInWithOAuth({ provider: 'google' })` and redirects to the current app's `/profile` route.

## 6. Row Level Security

The schema enables RLS on every application table.

- Published skills are visible to authenticated users.
- Users can create and edit only their own skills and availability.
- Session data and chat messages are visible only to participants.
- Credit ledger rows are read-only to the owning user.
- Verification submissions are private to the submitting user.
- Storage files must be placed under a folder named with the authenticated user's UUID.

Credit mutations, verification approval, and session state transitions should be performed by the Express API using validated server logic. Do not let the browser directly create credit ledger adjustments.

## 7. Storage

The schema creates two private buckets:

- `files`
- `student-verification`

Use paths beginning with the authenticated user ID:

```text
<user-id>/verification/student-id.png
<user-id>/attachments/example.pdf
```

The existing API downloads from the `files` bucket through `GET /api/files/*path`.

## 8. Page-to-Data Mapping

| Screen | Primary data |
| --- | --- |
| Login | `auth.users`, Supabase Auth session |
| Exchange | `skills`, `profiles`, `skill_availability` |
| Skill listing | `skills`, `skill_availability` |
| Verification | `verification_submissions`, `profiles`, `student-verification` bucket |
| Sessions | `sessions`, `skills`, `profiles` |
| Chat | `session_messages`, `sessions` |
| Wallet | `credit_balances`, `credit_ledger` |
| Skill detail | `skills`, `profiles`, `skill_availability` |

## 9. Vercel Environment Variables

Configure both client and server values in Vercel:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_ANON_KEY
```

Use the same project URL and anon key for both services. Redeploy after adding or changing environment variables.

## 10. Verification Checklist

- Create a test account with email/password.
- Confirm a `profiles` row is created.
- Sign in through `/login`.
- Test Google OAuth after configuring the provider URLs.
- Run `GET /api/health` and confirm the response is connected.
- Upload a test verification file under the user's UUID folder.
- Create a published skill and confirm it appears only to authenticated users.
- Confirm a user cannot read another user's ledger or private files.