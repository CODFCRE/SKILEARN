# Skilearn Client

The client is the React and Vite web application for Skilearn.

## Commands

```powershell
npm install
npm run dev
npm run lint
npm run build
npm run preview
```

## Supabase Auth

Copy `.env.example` to `.env` and set:

```text
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

The login screen is available at `/login` and supports Supabase passwordless email OTP and Google OAuth for new and existing accounts. Configure the Supabase Magic Link and Confirm signup email templates to include `{{ .Token }}` so users can enter the emailed code. Enable Google under Supabase Authentication providers and add the app callback URL to the Supabase redirect allowlist. Failed authentication opens `/auth/error` with the available reason; tokens are not displayed. The `/profile` route shows the profile UI while signed out and adds the current user's details and account activity after authentication.

## Source Structure

```text
src/
  app/
    App.jsx             Route switch
  features/
    auth/Login.jsx
    chat/Chat.jsx
    exchange/Exchange.jsx
    profile/Profile.jsx
    sessions/Sessions.jsx
    skills/              Skill details and listing
    verification/Verification.jsx
    wallet/Wallet.jsx
  shared/
    components.jsx       Shared layout and UI primitives
    lib/
      navigation.js      History API navigation helpers
      supabase.js        Supabase browser client
  styles/
    app.css              Design tokens and responsive component styles
    index.css            Global font and browser defaults
  main.jsx              React application entry point
public/                  Static design references and public assets
```

## Routes

- `/`: Exchange discovery
- `/profile`: Authenticated account profile
- `/login`: Supabase login
- `/sessions`: Sessions and messages
- `/wallet`: Credits and quick actions
- `/skill-listing`: Offer a new skill
- `/verification`: Campus verification
- `/chat`: Mentorship chat

The current screens use empty states where server-backed records will eventually be loaded. Do not add real customer, mentor, or credential data directly to the client source.

See the repository [development guide](../docs/DEVELOPMENT.md) for workflow conventions.
