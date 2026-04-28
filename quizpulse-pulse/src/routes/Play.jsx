import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { usePulseSession } from '@/hooks/usePulseSession'

const TEAM_KEY = (sessionId) => `pulse_team_${sessionId}`

const BG = 'radial-gradient(ellipse at center, #1a0800 0%, #0d0500 60%, #000 100%)'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&display=swap');

  .play-font, .play-font * {
    font-family: 'Barlow Condensed', sans-serif;
  }

  @keyframes orbit {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes orbit-reverse {
    from { transform: rotate(0deg); }
    to   { transform: rotate(-360deg); }
  }
  @keyframes pulse-glow {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50%      { opacity: 1;   transform: scale(1.05); }
  }
  @keyframes tap-burst {
    0%   { box-shadow: 0 0 0 0 rgba(249,115,22,0.8); }
    100% { box-shadow: 0 0 0 80px transparent; }
  }
  @keyframes slam-in {
    0%   { transform: scale(1.4); opacity: 0; }
    100% { transform: scale(1);   opacity: 1; }
  }
  @keyframes watch-pulse {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50%      { opacity: 0.9; transform: scale(1.06); }
  }

  .ring-1 {
    width: 280px; height: 160px;
    border: 2px solid rgba(249,115,22,0.6);
    border-radius: 50%;
    box-shadow: 0 0 30px rgba(249,115,22,0.3);
    animation: orbit 8s linear infinite;
    position: absolute;
  }
  .ring-2 {
    width: 220px; height: 130px;
    border: 1px solid rgba(234,88,12,0.4);
    border-radius: 50%;
    box-shadow: 0 0 20px rgba(234,88,12,0.2);
    animation: orbit-reverse 6s linear infinite;
    position: absolute;
  }

  .tap-btn {
    width: 220px; height: 220px; border-radius: 50%;
    background: radial-gradient(circle, #1f0900 0%, #0d0500 70%);
    border: 2px solid #f97316;
    box-shadow: 0 0 40px rgba(249,115,22,0.4), inset 0 0 30px rgba(249,115,22,0.1);
    animation: pulse-glow 2s ease-in-out infinite;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    transition: box-shadow 0.15s, transform 0.15s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    user-select: none;
    -webkit-user-select: none;
    outline: none;
    cursor: pointer;
  }
  @media (hover: hover) {
    .tap-btn:hover {
      box-shadow: 0 0 80px rgba(249,115,22,0.7);
      transform: scale(1.04);
      animation: none;
    }
  }
  .tap-btn:active { transform: scale(0.96); }

  .slam-in      { animation: slam-in 0.3s ease-out; }
  .slam-in-slow { animation: slam-in 0.4s ease-out; }
  .bolt-pulse   { display: inline-block; animation: pulse-glow 2s ease-in-out infinite; }
  .watch-dot    { animation: watch-pulse 2.2s ease-in-out infinite; }
`

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function Screen({ children }) {
  return (
    <div
      className="play-font"
      style={{
        height: '100dvh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        position: 'relative',
        background: BG,
      }}
    >
      {children}
    </div>
  )
}

function Logo() {
  return (
    <div
      style={{
        position: 'absolute',
        top: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 700,
        fontSize: '1.1rem',
        letterSpacing: '0.3em',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: '#f97316' }}>⚡</span>
      <span style={{ color: '#fff' }}> QUIZPULSE</span>
    </div>
  )
}

const GAME_LABELS = {
  blitz: 'BLITZ',
  closest: 'CLOSEST ANSWER',
  beer: 'BEER & KNOWLEDGE',
  'single-team': 'SINGLE TEAM CHALLENGE',
}

// ─── Team picker ──────────────────────────────────────────────────────────────

function TeamPicker({ teams, onSelect }) {
  return (
    <Screen>
      <Logo />
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1
          style={{
            color: '#fff',
            fontWeight: 900,
            fontSize: '3rem',
            lineHeight: 1,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Which team<br />are you on?
        </h1>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 320 }}>
        {teams.map(team => (
          <button
            key={team.id}
            onClick={() => onSelect(team.id)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(249,115,22,0.25)',
              borderRadius: '0.75rem',
              padding: '1.1rem 1.5rem',
              textAlign: 'left',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <span
              style={{
                color: '#fff',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: '1.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {team.name}
            </span>
          </button>
        ))}
      </div>
    </Screen>
  )
}

// ─── Waiting (setup state) ────────────────────────────────────────────────────

function WaitingScreen() {
  return (
    <Screen>
      <Logo />
      <div style={{ position: 'relative', width: 300, height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="ring-1" />
        <div className="ring-2" />
        <span
          style={{
            position: 'relative',
            zIndex: 1,
            color: '#fff',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: '2.5rem',
            letterSpacing: '0.05em',
          }}
        >
          STAND BY
        </span>
      </div>
      <p
        style={{
          color: '#7a4a20',
          fontSize: '0.95rem',
          letterSpacing: '0.1em',
          textAlign: 'center',
          maxWidth: 260,
          marginTop: '1.5rem',
        }}
      >
        Get ready to tap when the host says go
      </p>
    </Screen>
  )
}

// ─── Prize draw active — tap button ──────────────────────────────────────────

function DrawActiveScreen({ onTap }) {
  const [tapped, setTapped] = useState(false)

  const handleTap = useCallback(() => {
    if (tapped) return
    setTapped(true)
    onTap()
    if ('vibrate' in navigator) navigator.vibrate(18)
  }, [tapped, onTap])

  if (tapped) {
    return (
      <Screen>
        <Logo />
        <span className="slam-in" style={{ color: '#f97316', fontSize: '5rem', lineHeight: 1 }}>✓</span>
        <h2
          style={{
            color: '#fff',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: '2rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            textAlign: 'center',
            marginTop: '1rem',
          }}
        >
          YOU'RE IN THE DRAW
        </h2>
        <p style={{ color: '#7a4a20', fontSize: '1rem', marginTop: '0.5rem' }}>
          The Pulse is choosing...
        </p>
      </Screen>
    )
  }

  return (
    <Screen>
      <Logo />
      <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
        <div
          style={{
            color: '#f97316',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: '2rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          PULSE BUTTON
        </div>
        <div
          style={{
            color: '#fff',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: '3.5rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginTop: '-0.5rem',
          }}
        >
          IS LIVE
        </div>
      </div>

      <button className="tap-btn" onPointerDown={handleTap}>
        <span style={{ color: '#f97316', fontSize: '4rem', lineHeight: 1, pointerEvents: 'none' }}>⚡</span>
        <span
          style={{
            color: '#fff',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: '1.4rem',
            letterSpacing: '0.1em',
            pointerEvents: 'none',
          }}
        >
          TAP
        </span>
      </button>

      <p
        style={{
          color: '#f97316',
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700,
          fontSize: '0.85rem',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          marginTop: '1.5rem',
        }}
      >
        HOLD IT DOWN AND CHEER!
      </p>
    </Screen>
  )
}

// ─── Watching screen (non-closest mini games) ─────────────────────────────────

function WatchingScreen({ teamName, mode }) {
  return (
    <Screen>
      <Logo />
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        <span
          className="watch-dot"
          style={{ color: '#f97316', fontSize: '3.5rem', lineHeight: 1 }}
        >
          ⚡
        </span>

        <div>
          <p style={{ color: '#7a4a20', fontSize: '0.9rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            {GAME_LABELS[mode] ?? mode}
          </p>
          <h1
            style={{
              color: '#fff',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900,
              fontSize: 'clamp(2rem, 8vw, 3rem)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              lineHeight: 1,
            }}
          >
            {teamName}
          </h1>
        </div>

        <p style={{ color: '#7a4a20', fontSize: '1rem', letterSpacing: '0.12em', textTransform: 'uppercase', maxWidth: 240, lineHeight: 1.5 }}>
          Watch the big screen
        </p>
      </div>
    </Screen>
  )
}

// ─── Closest Answer input screen ──────────────────────────────────────────────

function ClosestAnswerScreen({ miniGame, teamId, existingSubmission, onSubmit }) {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = useCallback(async () => {
    const num = parseFloat(value)
    if (isNaN(num) || submitting) return
    setSubmitting(true)
    await onSubmit(teamId, num)
  }, [value, teamId, submitting, onSubmit])

  if (existingSubmission != null) {
    return (
      <Screen>
        <Logo />
        <span className="slam-in" style={{ color: '#f97316', fontSize: '4rem', lineHeight: 1 }}>✓</span>
        <h2
          style={{
            color: '#fff',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: '2rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            textAlign: 'center',
            marginTop: '1rem',
          }}
        >
          Answer locked in
        </h2>
        <p style={{ color: '#7a4a20', fontSize: '1.1rem', marginTop: '0.5rem', letterSpacing: '0.05em' }}>
          Your answer: <strong style={{ color: '#f97316' }}>{existingSubmission}</strong>
        </p>
        <p style={{ color: '#555', fontSize: '0.9rem', marginTop: '0.5rem', letterSpacing: '0.1em' }}>
          Watch the big screen
        </p>
      </Screen>
    )
  }

  return (
    <Screen>
      <Logo />
      <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#f97316', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            CLOSEST ANSWER
          </p>
          <h2 style={{
            color: '#fff',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: 'clamp(1.4rem, 5vw, 2rem)',
            lineHeight: 1.2,
            letterSpacing: '0.02em',
          }}>
            {miniGame.questionText}
          </h2>
        </div>

        <input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Your number…"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.06)',
            border: '2px solid rgba(249,115,22,0.4)',
            borderRadius: '1rem',
            color: '#fff',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: '2.5rem',
            textAlign: 'center',
            padding: '1rem',
            outline: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'textfield',
          }}
          onFocus={e => e.target.style.borderColor = '#f97316'}
          onBlur={e => e.target.style.borderColor = 'rgba(249,115,22,0.4)'}
        />

        <button
          onClick={handleSubmit}
          disabled={!value.trim() || isNaN(parseFloat(value)) || submitting}
          style={{
            width: '100%',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: '1.6rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: '#fff',
            background: '#f97316',
            border: 'none',
            borderRadius: '1rem',
            padding: '1.1rem',
            cursor: (!value.trim() || isNaN(parseFloat(value)) || submitting) ? 'not-allowed' : 'pointer',
            opacity: (!value.trim() || isNaN(parseFloat(value)) || submitting) ? 0.4 : 1,
            WebkitTapHighlightColor: 'transparent',
            boxShadow: '0 0 20px rgba(249,115,22,0.3)',
            transition: 'opacity 0.15s',
          }}
        >
          {submitting ? 'Locking in…' : 'Submit'}
        </button>
      </div>
    </Screen>
  )
}

// ─── Revealing ────────────────────────────────────────────────────────────────

function RevealingScreen({ mode }) {
  if (mode && mode !== 'draw') {
    return (
      <Screen>
        <Logo />
        <span className="watch-dot" style={{ color: '#f97316', fontSize: '3.5rem', lineHeight: 1 }}>⚡</span>
        <h2 style={{
          color: '#fff',
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 900,
          fontSize: '2rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          textAlign: 'center',
          marginTop: '1rem',
        }}>
          Watch the big screen
        </h2>
      </Screen>
    )
  }

  return (
    <Screen>
      <Logo />
      <span className="slam-in" style={{ color: '#f97316', fontSize: '5rem', lineHeight: 1 }}>✓</span>
      <h2
        style={{
          color: '#fff',
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 900,
          fontSize: '2rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          textAlign: 'center',
          marginTop: '1rem',
        }}
      >
        YOU'RE IN THE DRAW
      </h2>
      <p style={{ color: '#7a4a20', fontSize: '1rem', marginTop: '0.5rem' }}>
        The Pulse is choosing...
      </p>
    </Screen>
  )
}

// ─── Revealed ─────────────────────────────────────────────────────────────────

function RevealedScreen({ winnerName, mode }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  if (mode && mode !== 'draw') {
    return (
      <Screen>
        <Logo />
        <div style={{ textAlign: 'center', opacity: visible ? 1 : 0, transition: 'opacity 0.5s' }}>
          <span className="bolt-pulse" style={{ color: '#f97316', fontSize: '3rem', lineHeight: 1 }}>⚡</span>
          <h2 style={{
            color: '#fff',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: '2rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginTop: '1rem',
          }}>
            Round complete!
          </h2>
        </div>
      </Screen>
    )
  }

  return (
    <Screen>
      <Logo />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 2rem',
          transition: 'opacity 0.7s ease-out, transform 0.7s ease-out',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(1.5rem)',
        }}
      >
        <p
          style={{
            color: '#7a4a20',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: '1rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: '1rem',
          }}
        >
          THE PULSE HAS CHOSEN...
        </p>
        <h1
          className="slam-in-slow"
          style={{
            color: '#fff',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: 'clamp(2rem, 8vw, 3.5rem)',
            textTransform: 'uppercase',
            lineHeight: 1,
            textShadow: '0 0 40px rgba(249,115,22,0.8)',
          }}
        >
          {winnerName}
        </h1>
        <span className="bolt-pulse" style={{ color: '#f97316', fontSize: '2.5rem', lineHeight: 1, marginTop: '1.5rem' }}>
          ⚡
        </span>
      </div>
    </Screen>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Play() {
  const { id: sessionId } = useParams()
  const { teams, state, mode, miniGame, winnerId, winnerName, loading, submitAnswer } = usePulseSession(sessionId)

  const [selectedTeamId, setSelectedTeamId] = useState(() =>
    sessionId ? localStorage.getItem(TEAM_KEY(sessionId)) : null
  )
  const [tapCount, setTapCount] = useState(0)

  const prevStateRef = useRef(null)
  useEffect(() => {
    if (state === 'active' && prevStateRef.current !== 'active') setTapCount(0)
    prevStateRef.current = state
  }, [state])

  const selectTeam = useCallback((teamId) => {
    if (sessionId) localStorage.setItem(TEAM_KEY(sessionId), teamId)
    setSelectedTeamId(teamId)
  }, [sessionId])

  const handleTap = useCallback(() => setTapCount(c => c + 1), [])

  const selectedTeam = teams.find(t => t.id === selectedTeamId) ?? null
  const isMiniGame = mode && mode !== 'draw'
  const existingSubmission = miniGame?.submissions?.[selectedTeamId] ?? null

  let content

  if (!sessionId) {
    content = (
      <Screen>
        <p style={{ color: '#7a4a20', textAlign: 'center', fontSize: '1.25rem' }}>Invalid session link.</p>
      </Screen>
    )
  } else if (loading) {
    content = (
      <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#7a4a20' }} />
      </div>
    )
  } else if (!state) {
    content = (
      <Screen>
        <p style={{ color: '#7a4a20', textAlign: 'center', fontSize: '1.25rem' }}>Session not found.</p>
      </Screen>
    )
  } else if (!selectedTeam && teams.length > 0) {
    content = <TeamPicker teams={teams} onSelect={selectTeam} />
  } else if (!selectedTeam) {
    content = (
      <Screen>
        <Logo />
        <p style={{ color: '#7a4a20', textAlign: 'center', fontSize: '1.1rem', maxWidth: 280 }}>
          Teams haven't been set up yet — check back soon.
        </p>
      </Screen>
    )
  } else if (state === 'setup') {
    content = <WaitingScreen />
  } else if (state === 'active') {
    if (mode === 'closest') {
      content = (
        <ClosestAnswerScreen
          miniGame={miniGame}
          teamId={selectedTeamId}
          existingSubmission={existingSubmission}
          onSubmit={submitAnswer}
        />
      )
    } else if (isMiniGame) {
      content = <WatchingScreen teamName={selectedTeam.name} mode={mode} />
    } else {
      content = <DrawActiveScreen onTap={handleTap} />
    }
  } else if (state === 'revealing') {
    content = <RevealingScreen mode={mode} />
  } else if (state === 'revealed') {
    content = <RevealedScreen winnerName={winnerName ?? ''} mode={mode} />
  } else {
    content = <WaitingScreen />
  }

  return (
    <>
      <style>{STYLES}</style>
      {content}
    </>
  )
}
