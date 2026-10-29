# Skilearn

Skilearn is a peer-to-peer skill exchange application. Users can discover skills, offer their own expertise, schedule sessions, exchange time credits, verify campus membership, and communicate during mentorship sessions.

## Repository Layout

```text
docs/                    Product and engineering documentation
client/                  React + Vite application
	src/app/               Application entry and route switch
	src/features/          Feature-owned screens
	src/shared/            Reusable UI and client integrations
	src/styles/            Global and application styles
server/                  Express API and Supabase integration
	src/app.js             Express app configuration
	src/config/            Service configuration
	src/middleware/        Request middleware
	src/routes/             API route modules
	supabase/               Database schema
docs/                     Product and engineering documentation
vercel.json               Multi-service Vercel deployment configuration
```

## Quick Start

Install dependencies in each service:

```powershell
Push-Location client; npm install; Pop-Location
Push-Location server; npm install; Pop-Location
```

Start the web client:

```powershell
Push-Location client; npm run dev; Pop-Location
```

Start the API in a second terminal:

```powershell
Push-Location server; npm run dev; Pop-Location
```

The client uses Vite. The API listens on port `5000` by default.

## Environment

Create `server/.env` with:

```text
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
PORT=5000
```

Create `client/.env` with the browser-safe Supabase values:

```text
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

The client uses these values for Supabase Auth. Never place a service role key in the client environment.

Never commit `.env` files, private keys, or service-account credentials.

## Available Screens

| Route | Purpose |
| --- | --- |
| `/` | Skill exchange discovery |
| `/sessions` | Sessions, completed activity, and messages |
| `/wallet` | Time-credit balance and actions |
| `/skill-listing` | Offer a new skill |
| `/verification` | Campus verification and onboarding |
| `/chat` | Mentorship chat and session completion |
| `/login` | Supabase email/password and OAuth login |

## Quality Checks

```powershell
Push-Location client; npm run lint; npm run build; Pop-Location
node --check server/src/index.js
node --check server/src/app.js
node --check server/src/routes/api.js
```

## Documentation

- [Product Requirements](docs/PRD.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API Contract](docs/API.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Decisions](docs/DECISIONS.md)
- [Supabase Setup](docs/SUPABASE.md)