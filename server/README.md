# Skilearn API

The server is the Express API for authentication-aware data access, Supabase queries, and file downloads.

## Commands

```powershell
npm install
npm run dev
npm start
```

## Environment

Create `server/.env` locally:

```text
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
PORT=5000
```

The Supabase service role key must never be exposed to the client or committed to the repository.

## Source Structure

```text
src/
  index.js              Express application and middleware
  config/supabase.js    Supabase client configuration
  middleware/auth.js    Bearer-token authentication
  routes/api.js         API routes
```

## Current Routes

- `GET /api/health`
- `GET /api/items` with authentication
- `GET /api/files/*path` with authentication

See the repository [API contract](../docs/API.md) and [architecture guide](../docs/ARCHITECTURE.md).