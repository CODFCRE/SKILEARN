# Architecture Decisions

## Use Separate Client and Server Services

The repository keeps the Vite client and Express API in separate directories and deploys them as separate Vercel services. This preserves independent build boundaries while allowing one public domain through path-based rewrites.

## Use Supabase for Persistence and Storage

The server already uses Supabase for database queries and file storage. Keeping these operations behind Express allows authentication and authorization checks to remain on the server.



## Keep Navigation Lightweight for Now

The current client uses the History API and `popstate` rather than adding a routing dependency. A dedicated router can be introduced when route nesting, URL parameters, or navigation guards become substantial enough to justify it.