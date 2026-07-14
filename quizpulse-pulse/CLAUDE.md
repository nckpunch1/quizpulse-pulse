# QuizPulse Pulse Button — Claude Code Context

## What this app is

A real-time **display surface** for the mini-games that run alongside QuizPulse trivia nights. It is **read-only**: every session is created and driven from the admin-host repo's Host Console (`LiveGameController` → `pulseService`), which writes to this app's RTDB and links here with an explicit session ID. This app subscribes and renders — it never writes. Two audience surfaces: Player screen (phones, pure theater — taps are local-only) and Display screen (venue projector via HDMI), plus a leaderboard display.

## Stack

- React + Vite
- Firebase Realtime Database (real-time sync across all screens; **subscriptions only, no writes**)
- Hosted on Vercel

## Project structure

- `src/routes/Play.jsx` — player screen (no auth, phone-optimised; tap button is local theater, nothing is submitted)
- `src/routes/Display.jsx` — fullscreen venue presentation screen
- `src/pages/LeaderboardDisplay.jsx` — leaderboard projection
- `src/hooks/usePulseSession.js` — all Firebase subscriptions
- `src/lib/firebase.js` — Firebase config (reads from env vars)

## Routing

- `/` → landing note (this app has no admin; open screens from the Host Console)
- `/play/:id` → player screen
- `/display/:id` → venue display screen
- `/leaderboard/:id` → leaderboard display

## Data model (Firebase Realtime Database)

```
pulseSessions/{sessionId}/
  state: 'setup' | 'active' | 'game_active' | 'revealing' | 'revealed'
  winnerId: null | string
  winnerName: null | string
  currentGame: null | { type, phase, ... }   # written by admin-host
  teams/
    {teamId}/
      name: string
      pulseScore: 0 | 1 | 2 | 3 | 4
```

All of it is written by admin-host's `pulseService`; the authoritative schema lives in admin-host's `DATAMODEL.md` ("Pulse Display RTDB"). Winner selection (including the pulse-score weighted draw) happens in admin-host, not here.

## Session flow

1. Host sets up teams and pulse scores in the Host Console (admin-host)
2. Host opens `/display/:id` on the laptop, drags to the HDMI screen
3. Players open `/play/:id` on phones (shared via QR on the display screen)
4. Host triggers games from the Host Console → this app's screens react in real time
5. Host reveals / confirms / resets from the Host Console — **all state transitions are written by admin-host**; this app renders whatever RTDB currently says

## Rules — do not break these

- **Never add a write to this app.** It is a pure subscriber. The deployed RTDB rules require `auth != null` for writes and this app has no auth — any write will fail. Game control belongs in admin-host.
- Never add user authentication or login flows
- Never create a custom backend — Firebase is the entire backend
- Player screen must work on mobile with no setup, just open the link
- Display screen must work fullscreen (F11) with no UI chrome
- This app must never own a state transition (e.g. via `setTimeout`) — animation timing off payload timestamps is fine, state changes are not
- All Firebase subscriptions go through `usePulseSession.js` — never call Firebase directly in components

## Environment variables needed

`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`

## Follow-ups (not done, tracked here)

- **pulseSessions cleanup** — nothing ever deletes `pulseSessions`; every trivia night appends forever. Belongs in **admin-host** (this app has no writes): a scheduled job or manual admin action pruning sessions older than ~30 days.
- **Display.jsx decomposition** — ~1,500 lines mixing animation CSS, audio management, and six game renderers; split when next touched.
