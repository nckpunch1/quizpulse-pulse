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

it('keeps loading distinct from a missing session or an empty team list', () => {
  fixture.data.loading = true
  fixture.data.connected = false
  const view = render(<Play />)
  expect(screen.queryByText('Session not found.')).toBeNull()
  expect(screen.queryByText(/Connection lost/)).toBeNull()
  fixture.data.loading = false
  fixture.data.state = null
  view.rerender(<Play />)
  expect(screen.getByText('Session not found.')).toBeTruthy()
  fixture.data.state = 'setup'
  fixture.data.teams = []
  view.rerender(<Play />)
  expect(screen.getByText(/Teams haven't been set up/)).toBeTruthy()
})
it('a new draw clears previous tap feedback after the host completes the old round', () => {
  localStorage.setItem('pulse_team_night', 'a')
  fixture.data.state = 'active'
  const view = render(<Play />)
  fireEvent.pointerDown(screen.getByRole('button', { name: /TAP/ }))
  fixture.data.state = 'complete'
  view.rerender(<Play />)
  expect(screen.getByText('STAND BY')).toBeTruthy()
  fixture.data.state = 'active'
  view.rerender(<Play />)
  expect(screen.getByRole('button', { name: /TAP/ })).toBeTruthy()
  expect(screen.queryByText("YOU'RE IN THE DRAW")).toBeNull()
})
it.each(['blitz', 'closest_answer'])('mini-game %s never shows a prize-draw winner during revealing/revealed', mode => {
  localStorage.setItem('pulse_team_night', 'a')
  fixture.data = { ...fixture.data, state: 'revealing', mode, winnerName: 'Do not show' }
  const view = render(<Play />)
  expect(screen.getByText('Watch the big screen')).toBeTruthy()
  fixture.data.state = 'revealed'
  view.rerender(<Play />)
  expect(screen.getByText('Round complete!')).toBeTruthy()
  expect(screen.queryByText('Do not show')).toBeNull()
})
it('game_active uses the game type and keeps the selected team visible', () => {
  localStorage.setItem('pulse_team_night', 'b')
  fixture.data = { ...fixture.data, state: 'game_active', gameType: 'unknown-new-mode' }
  render(<Play />)
  expect(screen.getByRole('heading', { name: 'Beta' })).toBeTruthy()
  expect(screen.getByText('unknown-new-mode')).toBeTruthy()
  expect(screen.queryByRole('button', { name: /TAP/ })).toBeNull()
})
it('draw revealing acknowledges participation without displaying a winner prematurely', () => {
  localStorage.setItem('pulse_team_night', 'a')
  fixture.data = { ...fixture.data, state: 'revealing', winnerName: 'Beta' }
  render(<Play />)
  expect(screen.getByText('The Pulse is choosing...')).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Beta' })).toBeNull()
})
it('clears connection error UI after a successful update', () => {
  fixture.data.error = 'offline'
  const view = render(<Play />)
  fixture.data.error = null
  view.rerender(<Play />)
  expect(screen.queryByText('Connection problem')).toBeNull()
  expect(screen.getByRole('button', { name: 'Alpha' })).toBeTruthy()
})
