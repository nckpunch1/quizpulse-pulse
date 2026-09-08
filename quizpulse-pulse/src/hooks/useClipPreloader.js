/**
 * useClipPreloader
 *
 * Downloads a whole Music Bingo round's audio up front so that calling a song
 * plays it instantly.
 *
 * WHY THE WHOLE ROUND. Bingo calls at random: any uncalled song can be next, so
 * there is no "next few" to look ahead at. The only preload that helps is all of
 * them. That is affordable because a round has a natural 5-10 minute break
 * before the first call (cards handed out, rules explained) — that break is this
 * hook's window, and the display shows how far through it is.
 *
 * WHY <audio> ELEMENTS AND NOT fetch() INTO THE HTTP CACHE.
 *  1. A media element load is not CORS-gated, so it works for any clip URL a
 *     pack can hold — including one pasted by hand from a bucket that has no
 *     CORS rule for this origin. fetch() would need CORS on every such origin.
 *  2. Firebase Storage serves objects `Cache-Control: private, max-age=0` unless
 *     the uploader overrode it, so a warmed HTTP cache would be re-validated (at
 *     best) or re-downloaded (at worst) on the call — exactly the lag being
 *     fixed. An element holds its own buffered media and answers no such header.
 *  3. The element that downloaded the clip is the element that plays it, so
 *     playback cannot silently miss the thing that was downloaded.
 *
 * MEMORY. ~48 clips x 30-45s of MP3 is roughly 25-35 MB of compressed audio held
 * across the elements. Decoding happens per playback and only one clip ever
 * plays at a time, so the decoded cost is one clip, not 48. Comfortable for a
 * display laptop; the whole lot is released when the pack changes or the page
 * closes.
 *
 * DOWNLOADING IS NOT UNLOCKING. `load()` needs no user gesture, so preloading
 * starts and finishes whether or not the host has hit the audio-unlock chip.
 * Playing still needs the unlock — that gate is the caller's, unchanged.
 */

import { useEffect, useRef, useState } from 'react'

// Six at a time rather than 48. Over HTTP/2 all 48 would run in parallel and
// finish together, which makes the progress bar sit at 0 and then jump; a small
// window finishes clips steadily, and a clip that is finished is callable.
const CONCURRENCY = 6

// A clip that has not become playable in this long is treated as failed and left
// to the on-demand fallback. Without it one stalled request would hold the round
// at "loading" forever and the host would never see READY.
const LOAD_TIMEOUT_MS = 45000

const EMPTY = { total: 0, ready: 0, failed: 0 }

export function useClipPreloader(urls) {
  // url -> { el, status: 'loading' | 'ready' | 'error' }. A ref, not state:
  // it survives every re-render the RTDB feed causes, and nothing renders off
  // the elements themselves — only off the counts below.
  const entriesRef = useRef(new Map())
  // The set the callbacks below should be looking at. Kept in a ref, updated
  // inside the effect (never during render), because the event handlers that
  // finish a download outlive the render that started it.
  const urlsRef = useRef(urls)
  // Bumped per url-set, so a pump left running for the previous pack stops
  // starting downloads the moment a new one arrives.
  const runRef = useRef(0)
  const [progress, setProgress] = useState(EMPTY)

  // Joined rather than the array itself: the RTDB feed hands this component a
  // fresh songs array on every unrelated write, and re-running on identity
  // would restart the whole download each time.
  const key = urls.join('\n')

  useEffect(() => {
    const run = ++runRef.current
    const entries = entriesRef.current
    urlsRef.current = urls

    const publish = () => {
      const wanted = urlsRef.current
      let ready = 0
      let failed = 0
      wanted.forEach((url) => {
        const entry = entries.get(url)
        if (!entry) return
        if (entry.status === 'ready') ready += 1
        else if (entry.status === 'error') failed += 1
      })
      setProgress((prev) =>
        prev.total === wanted.length && prev.ready === ready && prev.failed === failed
          ? prev
          : { total: wanted.length, ready, failed }
      )
    }

    const start = (url) => {
      const el = new Audio()
      el.preload = 'auto'
      const entry = { el, status: 'loading', detach: () => {}, timer: null }
      entries.set(url, entry)

      const settle = (status, reason) => {
        if (entry.status !== 'loading') return
        entry.status = status
        clearTimeout(entry.timer)
        entry.detach()
        if (status === 'error') {
          // Not fatal, and deliberately not retried here: the call falls back to
          // fetching this one clip on demand, which is the old behaviour.
          console.warn(`[display] music_bingo: clip preload failed (${reason})`, url)
        }
        publish()
        pump()
      }

      const onReady = () => settle('ready')
      // Fully buffered: the browser has stopped fetching because there is
      // nothing left to fetch. Chrome does not always follow that with
      // canplaythrough, so this is the second way a clip can be declared ready.
      const onSuspend = () => { if (el.readyState >= 3) settle('ready') }
      const onError = () => settle('error', el.error?.message ?? 'media error')

      entry.detach = () => {
        el.removeEventListener('canplaythrough', onReady)
        el.removeEventListener('suspend', onSuspend)
        el.removeEventListener('error', onError)
      }
      el.addEventListener('canplaythrough', onReady)
      el.addEventListener('suspend', onSuspend)
      el.addEventListener('error', onError)
      entry.timer = setTimeout(() => {
        // Enough buffered to start and keep playing counts as ready even if the
        // tail is still coming: the point of all this is that the call STARTS
        // instantly, and the rest streams under it as it always did.
        if (el.readyState >= 3) settle('ready')
        else settle('error', 'timed out')
      }, LOAD_TIMEOUT_MS)

      el.src = url
      el.load()
    }

    function pump() {
      if (run !== runRef.current) return
      const wanted = urlsRef.current
      let inFlight = 0
      wanted.forEach((url) => {
        if (entries.get(url)?.status === 'loading') inFlight += 1
      })
      for (const url of wanted) {
        if (inFlight >= CONCURRENCY) break
        if (entries.has(url)) continue
        start(url)
        inFlight += 1
      }
    }

    if (urls.length > 0) {
      const keep = new Set(urls)
      entries.forEach((entry, url) => {
        // Clips the new round does not use are released; clips that failed last
        // time are dropped so this round gets a fresh attempt at them. Anything
        // still wanted and already downloaded is kept exactly as it is — which
        // is what makes re-launching the same pack, or the display reconnecting
        // mid-round, cost nothing.
        if (!keep.has(url) || entry.status === 'error') {
          releaseEntry(entry)
          entries.delete(url)
        }
      })
    }
    // An empty set means no round is on screen — end of the round, or a
    // different game. The cache is deliberately KEPT: the host commonly ends a
    // round and starts another from the same pack, and re-downloading 30 MB to
    // save idle memory is the wrong trade. A page reload clears it.

    publish()
    pump()
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps -- urls read via ref; key is its content

  // Release on unmount only. Every other path above keeps what it can.
  useEffect(() => {
    const entries = entriesRef.current
    return () => {
      entries.forEach(releaseEntry)
      entries.clear()
    }
  }, [])

  // The element holding this clip, or null if there is nothing usable — no
  // preload was started, or the media itself is dead. Returned even while it is
  // still downloading: a half-buffered element still starts sooner than a cold
  // one, and it is the same element the buffer belongs to.
  const getClipElement = (url) => {
    if (!url) return null
    const entry = entriesRef.current.get(url)
    if (!entry?.el || entry.el.error) return null
    return entry.el
  }

  // Hands every clip element that currently exists to `visit`, each inside its
  // own try/catch.
  //
  // The isolation is the entire point. This is called from the audio-unlock
  // gesture, and a throw from one dead element used to escape all the way out
  // of that handler and abandon the unlock — which killed the background beds
  // and stings too, since they are gated on the same flag. One bad element is
  // allowed to miss its turn and nothing else.
  //
  // What priming means is deliberately NOT decided here: Display owns one
  // definition of it and applies it to the fixed sounds and these clips alike.
  const forEachClipElement = (visit) => {
    entriesRef.current.forEach((entry) => {
      if (!entry?.el) return
      try {
        visit(entry.el)
      } catch (err) {
        console.warn('[display] music_bingo: clip element refused priming', err?.message ?? err)
      }
    })
  }

  const { total, ready, failed } = progress
  return {
    total,
    ready,
    failed,
    // "Nothing left to wait for" — not "all 48 arrived". A clip that failed is
    // never going to arrive, and holding the host at 47/48 forever would just
    // train them to ignore the indicator.
    done: total > 0 && ready + failed >= total,
    getClipElement,
    forEachClipElement,
  }
}

function releaseEntry(entry) {
  if (!entry) return
  clearTimeout(entry.timer)
  entry.detach?.()
  const el = entry.el
  if (!el) return
  try { el.pause() } catch { /* already gone */ }
  // removeAttribute rather than src = '': an empty src resolves to the page URL
  // and would send a pointless request for the document itself.
  el.removeAttribute('src')
  try { el.load() } catch { /* aborting a load that never started */ }
}
