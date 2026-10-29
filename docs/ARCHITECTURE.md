# Architecture

## System Context

```mermaid
flowchart LR
    Browser[Web Browser] --> Client[React + Vite Client]
    Client -->|/api/*| Server[Express API]
    Server --> Supabase[(Supabase Database and Storage)]
    Client --> Fonts[Google Fonts]
```

## Components

### Client

Location: `client/`

- React 19 renders the application screens.
- Vite provides local development and production bundling.
- `client/src/main.jsx` mounts the React application.
- `client/src/app/App.jsx` owns the route switch.
- `client/src/features/` contains route screens grouped by product area.
- `client/src/shared/components.jsx` contains reusable layout and UI primitives.
- `client/src/shared/lib/` contains navigation and service integrations.
- `client/src/styles/` contains global and application styles.
- Client-side routing currently uses the History API and `popstate`.
- Feature routes include member profiles (`/member-profile`), direct messages (`/messages`), and WebRTC calls (`/call`).
- The browser uses Supabase Auth and the anon key for user-scoped data, protected by RLS. Realtime Presence and call signaling use Supabase Realtime.

### Server

Location: `server/`

- `server/src/index.js` loads environment values and starts the HTTP listener.
- `server/src/app.js` configures Express middleware, routes, and error handling.
- `server/src/config/` owns service configuration.
- `server/src/middleware/` owns request middleware such as authentication.
- `server/src/routes/` owns the HTTP API endpoints.
- `server/supabase/` contains the database schema.
- Express exposes the `/api` route group.
- Helmet provides baseline security headers.
- CORS is enabled for client access.
- Supabase is the persistence and storage provider.
- Authentication middleware validates bearer tokens before protected routes.

### Deployment

`vercel.json` defines two Vercel services:

- `client`: the public Vite application
- `server`: the Express API, exposed through `/api/*`

There are currently no service bindings because the client and server do not make internal service-to-service requests through private hostnames.

## Request Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant A as Express API
    participant S as Supabase

    U->>C: Open application route
    C->>A: Request /api resource with bearer token
    A->>A: Authenticate request
    A->>S: Query database or storage
    S-->>A: Result
    A-->>C: JSON or file response
    C-->>U: Render state
```

## Boundaries

- The client owns presentation, input state, navigation, and user-scoped Supabase requests.
- Supabase RLS and database functions enforce authorization and data invariants for direct client access. The Express API owns the authorization and validation for its `/api/*` endpoints.
- Supabase service-role credentials remain server-only. The browser may receive the project URL and anon key; it must never receive a service-role key.
- Any future client-to-service URL should use a public `/api` path or a declared Vercel binding, never a hardcoded localhost or deployment hostname.

See [Member Profiles, Messaging, and Calls](features/member-profiles-messaging-calls.md) for the communication feature flows, policies, and verification steps.