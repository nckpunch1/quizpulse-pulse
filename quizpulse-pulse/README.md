# QuizPulse Pulse — display app

Read-only display surface for the pulse mini-games at QuizPulse trivia nights.
Sessions are created and driven from the **admin-host** Host Console, which
writes to the RTDB and links here with a session ID. This app subscribes and
renders; it makes no writes.

## Routes

| Route | Surface |
| --- | --- |
| `/display/:id` | Venue projector (fullscreen, HDMI) |
| `/play/:id` | Player phones (tap theater, no submission) |
| `/leaderboard/:id` | Leaderboard projection |

## Develop

```
npm install
npm run dev
```

Requires the `VITE_FIREBASE_*` env vars in `.env.local` (see `src/lib/firebase.js`).

## Follow-ups

- **pulseSessions cleanup** — nothing ever deletes `pulseSessions`, so every
  trivia night appends forever. Belongs in **admin-host** (this app has no
  writes): a scheduled job or a manual admin action pruning sessions older
  than ~30 days.
- **Display.jsx decomposition** — ~1,500 lines mixing animation CSS, audio
  management, and six game renderers in one file. Split when next touched;
  deliberately not mixed into the write-path-removal commit.
