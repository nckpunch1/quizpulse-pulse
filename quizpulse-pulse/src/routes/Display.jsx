import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { usePulseSession } from '@/hooks/usePulseSession'

// ─── Reveal animation ─────────────────────────────────────────────────────────
//
// Cycles through non-winner team names at decreasing speed, then lands on the
// winner. Total runtime is ~4.7s so it finishes before Firebase flips to
// 'revealed' at 5s.
//
// Returns { name, tick } — tick increments every frame so RevealingScreen
// can re-trigger its CSS animation even when the same team appears twice.

function useRevealAnimation(state, winnerName, teams) {
  const [frame, setFrame] = useState({ name: null, tick: 0 })
  const teamsSnap = useRef([])

  // Snapshot the team list the moment revealing starts.
  useEffect(() => {
    if (state === 'revealing' && teams.length > 0) {
      teamsSnap.current = teams
    }
  }, [state, teams])

  useEffect(() => {
    if (state !== 'revealing' || !winnerName) {
      setFrame({ name: null, tick: 0 })
      return
    }

    const snap = teamsSnap.current
    const pool = snap.filter(t => t.name !== winnerName)
    const src  = pool.length > 0 ? pool : snap
    const pick = () => src[Math.floor(Math.random() * src.length)]?.name ?? winnerName

    // 20 fast frames at 50ms, then gradually slowing — total ~4.65s
    const delays = [
      ...Array(20).fill(50),
      75, 105, 140, 185, 245, 320, 415, 540, 700, 900,
    ]

    const timeouts = []
    let elapsed = 0

    delays.forEach((delay, i) => {
      elapsed += delay
      timeouts.push(setTimeout(() => setFrame({ name: pick(), tick: i }), elapsed))
    })

    // Final frame: land on winner
    elapsed += 50
    timeouts.push(setTimeout(() => setFrame({ name: winnerName, tick: delays.length }), elapsed))

    return () => timeouts.forEach(clearTimeout)
  }, [state, winnerName]) // eslint-disable-line react-hooks/exhaustive-deps

  return frame
}

// ─── Shared ───────────────────────────────────────────────────────────────────

const font = { fontFamily: "'Barlow Condensed', sans-serif" }

// Injected per-screen for keyframes that can't live in index.css cleanly
const FLASH_STYLE = `
  @keyframes nameFlash {
    0%   { opacity: 0.15; transform: scaleY(0.88); }
    100% { opacity: 1;    transform: scaleY(1); }
  }
  .name-flash { animation: nameFlash 0.07s ease-out forwards; }
`

// ─── Screens ──────────────────────────────────────────────────────────────────

function SetupScreen({ sessionId }) {
  const playUrl = `${window.location.origin}/play/${sessionId}`

  return (
    <div style={{
      ...font,
      height: '100vh', background: '#0a0a0a', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '7vh', position: 'relative',
    }}>
      {/* Animated glow rings */}
      <div style={{
        position: 'absolute',
        width: '55vw', height: '55vw', borderRadius: '50%',
        animation: 'pulse-ring-slow 3.5s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: '35vw', height: '35vw', borderRadius: '50%',
        animation: 'pulse-ring-slow 3.5s ease-in-out infinite',
        animationDelay: '1.75s',
        pointerEvents: 'none',
      }} />

      {/* Branding */}
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <p style={{
          color: '#f97316', fontWeight: 900,
          fontSize: 'clamp(1.5rem, 3vw, 3rem)',
          letterSpacing: '0.4em', textTransform: 'uppercase',
          marginBottom: '2.5vh',
        }}>
          ⚡ QUIZPULSE
        </p>
        <h1 style={{
          color: '#ffffff', fontWeight: 900,
          fontSize: 'clamp(4rem, 11vw, 14rem)',
          lineHeight: 1, letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>
          PULSE BUTTON READY
        </h1>
      </div>

      {/* Player URL */}
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <p style={{
          color: '#444', fontWeight: 600,
          fontSize: 'clamp(0.75rem, 1.4vw, 1.1rem)',
          textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.5vh',
        }}>
          Players — open on your phone
        </p>
        <p style={{
          color: '#f97316', fontFamily: 'monospace',
          fontSize: 'clamp(1rem, 2vw, 2rem)',
          background: '#141414', borderRadius: 16,
          padding: '1rem 2.5rem', border: '1px solid #222',
          letterSpacing: '0.03em',
        }}>
          {playUrl}
        </p>
      </div>
    </div>
  )
}

function ActiveScreen() {
  return (
    <div style={{
      ...font,
      position: 'relative', height: '100vh', background: '#0a0a0a',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes edgePulse {
          0%, 100% { opacity: 0.45; }
          50%       { opacity: 1; }
        }
      `}</style>

      {/* Pulsing orange edge glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        boxShadow: 'inset 0 0 140px rgba(249,115,22,0.28), inset 0 0 60px rgba(249,115,22,0.12)',
        animation: 'edgePulse 1.6s ease-in-out infinite',
      }} />

      <div style={{ textAlign: 'center', position: 'relative', padding: '0 4vw' }}>
        <h1 style={{
          color: '#ffffff', fontWeight: 900,
          fontSize: 'clamp(3rem, 11vw, 14rem)',
          lineHeight: 0.95, textTransform: 'uppercase',
          letterSpacing: '0.03em', marginBottom: '4vh',
        }}>
          PULSE BUTTON IS LIVE
        </h1>
        <p style={{
          color: '#f97316', fontWeight: 700,
          fontSize: 'clamp(1rem, 2.2vw, 2.4rem)',
          letterSpacing: '0.25em', textTransform: 'uppercase',
        }}>
          CAPTAINS — OPEN YOUR PHONES AND TAP
        </p>
      </div>
    </div>
  )
}

function RevealingScreen({ frame }) {
  return (
    <div style={{
      ...font,
      height: '100vh', background: '#0a0a0a',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', overflow: 'hidden',
      position: 'relative', gap: '4vh',
    }}>
      <style>{FLASH_STYLE}</style>
      <style>{`
        @keyframes flickerGlow {
          0%, 100% { opacity: 0.7; }
          18%       { opacity: 1; }
          20%       { opacity: 0.25; }
          22%       { opacity: 1; }
          58%       { opacity: 0.85; }
          60%       { opacity: 0.15; }
          62%       { opacity: 0.9; }
        }
      `}</style>

      {/* Flickering radial glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 65% 65% at 50% 50%, rgba(249,115,22,0.14) 0%, transparent 70%)',
        animation: 'flickerGlow 0.9s ease-in-out infinite',
      }} />

      <p style={{
        color: '#444', fontWeight: 600, position: 'relative',
        fontSize: 'clamp(0.9rem, 1.8vw, 1.8rem)',
        letterSpacing: '0.3em', textTransform: 'uppercase',
      }}>
        THE PULSE HAS CHOSEN…
      </p>

      <h1
        key={frame.tick}
        className="name-flash"
        style={{
          color: '#ffffff', fontWeight: 900, position: 'relative',
          fontSize: 'clamp(4rem, 12vw, 10rem)',
          lineHeight: 1, textAlign: 'center',
          padding: '0 4vw', wordBreak: 'break-word',
          userSelect: 'none',
        }}
      >
        {frame.name ?? '…'}
      </h1>
    </div>
  )
}

function RevealedScreen({ winnerName }) {
  const [visible, setVisible] = useState(false)

  // Slight delay so the transition fires after mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      ...font,
      height: '100vh', background: '#0a0a0a',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', overflow: 'hidden',
      position: 'relative', gap: '4vh',
    }}>
      <style>{`
        @keyframes slamIn {
          from { transform: scale(1.3); opacity: 0; }
          to   { transform: scale(1.0); opacity: 1; }
        }
        @keyframes boltPulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.1); }
        }
      `}</style>

      {/* Celebration radial glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 55% at 50% 55%, rgba(249,115,22,0.1) 0%, transparent 70%)',
      }} />

      <p style={{
        color: '#444', fontWeight: 600, position: 'relative',
        fontSize: 'clamp(0.9rem, 1.8vw, 1.8rem)',
        letterSpacing: '0.3em', textTransform: 'uppercase',
      }}>
        THE PULSE HAS CHOSEN…
      </p>

      <h1
        style={{
          color: '#ffffff', fontWeight: 900, position: 'relative',
          fontSize: 'clamp(4rem, 12vw, 10rem)',
          lineHeight: 1, textAlign: 'center',
          padding: '0 4vw', wordBreak: 'break-word',
          textShadow: visible ? '0 0 40px rgba(249,115,22,0.8)' : 'none',
          animation: visible ? 'slamIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none',
          opacity: visible ? undefined : 0,
        }}
      >
        {winnerName}
      </h1>

      <div style={{
        fontSize: 'clamp(2rem, 4vw, 5rem)',
        position: 'relative',
        animation: 'boltPulse 2.2s ease-in-out infinite',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease 0.5s',
      }}>
        ⚡
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Display() {
  const { id: sessionId } = useParams()
  const { teams, state, winnerName, loading } = usePulseSession(sessionId)
  const revealFrame = useRevealAnimation(state, winnerName, teams)

  if (!sessionId) {
    return (
      <div style={{ ...font, height: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#333', fontSize: '1.25rem', fontFamily: 'monospace' }}>No session ID in URL</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ ...font, height: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%', background: '#2a2a2a',
          animation: 'pulse-ring 1.5s ease-in-out infinite',
        }} />
      </div>
    )
  }

  if (state === 'setup') return <SetupScreen sessionId={sessionId} />
  if (state === 'active') return <ActiveScreen />
  if (state === 'revealing') return <RevealingScreen frame={revealFrame} />
  if (state === 'revealed') return <RevealedScreen winnerName={winnerName} />

  // Fallback — shouldn't be reached
  return <SetupScreen sessionId={sessionId} />
}
