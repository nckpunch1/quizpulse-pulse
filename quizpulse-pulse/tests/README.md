# Pulse regression tests

Run `npm test` for a single run or `npm run test:watch` while editing.
Run `npm run test:coverage` for coverage checks and an HTML report at `coverage/index.html` (ignored by Git).

- `usePulseSession.test.jsx`: actual hook with mocked RTDB subscriptions; session mapping, legacy fields, errors/recovery, reconnects and listener cleanup.
- `Play.test.jsx`: actual phone screen with a mocked session feed; team selection, removed selections, draw feedback, host winner, paper mini-game viewing, reconnects and errors.
- `useClipPreloader.test.jsx`: actual hook with DOM audio doubles and fake timers; download concurrency, stalled loads, same-pack reuse, resource cleanup and isolated audio-unlock failures.
- `Display.test.jsx`: real Display and real preloader, mocked session/RTDB feeds and browser media methods. Covers explicit host title reveal, single-channel music/tiebreaker playback, replay deduplication, locked audio, fallback and stale rejection races, prize audio continuity, reconnect overlays across game screens, Shock completion/audio outcomes, server-adjusted countdown expiry/cleanup, and host-selected winner animation.
- `ErrorBoundary.test.jsx`: normal rendering and containment of a child render failure with a refresh affordance and no internal error disclosure.

The preloader suite also covers restarting mid-download (remaining clips must still start), obsolete media events after a pack switch, failed-media retry on a new round, duplicate completion events, buffered suspend/timeout handling, and unchanged URL arrays from fresh RTDB payloads.

## Measured baseline — 22 September 2026

57 tests pass, up from 21. Using the same V8 include set before and after the new tests:

| Scope | Before line coverage | After line coverage | After branch coverage |
| --- | --- | --- | --- |
| Screens, hooks and error boundary combined | 25.04% | 77.78% | 84.26% |
| Display | 0% | 72.41% | 83.63% |
| Play | 82.80% | 82.80% | 73.46% |
| Hooks combined | 100% | 100% | 91.57% |

Coverage includes both route screens, both hooks and ErrorBoundary, including untested lines. App routing, entry points, Firebase initialization and CSS are outside the denominator. The combined branch baseline is not a comparable before/after measure because V8 discovers additional branches when the previously unexecuted Display is exercised. Line percentages in this JSX-heavy file do not imply equivalent coverage of all behaviours. Floors in `vitest.config.js` protect this scoped baseline; do not lower them merely to pass a regression.

No Firebase project, credentials, network media or real audio playback are used. These tests do not exercise deployed RTDB rules, browser autoplay restrictions, HDMI/audio hardware, CSS animations or the full venue workflow. Test those separately before a live release. The refresh button's actual browser reload is not exercised. Phone taps are local feedback, not game entries or score writes; the Host Console owns game outcomes.

## Follow-up hardening pass

76 tests pass. Scoped line coverage increased from 77.78% to 94.80%, branch coverage to 89.54%, and function coverage to 95.08%. Display now has 92.65% line coverage; Play has 100%.

New regressions exercise BlitzPulse phase transitions, Prize Drop resets and timer cancellation, hidden team-draw slots until reveal, legacy mini-game dispatch, media preload failures, phone draw resets and error recovery. Coverage floors now protect these gains.

Remaining gaps include browser smoke tests for routing, real autoplay/unlock behaviour, hardware audio, and deployed rules. Mocked session transitions do not prove server authorization or timing across real clients.
