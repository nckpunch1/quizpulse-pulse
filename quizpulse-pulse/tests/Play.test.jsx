import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
const fixture = vi.hoisted(() => ({ id: 'night', data: {} }))
vi.mock('react-router-dom', () => ({ useParams: () => ({ id: fixture.id }) }))
vi.mock('@/hooks/usePulseSession', () => ({ usePulseSession: () => fixture.data }))
import Play from '../src/routes/Play'
beforeEach(() => {
  localStorage.clear()
  fixture.id = 'night'
  fixture.data = { teams: [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }], state: 'setup', mode: 'draw', loading: false, error: null, connected: true }
})
it('selects a team and persists it only under this session key', () => {
  render(<Play />)
  fireEvent.click(screen.getByRole('button', { name: 'Alpha' }))
  expect(localStorage.getItem('pulse_team_night')).toBe('a')
  expect(localStorage.getItem('pulse_team_other')).toBeNull()
  expect(screen.getByText('STAND BY')).toBeTruthy()
})
it('a stale saved team prompts selection instead of accepting a removed team', () => {
  localStorage.setItem('pulse_team_night', 'removed')
  render(<Play />)
  expect(screen.getByRole('button', { name: 'Beta' })).toBeTruthy()
})
it('draw tap gives local feedback and the host reveal determines the winner', () => {
  localStorage.setItem('pulse_team_night', 'a')
  fixture.data.state = 'active'
  const { rerender } = render(<Play />)
  fireEvent.pointerDown(screen.getByRole('button', { name: /TAP/ }))
  expect(screen.getByText("YOU'RE IN THE DRAW")).toBeTruthy()
  fixture.data = { ...fixture.data, state: 'revealed', winnerName: 'Beta' }
  rerender(<Play />)
  expect(screen.getByRole('heading', { name: 'Beta' })).toBeTruthy()
})
it.each(['blitz', 'closest_answer', 'beer'])('%s directs players to the screen without a draw button', mode => {
  localStorage.setItem('pulse_team_night', 'a')
  fixture.data = { ...fixture.data, state: 'active', mode }
  render(<Play />)
  expect(screen.getByText('Watch the big screen')).toBeTruthy()
  expect(screen.queryByRole('button', { name: /TAP/ })).toBeNull()
})
it('shows reconnect status while retaining the current game screen', () => {
  localStorage.setItem('pulse_team_night', 'a')
  fixture.data.connected = false
  render(<Play />)
  expect(screen.getByText(/Connection lost/)).toBeTruthy()
  expect(screen.getByText('STAND BY')).toBeTruthy()
})
it('reports a load error without exposing the raw Firebase message', () => {
  fixture.data.error = 'private internal details'
  render(<Play />)
  expect(screen.getByText('Connection problem')).toBeTruthy()
  expect(screen.queryByText('private internal details')).toBeNull()
})
it('handles a missing session link', () => {
  fixture.id = undefined
  render(<Play />)
  expect(screen.getByText('Invalid session link.')).toBeTruthy()
})
