# Skilearn: A Beginner-Friendly App and Code Guide

This guide explains the Skilearn idea shown in the six-slide Code4Care presentation and how that idea maps to the code in this repository. It is written for someone who is new to the app and to web application code.

> **Important: proposal versus implementation.** The presentation describes the intended product and, in places, a proposed technical stack. The repository is the source of truth for what the current application actually does. This guide calls out the differences rather than treating every slide promise as already finished.

## 1. Skilearn in one minute

Skilearn is a campus skill-sharing marketplace. A member can offer something they know, such as Python or guitar, and another member can request a session. The product uses **time credits** instead of cash: the concept is that teaching earns credits and learning spends credits. The app also provides campus-verification submissions, profiles, session chat, private messages, and video calls.

The project is split into three main parts:

1. **The client** is the website people see and interact with. It is built with React and Vite.
2. **The API server** is a small Express service for HTTP endpoints and authenticated file downloads.
3. **Supabase** provides the database, sign-in, private file storage, row-level security, and realtime signaling.

Today, many screens talk directly from the browser to Supabase using the signed-in user's session. The Express service exists alongside that client integration, but it does not yet contain a complete REST API for all of the marketplace features.

## 2. How the slides connect to the app

### Slide 1 - The problem

The presentation says that students have useful skills but cannot easily find one another, that paid learning can be inaccessible, and that informal group chats do not provide structured scheduling or trust.

Skilearn's answer in the code is a shared exchange page, member profiles, skill listings, session requests, and messaging. The visible exchange is at `/`; its screen is implemented in [Exchange.jsx](../client/src/features/exchange/Exchange.jsx). It loads published skills and member profiles for signed-in users and lets them search and filter the results.

### Slide 2 - Time credits and the exchange loop

The proposed product loop is:

1. A member publishes a skill.
2. Another member finds it and requests a time.
3. The two people meet and confirm the session.
4. The learner's credits are spent and the mentor's credits are earned.

The code supports publishing a skill in [SkillListing.jsx](../client/src/features/skills/SkillListing.jsx), requesting a session in [SkillDetail.jsx](../client/src/features/skills/SkillDetail.jsx), and confirming completion from the session chat in [Chat.jsx](../client/src/features/chat/Chat.jsx). The database function `complete_session` performs the paired credit transfer only after both participants have confirmed.

There are two important differences from the slide's simplified description:

- The app stores a requested session and its proposed credit amount, but the inspected screens do not provide a complete mentor-acceptance and calendar-conflict workflow.
- Despite the `credits_reserved` field name, booking does not immediately subtract credits into an escrow account. The ledger entries are written when both parties confirm completion. The database checks that the learner has enough credits at settlement time.

### Slide 3 - Product pillars

| Pillar in the slide | What the repository currently provides |
| --- | --- |
| Registration and verification | Email one-time-code sign-in and Google sign-in are in [Login.jsx](../client/src/features/auth/Login.jsx). A separate screen in [Verification.jsx](../client/src/features/verification/Verification.jsx) lets signed-in users submit an academic email or student ID for review. |
| Listing, search, and matching | Published skills can be searched and filtered by category in [Exchange.jsx](../client/src/features/exchange/Exchange.jsx). The current search is a simple text match; it is not an AI matching service. |
| Booking and scheduling | A learner can request a future one-hour slot from [SkillDetail.jsx](../client/src/features/skills/SkillDetail.jsx). The listing form can save weekly availability. Automatic reminders and full calendar conflict handling are not present in the inspected implementation. |
| Time-credit system | The wallet reads a ledger-derived balance and recent entries in [Wallet.jsx](../client/src/features/wallet/Wallet.jsx). The database contains a guarded completion function for paired settlement. |
| Confirmation and feedback | Both participants can confirm completion in the session chat. A participant can submit a 1-5 star rating after settlement. A full moderated review workflow is not present in the current screen. |

### Slide 4 - Technical approach and stack

The slide mentions a React/TypeScript client, Tailwind, Framer Motion, Zustand, React Router, an Express/TypeScript API, Multer, offline storage, and a PWA. **Those are not the current repository stack.**

What the code actually uses:

- **Client:** React with JavaScript/JSX, Vite, React hooks for screen state, and ordinary CSS. Navigation is a small History API helper rather than React Router.
- **Server:** Express with CommonJS JavaScript, plus Helmet and CORS middleware.
- **Data and identity:** Supabase PostgreSQL, Supabase Auth, Supabase Storage, and row-level security (RLS).
- **Realtime and video:** Supabase Realtime is used for online presence and private WebRTC signaling. WebRTC carries the audio/video stream between browsers.

No evidence of TypeScript, Tailwind, Framer Motion, Zustand, React Router, Multer, IndexedDB offline caching, or a PWA setup was found in the current package manifests and application source. Treat those slide items as proposed or presentation-level architecture, not as installed or working features in this codebase.

### Slide 5 - Data model and honest ledger

The database schema is in [schema.sql](../server/supabase/schema.sql). Its main tables are:

| Table | Plain-language purpose |
| --- | --- |
| `profiles` | Public-facing member details linked to a Supabase Auth user. |
| `verification_submissions` | A member's submitted verification method and review status. |
| `skills` | A member's skill listing, category, rate, format, and publication status. |
| `skill_availability` | Weekly availability attached to a skill listing. |
| `sessions` | The learner, mentor, requested time, status, and agreed credit amount for a session. |
| `session_messages` | Messages that belong to a scheduled session. |
| `direct_message_threads` and `direct_messages` | Private member-to-member conversations that do not require a scheduled session. |
| `call_sessions` | The participants and status of a direct video call. |
| `credit_ledger` | Append-only credit entries: a positive amount adds credit and a negative amount spends credit. |
| `credit_balances` | A database view that calculates each balance by summing that member's ledger entries. |
| `session_ratings` | A participant's star rating for the other participant after a session. |
| `items` | A small compatibility table used by the current API health and example-items endpoints. |

The ledger is important because a balance is not treated as an editable number. The database computes it from transactions. A database function records both sides of a completed session together: the learner gets a negative ledger entry and the mentor gets a matching positive entry. A database trigger prevents a session from being marked completed unless both completion timestamps and the matching ledger entries exist.

There is a five-credit welcome entry when a profile is created. Also, a listing can specify its own credit rate; the code does not currently enforce the presentation's exact rule of one credit per hour. This should be kept in mind when reading slide 2's example.

### Slide 6 - Impact and roadmap

The impact goals are accessibility, fair exchange, visible student talent, and trust. Those are product goals, not measurements produced by the code.

The slide's phases also include features such as notifications, wishlists, group workshops, badges, leaderboards, AI matching, cross-campus exchange, and mobile apps. These should be considered roadmap ideas unless a corresponding implementation is added. The repository's current implemented features are described in the feature tour below.

## 3. What a user can do today

### Sign in

At `/login`, a user can request a one-time email code, enter the code, or start Google OAuth. Supabase Auth handles identity and returns a user session. The login screen navigates to the profile after a successful sign-in. Campus verification is a **separate** process: the login form itself does not prove that the address belongs to a particular campus or block non-campus domains.

### Discover skills and people

At `/`, the user can switch between skill and people search. Skill results come from published database rows, categories are built from the returned results, and text filtering happens in the browser. People search is based on member profiles. A member can open a published listing or another member's profile.

### Offer a skill

At `/skill-listing`, a signed-in user enters a title, description, category, hourly credit rate, format, and optional days and times. The client inserts the skill and then inserts its availability rows. A listing is saved with the `published` status. If the second insert fails, the screen reports that the listing itself may already have been saved.

### Request a session

At `/skill-detail`, the app loads the selected listing, its mentor, and its weekly availability. A signed-in learner chooses a future date and time. The client inserts a one-hour `requested` session using the listing's credit rate. Database constraints and a trigger check that the listing is published, the learner is the signed-in user, and the proposed credit amount matches the listing.

### Track sessions and credits

At `/sessions`, a member sees upcoming sessions, completed sessions, or sessions with messages. A session card opens its chat. At `/wallet`, the app shows the member's calculated balance, recent ledger entries, rating average, published listing count, and monthly completed-session count.

### Chat, completion, and rating

At `/chat`, the two participants can read and send messages for their session. Each person has a completion action. The first confirmation is recorded but does not yet transfer credits. When the second person confirms, the database function checks the available learner balance and writes both ledger entries as one database operation; the session then becomes completed. A participant may then submit a star rating.

### Profiles, direct messages, and video

At `/member-profile?memberId=...`, a user can see a member's display name, verification indicator, and published skills. At `/messages?memberId=...`, the app opens or creates a private conversation and refreshes the message list periodically. A direct message thread also has a video-call action.

At `/call?callId=...`, the participants can accept, decline, mute, turn off their camera, or end a call. WebRTC negotiates a peer-to-peer media connection; a private Supabase Realtime channel passes setup messages between participants. The current call configuration uses a public STUN server and does not include TURN credentials, so some networks may not connect. Camera and microphone access normally requires HTTPS (localhost is an exception). Incoming calls are checked while the app is open; browser push notifications when it is closed are not implemented.

## 4. How the codebase is organized

```text
client/                         Website users interact with
  src/main.jsx                  Starts the React application
  src/app/App.jsx               Chooses which screen to show for a URL
  src/features/                 Product screens grouped by feature
  src/shared/                   Reusable UI, navigation, theme, Supabase setup
  src/styles/                   Global and component styles
  public/                       Static browser assets
server/                         Express API service
  src/index.js                  Starts the HTTP server
  src/app.js                    Middleware, routes, and error responses
  src/config/supabase.js        Creates the server's Supabase client
  src/middleware/auth.js        Checks bearer tokens for protected API routes
  src/routes/api.js             API endpoint definitions
  supabase/schema.sql           Database schema, functions, and access policies
  supabase/migrations/          Database changes for existing projects
docs/                           Product, setup, deployment, and feature guides
docker-compose.yml              Local multi-container setup
vercel.json                     Vercel client/API routing and deployment setup
```

### What happens when the page starts

1. The browser loads `client/index.html`.
2. [main.jsx](../client/src/main.jsx) finds the HTML element named `root` and mounts React there.
3. [App.jsx](../client/src/app/App.jsx) reads the current URL path and chooses a screen.
4. A screen uses React state to keep track of input, loading, errors, and data. Its effects load data from Supabase when needed.
5. Shared controls and styles keep the screens visually consistent.

### Routes and navigation

`App.jsx` is a simple route switch. It listens for the browser's `popstate` event so the back and forward buttons update the selected screen. [navigation.js](../client/src/shared/lib/navigation.js) wraps `history.pushState` and dispatches that event for in-app navigation.

Some screens pass an ID in browser history state for in-app navigation, and also read a query parameter so a copied or refreshed profile/message/call link can still identify its target. The app does not use a full routing library.

### Supabase from the browser

[supabase.js](../client/src/shared/lib/supabase.js) reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. If either is missing, it exports `null`, and connected screens can show a configuration error instead of making a request. The browser uses the public anon key with the signed-in user's session; it must never contain a Supabase service-role key.

The browser's direct database access is restricted by RLS policies in the schema. For example, a member can read their own verification submissions, and session messages are available only to participants of that session. The database is the security boundary, not just the fact that a button is hidden in the interface.

### The Express API

[index.js](../server/src/index.js) loads environment variables and starts Express on the configured port (5000 by default). [app.js](../server/src/app.js) installs JSON parsing, Helmet security headers, CORS, the `/api` route group, and JSON not-found/error responses. [auth.js](../server/src/middleware/auth.js) checks a bearer token before a protected route proceeds.

The current [api.js](../server/src/routes/api.js) contains:

- `GET /api/health`, which checks the API and performs a lightweight Supabase query.
- `GET /api/items`, an authenticated example that returns rows for the current user.
- `GET /api/files/*path`, an authenticated file download.

These are not yet a full marketplace API for skills, booking, wallet, or verification. Many current feature screens query Supabase directly.

## 5. A beginner's code-reading guide

The React screens follow a common pattern:

1. `useState` creates values the screen needs, such as `loading`, `error`, or the typed message.
2. `useEffect` runs work when the screen appears or when an ID changes. It requests data and fills state.
3. An event handler runs when the user submits a form or presses a button.
4. JSX describes what the browser should show. Expressions like `{loading ? ... : ...}` choose the loading or normal view.
5. Supabase query errors are checked and shown; database policies determine whether a query is allowed.

For example, the exchange loads published `skills` rows, then loads profiles for the owners. It combines the results so each skill can display a mentor name. The search box changes React state; the rendered list is filtered from that state. This is a common client pattern: **load data -> store it in state -> render it -> update state when the user interacts**.

In the server, Express uses middleware to process each request in order. A request to `/api/items` first passes through the app's shared middleware, then the route's `authenticate` check, then the route handler. The handler queries Supabase and responds with JSON. If an operation throws an error, `next(error)` passes it to the shared error handler.

## 6. Database relationships and trust

Think of the database tables as connected records:

- A Supabase Auth user has one `profiles` row.
- A profile can own many `skills`; a skill can have many `skill_availability` slots.
- A skill can have many `sessions`. Every session names one learner and one mentor.
- A session can have many `session_messages` and participant `session_ratings`.
- A completed session has paired `credit_ledger` entries, one debit and one credit.
- Two users can share one direct-message thread with many messages.
- A call row names a caller and recipient; RLS limits call records and signaling to those participants.

RLS means **Row-Level Security**. Instead of trusting every client to filter rows correctly, the database checks the signed-in identity (`auth.uid()`) against each requested row. SQL constraints and triggers add rules such as allowed status values, valid participant relationships, and session settlement requirements.

The schema also creates private storage buckets for files and student-verification documents. Verification documents are stored separately from profile photos. A verification submission is recorded as pending for review; the repository does not show a complete reviewer/admin interface or automatic approval process.

## 7. What is complete, partial, or planned

### Implemented in this repository

- React/Vite web app and screen navigation
- Email one-time-code and Google sign-in flows through Supabase Auth
- Skill discovery, member search, skill publishing, and session requests
- Verification submission records and private student-ID uploads
- Session list, session chat, two-party completion confirmation, ledger settlement, and star ratings
- Member profiles, private direct messages, online presence, and browser-based WebRTC calls
- Express health, example-items, and file-download routes
- Supabase schema, RLS policies, SQL functions, and migrations

### Present but with important limitations

- Verification accepts a submitted campus email or student ID, but the code does not enforce campus-only sign-up or provide the reviewer workflow that would approve/reject submissions.
- A session request can be created, but the inspected UI does not provide a full mentor approval, calendar-conflict, cancellation, reminder, or rescheduling flow.
- Weekly availability can be saved and displayed; the booking form does not itself enforce that a requested time falls within an available slot.
- Credit settlement is protected by the database and occurs at dual confirmation, but credit rates can be chosen per listing and funds are not deducted at booking time.
- Direct messages refresh by polling; they are not end-to-end encrypted.
- Video calls depend on browser permissions, network conditions, Supabase Realtime, and a public STUN server. No TURN relay is configured.

### Not implemented just because it appears on the slides

The presentation mentions automatic reminders, moderation before publishing, push notifications, wishlists, group workshops, badges, leaderboards, AI matching, cross-campus exchange, native mobile-specific features, and offline/PWA support. The Android app embeds the shared web client; it does not add offline support or native-only features.

## 8. Running and checking the project

The full setup instructions live in [DEVELOPMENT.md](./DEVELOPMENT.md), [SUPABASE.md](./SUPABASE.md), and [DEPLOYMENT.md](./DEPLOYMENT.md). In brief:

1. Install Node.js and npm, and create/configure a Supabase project.
2. Configure the client with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Configure the server with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and optionally `PORT`.
4. Install dependencies separately in `client/` and `server/`.
5. Start the Vite client and Express server in separate terminals, or use the documented Docker setup.
6. Configure Supabase Auth redirect URLs and providers for the sign-in methods you intend to use.

Useful checks from the repository root:

```powershell
Push-Location client; npm run lint; npm run build; Pop-Location
node --check server/src/index.js
node --check server/src/app.js
node --check server/src/routes/api.js
```

Never put private keys or service-role credentials in browser variables or commit them to the repository.

## 9. Where to learn more

- [Product requirements](./PRD.md) explain the intended users and workflows.
- [Architecture](./ARCHITECTURE.md) describes the client/server/database boundaries.
- [API contract](./API.md) documents the current Express endpoints.
- [Supabase setup](./SUPABASE.md) covers database and authentication configuration.
- [Development guide](./DEVELOPMENT.md) explains local setup and quality checks.
- [Deployment guide](./DEPLOYMENT.md) covers Docker and Vercel.
- [Member profiles, messaging, and calls](./features/member-profiles-messaging-calls.md) describes the communication flows and their limitations.
- The six-slide Code4Care presentation supplied for this task is the product reference.

---

**In one sentence:** Skilearn is a React web app for discovering and sharing campus skills, backed by Supabase identity and data policies, with a small Express API and a database-controlled time-credit settlement flow.
