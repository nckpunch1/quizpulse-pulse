import { useState, useCallback, useRef, useEffect } from 'react'
import { usePulseSession } from '@/hooks/usePulseSession'

const font = { fontFamily: "'Barlow Condensed', sans-serif" }

// ─── Pulse score dot picker ───────────────────────────────────────────────────
// Dots 1–4. Clicking a dot sets score to N; clicking the active dot clears to 0.

function DotPicker({ value, onChange, disabled = false }) {
  const [tip, setTip] = useState(false)

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
      {[1, 2, 3, 4].map(n => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(value === n ? 0 : n)}
          aria-label={`Pulse score ${n}`}
          style={{
            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
            background: n <= value ? '#f97316' : 'transparent',
            border: `2px solid ${n <= value ? '#f97316' : '#444'}`,
            cursor: disabled ? 'default' : 'pointer',
            transition: 'background 0.15s, border-color 0.15s',
            padding: 0,
          }}
        />
      ))}
      <button
        type="button"
        tabIndex={-1}
        onMouseEnter={() => setTip(true)}
        onMouseLeave={() => setTip(false)}
        style={{
          ...font, background: 'none', border: 'none', color: '#444',
          fontSize: 13, cursor: 'default', lineHeight: 1, padding: '0 2px',
        }}
      >
        ?
      </button>
      {tip && (
        <div style={{
          ...font,
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          background: '#1c1c1c', border: '1px solid #2a2a2a', borderRadius: 8,
          padding: '8px 12px', color: '#888', fontSize: 12,
          whiteSpace: 'nowrap', zIndex: 20, lineHeight: 1.7,
        }}>
          0 dots = 1 entry · 1 = 2 · 2 = 4 · 3 = 7 · 4 = 12<br />
          Click to set; re-click to clear.
        </div>
      )}
    </div>
  )
}

// ─── Session link copy box ────────────────────────────────────────────────────

function SessionLink({ label, url }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(null)

  const copy = useCallback(() => {
    navigator.clipboard.writeText(url).catch(() => {})
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1500)
  }, [url])

  return (
    <button
      onClick={copy}
      style={{
        ...font, background: '#141414', border: '1px solid #222',
        borderRadius: 12, padding: '12px 14px', textAlign: 'left',
        width: '100%', cursor: 'pointer', transition: 'border-color 0.15s',
        display: 'block',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#f97316'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#222'}
    >
      <div style={{ color: '#555', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: '#f97316', fontSize: 12, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {url}
      </div>
      <div style={{ color: '#555', fontSize: 11, marginTop: 4 }}>
        {copied ? '✓ Copied' : 'Tap to copy'}
      </div>
    </button>
  )
}

// ─── Team row ─────────────────────────────────────────────────────────────────
// Name is always editable inline; blur or Enter commits.

function TeamRow({ team, onScoreChange, onNameChange, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(team.name)

  // Sync draft if name changes externally
  useEffect(() => {
    if (!editing) setDraft(team.name)
  }, [team.name, editing])

  const commit = useCallback(() => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== team.name) onNameChange(trimmed)
    else setDraft(team.name)
    setEditing(false)
  }, [draft, team.name, onNameChange])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit() }
    if (e.key === 'Escape') { setDraft(team.name); setEditing(false) }
  }, [commit, team.name])

  return (
    <div
      className="last:border-b-0"
      style={{ ...font, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #1e1e1e' }}
    >
      {editing ? (
        <input
          autoFocus
          value={draft}
          maxLength={40}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          style={{
            ...font, flex: 1, background: '#1a1a1a', color: '#fff',
            border: '1px solid #f97316', borderRadius: 8,
            padding: '6px 12px', fontSize: 15, outline: 'none', minWidth: 0,
          }}
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          style={{
            ...font, flex: 1, textAlign: 'left', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 15, color: '#fff', minWidth: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#f97316'}
          onMouseLeave={e => e.currentTarget.style.color = '#fff'}
        >
          {team.name}
        </button>
      )}

      <DotPicker value={team.pulseScore} onChange={onScoreChange} />

      <button
        onClick={onRemove}
        aria-label={`Remove ${team.name}`}
        style={{
          ...font, background: 'none', border: 'none', cursor: 'pointer',
          color: '#555', fontSize: 20, lineHeight: 1, flexShrink: 0,
          width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#888'}
        onMouseLeave={e => e.currentTarget.style.color = '#555'}
      >
        ×
      </button>
    </div>
  )
}

// ─── State badge ──────────────────────────────────────────────────────────────

function StateBadge({ state }) {
  const look = {
    setup:     { bg: '#1a1a1a', color: '#555' },
    active:    { bg: 'rgba(74,222,128,0.12)', color: '#4ade80' },
    revealing: { bg: '#f97316', color: '#fff' },
    revealed:  { bg: '#f97316', color: '#fff' },
  }
  const labels = { setup: 'Setup', active: 'Live', revealing: 'Revealing', revealed: 'Revealed' }
  const c = look[state] ?? look.setup
  return (
    <span style={{
      ...font, background: c.bg, color: c.color,
      padding: '4px 12px', borderRadius: 999,
      fontSize: 11, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.1em',
    }}>
      {labels[state] ?? state}
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const SESSION_KEY = 'pulseAdminSessionId'

export default function Admin() {
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(SESSION_KEY))
  const [newTeamName, setNewTeamName] = useState('')
  const [creating, setCreating] = useState(false)

  const {
    teams,
    state,
    winnerName,
    loading,
    createSession,
    addTeam,
    updateTeamScore,
    updateTeamName,
    removeTeam,
    activatePulse,
    revealWinner,
    resetSession,
  } = usePulseSession(sessionId)

  const handleCreateSession = useCallback(async () => {
    setCreating(true)
    const id = await createSession()
    localStorage.setItem(SESSION_KEY, id)
    setSessionId(id)
    setCreating(false)
  }, [createSession])

  const handleNewSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setSessionId(null)
  }, [])

  const handleAddTeam = useCallback(async (e) => {
    e.preventDefault()
    const name = newTeamName.trim()
    if (!name) return
    setNewTeamName('')
    await addTeam(name)
  }, [newTeamName, addTeam])

  // ─── No session ─────────────────────────────────────────────────────────────
  if (!sessionId) {
    return (
      <div style={{ ...font, minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: '#f97316',
            margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
          }}>
            ⚡
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: '#f97316', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 6 }}>
            Pulse Button
          </h1>
          <p style={{ color: '#555', marginBottom: 40, fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Admin Panel
          </p>
          <button
            onClick={handleCreateSession}
            disabled={creating}
            style={{
              ...font, background: '#f97316', border: 'none', borderRadius: 16,
              color: '#fff', fontWeight: 900, fontSize: '1.1rem',
              padding: '14px 40px', cursor: creating ? 'not-allowed' : 'pointer',
              opacity: creating ? 0.5 : 1, letterSpacing: '0.05em',
            }}
          >
            {creating ? 'Creating…' : 'Start New Session'}
          </button>
        </div>
      </div>
    )
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ ...font, minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#555', letterSpacing: '0.1em', fontSize: 14 }}>Connecting…</p>
      </div>
    )
  }

  const baseUrl = window.location.origin
  const displayUrl = `${baseUrl}/display/${sessionId}`
  const playUrl    = `${baseUrl}/play/${sessionId}`

  // ─── Revealing / Revealed ────────────────────────────────────────────────────
  if (state === 'revealing' || state === 'revealed') {
    return (
      <div style={{ ...font, minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <StateBadge state={state} />
        <p style={{ color: '#555', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 8 }}>Winner</p>
        <h2 style={{ fontSize: 56, fontWeight: 900, color: '#fff', textAlign: 'center', lineHeight: 1.1 }}>{winnerName}</h2>
        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <button
            onClick={resetSession}
            disabled={state === 'revealing'}
            style={{
              ...font, background: '#f97316', border: 'none', borderRadius: 12,
              color: '#fff', fontWeight: 900, fontSize: '1rem',
              padding: '12px 28px', cursor: state === 'revealing' ? 'not-allowed' : 'pointer',
              opacity: state === 'revealing' ? 0.4 : 1,
            }}
          >
            Reset &amp; Run Again
          </button>
          <button
            onClick={handleNewSession}
            style={{
              ...font, background: '#141414', border: '1px solid #222', borderRadius: 12,
              color: '#888', fontWeight: 700, fontSize: '1rem',
              padding: '12px 28px', cursor: 'pointer',
            }}
          >
            New Session
          </button>
        </div>
      </div>
    )
  }

  // ─── Active (pulse is live) ───────────────────────────────────────────────────
  if (state === 'active') {
    return (
      <div style={{ ...font, minHeight: '100vh', background: '#0a0a0a', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 520, margin: '0 auto', width: '100%' }}>
          <h1 style={{ color: '#f97316', fontWeight: 900, fontSize: 20, letterSpacing: '0.25em', textTransform: 'uppercase' }}>Pulse Button</h1>
          <StateBadge state={state} />
        </div>

        <div style={{ maxWidth: 520, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
          {/* Teams — scores still editable in case of last-second changes */}
          <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
            {teams.map(team => (
              <TeamRow
                key={team.id}
                team={team}
                onScoreChange={score => updateTeamScore(team.id, score)}
                onNameChange={name => updateTeamName(team.id, name)}
                onRemove={() => removeTeam(team.id)}
              />
            ))}
          </div>

          {/* Reveal — big, unmissable */}
          <button
            onClick={revealWinner}
            disabled={teams.length === 0}
            style={{
              ...font, background: '#f97316', border: 'none', borderRadius: 16,
              color: '#fff', fontWeight: 900, fontSize: '1.25rem',
              padding: '20px', width: '100%', letterSpacing: '0.05em',
              cursor: teams.length === 0 ? 'not-allowed' : 'pointer',
              opacity: teams.length === 0 ? 0.4 : 1, marginTop: 'auto',
              boxShadow: '0 0 30px rgba(249,115,22,0.3)',
              transition: 'box-shadow 0.2s',
            }}
            onMouseEnter={e => { if (teams.length > 0) e.currentTarget.style.boxShadow = '0 0 40px rgba(249,115,22,0.5)' }}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 30px rgba(249,115,22,0.3)'}
          >
            Reveal Winner
          </button>
        </div>
      </div>
    )
  }

  // ─── Setup ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ ...font, minHeight: '100vh', background: '#0a0a0a', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 520, margin: '0 auto', width: '100%' }}>
        <h1 style={{ color: '#f97316', fontWeight: 900, fontSize: 20, letterSpacing: '0.25em', textTransform: 'uppercase' }}>
          Pulse Button
        </h1>
        <StateBadge state={state} />
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Share links */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <SessionLink label="Display screen" url={displayUrl} />
          <SessionLink label="Player link" url={playUrl} />
        </div>

        {/* Add team form */}
        <form onSubmit={handleAddTeam} style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={newTeamName}
            onChange={e => setNewTeamName(e.target.value)}
            placeholder="Team name…"
            maxLength={40}
            className="placeholder-[#444]"
            style={{
              ...font, flex: 1, background: '#141414', color: '#fff',
              border: '1px solid #222', borderRadius: 12,
              padding: '12px 16px', fontSize: 15, outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = '#f97316'}
            onBlur={e => e.target.style.borderColor = '#222'}
          />
          <button
            type="submit"
            disabled={!newTeamName.trim()}
            style={{
              ...font, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12,
              color: '#fff', fontWeight: 700, fontSize: 15, padding: '12px 20px',
              cursor: newTeamName.trim() ? 'pointer' : 'not-allowed',
              opacity: newTeamName.trim() ? 1 : 0.4,
            }}
          >
            Add
          </button>
        </form>

        {/* Team list */}
        {teams.length > 0 ? (
          <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
            {teams.map(team => (
              <TeamRow
                key={team.id}
                team={team}
                onScoreChange={score => updateTeamScore(team.id, score)}
                onNameChange={name => updateTeamName(team.id, name)}
                onRemove={() => removeTeam(team.id)}
              />
            ))}
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: '#333', padding: '24px 0', fontSize: 14 }}>
            Add at least one team to start.
          </p>
        )}

        {/* Trigger button */}
        <button
          onClick={activatePulse}
          disabled={teams.length === 0}
          style={{
            ...font, background: '#f97316', border: 'none', borderRadius: 16,
            color: '#fff', fontWeight: 900, fontSize: '1.25rem',
            padding: '18px', width: '100%', letterSpacing: '0.05em',
            cursor: teams.length === 0 ? 'not-allowed' : 'pointer',
            opacity: teams.length === 0 ? 0.4 : 1, marginTop: 8,
            boxShadow: 'none', transition: 'box-shadow 0.2s',
          }}
          onMouseEnter={e => { if (teams.length > 0) e.currentTarget.style.boxShadow = '0 0 30px rgba(249,115,22,0.4)' }}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
        >
          Trigger Pulse Button
        </button>

        <button
          onClick={handleNewSession}
          style={{
            ...font, background: 'none', border: 'none', cursor: 'pointer',
            color: '#333', fontSize: 13, padding: '8px', textAlign: 'center',
            letterSpacing: '0.05em', transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#555'}
          onMouseLeave={e => e.currentTarget.style.color = '#333'}
        >
          New Session
        </button>
      </div>
    </div>
  )
}
