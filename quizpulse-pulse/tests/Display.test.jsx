import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const fixture = vi.hoisted(() => ({ id: 'night', data: {}, subscriptions: [] }))
vi.mock('react-router-dom', () => ({ useParams: () => ({ id: fixture.id }) }))
vi.mock('@/hooks/usePulseSession', () => ({ usePulseSession: () => fixture.data }))
vi.mock('@/lib/firebase', () => ({ db: {} }))
vi.mock('firebase/database', () => ({
  ref: (_db, path) => path,
  onValue: (path, next) => {
    const unsubscribe = vi.fn()
    fixture.subscriptions.push({ path, next, unsubscribe })
    return unsubscribe
  },
}))
// Keep the real preloader: these tests verify that Display plays the actual
// element holding a downloaded clip, not a mocked accessor's return value.
import Display from '../src/routes/Display'
let audio
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(100000)
  fixture.id = 'night'
  fixture.subscriptions = []
  fixture.data = { teams: [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }], state: 'setup', session: {}, loading: false, connected: true, error: null }
  audio = []
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function () {
    Object.defineProperty(this, 'paused', { configurable: true, value: false })
    return Promise.resolve()
  })
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function () {
    Object.defineProperty(this, 'paused', { configurable: true, value: true })
  })
  vi.stubGlobal('Audio', function (src) {
    const el = document.createElement('audio')
    if (src) el.src = src
    el.play = vi.fn(HTMLMediaElement.prototype.play)
    el.pause = vi.fn(HTMLMediaElement.prototype.pause)
    audio.push(el)
    return el
  })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })
const feed = (path, value) => act(() => fixture.subscriptions.find(s => s.path === path).next({ val: () => value }))
const enable = () => fireEvent.click(screen.getByRole('button', { name: /enable sound/i }))
const song = { number: 1, title: 'Secret Song', artist: 'Secret Artist', clipUrl: 'https://example.test/song.mp3' }
const bingo = (extra = {}) => ({ type: 'music_bingo', startedAt: 1, songs: [song], calledNumbers: {}, ...extra })
function game(value) { fixture.data.session = { currentGame: value } }
function call(view, calledAt, extra = {}) {
  game(bingo({ calledNumbers: { 1: true }, lastCalled: { ...song, calledAt, revealed: false }, ...extra }))
  view.rerender(<Display />)
}
const clipFor = url => audio.find(el => el.src === url)

it('keeps music titles hidden until explicit host reveal, even after a long wait', () => {
  game(bingo({ calledNumbers: { 1: true }, lastCalled: { ...song, calledAt: 10, revealed: false } }))
  const view = render(<Display />)
  expect(screen.queryByText(song.title)).toBeNull()
  expect(screen.queryByText(song.artist)).toBeNull()
  act(() => vi.advanceTimersByTime(60000))
  expect(screen.queryByText(song.title)).toBeNull()
  call(view, 10, { lastCalled: { ...song, calledAt: 10, revealed: true } })
  expect(screen.getByText(song.title)).toBeTruthy()
  expect(screen.getByText(song.artist)).toBeTruthy()
  call(view, 20)
  expect(screen.queryByText(song.title)).toBeNull()
})

it('plays the preloaded element once per host trigger, with explicit replay support', () => {
  game(bingo())
  const view = render(<Display />)
  const clip = clipFor(song.clipUrl)
  act(() => clip.dispatchEvent(new Event('canplaythrough')))
  enable()
  clip.play.mockClear()
  call(view, 10)
  expect(clip.play).toHaveBeenCalledTimes(1)
  clip.currentTime = 12
  call(view, 10, { unrelated: 'new RTDB object' })
  expect(clip.play).toHaveBeenCalledTimes(1)
  expect(clip.currentTime).toBe(12)
  call(view, 20)
  expect(clip.play).toHaveBeenCalledTimes(2)
  expect(clip.currentTime).toBe(0)
})

it('does not retro-play a locked call when sound is enabled', () => {
  game(bingo())
  const view = render(<Display />)
  const clip = clipFor(song.clipUrl)
  call(view, 10)
  expect(clip.play).not.toHaveBeenCalled()
  enable()
  // Gesture priming is synchronous and stops; it is not song playback.
  expect(clip.paused).toBe(true)
  clip.play.mockClear()
  call(view, 20)
  expect(clip.play).toHaveBeenCalledOnce()
})

it('switches the single audio channel to the newer tiebreaker and never replays an older song on removal', () => {
  game(bingo())
  const view = render(<Display />)
  enable()
  call(view, 10)
  const clip = clipFor(song.clipUrl)
  call(view, 10, { tiebreaker: { playedAt: 20, url: 'https://example.test/tie.mp3' } })
  const tie = clipFor('https://example.test/tie.mp3')
  expect(clip.paused).toBe(true)
  expect(tie.paused).toBe(false)
  clip.play.mockClear()
  call(view, 10)
  expect(tie.paused).toBe(true)
  expect(clip.play).not.toHaveBeenCalled()
  call(view, 30)
  expect(clip.paused).toBe(false)
})

it('falls back to the shared audio channel when a preloaded element rejects playback', async () => {
  game(bingo())
  const view = render(<Display />)
  enable()
  const preloaded = clipFor(song.clipUrl)
  preloaded.play.mockRejectedValueOnce(new Error('element locked'))
  await act(async () => { call(view, 10) })
  const fallback = audio.find(el => el !== preloaded && el.src === song.clipUrl)
  expect(fallback).toBeDefined()
  expect(fallback.paused).toBe(false)
})

it('ignores a stale playback rejection after the host has moved to another clip', async () => {
  game(bingo())
  const view = render(<Display />)
  enable()
  const clip = clipFor(song.clipUrl)
  let rejectOld
  clip.play.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOld = reject }))
  call(view, 10)
  call(view, 20, { lastCalled: { ...song, calledAt: 20, clipUrl: 'https://example.test/new.mp3' } })
  const next = clipFor('https://example.test/new.mp3')
  await act(async () => { rejectOld(new Error('interrupted')) })
  expect(next.src).toBe('https://example.test/new.mp3')
  expect(next.paused).toBe(false)
  expect(audio.filter(el => el.src === song.clipUrl)).toHaveLength(1)
})

it.each(['missing clip', 'round ended'])('stops the old clip when %s', reason => {
  game(bingo())
  const view = render(<Display />)
  enable()
  call(view, 10)
  const clip = clipFor(song.clipUrl)
  if (reason === 'missing clip') call(view, 20, { lastCalled: { number: 2, calledAt: 20 } })
  else { game(null); view.rerender(<Display />) }
  expect(clip.paused).toBe(true)
})

it('a broken audio element cannot prevent the rest of the display from unlocking', () => {
  game({ type: 'beer_shock', phase: 'active' })
  render(<Display />)
  audio[0].play.mockImplementationOnce(() => { throw new Error('unsupported') })
  enable()
  expect(screen.queryByRole('button', { name: /enable sound/i })).toBeNull()
  expect(clipFor(new URL('/Beer.mp3', window.location.href).href).paused).toBe(false)
  expect(audio.every(el => el.volume === 1)).toBe(true)
})

it('keeps the prize audio bed running across drops, but stops it on game exit', () => {
  game({ type: 'prize_drop', phase: 'idle', startedAt: 1 })
  const view = render(<Display />)
  enable()
  const bed = audio.find(el => el.src.endsWith('/prizes.mp3'))
  bed.play.mockClear()
  bed.currentTime = 12
  game({ type: 'prize_drop', phase: 'dropping', startedAt: 1, dropStartedAt: 2 })
  view.rerender(<Display />)
  expect(bed.currentTime).toBe(12)
  expect(bed.play).not.toHaveBeenCalled()
  expect(bed.paused).toBe(false)
  game(null)
  view.rerender(<Display />)
  expect(bed.paused).toBe(true)
  expect(bed.currentTime).toBe(0)
})

it.each([
  ['loading', null, true], ['bingo', bingo(), false],
  ['closest', { type: 'closest_answer', phase: 'active', question: 'How many?' }, false],
  ['beer', { type: 'beer_shock', phase: 'active' }, false],
  ['prizes', { type: 'prize_drop', phase: 'idle' }, false],
  ['blitz', { type: 'blitz_pulse', phase: 'idle' }, false],
  ['team draw', { type: 'team_draw', teams: [] }, false],
])('keeps reconnect and audio controls reachable on %s screen', (_name, current, loading) => {
  game(current)
  fixture.data.connected = false
  fixture.data.loading = loading
  const view = render(<Display />)
  expect(screen.getByText('Reconnecting...')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
  expect(screen.queryByRole('button', { name: /enable sound/i })).toBeNull()
  fixture.data.connected = true
  view.rerender(<Display />)
  expect(screen.queryByText('Reconnecting...')).toBeNull()
})

it('releases the Shock display when the host completes it and removes its listener on unmount', () => {
  game({ type: 'closest_answer', phase: 'active', question: 'Next question' })
  const view = render(<Display />)
  feed('shockTheRoom/night', { phase: 'charging' })
  expect(screen.queryByText('Next question')).toBeNull()
  expect(screen.getByRole('button', { name: /enable sound/i })).toBeTruthy()
  feed('shockTheRoom/night', { phase: 'complete' })
  expect(screen.getByText('Next question')).toBeTruthy()
  view.unmount()
  expect(fixture.subscriptions.every(s => s.unsubscribe.mock.calls.length === 1)).toBe(true)
})

it('uses server clock offset for countdown and stops scheduling work at expiry', () => {
  game({ type: 'team_draw', teams: [], timerStartedAt: 100000, timerDuration: 12000 })
  const view = render(<Display />)
  expect(screen.getByText('12')).toBeTruthy()
  feed('.info/serverTimeOffset', 2000)
  expect(screen.getByText('10.0')).toBeTruthy()
  act(() => vi.advanceTimersByTime(100))
  expect(screen.getByText('9.9')).toBeTruthy()
  act(() => vi.advanceTimersByTime(9900))
  expect(screen.getByText('ВРЕМЯ!')).toBeTruthy()
  expect(vi.getTimerCount()).toBe(0)
  view.unmount()
  expect(fixture.subscriptions.every(s => s.unsubscribe.mock.calls.length === 1)).toBe(true)
})

it('cleans up a running countdown on navigation away from team draw', () => {
  game({ type: 'team_draw', teams: [], timerStartedAt: 100000 })
  const view = render(<Display />)
  expect(vi.getTimerCount()).toBeGreaterThan(0)
  game(null)
  view.rerender(<Display />)
  expect(vi.getTimerCount()).toBe(0)
  expect(fixture.subscriptions.find(s => s.path === '.info/serverTimeOffset').unsubscribe).toHaveBeenCalledOnce()
})

it('reports a missing session without subscribing to a Shock game', () => {
  fixture.id = undefined
  render(<Display />)
  expect(screen.getByText(/No session ID/)).toBeTruthy()
  expect(fixture.subscriptions).toHaveLength(0)
})

it('distinguishes a subscription failure from reconnecting and recovers on fresh data', () => {
  fixture.data.error = 'Permission denied'
  const view = render(<Display />)
  expect(screen.getByText('Display connection error')).toBeTruthy()
  fixture.data.error = null
  game({ type: 'closest_answer', phase: 'active', question: 'Recovered question' })
  view.rerender(<Display />)
  expect(screen.queryByText('Display connection error')).toBeNull()
  expect(screen.getByText('Recovered question')).toBeTruthy()
})

it.each([
  [null, 'Beta'], ['blitz', 'SUDDEN DEATH BLITZ'], ['closest_answer', 'CLOSEST ANSWER CHALLENGE'],
])('reveal animation lands on the host outcome %s rather than picking a winner locally', (outcomeType, target) => {
  fixture.data.state = 'revealing'
  fixture.data.winnerName = 'Beta'
  fixture.data.session = { outcomeType }
  const view = render(<Display />)
  act(() => vi.advanceTimersByTime(5000))
  expect(screen.getByRole('heading', { name: target })).toBeTruthy()
  fixture.data.state = 'revealed'
  view.rerender(<Display />)
  act(() => vi.advanceTimersByTime(60))
  expect(screen.getByRole('heading', { name: target })).toBeTruthy()
  expect(vi.getTimerCount()).toBe(0)
})

it('cancels reveal timers if the host resets before the winner lands', () => {
  fixture.data.state = 'revealing'
  fixture.data.winnerName = 'Beta'
  const view = render(<Display />)
  expect(vi.getTimerCount()).toBeGreaterThan(0)
  fixture.data.state = 'setup'
  view.rerender(<Display />)
  expect(vi.getTimerCount()).toBe(0)
  act(() => vi.advanceTimersByTime(10000))
  expect(screen.queryByRole('heading', { name: 'Beta' })).toBeNull()
})

it.each([['pulse', '/SuccessShock.mp3'], ['flatline', '/Flatline.mp3']])('plays only the host-selected Shock result %s and silences it on completion', (result, suffix) => {
  render(<Display />)
  enable()
  feed('shockTheRoom/night', { phase: 'charging' })
  const charging = audio.find(el => el.src.endsWith('/Charging.mp3'))
  expect(charging.paused).toBe(false)
  feed('shockTheRoom/night', { phase: 'shocked', result })
  const sting = audio.find(el => el.src.endsWith(suffix))
  const other = audio.find(el => el.src.endsWith(result === 'pulse' ? '/Flatline.mp3' : '/SuccessShock.mp3'))
  expect(charging.paused).toBe(true)
  expect(sting.paused).toBe(false)
  expect(sting.loop).toBe(false)
  expect(other.paused).toBe(true)
  feed('shockTheRoom/night', { phase: 'complete', result })
  expect(sting.paused).toBe(true)
})

it('BlitzPulse advances through team selection, award, next team and completion without carrying old prizes', () => {
  const base = { type: 'blitz_pulse', startedAt: 1, maxTeams: 2, awardedCount: 0 }
  game(base)
  const view = render(<Display />)
  expect(screen.getByText('NEXT TEAM UP')).toBeTruthy()
  game({ ...base, phase: 'team_shown', currentTeam: { teamId: 'a', teamName: 'Alpha' } })
  view.rerender(<Display />)
  expect(screen.getByText('Alpha')).toBeTruthy()
  expect(screen.getByText('Answer to win…')).toBeTruthy()
  expect(screen.getByText('Team 1 of 2')).toBeTruthy()
  game({ ...base, phase: 'prize_awarded', awardedCount: 1, currentTeam: { teamId: 'a', teamName: 'Alpha' }, currentPrize: { prizeName: 'Voucher' } })
  view.rerender(<Display />)
  act(() => vi.advanceTimersByTime(4200))
  expect(screen.getByText('Voucher')).toBeTruthy()
  expect(vi.getTimerCount()).toBe(0)
  game({ ...base, phase: 'team_shown', awardedCount: 1, currentTeam: { teamId: 'b', teamName: 'Beta' } })
  view.rerender(<Display />)
  expect(screen.queryByText('Voucher')).toBeNull()
  expect(screen.queryByText('Alpha')).toBeNull()
  expect(screen.getByText('Team 2 of 2')).toBeTruthy()
  game({ ...base, phase: 'complete', awardedCount: 2 })
  view.rerender(<Display />)
  expect(screen.getByText("THAT'S A WRAP")).toBeTruthy()
  expect(screen.getByText('Team 2 of 2')).toBeTruthy()
})

it('cancels an unfinished BlitzPulse prize animation when the host clears the game', () => {
  game({ type: 'blitz_pulse', phase: 'prize_awarded', currentTeam: { teamId: 'a', teamName: 'Alpha' }, currentPrize: { prizeName: 'Voucher' } })
  const view = render(<Display />)
  expect(vi.getTimerCount()).toBe(2)
  game(null)
  view.rerender(<Display />)
  expect(vi.getTimerCount()).toBe(0)
  act(() => vi.advanceTimersByTime(5000))
  expect(screen.queryByText('Voucher')).toBeNull()
})

it('restarts Prize Drop animation for a new drop identity even when the phase stays dropping', () => {
  const base = { type: 'prize_drop', phase: 'dropping', prizes: ['Mug', 'Voucher'], dropStartedAt: 1, prizeName: 'Voucher' }
  game(base)
  const view = render(<Display />)
  expect(screen.getByText('SELECTING PRIZE...')).toBeTruthy()
  act(() => vi.advanceTimersByTime(4200))
  expect(screen.getByText('Voucher')).toBeTruthy()
  expect(screen.queryByText('SELECTING PRIZE...')).toBeNull()
  game({ ...base, dropStartedAt: 2, prizeName: 'Mug' })
  view.rerender(<Display />)
  expect(screen.getByText('SELECTING PRIZE...')).toBeTruthy()
  act(() => vi.advanceTimersByTime(4200))
  expect(screen.getByText('Mug')).toBeTruthy()
  expect(screen.queryByText('Voucher')).toBeNull()
})

it('resetting Prize Drop cancels its outstanding reveal timers', () => {
  game({ type: 'prize_drop', phase: 'dropping', prizes: [], prizeName: 'Voucher' })
  const view = render(<Display />)
  expect(vi.getTimerCount()).toBe(2)
  game({ type: 'prize_drop', phase: 'idle', prizes: [] })
  view.rerender(<Display />)
  expect(vi.getTimerCount()).toBe(0)
  expect(screen.queryByText('SELECTING PRIZE...')).toBeNull()
})

it.each([null, 100000])('team draw reveals only host-approved slots with timer=%s', timerStartedAt => {
  const base = { type: 'team_draw', teams: [{ teamId: 'a', teamName: 'Alpha' }, { teamId: 'b', teamName: 'Beta' }], timerStartedAt, revealedCount: 0 }
  game(base)
  const view = render(<Display />)
  expect(screen.queryByText('Alpha')).toBeNull()
  expect(screen.queryByText('Beta')).toBeNull()
  game({ ...base, revealedCount: 1 })
  view.rerender(<Display />)
  expect(screen.getByText('Alpha')).toBeTruthy()
  expect(screen.queryByText('Beta')).toBeNull()
  game({ ...base, revealedCount: 2 })
  view.rerender(<Display />)
  expect(screen.getByText('Beta')).toBeTruthy()
})

it.each([
  { questions: [{ text: 'First?', choiceA: 'Red', choiceB: 'Blue' }, { question: 'Second?', choices: ['Green', 'Gold'] }], currentQuestionIndex: 1 },
  { questionText: 'Second?', choiceA: 'Green', choiceB: 'Gold' },
])('legacy Blitz renders the selected question and both choices: %j', miniGame => {
  fixture.data.state = 'game_active'
  fixture.data.session = { outcomeType: 'blitz', miniGame }
  render(<Display />)
  expect(screen.getByRole('heading', { name: 'Second?' })).toBeTruthy()
  expect(screen.getByText('Green')).toBeTruthy()
  expect(screen.getByText('Gold')).toBeTruthy()
  expect(screen.queryByText('First?')).toBeNull()
})

it.each(['closest_answer', 'beer_game', 'bonus'])('legacy %s reads its question without requiring currentGame', outcomeType => {
  fixture.data.state = 'game_active'
  fixture.data.winnerName = 'Alpha'
  fixture.data.session = { outcomeType, miniGame: { questionText: 'Legacy question?' } }
  render(<Display />)
  expect(screen.getByRole('heading', { name: 'Legacy question?' })).toBeTruthy()
})

it('shows preload failures without blocking the music board and hides settled status once calls start', () => {
  game(bingo())
  const view = render(<Display />)
  expect(screen.getByText('Loading clips 0/1')).toBeTruthy()
  act(() => clipFor(song.clipUrl).dispatchEvent(new Event('error')))
  expect(screen.getByText('♪ 0/1 ready · 1 unavailable')).toBeTruthy()
  call(view, 10)
  expect(screen.queryByText('♪ 0/1 ready · 1 unavailable')).toBeNull()
  expect(screen.getByText('1 called')).toBeTruthy()
})
