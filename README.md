# Skilearn

Skilearn is a peer-to-peer skill exchange application. Users can discover skills, offer their own expertise, schedule sessions, exchange time credits, verify campus membership, and communicate during mentorship sessions.

## Repository Layout

```text
client/                  React + Vite web application
server/                  Express API and Supabase integration
docs/                    Product and engineering documentation
vercel.json              Multi-service Vercel deployment configuration
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

## Quality Checks

```powershell
Push-Location client; npm run lint; npm run build; Pop-Location
node --check server/src/index.js
node --check server/src/routes/api.js
```

## Documentation

- [Product Requirements](docs/PRD.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API Contract](docs/API.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Decisions](docs/DECISIONS.md)