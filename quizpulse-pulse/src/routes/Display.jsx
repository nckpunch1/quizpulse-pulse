import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { usePulseSession } from '@/hooks/usePulseSession'
import { ref as rtdbRef, onValue } from 'firebase/database'
import { db } from '@/lib/firebase'

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
          PULSE READY
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
          PULSE IS ACTIVE
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
  const idx = miniGame?.currentQuestionIndex ?? session?.currentGame?.currentQuestionIndex ?? 0
  const currentQ = Array.isArray(miniGame?.questions)
    ? (miniGame.questions[idx] ?? {})
    : { text: miniGame?.questionText, choiceA: miniGame?.choiceA, choiceB: miniGame?.choiceB }

  const choiceA = currentQ.choiceA ?? currentQ.choices?.[0]
  const choiceB = currentQ.choiceB ?? currentQ.choices?.[1]

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
          {currentQ.text ?? currentQ.question}
        </h1>

        <div style={{ display: 'flex', gap: '3vw' }}>
          <div style={{
            flex: 1, borderRadius: 20,
            padding: 'clamp(1.5rem, 3vh, 3rem)',
            border: '3px solid #222', background: '#141414',
            display: 'flex', flexDirection: 'column', gap: '1vh', alignItems: 'flex-start',
          }}>
            <span style={{ color: '#f97316', fontWeight: 900, fontSize: 'clamp(1.5rem, 3vw, 3.5rem)', letterSpacing: '0.1em' }}>A</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 'clamp(1.2rem, 2.5vw, 3rem)', lineHeight: 1.1 }}>{choiceA}</span>
          </div>
          <div style={{
            flex: 1, borderRadius: 20,
            padding: 'clamp(1.5rem, 3vh, 3rem)',
            border: '3px solid #222', background: '#141414',
            display: 'flex', flexDirection: 'column', gap: '1vh', alignItems: 'flex-start',
          }}>
            <span style={{ color: '#f97316', fontWeight: 900, fontSize: 'clamp(1.5rem, 3vw, 3.5rem)', letterSpacing: '0.1em' }}>B</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 'clamp(1.2rem, 2.5vw, 3rem)', lineHeight: 1.1 }}>{choiceB}</span>
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
        {miniGame?.question ?? miniGame?.questionText}
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
        {miniGame?.question ?? miniGame?.questionText}
      </h2>
    </FullScreen>
  )
}

// ─── Shock The Room display ───────────────────────────────────────────────────

function ShockTheRoomDisplay({ game }) {
  const isPulse = game.result === 'pulse'
  const isFlatline = game.result === 'flatline'
  const isCharging = game.phase === 'charging'
  const isShocked = game.phase === 'shocked'
  const isChoosing = game.phase === 'choosing'
  const isComplete = game.phase === 'complete'
  const isFinal = game.isFinalRound

  return (
    <div style={{
      height: '100vh',
      background: isShocked && isPulse
        ? '#001a00'
        : isShocked && isFlatline
        ? '#1a0000'
        : '#0a0a0f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Barlow Condensed', sans-serif",
      overflow: 'hidden',
      position: 'relative',
      transition: 'background 0.5s ease',
    }}>

      <style>{`
        @keyframes electricPulse {
          0%, 100% { opacity: 0.4; transform: scaleY(1); }
          50% { opacity: 1; transform: scaleY(1.3); }
        }
        @keyframes heartbeat {
          0% { stroke-dashoffset: 1000; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px #00ff88; }
          50% { box-shadow: 0 0 60px #00ff88, 0 0 100px #00ff88; }
        }
        @keyframes flatlineGlow {
          0%, 100% { box-shadow: 0 0 20px #ff2222; }
          50% { box-shadow: 0 0 60px #ff2222; }
        }
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes chargeFlicker {
          0%, 100% { opacity: 1; }
          45% { opacity: 0.7; }
          50% { opacity: 1; }
          70% { opacity: 0.5; }
          75% { opacity: 1; }
        }
      `}</style>

      {/* Round + Players info */}
      <div style={{
        position: 'absolute', top: '4vh',
        display: 'flex', gap: '3vw',
        fontSize: 'clamp(0.8rem, 1.5vw, 1.4rem)',
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: '0.2em', textTransform: 'uppercase',
      }}>
        <span>Round {game.round}</span>
        <span>·</span>
        <span>{game.playersIn} remaining</span>
        {isFinal && (
          <span style={{ color: '#f97316', fontWeight: 900 }}>
            · FINAL ROUND
          </span>
        )}
      </div>

      {/* Main title */}
      {!isShocked && !isComplete && (
        <p style={{
          fontSize: 'clamp(2rem, 5vw, 4.5rem)',
          fontWeight: 900,
          color: '#ffffff',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: '4vh',
          animation: isCharging
            ? 'chargeFlicker 0.3s ease-in-out infinite'
            : 'none',
        }}>
          {isFinal ? '⚡ FINAL SHOWDOWN' : '⚡ SHOCK THE ROOM'}
        </p>
      )}

      {/* Voting instruction */}
      {isChoosing && (
        <div style={{
          display: 'flex', gap: '6vw',
          animation: 'fadeInUp 0.4s ease',
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 'clamp(3rem,8vw,7rem)' }}>🙌</p>
            <p style={{
              fontSize: 'clamp(1.2rem,3vw,2.5rem)',
              fontWeight: 900, color: '#00ff88',
              letterSpacing: '0.1em',
            }}>
              HANDS UP
            </p>
            <p style={{
              color: '#00ff88', opacity: 0.7,
              fontSize: 'clamp(0.8rem,1.5vw,1.2rem)',
            }}>
              = PULSE
            </p>
          </div>
          <div style={{
            width: 2, background: 'rgba(255,255,255,0.15)',
            borderRadius: 2,
          }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 'clamp(3rem,8vw,7rem)' }}>🤲</p>
            <p style={{
              fontSize: 'clamp(1.2rem,3vw,2.5rem)',
              fontWeight: 900, color: '#ff4444',
              letterSpacing: '0.1em',
            }}>
              HANDS DOWN
            </p>
            <p style={{
              color: '#ff4444', opacity: 0.7,
              fontSize: 'clamp(0.8rem,1.5vw,1.2rem)',
            }}>
              = FLATLINE
            </p>
          </div>
        </div>
      )}

      {/* Charging animation */}
      {isCharging && (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '3vh',
          animation: 'fadeInUp 0.3s ease',
        }}>
          <div style={{ display: 'flex', gap: '4vw', alignItems: 'center' }}>
            {/* Left paddle */}
            <div style={{
              width: 'clamp(60px,8vw,100px)',
              height: 'clamp(80px,12vw,140px)',
              background: 'linear-gradient(180deg, #444 0%, #222 100%)',
              borderRadius: 12,
              border: '3px solid #f97316',
              boxShadow: '0 0 30px rgba(249,115,22,0.6)',
              animation: 'electricPulse 0.4s ease-in-out infinite',
            }} />

            {/* ECG flat line with electric sparks */}
            <div style={{
              width: 'clamp(150px,25vw,350px)',
              position: 'relative',
            }}>
              <svg width="100%" height="60" viewBox="0 0 300 60">
                <line x1="0" y1="30" x2="300" y2="30"
                  stroke="#f97316" strokeWidth="3"
                  opacity="0.8" />
                {[50, 100, 150, 200, 250].map((x, i) => (
                  <line key={i}
                    x1={x} y1="20" x2={x + 10} y2="40"
                    stroke="#fff" strokeWidth="2"
                    style={{
                      animation: `electricPulse ${0.2 + i * 0.05}s ease-in-out infinite`,
                      animationDelay: `${i * 0.08}s`,
                    }}
                  />
                ))}
              </svg>
            </div>

            {/* Right paddle */}
            <div style={{
              width: 'clamp(60px,8vw,100px)',
              height: 'clamp(80px,12vw,140px)',
              background: 'linear-gradient(180deg, #444 0%, #222 100%)',
              borderRadius: 12,
              border: '3px solid #f97316',
              boxShadow: '0 0 30px rgba(249,115,22,0.6)',
              animation: 'electricPulse 0.4s ease-in-out infinite 0.2s',
            }} />
          </div>
          <p style={{
            color: '#f97316', fontWeight: 900,
            fontSize: 'clamp(1.5rem,4vw,3.5rem)',
            letterSpacing: '0.3em',
            animation: 'chargeFlicker 0.3s infinite',
          }}>
            CHARGING...
          </p>
        </div>
      )}

      {/* Result — PULSE */}
      {isShocked && isPulse && (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '3vh',
          animation: 'fadeInUp 0.3s ease',
        }}>
          <p style={{
            fontSize: 'clamp(3rem,9vw,8rem)',
            fontWeight: 900, color: '#00ff88',
            letterSpacing: '0.1em',
            animation: 'glowPulse 1.5s ease-in-out infinite',
            textShadow: '0 0 40px #00ff88',
          }}>
            💚 PULSE!
          </p>
          <svg width="clamp(200px,50vw,600px)" height="80" viewBox="0 0 600 80">
            <polyline
              points="0,40 100,40 130,40 150,5 170,75 190,40 220,40 260,40 290,40 310,5 330,75 350,40 380,40 600,40"
              fill="none"
              stroke="#00ff88"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 1000,
                strokeDashoffset: 0,
                animation: 'heartbeat 1s ease-out forwards',
              }}
            />
          </svg>
          <p style={{
            color: 'rgba(0,255,136,0.6)',
            fontSize: 'clamp(0.9rem,2vw,1.5rem)',
            letterSpacing: '0.2em',
          }}>
            HANDS UP SURVIVE
          </p>
        </div>
      )}

      {/* Result — FLATLINE */}
      {isShocked && isFlatline && (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '3vh',
          animation: 'shakeX 0.5s ease',
        }}>
          <p style={{
            fontSize: 'clamp(3rem,9vw,8rem)',
            fontWeight: 900, color: '#ff2222',
            letterSpacing: '0.1em',
            textShadow: '0 0 40px #ff2222',
            animation: 'flatlineGlow 1.5s ease-in-out infinite',
          }}>
            💀 FLATLINE
          </p>
          <svg width="clamp(200px,50vw,600px)" height="80" viewBox="0 0 600 80">
            <line x1="0" y1="40" x2="600" y2="40"
              stroke="#ff2222" strokeWidth="4"
              strokeLinecap="round" />
          </svg>
          <p style={{
            color: 'rgba(255,34,34,0.6)',
            fontSize: 'clamp(0.9rem,2vw,1.5rem)',
            letterSpacing: '0.2em',
          }}>
            HANDS DOWN SURVIVE
          </p>
        </div>
      )}

      {/* Complete — Winner */}
      {isComplete && (
        <div style={{
          textAlign: 'center',
          animation: 'fadeInUp 0.5s ease',
        }}>
          <p style={{
            fontSize: 'clamp(1.5rem,4vw,3rem)',
            color: '#f97316', fontWeight: 900,
            letterSpacing: '0.2em', marginBottom: '2vh',
          }}>
            🏆 SURVIVOR
          </p>
          <p style={{
            fontSize: 'clamp(3rem,10vw,9rem)',
            fontWeight: 900, color: '#ffffff',
            lineHeight: 1,
            textShadow: '0 0 40px rgba(249,115,22,0.5)',
          }}>
            {game.winnerName ?? 'WINNER'}
          </p>
        </div>
      )}

      {/* Bottom label */}
      <p style={{
        position: 'absolute', bottom: '3vh',
        color: 'rgba(255,255,255,0.15)',
        fontSize: 'clamp(0.6rem,1vw,0.9rem)',
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
      }}>
        Shock The Room
      </p>
    </div>
  )
}

// ─── Prize Drop display ───────────────────────────────────────────────────────

function PrizeDropDisplay({ prizeName }) {
  const [phase, setPhase] = useState('intro')
  // intro → spinning → revealing → revealed

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('spinning'), 500)
    const t2 = setTimeout(() => setPhase('revealing'), 3500)
    const t3 = setTimeout(() => setPhase('revealed'), 4200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  const fakeSlots = ['🎁', '⚡', '🏆', '🎯', '💥',
    '🎁', '⚡', '🏆', '🎯', '💥']

  return (
    <div style={{
      height: '100vh',
      background: '#0a0a0f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Barlow Condensed', sans-serif",
      overflow: 'hidden',
      position: 'relative',
    }}>
      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes prizeIntro {
          0% { opacity: 0; transform: translateY(-40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes slotSpin {
          0% { transform: translateY(0); }
          100% { transform: translateY(-1000px); }
        }
        @keyframes slotSlowSpin {
          0% { transform: translateY(0); }
          100% { transform: translateY(-400px); }
        }
        @keyframes prizeDrop {
          0% {
            transform: translateY(-120vh) rotate(-3deg) scale(1.3);
            opacity: 0;
          }
          60% {
            transform: translateY(18px) rotate(1deg) scale(0.97);
            opacity: 1;
          }
          75% {
            transform: translateY(-8px) rotate(-0.5deg) scale(1.01);
          }
          90% { transform: translateY(4px) rotate(0); }
          100% { transform: translateY(0) rotate(0) scale(1); }
        }
        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 30px rgba(249,115,22,0.4),
                        0 0 60px rgba(249,115,22,0.1);
          }
          50% {
            box-shadow: 0 0 60px rgba(249,115,22,0.8),
                        0 0 120px rgba(249,115,22,0.3),
                        0 0 200px rgba(249,115,22,0.1);
          }
        }
        @keyframes electricFlicker {
          0%, 100% { opacity: 1; }
          92% { opacity: 1; }
          93% { opacity: 0.3; }
          94% { opacity: 1; }
          97% { opacity: 0.5; }
          98% { opacity: 1; }
        }
        @keyframes particleFloat {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-200px) rotate(720deg); opacity: 0; }
        }
        @keyframes screenFlash {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.15; }
        }
      `}</style>

      {/* Scanline effect */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.03) 50%)',
        backgroundSize: '100% 4px',
        pointerEvents: 'none', zIndex: 1,
      }} />

      {/* Screen flash on reveal */}
      {phase === 'revealing' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: '#f97316',
          animation: 'screenFlash 0.4s ease',
          zIndex: 2, pointerEvents: 'none',
        }} />
      )}

      {/* Floating particles when revealed */}
      {phase === 'revealed' && (
        ['✨','⭐','💥','✨','⭐','💫','✨','⭐'].map((s, i) => (
          <div key={i} style={{
            position: 'absolute',
            fontSize: 'clamp(1rem,2.5vw,2rem)',
            left: `${8 + i * 12}%`,
            bottom: `${20 + (i % 3) * 15}%`,
            animation: `particleFloat ${1.5 + i * 0.2}s ease-out forwards`,
            animationDelay: `${i * 0.1}s`,
            zIndex: 2,
          }}>{s}</div>
        ))
      )}

      {/* INTRO PHASE */}
      {phase === 'intro' && (
        <div style={{
          textAlign: 'center',
          animation: 'prizeIntro 0.4s ease',
          zIndex: 3,
        }}>
          <p style={{
            fontSize: 'clamp(1rem,3vw,2.5rem)',
            color: '#f97316',
            fontWeight: 700,
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            marginBottom: '3vh',
          }}>
            ⚡ Prize Drop
          </p>
          <p style={{
            fontSize: 'clamp(2rem,7vw,6rem)',
            fontWeight: 900,
            color: 'rgba(255,255,255,0.15)',
            letterSpacing: '0.1em',
          }}>
            LOADING...
          </p>
        </div>
      )}

      {/* SPINNING PHASE — slot machine */}
      {(phase === 'spinning' || phase === 'revealing') && (
        <div style={{
          textAlign: 'center', zIndex: 3,
          width: '100%',
        }}>
          <p style={{
            fontSize: 'clamp(0.8rem,1.8vw,1.5rem)',
            color: '#f97316',
            fontWeight: 700,
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            marginBottom: '4vh',
            animation: 'electricFlicker 2s infinite',
          }}>
            ⚡ Prize Drop
          </p>

          {/* Slot window */}
          <div style={{
            position: 'relative',
            width: 'clamp(280px,60vw,700px)',
            height: 'clamp(100px,18vh,180px)',
            margin: '0 auto',
            overflow: 'hidden',
            border: '2px solid rgba(249,115,22,0.5)',
            borderRadius: 16,
            background: '#111',
            boxShadow: '0 0 40px rgba(249,115,22,0.2)',
          }}>
            {/* Top fade */}
            <div style={{
              position: 'absolute', top: 0, left: 0,
              right: 0, height: '30%', zIndex: 2,
              background: 'linear-gradient(#111, transparent)',
            }} />
            {/* Bottom fade */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0,
              right: 0, height: '30%', zIndex: 2,
              background: 'linear-gradient(transparent, #111)',
            }} />
            {/* Center highlight line */}
            <div style={{
              position: 'absolute', top: '50%',
              left: 0, right: 0, height: 2,
              background: 'rgba(249,115,22,0.6)',
              transform: 'translateY(-50%)', zIndex: 3,
              boxShadow: '0 0 10px rgba(249,115,22,0.8)',
            }} />

            {/* Spinning tiles */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              animation: phase === 'spinning'
                ? 'slotSpin 0.3s linear infinite'
                : 'slotSlowSpin 0.8s ease-out forwards',
            }}>
              {[...fakeSlots, ...fakeSlots, prizeName].map(
                (item, i) => (
                  <div key={i} style={{
                    height: 'clamp(100px,18vh,180px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'clamp(1.5rem,4vw,3.5rem)',
                    fontWeight: 900,
                    color: item === prizeName
                      ? '#f97316' : 'rgba(255,255,255,0.4)',
                    letterSpacing: '0.05em',
                    flexShrink: 0,
                    width: '100%',
                    textAlign: 'center',
                    padding: '0 1rem',
                  }}>
                    {item}
                  </div>
                )
              )}
            </div>
          </div>

          <p style={{
            marginTop: '3vh',
            fontSize: 'clamp(0.7rem,1.2vw,1rem)',
            color: 'rgba(255,255,255,0.2)',
            letterSpacing: '0.2em',
          }}>
            SELECTING PRIZE...
          </p>
        </div>
      )}

      {/* REVEALED PHASE */}
      {phase === 'revealed' && (
        <div style={{
          textAlign: 'center', zIndex: 3,
          width: '100%', padding: '0 4vw',
        }}>
          <p style={{
            fontSize: 'clamp(0.8rem,1.8vw,1.5rem)',
            color: '#f97316',
            fontWeight: 700,
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            marginBottom: '3vh',
          }}>
            🎁 Tonight's Prize
          </p>

          <div style={{
            background: 'linear-gradient(135deg, #1a0f00, #0f0f1a)',
            border: '2px solid rgba(249,115,22,0.6)',
            borderRadius: 20,
            padding: 'clamp(2rem,5vw,4rem) clamp(3rem,8vw,7rem)',
            maxWidth: '80vw',
            margin: '0 auto',
            animation: 'prizeDrop 0.7s cubic-bezier(0.34,1.2,0.64,1), pulseGlow 2s ease-in-out infinite',
          }}>
            <p style={{
              fontSize: 'clamp(2.5rem,8vw,7.5rem)',
              fontWeight: 900,
              color: '#ffffff',
              lineHeight: 1.1,
              margin: 0,
              textShadow: '0 0 40px rgba(249,115,22,0.4)',
            }}>
              {prizeName}
            </p>
          </div>

          <p style={{
            marginTop: '3vh',
            fontSize: 'clamp(0.7rem,1.2vw,1rem)',
            color: 'rgba(255,255,255,0.25)',
            letterSpacing: '0.2em',
          }}>
            Speak to your host to claim
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Display() {
  const { id: sessionId } = useParams()
  const { teams, state, winnerName, loading, session } = usePulseSession(sessionId)

  const audioRef = useRef(null)
  const chargingAudioRef = useRef(null)
  const successAudioRef = useRef(null)
  const flatlineAudioRef = useRef(null)
  const beerAudioRef = useRef(null)
  const prizesAudioRef = useRef(null)
  const [audioEnabled, setAudioEnabled] = useState(false)

  const [rtdbConnected, setRtdbConnected] = useState(true)
  const [shockGame, setShockGame] = useState(null)

  useEffect(() => {
    const connRef = rtdbRef(db, '.info/connected')
    const unsub = onValue(connRef, (snap) => {
      setRtdbConnected(snap.val() === true)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!sessionId) return
    const shockRef = rtdbRef(db, `shockTheRoom/${sessionId}`)
    const unsubShock = onValue(shockRef, snap => {
      setShockGame(snap.val())
    })
    return () => unsubShock()
  }, [sessionId])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !audioEnabled) return

    // Play when session is live, stop when released
    const sessionIsLive = session?.state === 'active'
      || session?.state === 'game_active'
      || session?.state === 'pulse_active'

    const muteBackground =
      (shockGame && shockGame.phase !== null && shockGame.phase !== 'complete') ||
      currentGame?.type === 'beer_shock' ||
      currentGame?.type === 'prize_drop'

    if (sessionIsLive && audioEnabled && !muteBackground) {
      if (audio.paused) {
        audio.play().catch(console.error)
      }
    } else {
      audio.pause()
      if (!sessionIsLive) audio.currentTime = 0
    }
  }, [session?.state, audioEnabled, shockGame, currentGame?.type])

  useEffect(() => {
    if (!audioEnabled) return

    const charging = chargingAudioRef.current
    const success = successAudioRef.current
    const flatline = flatlineAudioRef.current
    if (!charging || !success || !flatline) return

    const stopAll = () => {
      charging.pause()
      charging.currentTime = 0
      success.pause()
      success.currentTime = 0
      flatline.pause()
      flatline.currentTime = 0
    }

    if (!shockGame || shockGame.phase === null
      || shockGame.phase === 'idle') {
      stopAll()
      return
    }

    if (shockGame.phase === 'charging') {
      stopAll()
      charging.play().catch(console.error)
      return
    }

    if (shockGame.phase === 'shocked') {
      stopAll()
      if (shockGame.result === 'pulse') {
        success.play().catch(console.error)
      } else if (shockGame.result === 'flatline') {
        flatline.play().catch(console.error)
      }
      return
    }

    if (shockGame.phase === 'choosing'
      || shockGame.phase === 'complete') {
      stopAll()
    }
  }, [shockGame?.phase, shockGame?.result, audioEnabled])

  useEffect(() => {
    if (!audioEnabled) return

    const beer = beerAudioRef.current
    const prizes = prizesAudioRef.current
    if (!beer || !prizes) return

    const type = currentGame?.type
    const phase = currentGame?.phase

    beer.pause()
    beer.currentTime = 0
    prizes.pause()
    prizes.currentTime = 0

    if (type === 'beer_shock' && phase === 'active') {
      beer.play().catch(console.error)
      return
    }

    if (type === 'prize_drop' && phase === 'active') {
      prizes.play().catch(console.error)
      return
    }
  }, [currentGame?.type, currentGame?.phase, currentGame?.startedAt, audioEnabled])

  const outcomeType = session?.outcomeType ?? session?.gameType ?? null
  const miniGame = session?.currentGame ?? session?.miniGame ?? null
  const currentGame = session?.currentGame

  console.log('session data:', session)
  console.log('currentGame:', session?.currentGame)

  const landingTarget =
    outcomeType === 'blitz' ? 'SUDDEN DEATH BLITZ' :
    outcomeType === 'closest_answer' ? 'CLOSEST ANSWER CHALLENGE' :
    winnerName

  const revealFrame = useRevealAnimation(state, landingTarget, teams)

  if (!sessionId) {
    return (
      <div style={{ ...font, height: '100vh', background: '#0a0a0a',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '2vh' }}>
        <p style={{ color: '#f97316', fontSize: '2rem' }}>⚡</p>
        <p style={{ color: '#555', fontSize: '1rem',
          fontFamily: 'monospace', textAlign: 'center', padding: '0 2rem' }}>
          No session ID in URL.
          <br />
          Open this page from the Host Console → Pulse tab → Open Display.
        </p>
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

  if (shockGame && shockGame.phase !== null && shockGame.phase !== 'idle') {
    return <ShockTheRoomDisplay game={shockGame} />
  }

  if (currentGame?.type === 'closest_answer' && currentGame?.phase === 'active') {
    return (
      <div style={{
        height: '100vh', background: '#0a0a0f',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Barlow Condensed', sans-serif",
        padding: '4vw',
      }}>
        <style>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <p style={{
          fontSize: 'clamp(0.8rem,1.5vw,1.2rem)',
          color: '#f97316', fontWeight: 700,
          letterSpacing: '0.3em', textTransform: 'uppercase',
          marginBottom: '3vh', animation: 'fadeUp 0.4s ease',
        }}>
          🎯 Closest Answer
        </p>
        <p style={{
          fontSize: 'clamp(1.8rem,5vw,4.5rem)',
          fontWeight: 900, color: '#ffffff',
          textAlign: 'center', lineHeight: 1.2,
          maxWidth: '80vw',
          animation: 'fadeUp 0.5s ease 0.15s both',
        }}>
          {currentGame.question}
        </p>
        <p style={{
          marginTop: '4vh',
          fontSize: 'clamp(0.8rem,1.5vw,1.2rem)',
          color: 'rgba(255,255,255,0.3)',
          animation: 'fadeUp 0.5s ease 0.3s both',
        }}>
          Write your answer — closest wins
        </p>
      </div>
    )
  }

  if (currentGame?.type === 'beer_shock' && currentGame?.phase === 'active') {
    return (
      <div style={{
        height: '100vh',
        background: 'radial-gradient(ellipse at center, #1a0f00 0%, #0a0a0a 70%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Barlow Condensed', sans-serif",
        overflow: 'hidden', position: 'relative',
      }}>
        <style>{`
          @keyframes bubble {
            0% { transform: translateY(100vh) scale(0.5); opacity: 0; }
            50% { opacity: 0.6; }
            100% { transform: translateY(-10vh) scale(1.2); opacity: 0; }
          }
          @keyframes beerReveal {
            0% { opacity: 0; transform: scale(0.3) rotate(-5deg); }
            60% { transform: scale(1.08) rotate(1deg); }
            100% { opacity: 1; transform: scale(1) rotate(0deg); }
          }
          @keyframes glowAmber {
            0%, 100% { text-shadow: 0 0 30px rgba(251,191,36,0.5); }
            50% { text-shadow: 0 0 60px rgba(251,191,36,0.9), 0 0 100px rgba(251,191,36,0.4); }
          }
        `}</style>

        {[...Array(12)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: `${8 + Math.random() * 20}px`,
            height: `${8 + Math.random() * 20}px`,
            borderRadius: '50%',
            background: 'rgba(251,191,36,0.3)',
            left: `${Math.random() * 100}%`,
            animation: `bubble ${2 + Math.random() * 3}s ease-in infinite`,
            animationDelay: `${Math.random() * 3}s`,
          }} />
        ))}

        <p style={{
          fontSize: 'clamp(3rem,10vw,9rem)',
          marginBottom: '2vh', zIndex: 1,
          animation: 'beerReveal 0.6s cubic-bezier(0.34,1.56,0.64,1)',
        }}>🍺</p>

        <p style={{
          fontSize: 'clamp(1rem,2.5vw,2rem)',
          color: '#fbbf24', fontWeight: 700,
          letterSpacing: '0.3em', textTransform: 'uppercase',
          marginBottom: '2vh', zIndex: 1,
          animation: 'beerReveal 0.5s ease 0.2s both',
        }}>
          Beer Shock
        </p>

        <p style={{
          fontSize: 'clamp(3rem,9vw,8rem)',
          fontWeight: 900, color: '#ffffff',
          textAlign: 'center', zIndex: 1,
          lineHeight: 1, maxWidth: '90vw',
          animation: 'beerReveal 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both',
          animationFillMode: 'both',
        }}>
          {currentGame.teamName}
        </p>

        <p style={{
          marginTop: '3vh', zIndex: 1,
          fontSize: 'clamp(0.8rem,1.5vw,1.3rem)',
          color: 'rgba(251,191,36,0.6)',
          letterSpacing: '0.15em',
          animation: 'glowAmber 2s ease-in-out infinite',
        }}>
          First to finish drinks gets to answer
        </p>
      </div>
    )
  }

  if (currentGame?.type === 'prize_drop') {
    return <PrizeDropDisplay
      prizeName={currentGame.prizeName}
      key={currentGame.startedAt}
    />
  }

  let screen
  if (state === 'setup' || state === 'complete') screen = <IdleScreen />
  else if (state === 'active') screen = <ActiveScreen />
  else if (state === 'revealing') screen = <RevealingScreen frame={revealFrame} />
  else if (state === 'revealed') screen = <RevealedScreen displayText={landingTarget} />
  else if (state === 'game_active') {
    if (outcomeType === 'blitz') screen = <BlitzGameScreen miniGame={miniGame} session={session} />
    else if (outcomeType === 'closest_answer') screen = <ClosestGameScreen miniGame={miniGame} />
    else screen = <BonusGameScreen miniGame={miniGame} winnerName={winnerName} outcomeType={outcomeType} />
  } else {
    screen = <IdleScreen />
  }

  return (
    <>
      {!audioEnabled && (
        <div
          onClick={() => setAudioEnabled(true)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', gap: '1rem',
          }}
        >
          <p style={{ fontSize: '3rem' }}>🔊</p>
          <p style={{
            color: '#fff', fontWeight: 800,
            fontSize: 'clamp(1rem, 3vw, 2rem)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Click to enable audio
          </p>
          <p style={{ color: '#555', fontSize: '0.9rem' }}>
            Required once per session
          </p>
        </div>
      )}
      {screen}
      {!rtdbConnected && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '2vh',
        }}>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg) } }
          `}</style>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '3px solid rgba(249,115,22,0.2)',
            borderTopColor: '#f97316',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{
            color: '#f97316', fontWeight: 800,
            fontSize: 'clamp(1rem,2vw,2rem)',
            letterSpacing: '0.2em', textTransform: 'uppercase',
          }}>
            Reconnecting...
          </p>
        </div>
      )}
      <audio
        ref={audioRef}
        src="/OrangeArenaPulse.mp3"
        preload="auto"
      />
      <audio ref={chargingAudioRef}
        src="/Charging.aif" preload="auto" loop />
      <audio ref={successAudioRef}
        src="/SuccessShock.aif" preload="auto" />
      <audio ref={flatlineAudioRef}
        src="/Flatline.aif" preload="auto" />
      <audio ref={beerAudioRef}
        src="/Beer.mp3" preload="auto" />
      <audio ref={prizesAudioRef}
        src="/prizes.mp3" preload="auto" />
    </>
  )
}
