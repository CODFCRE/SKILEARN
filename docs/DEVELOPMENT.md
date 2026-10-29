# Development Guide

## Prerequisites

- Node.js with npm
- A Supabase project for server and Auth development
- A browser with JavaScript enabled

## Install

```powershell
Push-Location client; npm install; Pop-Location
Push-Location server; npm install; Pop-Location
```

## Environment

Create `server/.env`:

```text
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
PORT=5000
```

Create `client/.env` from [client/.env.example](../client/.env.example):

```text
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

The browser may use the Supabase URL and anon key. It must never receive the service role key.

## Run Locally

Start the API:

```powershell
Push-Location server; npm run dev; Pop-Location
```

Start the client in another terminal:

```powershell
Push-Location client; npm run dev; Pop-Location
```

## Validate Changes

```powershell
Push-Location client; npm run lint; npm run build; Pop-Location
node --check server/src/index.js
node --check server/src/routes/api.js
```

## Working Conventions

- Keep screen-specific React components near their route logic until a shared abstraction is clearly useful.
- Keep design tokens and responsive rules in `client/src/App.css`.
- Add loading, empty, and error states when connecting a screen to the API.
- Keep API route behavior independent from client presentation.
- Use semantic labels and accessible names for interactive controls.
- Keep Supabase redirect URLs synchronized between the client and Supabase Auth settings.