import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { usePulseSession } from '@/hooks/usePulseSession'

// ─── Reveal animation ─────────────────────────────────────────────────────────

function useRevealAnimation(state, landingTarget, teams) {
  const [frame, setFrame] = useState({ name: null, tick: 0 })
  const teamsSnap = useRef([])

  useEffect(() => {
    if (state === 'revealing' && teams.length > 0) {
      teamsSnap.current = teams
    }
  }, [state, teams])

  useEffect(() => {
    if (state !== 'revealing' || !landingTarget) {
      setFrame({ name: null, tick: 0 })
      return
    }

    const snap = teamsSnap.current
    const pool = snap.filter(t => t.name !== landingTarget)
    const src  = pool.length > 0 ? pool : snap
    const pick = () => src[Math.floor(Math.random() * src.length)]?.name ?? landingTarget

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

    elapsed += 50
    timeouts.push(setTimeout(() => setFrame({ name: landingTarget, tick: delays.length }), elapsed))

    return () => timeouts.forEach(clearTimeout)
  }, [state, landingTarget]) // eslint-disable-line react-hooks/exhaustive-deps

  return frame
}

// ─── Shared ───────────────────────────────────────────────────────────────────

const font = { fontFamily: "'Barlow Condensed', sans-serif" }

const FLASH_STYLE = `
  @keyframes nameFlash {
    0%   { opacity: 0.15; transform: scaleY(0.88); }
    100% { opacity: 1;    transform: scaleY(1); }
  }
  .name-flash { animation: nameFlash 0.07s ease-out forwards; }
`

function FullScreen({ children, style }) {
  return (
    <div style={{
      ...font,
      height: '100vh', background: '#0a0a0a', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', position: 'relative',
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── Screens ──────────────────────────────────────────────────────────────────

function IdleScreen() {
  return (
    <div style={{
      ...font,
      height: '100vh', background: '#0a0a0a', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '7vh', position: 'relative',
    }}>
      <style>{`
        @keyframes pulse-ring-slow {
          0%, 100% { opacity: 0.06; transform: scale(1); }
          50%       { opacity: 0.14; transform: scale(1.04); }
        }
      `}</style>

      <div style={{
        position: 'absolute',
        width: '55vw', height: '55vw', borderRadius: '50%',
        border: '1px solid #f97316',
        animation: 'pulse-ring-slow 3.5s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: '35vw', height: '35vw', borderRadius: '50%',
        border: '1px solid #f97316',
        animation: 'pulse-ring-slow 3.5s ease-in-out infinite',
        animationDelay: '1.75s',
        pointerEvents: 'none',
      }} />

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

      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        boxShadow: 'inset 0 0 140px rgba(249,115,22,0.28), inset 0 0 60px rgba(249,115,22,0.12)',
        animation: 'edgePulse 1.6s ease-in-out infinite',
      }} />

      <div style={{ textAlign: 'center', position: 'relative', padding: '0 4vw' }}>
        <h1 style={{
          color: '#ffffff', fontWeight: 900,
          fontSize: 'clamp(3rem, 10vw, 14rem)',
          lineHeight: 0.95, textTransform: 'uppercase',
          letterSpacing: '0.03em', marginBottom: '4vh',
        }}>
          PULSE BUTTON ACTIVE
        </h1>
        <p style={{
          color: '#f97316', fontWeight: 700,
          fontSize: 'clamp(1rem, 2.2vw, 2.4rem)',
          letterSpacing: '0.25em', textTransform: 'uppercase',
        }}>
          CHECK YOUR DEVICE!
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

function RevealedScreen({ displayText }) {
  const [visible, setVisible] = useState(false)

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
        {displayText}
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

// ─── Game active screens ──────────────────────────────────────────────────────

function BlitzGameScreen({ miniGame, session }) {
  const idx = session?.currentQuestionIndex ?? 0
  const currentQ = Array.isArray(miniGame?.questions)
    ? (miniGame.questions[idx] ?? {})
    : { text: miniGame?.questionText, choiceA: miniGame?.choiceA, choiceB: miniGame?.choiceB }

  return (
    <FullScreen>
      <p style={{
        position: 'absolute', top: '3vh', left: '50%', transform: 'translateX(-50%)',
        color: '#f97316', fontWeight: 900,
        fontSize: 'clamp(0.9rem, 1.8vw, 1.8rem)',
        letterSpacing: '0.3em', textTransform: 'uppercase', whiteSpace: 'nowrap',
      }}>
        ⚡ SUDDEN DEATH BLITZ
      </p>

      <div style={{
        width: '100%', maxWidth: '90vw',
        display: 'flex', flexDirection: 'column', gap: '4vh',
        padding: '10vh 3vw 0',
      }}>
        <h1 style={{
          color: '#fff', fontWeight: 900, textAlign: 'center',
          fontSize: 'clamp(2rem, 5vw, 6rem)',
          lineHeight: 1.05, letterSpacing: '0.01em',
        }}>
          {currentQ.text}
        </h1>

        <div style={{ display: 'flex', gap: '3vw' }}>
          <div style={{
            flex: 1, borderRadius: 20,
            padding: 'clamp(1.5rem, 3vh, 3rem)',
            border: '3px solid #222', background: '#141414',
            display: 'flex', flexDirection: 'column', gap: '1vh', alignItems: 'flex-start',
          }}>
            <span style={{ color: '#f97316', fontWeight: 900, fontSize: 'clamp(1.5rem, 3vw, 3.5rem)', letterSpacing: '0.1em' }}>A</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 'clamp(1.2rem, 2.5vw, 3rem)', lineHeight: 1.1 }}>{currentQ.choiceA}</span>
          </div>
          <div style={{
            flex: 1, borderRadius: 20,
            padding: 'clamp(1.5rem, 3vh, 3rem)',
            border: '3px solid #222', background: '#141414',
            display: 'flex', flexDirection: 'column', gap: '1vh', alignItems: 'flex-start',
          }}>
            <span style={{ color: '#f97316', fontWeight: 900, fontSize: 'clamp(1.5rem, 3vw, 3.5rem)', letterSpacing: '0.1em' }}>B</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 'clamp(1.2rem, 2.5vw, 3rem)', lineHeight: 1.1 }}>{currentQ.choiceB}</span>
          </div>
        </div>
      </div>
    </FullScreen>
  )
}

function ClosestGameScreen({ miniGame }) {
  return (
    <FullScreen style={{ gap: '4vh', padding: '0 4vw' }}>
      <p style={{
        color: '#f97316', fontWeight: 900,
        fontSize: 'clamp(0.9rem, 1.8vw, 1.8rem)',
        letterSpacing: '0.3em', textTransform: 'uppercase',
      }}>
        ⚡ CLOSEST ANSWER CHALLENGE
      </p>
      <h1 style={{
        color: '#fff', fontWeight: 900, textAlign: 'center',
        fontSize: 'clamp(2rem, 5vw, 7rem)',
        lineHeight: 1.05, maxWidth: '85vw',
      }}>
        {miniGame?.questionText}
      </h1>
      <p style={{
        color: '#555', fontWeight: 700,
        fontSize: 'clamp(1rem, 2vw, 2rem)',
        letterSpacing: '0.2em', textTransform: 'uppercase',
      }}>
        ENTER YOUR ANSWER ON YOUR DEVICE
      </p>
    </FullScreen>
  )
}

function BonusGameScreen({ miniGame, winnerName, outcomeType }) {
  const gameLabel = outcomeType === 'beer_game' ? '🍺 BEER GAME' : '🎯 BONUS QUESTION'

  return (
    <FullScreen style={{ gap: '3vh', padding: '6vh 4vw' }}>
      <p style={{
        color: '#555', fontWeight: 700,
        fontSize: 'clamp(0.8rem, 1.5vw, 1.4rem)',
        letterSpacing: '0.2em', textTransform: 'uppercase',
      }}>
        {gameLabel}
      </p>
      <h1 style={{
        color: '#f97316', fontWeight: 900, textAlign: 'center',
        fontSize: 'clamp(3rem, 8vw, 12rem)',
        lineHeight: 1, textTransform: 'uppercase',
        textShadow: '0 0 40px rgba(249,115,22,0.4)',
      }}>
        {winnerName}
      </h1>
      <h2 style={{
        color: '#fff', fontWeight: 900, textAlign: 'center',
        fontSize: 'clamp(1.5rem, 4vw, 6rem)',
        lineHeight: 1.05, maxWidth: '85vw',
      }}>
        {miniGame?.questionText}
      </h2>
    </FullScreen>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Display() {
  const { id: sessionId } = useParams()
  const { teams, state, winnerName, loading, miniGame, session } = usePulseSession(sessionId)
  const outcomeType = session?.outcomeType ?? session?.gameType ?? null

  const landingTarget =
    outcomeType === 'blitz' ? 'SUDDEN DEATH BLITZ' :
    outcomeType === 'closest_answer' ? 'CLOSEST ANSWER CHALLENGE' :
    winnerName

  const revealFrame = useRevealAnimation(state, landingTarget, teams)

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

  if (state === 'setup' || state === 'complete') return <IdleScreen />
  if (state === 'active') return <ActiveScreen />
  if (state === 'revealing') return <RevealingScreen frame={revealFrame} />
  if (state === 'revealed') return <RevealedScreen displayText={landingTarget} />

  if (state === 'game_active') {
    if (outcomeType === 'blitz') return <BlitzGameScreen miniGame={miniGame} session={session} />
    if (outcomeType === 'closest_answer') return <ClosestGameScreen miniGame={miniGame} />
    return <BonusGameScreen miniGame={miniGame} winnerName={winnerName} outcomeType={outcomeType} />
  }

  return <IdleScreen />
}
