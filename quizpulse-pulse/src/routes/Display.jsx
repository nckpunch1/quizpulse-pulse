import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { usePulseSession } from '@/hooks/usePulseSession'

// ─── Reveal animation (prize draw) ────────────────────────────────────────────

function useRevealAnimation(state, winnerName, teams) {
  const [frame, setFrame] = useState({ name: null, tick: 0 })
  const teamsSnap = useRef([])

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
    timeouts.push(setTimeout(() => setFrame({ name: winnerName, tick: delays.length }), elapsed))

    return () => timeouts.forEach(clearTimeout)
  }, [state, winnerName]) // eslint-disable-line react-hooks/exhaustive-deps

  return frame
}

// ─── Countdown hook ────────────────────────────────────────────────────────────

function useCountdown(activatedAt, totalSeconds) {
  const [remaining, setRemaining] = useState(() => {
    if (!activatedAt || !totalSeconds) return totalSeconds ?? 0
    return Math.max(0, totalSeconds - Math.round((Date.now() - activatedAt) / 1000))
  })

  useEffect(() => {
    if (!activatedAt || !totalSeconds) return
    const tick = () => {
      const elapsed = Math.round((Date.now() - activatedAt) / 1000)
      setRemaining(Math.max(0, totalSeconds - elapsed))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activatedAt, totalSeconds])

  return remaining
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

const GAME_LABELS = {
  blitz: 'BLITZ',
  closest: 'CLOSEST ANSWER',
  beer: 'BEER & KNOWLEDGE',
  'single-team': 'SINGLE TEAM CHALLENGE',
}

const OUTCOME_LABELS = {
  bonus_question: '🎯 Bonus Question',
  beer_game: '🍺 Beer Game',
  blitz: '⚡ Sudden Death Blitz',
  closest_answer: '🎯 Closest Answer',
}

function OutcomeLabel({ outcomeType }) {
  const label = OUTCOME_LABELS[outcomeType]
  if (!label) return null
  return (
    <p style={{
      position: 'absolute', bottom: '3vh', left: '50%', transform: 'translateX(-50%)',
      color: '#333', fontSize: 'clamp(0.65rem, 1.1vw, 0.95rem)',
      fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase',
      whiteSpace: 'nowrap', pointerEvents: 'none',
    }}>
      {label}
    </p>
  )
}

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

function CountdownRing({ seconds, total }) {
  const pct = total > 0 ? seconds / total : 0
  const r = 36, c = 2 * Math.PI * r
  const dash = pct * c
  const urgent = seconds <= 10

  return (
    <div style={{ position: 'relative', width: 96, height: 96 }}>
      <svg width={96} height={96} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={48} cy={48} r={r} fill="none" stroke="#1a1a1a" strokeWidth={5} />
        <circle
          cx={48} cy={48} r={r} fill="none"
          stroke={urgent ? '#ef4444' : '#f97316'}
          strokeWidth={5}
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: 'stroke-dasharray 0.9s linear' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        ...font, fontWeight: 900,
        fontSize: seconds >= 100 ? '1.4rem' : '1.8rem',
        color: urgent ? '#ef4444' : '#fff',
      }}>
        {seconds}
      </div>
    </div>
  )
}

// ─── Prize draw screens (existing) ────────────────────────────────────────────

function SetupScreen({ sessionId, outcomeType }) {
  return (
    <div style={{
      ...font,
      height: '100vh', background: '#0a0a0a', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '7vh', position: 'relative',
    }}>
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

      <div style={{ textAlign: 'center', position: 'relative' }}>
        <p style={{
          color: '#444', fontWeight: 600,
          fontSize: 'clamp(0.75rem, 1.4vw, 1.1rem)',
          textTransform: 'uppercase', letterSpacing: '0.2em',
        }}>
          Players — open your PulseIQ app
        </p>
      </div>

      <OutcomeLabel outcomeType={outcomeType} />
    </div>
  )
}

function DrawActiveScreen({ outcomeType }) {
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

      <OutcomeLabel outcomeType={outcomeType} />
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

function DrawRevealedScreen({ winnerName }) {
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

// ─── Mini game display screens ────────────────────────────────────────────────

// Blitz — question + A/B options + countdown, answer highlighted on reveal
function BlitzDisplay({ miniGame, state, activatedAt }) {
  const countdown = useCountdown(activatedAt, miniGame.countdownSeconds)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (state === 'revealed') {
      const t = setTimeout(() => setVisible(true), 100)
      return () => clearTimeout(t)
    }
    setVisible(false)
  }, [state])

  const answer = miniGame.answer?.toLowerCase()
  const isACorrect = answer === 'a'
  const isBCorrect = answer === 'b'

  const choiceStyle = (isCorrect) => ({
    flex: 1, borderRadius: 20, padding: 'clamp(1.5rem, 3vh, 3rem)',
    border: `3px solid ${state === 'revealed' && isCorrect ? '#4ade80' : '#222'}`,
    background: state === 'revealed' && isCorrect
      ? 'rgba(74,222,128,0.12)'
      : '#141414',
    transition: 'border-color 0.4s, background 0.4s',
    display: 'flex', flexDirection: 'column', gap: '1vh', alignItems: 'flex-start',
  })

  return (
    <FullScreen>
      <style>{`@keyframes slamIn { from { transform:scale(1.15);opacity:0; } to { transform:scale(1);opacity:1; } }`}</style>

      {/* Mode label */}
      <p style={{
        position: 'absolute', top: '3vh', left: '50%', transform: 'translateX(-50%)',
        color: '#f97316', fontWeight: 900, fontSize: 'clamp(0.8rem, 1.5vw, 1.4rem)',
        letterSpacing: '0.3em', textTransform: 'uppercase', whiteSpace: 'nowrap',
      }}>
        ⚡ BLITZ
      </p>

      {/* Countdown */}
      {state === 'active' && (
        <div style={{ position: 'absolute', top: '3vh', right: '3vw' }}>
          <CountdownRing seconds={countdown} total={miniGame.countdownSeconds} />
        </div>
      )}

      <div style={{ width: '100%', maxWidth: '90vw', display: 'flex', flexDirection: 'column', gap: '4vh', padding: '0 3vw' }}>
        {/* Question */}
        <h1 style={{
          color: '#fff', fontWeight: 900, textAlign: 'center',
          fontSize: 'clamp(2rem, 5vw, 6rem)',
          lineHeight: 1.05, letterSpacing: '0.01em',
        }}>
          {miniGame.questionText}
        </h1>

        {/* Choices */}
        <div style={{ display: 'flex', gap: '3vw' }}>
          <div style={choiceStyle(isACorrect)}>
            <span style={{ color: '#f97316', fontWeight: 900, fontSize: 'clamp(1.5rem, 3vw, 3.5rem)', letterSpacing: '0.1em' }}>A</span>
            <span style={{
              color: '#fff', fontWeight: 700, fontSize: 'clamp(1.2rem, 2.5vw, 3rem)',
              lineHeight: 1.1,
              ...(state === 'revealed' && isACorrect ? { animation: 'slamIn 0.4s ease-out' } : {}),
            }}>
              {miniGame.choiceA}
            </span>
            {state === 'revealed' && isACorrect && (
              <span style={{ color: '#4ade80', fontWeight: 900, fontSize: 'clamp(1rem, 2vw, 2rem)', letterSpacing: '0.15em' }}>CORRECT ✓</span>
            )}
          </div>

          <div style={choiceStyle(isBCorrect)}>
            <span style={{ color: '#f97316', fontWeight: 900, fontSize: 'clamp(1.5rem, 3vw, 3.5rem)', letterSpacing: '0.1em' }}>B</span>
            <span style={{
              color: '#fff', fontWeight: 700, fontSize: 'clamp(1.2rem, 2.5vw, 3rem)',
              lineHeight: 1.1,
              ...(state === 'revealed' && isBCorrect ? { animation: 'slamIn 0.4s ease-out' } : {}),
            }}>
              {miniGame.choiceB}
            </span>
            {state === 'revealed' && isBCorrect && (
              <span style={{ color: '#4ade80', fontWeight: 900, fontSize: 'clamp(1rem, 2vw, 2rem)', letterSpacing: '0.15em' }}>CORRECT ✓</span>
            )}
          </div>
        </div>

        {state === 'revealing' && (
          <p style={{ textAlign: 'center', color: '#f97316', fontWeight: 700, fontSize: 'clamp(1rem, 2vw, 2rem)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Revealing…
          </p>
        )}
      </div>
    </FullScreen>
  )
}

// Closest Answer — question + live submissions + sorted reveal
function ClosestDisplay({ miniGame, teams, state, activatedAt }) {
  const countdown = useCountdown(activatedAt, miniGame.countdownSeconds)

  const submissions = miniGame.submissions
    ? Object.entries(miniGame.submissions).map(([teamId, value]) => {
        const team = teams.find(t => t.id === teamId)
        return { teamId, teamName: team?.name ?? '—', value }
      })
    : []

  const answer = parseFloat(miniGame.answer)
  const sorted = state === 'revealed'
    ? [...submissions].sort((a, b) => Math.abs(a.value - answer) - Math.abs(b.value - answer))
    : submissions

  return (
    <FullScreen style={{ gap: '3vh', padding: '6vh 4vw', justifyContent: 'flex-start' }}>
      <p style={{
        color: '#f97316', fontWeight: 900,
        fontSize: 'clamp(0.8rem, 1.5vw, 1.4rem)',
        letterSpacing: '0.3em', textTransform: 'uppercase',
      }}>
        ⚡ CLOSEST ANSWER
      </p>

      <h1 style={{
        color: '#fff', fontWeight: 900, textAlign: 'center',
        fontSize: 'clamp(1.8rem, 4vw, 5rem)',
        lineHeight: 1.05, letterSpacing: '0.01em', maxWidth: '80vw',
      }}>
        {miniGame.questionText}
      </h1>

      {state === 'active' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2vw' }}>
          <CountdownRing seconds={countdown} total={miniGame.countdownSeconds} />
          <p style={{ color: '#555', fontSize: 'clamp(0.8rem, 1.5vw, 1.4rem)', letterSpacing: '0.1em' }}>
            {submissions.length} answer{submissions.length !== 1 ? 's' : ''} in
          </p>
        </div>
      )}

      {/* Submissions list */}
      {submissions.length > 0 && (
        <div style={{ width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map((s, i) => {
            const isWinner = state === 'revealed' && i === 0
            return (
              <div
                key={s.teamId}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 'clamp(0.8rem, 1.5vh, 1.2rem) clamp(1rem, 2vw, 1.5rem)',
                  borderRadius: 14,
                  background: isWinner ? 'rgba(74,222,128,0.1)' : '#141414',
                  border: `2px solid ${isWinner ? '#4ade80' : '#1e1e1e'}`,
                  transition: 'border-color 0.4s, background 0.4s',
                }}
              >
                <span style={{
                  color: '#fff', fontWeight: 700,
                  fontSize: 'clamp(1.1rem, 2.5vw, 2.2rem)',
                }}>
                  {isWinner && '✓ '}{s.teamName}
                </span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    color: isWinner ? '#4ade80' : '#f97316',
                    fontWeight: 900, fontSize: 'clamp(1.4rem, 3vw, 2.8rem)',
                  }}>
                    {s.value}
                  </span>
                  {state === 'revealed' && (
                    <span style={{ color: '#555', fontSize: 'clamp(0.8rem, 1.5vw, 1.3rem)', display: 'block' }}>
                      {Math.abs(s.value - answer) === 0 ? 'exact!' : `off by ${Math.abs(s.value - answer)}`}
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          {state === 'revealed' && (
            <p style={{
              textAlign: 'center', color: '#555',
              fontSize: 'clamp(0.9rem, 1.8vw, 1.6rem)',
              letterSpacing: '0.1em', marginTop: '1vh',
            }}>
              Target: {miniGame.answer}
            </p>
          )}
        </div>
      )}

      {submissions.length === 0 && state === 'active' && (
        <p style={{ color: '#333', fontSize: 'clamp(0.9rem, 2vw, 1.8rem)', letterSpacing: '0.15em' }}>
          Waiting for answers on phones…
        </p>
      )}
    </FullScreen>
  )
}

// Beer & Knowledge — teams face off, question revealed after 3s
function BeerDisplay({ miniGame, teams, state, activatedAt }) {
  const countdown = useCountdown(activatedAt, miniGame.countdownSeconds)
  const [questionVisible, setQuestionVisible] = useState(false)

  useEffect(() => {
    if (state !== 'active') { setQuestionVisible(false); return }
    const t = setTimeout(() => setQuestionVisible(true), 3000)
    return () => clearTimeout(t)
  }, [state])

  const challenger = teams.find(t => t.id === miniGame.targetTeamId)
  const opponent = teams.find(t => t.id === miniGame.opponentTeamId)
  const answer = miniGame.answer?.toLowerCase()
  const isACorrect = answer === 'a'
  const isBCorrect = answer === 'b'

  const choiceStyle = (isCorrect) => ({
    flex: 1, borderRadius: 16, padding: 'clamp(1rem, 2vh, 2rem)',
    border: `2px solid ${state === 'revealed' && isCorrect ? '#4ade80' : '#222'}`,
    background: state === 'revealed' && isCorrect ? 'rgba(74,222,128,0.1)' : '#141414',
    transition: 'border-color 0.4s, background 0.4s',
    display: 'flex', flexDirection: 'column', gap: '1vh',
  })

  return (
    <FullScreen style={{ gap: '3vh', padding: '4vh 4vw' }}>
      <p style={{
        position: 'absolute', top: '3vh', left: '50%', transform: 'translateX(-50%)',
        color: '#f97316', fontWeight: 900,
        fontSize: 'clamp(0.8rem, 1.5vw, 1.4rem)',
        letterSpacing: '0.3em', textTransform: 'uppercase', whiteSpace: 'nowrap',
      }}>
        ⚡ BEER & KNOWLEDGE
      </p>

      {/* Teams matchup */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '3vw', marginTop: '4vh' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <p style={{ color: '#555', fontSize: 'clamp(0.7rem, 1.2vw, 1rem)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.5vh' }}>Challenger</p>
          <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.5rem, 4vw, 5rem)', lineHeight: 1 }}>
            {challenger?.name ?? '—'}
          </h2>
        </div>
        <span style={{ color: '#f97316', fontWeight: 900, fontSize: 'clamp(1.5rem, 4vw, 4rem)' }}>VS</span>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <p style={{ color: '#555', fontSize: 'clamp(0.7rem, 1.2vw, 1rem)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.5vh' }}>Opponent</p>
          <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.5rem, 4vw, 5rem)', lineHeight: 1 }}>
            {opponent?.name ?? '—'}
          </h2>
        </div>
      </div>

      {/* Question (appears after 3s in active, always in other states) */}
      {(questionVisible || state !== 'active') && (
        <div style={{ width: '100%', maxWidth: '85vw', display: 'flex', flexDirection: 'column', gap: '3vh' }}>
          <h1 style={{
            color: '#fff', fontWeight: 900, textAlign: 'center',
            fontSize: 'clamp(1.5rem, 3.5vw, 4.5rem)',
            lineHeight: 1.05,
          }}>
            {miniGame.questionText}
          </h1>

          {(miniGame.choiceA || miniGame.choiceB) && (
            <div style={{ display: 'flex', gap: '2vw' }}>
              <div style={choiceStyle(isACorrect)}>
                <span style={{ color: '#f97316', fontWeight: 900, fontSize: 'clamp(1.2rem, 2.5vw, 3rem)' }}>A</span>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 'clamp(1rem, 2vw, 2.5rem)', lineHeight: 1.1 }}>{miniGame.choiceA}</span>
                {state === 'revealed' && isACorrect && <span style={{ color: '#4ade80', fontWeight: 900, fontSize: 'clamp(0.8rem, 1.5vw, 1.5rem)', letterSpacing: '0.1em' }}>CORRECT ✓</span>}
              </div>
              <div style={choiceStyle(isBCorrect)}>
                <span style={{ color: '#f97316', fontWeight: 900, fontSize: 'clamp(1.2rem, 2.5vw, 3rem)' }}>B</span>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 'clamp(1rem, 2vw, 2.5rem)', lineHeight: 1.1 }}>{miniGame.choiceB}</span>
                {state === 'revealed' && isBCorrect && <span style={{ color: '#4ade80', fontWeight: 900, fontSize: 'clamp(0.8rem, 1.5vw, 1.5rem)', letterSpacing: '0.1em' }}>CORRECT ✓</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {state === 'active' && !questionVisible && (
        <p style={{ color: '#555', fontWeight: 700, fontSize: 'clamp(1.5rem, 3vw, 3rem)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Get ready…
        </p>
      )}

      {state === 'active' && questionVisible && (
        <div style={{ position: 'absolute', bottom: '3vh', right: '3vw' }}>
          <CountdownRing seconds={countdown} total={miniGame.countdownSeconds} />
        </div>
      )}

      {state === 'revealing' && (
        <p style={{ color: '#f97316', fontWeight: 700, fontSize: 'clamp(1rem, 2vw, 2rem)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          Revealing…
        </p>
      )}
    </FullScreen>
  )
}

// Single Team Challenge — one team's moment
function SingleTeamDisplay({ miniGame, teams, state, activatedAt }) {
  const countdown = useCountdown(activatedAt, miniGame.countdownSeconds)
  const targetTeam = teams.find(t => t.id === miniGame.targetTeamId)

  return (
    <FullScreen style={{ gap: '3vh', padding: '4vh 4vw' }}>
      <p style={{
        position: 'absolute', top: '3vh', left: '50%', transform: 'translateX(-50%)',
        color: '#f97316', fontWeight: 900,
        fontSize: 'clamp(0.8rem, 1.5vw, 1.4rem)',
        letterSpacing: '0.3em', textTransform: 'uppercase', whiteSpace: 'nowrap',
      }}>
        ⚡ SINGLE TEAM CHALLENGE
      </p>

      {/* Team name */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#555', fontSize: 'clamp(0.7rem, 1.2vw, 1rem)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1vh' }}>
          On the spot
        </p>
        <h2 style={{
          color: '#f97316', fontWeight: 900,
          fontSize: 'clamp(2.5rem, 7vw, 9rem)',
          lineHeight: 1, textTransform: 'uppercase',
          textShadow: '0 0 30px rgba(249,115,22,0.4)',
        }}>
          {targetTeam?.name ?? '—'}
        </h2>
      </div>

      {/* Question */}
      <h1 style={{
        color: '#fff', fontWeight: 900, textAlign: 'center',
        fontSize: 'clamp(1.5rem, 3.5vw, 5rem)',
        lineHeight: 1.05, maxWidth: '80vw',
      }}>
        {miniGame.questionText}
      </h1>

      {state === 'active' && (
        <div style={{ position: 'absolute', bottom: '3vh', right: '3vw' }}>
          <CountdownRing seconds={countdown} total={miniGame.countdownSeconds} />
        </div>
      )}

      {state === 'revealing' && (
        <p style={{ color: '#f97316', fontWeight: 700, fontSize: 'clamp(1rem, 2vw, 2rem)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          Revealing…
        </p>
      )}

      {state === 'revealed' && (
        <div style={{ textAlign: 'center', marginTop: '1vh' }}>
          <p style={{ color: '#555', fontSize: 'clamp(0.8rem, 1.5vw, 1.4rem)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1vh' }}>
            Correct Answer
          </p>
          <p style={{
            color: '#4ade80', fontWeight: 900,
            fontSize: 'clamp(2rem, 5vw, 7rem)',
            lineHeight: 1,
          }}>
            {miniGame.answer}
          </p>
        </div>
      )}
    </FullScreen>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Display() {
  const { id: sessionId } = useParams()
  const { teams, state, winnerName, loading, mode, miniGame, activatedAt, session } = usePulseSession(sessionId)
  const outcomeType = session?.outcomeType ?? null
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

  if (state === 'setup') return <SetupScreen sessionId={sessionId} outcomeType={outcomeType} />

  // Prize draw — existing screens
  if (!mode || mode === 'draw') {
    if (state === 'active') return <DrawActiveScreen outcomeType={outcomeType} />
    if (state === 'revealing') return <RevealingScreen frame={revealFrame} />
    if (state === 'revealed') return <DrawRevealedScreen winnerName={winnerName} />
    return <SetupScreen sessionId={sessionId} outcomeType={outcomeType} />
  }

  // Mini game screens
  if (mode === 'blitz') {
    return <BlitzDisplay miniGame={miniGame} state={state} activatedAt={activatedAt} />
  }
  if (mode === 'closest') {
    return <ClosestDisplay miniGame={miniGame} teams={teams} state={state} activatedAt={activatedAt} />
  }
  if (mode === 'beer') {
    return <BeerDisplay miniGame={miniGame} teams={teams} state={state} activatedAt={activatedAt} />
  }
  if (mode === 'single-team') {
    return <SingleTeamDisplay miniGame={miniGame} teams={teams} state={state} activatedAt={activatedAt} />
  }

  return <SetupScreen sessionId={sessionId} />
}
