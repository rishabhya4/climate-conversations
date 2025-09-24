# Weather Agent Chat

React + Vite + TypeScript chat UI for a streaming Weather Agent.

## Getting Started

```sh
npm install
npm run dev
```

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Local Setup (Assignment)

### 1) Install and Run

```sh
npm install
npm run dev
```

### 2) Environment Variables

Create a `.env` file at the project root using `.env.example` as a template:

```env
VITE_THREAD_ID=YOUR_COLLEGE_ROLL_NUMBER
```

- Set `VITE_THREAD_ID` to your actual college roll number as required by the assignment. If unset, the app defaults to `2`.

### 3) Weather Agent Streaming API

The app sends chat messages to the Mastra Weather Agent streaming endpoint and renders tokens incrementally in the UI.

- Endpoint: `https://millions-screeching-vultur.mastra.cloud/api/agents/weatherAgent/stream`
- Method: `POST`
- Headers:
  - `Content-Type: application/json`
  - `x-mastra-dev-playground: true`

Request body example:

```json
{
  "messages": [
    { "role": "user", "content": "Your message here" }
  ],
  "runId": "weatherAgent",
  "maxRetries": 2,
  "maxSteps": 5,
  "temperature": 0.5,
  "topP": 1,
  "runtimeContext": {},
  "threadId": "YOUR_COLLEGE_ROLL_NUMBER",
  "resourceId": "weatherAgent"
}
```

The UI shows:
- Right-aligned user messages, left-aligned agent messages
- Auto-scroll to the latest message
- Loading/typing indicator while streaming
- Error banner with dismiss
- Clear chat button

### 4) Keyboard & UX
- Enter to send, Shift+Enter for newline
- Input disabled while awaiting a response

### 5) Notes
- No API key is required for this streaming endpoint.
- If you need to test with a different `threadId` quickly, set `VITE_THREAD_ID` in `.env` and restart the dev server.

## Features

- Real-time streaming responses from Mastra Weather Agent
- Enter to send, Shift+Enter for newline
- Distinct bubbles for user (right) and agent (left), with timestamps
- Auto-scroll to the latest message
- Error banner with dismiss
- Clear chat for the current thread
- Thread selector in header (uses your roll number as `threadId`) and per-thread history
- LocalStorage persistence per `threadId`
- Light/Dark theme toggle (saved in localStorage)
- Quick prompt buttons for Indian cities (Mumbai, Delhi, Bengaluru, Kolkata)
- Export current thread chat as JSON
- Re-send last user message shortcut

## Thread ID (Conversation Context)

- The `threadId` identifies a conversation thread (assignment requires your college roll number).
- Where it’s used:
  - Sent in each API request so the agent keeps context per thread
  - Used as the key for saving chat history in the browser (localStorage)
- How to set:
  - Header input: type your roll number to switch immediately
  - `.env`: set `VITE_THREAD_ID=YOUR_ROLL_NUMBER` to set a default

## Branding and Meta

- Removed Lovable branding and social meta; replaced preview image with local `/placeholder.svg`.
- Removed `public/favicon.ico`. To add your own, place a new favicon in `public/` and add the appropriate `<link rel="icon" ...>` tag in `index.html`.

## Documentation

### Brief explanation of the approach

- UI is built with React + Vite + TypeScript and shadcn/ui components for fast, consistent styling.
- Core chat logic lives in a custom hook (`useWeatherChat`) that:
  - Accepts a `threadId`, manages messages, loading, and errors
  - Sends user messages to the Mastra Weather Agent streaming endpoint
  - Incrementally parses stream chunks to display the assistant’s reply in real time
  - Persists messages per thread to `localStorage`
- The `WeatherChat` component renders the header (thread selector, theme toggle, export, re-send), message list, error banner, and input area.
- Architecture keeps data flow simple: `WeatherChat` → `useWeatherChat` → streaming API.

### Assumptions made

- The streaming endpoint is available without authentication and responds with either NDJSON/SSE-like lines or `index:"token"` lines; parser tolerates both and ignores meta lines (`f:`, `e:`, `d:`).
- `threadId` is sufficient for maintaining conversation context server-side; no server session management required.
- Browser `localStorage` is acceptable for client-side history persistence (non-sensitive data).
- No need for SSR/Next.js features for the assignment scope.

### Known limitations / Areas for improvement

- Parser: While robust for common formats, if the stream schema changes significantly, the parser may need adjustment.
- No message search or reactions yet (listed as bonus features).
- No unit tests included; could add Jest + React Testing Library for hook and component tests.
- Accessibility can be enhanced with ARIA labels in several components and better focus management.
- No offline/PWA support; could add a service worker and caching for assets/history.
- No server-side proxy; all requests go directly from the browser to the Mastra endpoint.
- Multi-thread UI is a single input; a richer threads sidebar/list could improve discoverability.
