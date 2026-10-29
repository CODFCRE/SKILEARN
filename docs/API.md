# API Contract

The API is mounted at `/api` by `server/src/index.js`.

## Authentication

Protected routes expect:

```text
Authorization: Bearer <access-token>
```

The server authentication middleware validates the token before the route handler runs.

## Endpoints

### `GET /api/health`

Checks API reachability and performs a lightweight Supabase query.

Success response:

```json
{
  "message": "API and Supabase are healthy.",
  "supabase": "connected"
}
```

### `GET /api/items`

Returns items belonging to the authenticated user.

Response shape:

```json
{
  "data": []
}
```

The current implementation uses the authenticated user's ID as the `user_id` filter.

### `GET /api/files/*path`

Downloads an authenticated file from the `files` Supabase storage bucket. The route returns the file as an attachment and responds with `404` when the object does not exist.

## Error Contract

Errors use a JSON object with an `error` field:

```json
{
  "error": "Internal server error."
}
```

The server should preserve this shape as new routes are added.

## Planned API Areas

- Skill listings and category filtering
- Skill availability and booking
- Credit ledger and escrow transitions
- Verification submissions and status
- Session messages and session completion