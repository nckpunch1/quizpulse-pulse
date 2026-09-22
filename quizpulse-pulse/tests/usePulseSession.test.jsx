import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
const { subscriptions } = vi.hoisted(() => ({ subscriptions: [] }))
vi.mock('@/lib/firebase', () => ({ db: {} }))
vi.mock('firebase/database', () => ({
  ref: (_db, path) => path,
  onValue: (path, next, error) => {
    const unsubscribe = vi.fn()
    subscriptions.push({ path, next, error, unsubscribe })
    return unsubscribe
  },
}))
import { usePulseSession } from '../src/hooks/usePulseSession'
const feed = (path, data) => act(() => subscriptions.find(s => s.path === path).next({ val: () => data }))
beforeEach(() => subscriptions.splice(0))
it('subscribes to the requested session and connection state, with safe initial defaults', () => {
  const { result } = renderHook(() => usePulseSession('night'))
  expect(subscriptions.map(s => s.path)).toEqual(['pulseSessions/night', '.info/connected'])
  expect(result.current).toMatchObject({ session: null, teams: [], loading: true, state: 'setup', mode: null })
})
it('maps teams and exposes host-controlled game and winner state', () => {
  const { result } = renderHook(() => usePulseSession('night'))
  feed('pulseSessions/night', { state: 'revealed', mode: 'draw', winnerId: 'a', winnerName: 'Alpha', teams: { a: { name: 'Alpha' }, b: { name: 'Beta' } }, currentGame: { type: 'blitz' }, miniGame: { type: 'old' } })
  expect(result.current).toMatchObject({ loading: false, state: 'revealed', winnerId: 'a', winnerName: 'Alpha', miniGame: { type: 'blitz' }, teams: [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }] })
  expect(result.current.session).not.toHaveProperty('teams')
})
it('supports legacy miniGame data and clears removed session state', () => {
  const { result } = renderHook(() => usePulseSession('night'))
  feed('pulseSessions/night', { miniGame: { type: 'closest' }, teams: { a: { name: 'Alpha' } } })
  expect(result.current.miniGame).toEqual({ type: 'closest' })
  feed('pulseSessions/night', null)
  expect(result.current).toMatchObject({ session: null, teams: [], loading: false, winnerName: null, miniGame: null })
})
it('reports subscription errors and clears them when valid data arrives', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const { result } = renderHook(() => usePulseSession('night'))
  act(() => subscriptions[0].error(new Error('Permission denied')))
  expect(result.current).toMatchObject({ error: 'Permission denied', loading: false })
  feed('pulseSessions/night', { state: 'active' })
  expect(result.current).toMatchObject({ error: null, state: 'active' })
})
it('reports loss and restoration of the realtime connection', () => {
  const { result } = renderHook(() => usePulseSession('night'))
  feed('.info/connected', false)
  expect(result.current.connected).toBe(false)
  feed('.info/connected', true)
  expect(result.current.connected).toBe(true)
})
it('unsubscribes the old session on navigation and all listeners on unmount', () => {
  const { rerender, unmount } = renderHook(({ id }) => usePulseSession(id), { initialProps: { id: 'a' } })
  rerender({ id: 'b' })
  expect(subscriptions[0].unsubscribe).toHaveBeenCalledTimes(1)
  expect(subscriptions.map(s => s.path)).toEqual(['pulseSessions/a', '.info/connected', 'pulseSessions/b'])
  unmount()
  expect(subscriptions.every(s => s.unsubscribe.mock.calls.length === 1)).toBe(true)
})
it('does not create a session subscription for a missing link', () => {
  renderHook(() => usePulseSession(undefined))
  expect(subscriptions.map(s => s.path)).toEqual(['.info/connected'])
})
