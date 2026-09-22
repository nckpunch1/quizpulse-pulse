import { act, renderHook, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useClipPreloader } from '../src/hooks/useClipPreloader'
let clips
beforeEach(() => {
  clips = []
  vi.useFakeTimers()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.stubGlobal('Audio', function () {
    const el = document.createElement('audio')
    el.load = vi.fn(); el.pause = vi.fn()
    clips.push(el)
    return el
  })
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })
const ready = el => act(() => el.dispatchEvent(new Event('canplaythrough')))
it('loads six clips at once and advances the queue as clips become ready', () => {
  const urls = Array.from({ length: 8 }, (_, i) => `https://example.test/${i}.mp3`)
  const { result } = renderHook(() => useClipPreloader(urls))
  expect(clips).toHaveLength(6)
  ready(clips[0]); ready(clips[1])
  expect(clips).toHaveLength(8)
  clips.slice(2).forEach(ready)
  expect(result.current).toMatchObject({ total: 8, ready: 8, failed: 0, done: true })
})
it('times out stalled audio without leaving the round loading forever', () => {
  const { result } = renderHook(() => useClipPreloader(['https://example.test/a.mp3']))
  act(() => vi.advanceTimersByTime(45000))
  expect(result.current).toMatchObject({ ready: 0, failed: 1, done: true })
})
it('retains downloaded clips through an idle screen and round restart', () => {
  const url = 'https://example.test/a.mp3'
  const { result, rerender } = renderHook(({ urls }) => useClipPreloader(urls), { initialProps: { urls: [url] } })
  ready(clips[0])
  const original = result.current.getClipElement(url)
  rerender({ urls: [] })
  expect(result.current).toMatchObject({ total: 0, done: false })
  rerender({ urls: [url] })
  expect(clips).toHaveLength(1)
  expect(result.current.getClipElement(url)).toBe(original)
  expect(result.current.ready).toBe(1)
})
it('releases obsolete audio and cleans up DOM nodes and timers on unmount', () => {
  const { rerender, unmount } = renderHook(({ urls }) => useClipPreloader(urls), { initialProps: { urls: ['https://example.test/a.mp3'] } })
  const old = clips[0]
  rerender({ urls: ['https://example.test/b.mp3'] })
  expect(old.pause).toHaveBeenCalled()
  expect(old.hasAttribute('src')).toBe(false)
  expect(old.isConnected).toBe(false)
  unmount()
  expect(document.querySelector('[data-bingo-clips]')).toBeNull()
  expect(vi.getTimerCount()).toBe(0)
})
it('one broken audio unlock does not prevent other clips being primed', () => {
  const { result } = renderHook(() => useClipPreloader(['https://example.test/a.mp3', 'https://example.test/b.mp3']))
  const visit = vi.fn().mockImplementationOnce(() => { throw new Error('audio unavailable') })
  expect(() => result.current.forEachClipElement(visit)).not.toThrow()
  expect(visit).toHaveBeenCalledTimes(2)
})

it('continues the download queue after ending and restarting a round mid-download', () => {
  const urls = Array.from({ length: 10 }, (_, i) => `https://example.test/${i}.mp3`)
  const { result, rerender } = renderHook(({ urls }) => useClipPreloader(urls), { initialProps: { urls } })
  expect(clips).toHaveLength(6)
  rerender({ urls: [] })
  rerender({ urls: [...urls] })
  expect(clips).toHaveLength(6)
  // These events come from elements created before the restart. They must pump
  // the current round, otherwise the remaining four clips never start.
  clips.slice(0, 6).forEach(ready)
  expect(clips).toHaveLength(10)
  clips.slice(6).forEach(ready)
  expect(result.current).toMatchObject({ total: 10, ready: 10, failed: 0, done: true })
})

it('ignores obsolete clip events after changing packs', () => {
  const { result, rerender } = renderHook(({ urls }) => useClipPreloader(urls), { initialProps: { urls: ['https://example.test/old.mp3'] } })
  const old = clips[0]
  rerender({ urls: ['https://example.test/new.mp3'] })
  ready(old)
  expect(result.current).toMatchObject({ total: 1, ready: 0, failed: 0 })
  ready(clips[1])
  expect(result.current).toMatchObject({ ready: 1, done: true })
})

it('counts media errors once, advances the queue and retries failed clips on a new round', () => {
  const urls = Array.from({ length: 7 }, (_, i) => `https://example.test/${i}.mp3`)
  const { result, rerender } = renderHook(({ urls }) => useClipPreloader(urls), { initialProps: { urls } })
  Object.defineProperty(clips[0], 'error', { value: { message: 'bad media' } })
  act(() => clips[0].dispatchEvent(new Event('error')))
  ready(clips[0]) // duplicate/late event must not turn the failure into success
  expect(clips).toHaveLength(7)
  expect(result.current.failed).toBe(1)
  expect(result.current.getClipElement(urls[0])).toBeNull()
  clips.slice(1).forEach(ready)
  expect(result.current).toMatchObject({ ready: 6, failed: 1, done: true })
  rerender({ urls: [] })
  rerender({ urls })
  expect(clips).toHaveLength(8)
  ready(clips[7])
  expect(result.current).toMatchObject({ ready: 7, failed: 0, done: true })
})

it('accepts suspend only when sufficient media is buffered', () => {
  const { result } = renderHook(() => useClipPreloader(['https://example.test/a.mp3']))
  act(() => clips[0].dispatchEvent(new Event('suspend')))
  expect(result.current.ready).toBe(0)
  Object.defineProperty(clips[0], 'readyState', { value: 3 })
  act(() => clips[0].dispatchEvent(new Event('suspend')))
  expect(result.current).toMatchObject({ ready: 1, failed: 0, done: true })
  expect(vi.getTimerCount()).toBe(0)
})

it('treats a buffered clip as ready at timeout even if no readiness event arrived', () => {
  const { result } = renderHook(() => useClipPreloader(['https://example.test/a.mp3']))
  Object.defineProperty(clips[0], 'readyState', { value: 3 })
  act(() => vi.advanceTimersByTime(45000))
  expect(result.current).toMatchObject({ ready: 1, failed: 0, done: true })
})

it('does not restart downloads when RTDB supplies a fresh array of the same URLs', () => {
  const urls = ['https://example.test/a.mp3']
  const { result, rerender } = renderHook(({ urls }) => useClipPreloader(urls), { initialProps: { urls } })
  const original = result.current.getClipElement(urls[0])
  rerender({ urls: [...urls] })
  expect(clips).toHaveLength(1)
  expect(result.current.getClipElement(urls[0])).toBe(original)
  expect(result.current.getClipElement(null)).toBeNull()
  expect(result.current.getClipElement('unknown')).toBeNull()
})
