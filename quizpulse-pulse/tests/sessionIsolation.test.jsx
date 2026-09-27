// A Brisbane and a Melbourne game live at once: every screen in this app takes its
// session from its own URL and subscribes only to that session's nodes, so one
// host's writes never reach (or switch) the other venue's screen.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { cwd } from 'node:process'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
const rtdb = vi.hoisted(() => ({ listeners: [], paths: [] }))
vi.mock('@/lib/firebase', () => ({ db: {} }))
vi.mock('firebase/database', () => ({
  ref: (_db, path) => { rtdb.paths.push(path); return path },
  onValue: (path, next) => {
    const listener = { path, next }
    rtdb.listeners.push(listener)
    return () => { rtdb.listeners = rtdb.listeners.filter(l => l !== listener) }
  },
}))
import { usePulseSession } from '../src/hooks/usePulseSession'

// The host writes a node: every listener on exactly that path hears it.
const hostWrites = (path, data) => act(() => { for (const l of rtdb.listeners) if (l.path === path) l.next({ val: () => data }) })
beforeEach(() => { rtdb.listeners = []; rtdb.paths = [] })

it('two screens on two sessions each follow only their own session through a whole game', () => {
  const mel = renderHook(() => usePulseSession('mel-night'))
  const bne = renderHook(() => usePulseSession('bne-night'))
  hostWrites('pulseSessions/mel-night', { state: 'setup', teams: { mo: { name: 'Mel Owls', pulseScore: 0 } } })
  hostWrites('pulseSessions/bne-night', { state: 'setup', teams: { bo: { name: 'Bne Owls', pulseScore: 0 } } })
  // Brisbane runs a pulse game and reveals it; Melbourne is still in setup.
  hostWrites('pulseSessions/bne-night', { state: 'game_active', gameType: 'closest_answer', currentGame: { name: 'Bne Closest' }, teams: { bo: { name: 'Bne Owls', pulseScore: 2 } } })
  hostWrites('pulseSessions/bne-night', { state: 'revealed', winnerName: 'Bne Owls', teams: { bo: { name: 'Bne Owls', pulseScore: 2 } } })
  expect(mel.result.current).toMatchObject({ state: 'setup', winnerName: null, miniGame: null, teams: [{ id: 'mo', name: 'Mel Owls' }] })
  expect(bne.result.current).toMatchObject({ state: 'revealed', winnerName: 'Bne Owls', teams: [{ id: 'bo', pulseScore: 2 }] })
  // Melbourne launches its own game: Brisbane's screen is untouched.
  hostWrites('pulseSessions/mel-night', { state: 'game_active', currentGame: { name: 'Mel Blitz' }, teams: { mo: { name: 'Mel Owls', pulseScore: 1 } } })
  expect(mel.result.current.miniGame).toEqual({ name: 'Mel Blitz' })
  expect(bne.result.current).toMatchObject({ state: 'revealed', winnerName: 'Bne Owls' })
  // Nothing but the two sessions' own nodes (and connection state) was subscribed.
  expect(new Set(rtdb.paths)).toEqual(new Set(['pulseSessions/mel-night', 'pulseSessions/bne-night', '.info/connected']))
})

it('no screen reads a global "current session" pointer (activePulseSession or similar)', () => {
  const files = []
  const walk = dir => { for (const f of readdirSync(dir)) { const p = join(dir, f); statSync(p).isDirectory() ? walk(p) : /\.(jsx?|tsx?)$/.test(f) && files.push(p) } }
  walk(join(cwd(), 'src'))
  const found = []
  for (const file of files) {
    const code = readFileSync(file, 'utf8')
    expect(code, file).not.toMatch(/activePulseSession|currentSession|activeSession/)
    // Every RTDB path the app builds is keyed by the URL's session (or is .info/*).
    for (const [, path] of code.matchAll(/[rR]ef\([^,()]+,\s*[`'"]([^`'"]+)[`'"]/g)) {
      found.push(path)
      expect(path.startsWith('.info/') || /\$\{sessionId\}/.test(path), `${file}: ${path}`).toBe(true)
    }
  }
  expect(found).toEqual(expect.arrayContaining(['pulseSessions/${sessionId}', 'shockTheRoom/${sessionId}', '.info/connected']))
})
