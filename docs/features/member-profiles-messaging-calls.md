# Member Profiles, Direct Messages, and Calls

This guide covers the member discovery and communication flows, their client entry points, and the required Supabase setup.

## User flows

1. **Find a member:** The People tab on Exchange searches signed-in user profiles.
2. **View a profile:** Selecting a person opens `/member-profile?memberId=<uuid>`. The profile shows their display name, verification status, selected profile photo, and published skills.
3. **Message:** The profile's Message action opens `/messages?memberId=<uuid>`. A private thread is created on first contact; subsequent visits reuse it. Direct messages do not require a scheduled session.
4. **Request a call:** The direct-message header's Request video call action creates a ringing call and opens `/call?callId=<uuid>`. The recipient is redirected into the incoming call screen while signed in.
5. **Connect:** Both participants grant camera and microphone access. WebRTC carries media peer-to-peer; a private Supabase Realtime channel exchanges the offer, answer, and ICE candidates.

Query parameters keep profile, conversation, and call links usable after a page refresh. The client also passes History API state for in-app navigation.

## Code ownership

| Responsibility | Location |
| --- | --- |
| People search and profile entry | `client/src/features/exchange/Exchange.jsx` |
| Public member profile | `client/src/features/profile/MemberProfile.jsx` |
| Direct-message conversation | `client/src/features/chat/DirectMessage.jsx` |
| WebRTC call screen and signaling | `client/src/features/call/Call.jsx` |
| Client route selection and incoming-call checks | `client/src/app/App.jsx` |
| Shared controls and navigation | `client/src/shared/components.jsx`, `client/src/shared/lib/navigation.js` |
| Feature styles | `client/src/styles/app.css` |
| New-project database policies | `server/supabase/schema.sql` |
| Existing-project changes | `server/supabase/migrations/20261029_public_profiles_webrtc_calls.sql`, `server/supabase/migrations/20261029_direct_messages.sql` |

## Database setup

For a new project, run [the complete schema](../../server/supabase/schema.sql).

For an existing project, run these migrations in order in the Supabase SQL Editor:

1. [Session credit settlement](../../server/supabase/migrations/20261029_session_credit_settlement.sql)
2. [Public profiles and WebRTC calls](../../server/supabase/migrations/20261029_public_profiles_webrtc_calls.sql)
3. [Direct messages](../../server/supabase/migrations/20261029_direct_messages.sql)

The call migration defines participant-only call rows and private Realtime signaling policies. A database trigger prevents call participants or creation times from changing and enforces allowed status transitions. The direct-message migration restricts thread and message access to the two participants.

Profile photos are stored in the private `files` bucket. Other signed-in users can read only paths currently referenced by a profile's `avatar_path`; verification documents and other private files remain protected by the user's storage folder policy.

## Runtime requirements and limitations

- Users must be signed in to search, view member profiles, message, and call.
- Camera and microphone access requires HTTPS, except on localhost.
- The default call configuration uses a public STUN server. Some NATs, corporate networks, and firewalls require a TURN relay; no TURN credentials are bundled in the client.
- Calls and incoming call status use Supabase Realtime and the Supabase database. The recipient's app checks for incoming calls while open; browser push notifications when the app is closed are not implemented.
- Direct messages refresh from Supabase periodically while the conversation is open. They are not encrypted end-to-end.
- Call and message records are retained in Supabase until deleted by database policy or an administrative process.

## Manual verification

Use two signed-in test accounts in separate browser profiles:

1. Search for the other account in Exchange and open its profile.
2. Confirm profile details and published skills load; confirm the profile has a Message action but no call button.
3. Open Message, send a message, reload the page, and confirm the conversation and message remain.
4. In the direct-message header, request a video call. Confirm the recipient's open app routes to the incoming call screen.
5. Test accept, decline, mute, camera toggle, hang up, unanswered-call timeout, and permission-denied states.
6. Confirm a third account cannot read either participant's DM or call, and cannot use a call ID to join signaling.

Run the client checks with:

```powershell
Push-Location client; npm run lint; npm run build; Pop-Location
```
