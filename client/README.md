# Skilearn Client

The client is the React and Vite web application for Skilearn.

## Commands

```powershell
npm install
npm run dev
npm run lint
npm run build
npm run preview
```

## Source Structure

```text
src/
  App.jsx       Route switch, shared UI primitives, and screens
  App.css       Design tokens, components, and responsive layout rules
  index.css     Global font and browser defaults
  main.jsx      React application entry point
public/         Static design references and public assets
```

## Routes

- `/`: Exchange discovery
- `/sessions`: Sessions and messages
- `/wallet`: Credits and quick actions
- `/skill-listing`: Offer a new skill
- `/verification`: Campus verification
- `/chat`: Mentorship chat

The current screens use empty states where server-backed records will eventually be loaded. Do not add real customer, mentor, or credential data directly to the client source.

See the repository [development guide](../docs/DEVELOPMENT.md) for workflow conventions.
