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

- Enable the Email provider.
- Set **Authentication -> Email Templates -> Magic Link** to include the numeric token, for example:

  ```text
  Your Skilearn sign-in code is {{ .Token }}
  ```

- Also update **Confirm signup** to use `{{ .Token }}` if that template is used for new accounts. Do not rely on `{{ .ConfirmationURL }}` for the code-entry flow.
- Configure SMTP under **Project Settings -> Authentication -> SMTP Settings** for reliable delivery outside Supabase's limited test-email service.

The app sends a one-time email code with `signInWithOtp` and verifies it with `verifyOtp`. A first-time email automatically creates an account. When Supabase creates the auth user, the database trigger creates a `profiles` row and copies the user's email and basic name metadata.

## 5. Optional Google OAuth URLs

In **Authentication -> Providers -> Google**, enable the provider and enter the OAuth client ID and secret for the same Google Cloud **Web application** client. In Google Cloud Console, add the exact Supabase callback URL shown on that provider page as an authorized redirect URI. It normally follows this form:

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
http://127.0.0.1:5173/auth/error
http://localhost:5173/
http://localhost:5173/login
http://localhost:5173/profile
http://localhost:5173/auth/error
http://127.0.0.1:5174/
http://127.0.0.1:5174/login
http://127.0.0.1:5174/profile
http://127.0.0.1:5174/auth/error
http://localhost:5174/
http://localhost:5174/login
http://localhost:5174/profile
http://localhost:5174/auth/error
http://localhost:8080/
http://localhost:8080/login
http://localhost:8080/profile
http://localhost:8080/auth/error
https://skilearn-tan.vercel.app/
https://skilearn-tan.vercel.app/login
https://skilearn-tan.vercel.app/profile
https://skilearn-tan.vercel.app/auth/error
```

The browser starts Google sign-in using Supabase Auth's `signInWithOAuth`; Supabase handles the provider callback and returns to `/auth/error`. That route completes session detection, displays callback errors, and redirects successful sign-ins to `/profile`. No Google client secret belongs in the client or Docker environment.

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

The client uses the authenticated Supabase session and the public anon key for these queries; row-level security applies. Email verification submissions are saved with `pending` status for review and do not automatically mark a profile as verified. Credit ledger entries are read-only to the client; credit settlement requires trusted server-side logic.

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

- Create or sign in to a test account with the email OTP flow.
- Confirm a `profiles` row is created.
- Request a skill listing and confirm it appears on Exchange after publishing.
- Create a session and confirm it appears in the session list.
- Run `GET /api/health` and confirm the response is connected.
- Upload a test verification file under the user's UUID folder.
- Confirm a user cannot read another user's ledger or private files.