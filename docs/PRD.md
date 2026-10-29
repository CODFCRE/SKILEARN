# Product Requirements

## Product Summary

Skilearn enables people in a shared learning community to exchange practical skills using time credits instead of direct payment. The product should make discovery, trust, scheduling, and session completion easy to understand on mobile and desktop.

## Users

- Learners looking for help with a specific skill
- Peer mentors offering time and expertise
- Community members who may switch between learner and mentor roles

## Core Workflows

### Discover a Skill

1. Search the exchange.
2. Filter by category.
3. Review the skill, format, rate, and availability.
4. Choose a session time.

### Offer a Skill

1. Enter a skill title.
2. Select a category and credit rate.
3. Choose online or in-person delivery.
4. Set weekly availability.
5. Publish the listing.

### Establish Trust

1. Submit a verified academic email or student ID.
2. Enter the verification code when email verification is used.
3. Receive access to the community after successful verification.

### Complete a Session

1. Open the session chat.
2. Join the secure video room when available.
3. Communicate and share notes or code.
4. Rate the session.
5. Complete the session and release reserved credits.

## Product Principles

- Do not display seeded customer or mentor identities in the application.
- Keep credit balances and transaction history server-backed.
- Treat verification and session completion as explicit state transitions.
- Make empty, loading, error, and unavailable states visible.
- Keep primary actions usable on narrow screens.

## Current Implementation

The React client currently provides the visual screens and local interaction states. The server provides the initial Express and Supabase foundation. Marketplace records, account balances, verification, booking, and chat persistence still need to be connected to authenticated backend data.

## Success Criteria

- A user can understand the next action on every screen.
- A new user can verify their community membership without exposing private data.
- A user can publish or discover a skill from a mobile viewport.
- Credit changes are auditable and never calculated only in the browser.
- API failures produce clear, recoverable UI states.