# Pulse regression tests

Run `npm test` for a single run or `npm run test:watch` while editing.

- `usePulseSession.test.jsx`: actual hook with mocked RTDB subscriptions; session mapping, legacy fields, errors/recovery, reconnects and listener cleanup.
- `Play.test.jsx`: actual phone screen with a mocked session feed; team selection, removed selections, draw feedback, host winner, paper mini-game viewing, reconnects and errors.
- `useClipPreloader.test.jsx`: actual hook with DOM audio doubles and fake timers; download concurrency, stalled loads, same-pack reuse, resource cleanup and isolated audio-unlock failures.

No Firebase project, credentials, network media or real audio playback are used. These tests do not exercise deployed RTDB rules, browser autoplay restrictions, or the complete venue Display screen. Test those separately before a live release. Phone taps are local feedback, not game entries or score writes; the Host Console owns game outcomes.
