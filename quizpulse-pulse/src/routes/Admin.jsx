import { useState, useCallback, useRef, useEffect } from 'react'
import { usePulseSession } from '@/hooks/usePulseSession'

const font = { fontFamily: "'Barlow Condensed', sans-serif" }

const GAME_TYPES = {
  draw: 'Prize Draw',
  blitz: 'Blitz',
  closest: 'Closest Answer',
  beer: 'Beer & Knowledge',
  'single-team': 'Single Team',
}

const OUTCOME_LABELS = {
  bonus_question: '🎯 Bonus Question',
  beer_game: '🍺 Beer Game',
  blitz: '⚡ Sudden Death Blitz',
  closest_answer: '🎯 Closest Answer',
}

const TYPE_NEEDS_CHOICES = t => t === 'blitz' || t === 'beer'
const TYPE_NEEDS_TEAM = t => t === 'single-team' || t === 'beer'
const TYPE_NEEDS_OPPONENT = t => t === 'beer'

const ANSWER_PLACEHOLDER = {
  blitz: 'A or B',
  closest: 'Target number',
  beer: 'A or B',
  'single-team': 'Correct answer',
}

// ─── Reusable atoms ────────────────────────────────────────────────────────────

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

function TeamRow({ team, onScoreChange, onNameChange, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(team.name)

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

function TypeBadge({ type }) {
  return (
    <span style={{
      ...font, background: '#1a1a1a', color: '#f97316',
      padding: '2px 8px', borderRadius: 6,
      fontSize: 11, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.08em',
      flexShrink: 0,
    }}>
      {GAME_TYPES[type] ?? type}
    </span>
  )
}

function OutcomeBadge({ outcomeType }) {
  const label = OUTCOME_LABELS[outcomeType]
  if (!label) return null
  return (
    <span style={{
      ...font, background: '#1a1a1a', color: '#888',
      padding: '4px 10px', borderRadius: 999,
      fontSize: 11, fontWeight: 600,
      letterSpacing: '0.08em', flexShrink: 0,
    }}>
      {label}
    </span>
  )
}

// ─── Question Bank ────────────────────────────────────────────────────────────

const BLANK_Q = { text: '', type: 'blitz', choiceA: '', choiceB: '', answer: '' }

function QuestionBank({ questions, onAdd, onRemove }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(BLANK_Q)
  const [saving, setSaving] = useState(false)

  const needsChoices = TYPE_NEEDS_CHOICES(draft.type)

  const isValid = draft.text.trim() && draft.answer.trim() &&
    (!needsChoices || (draft.choiceA.trim() && draft.choiceB.trim()))

  const handleSave = useCallback(async () => {
    if (!isValid || saving) return
    setSaving(true)
    await onAdd({
      text: draft.text.trim(),
      type: draft.type,
      choiceA: needsChoices ? draft.choiceA.trim() : null,
      choiceB: needsChoices ? draft.choiceB.trim() : null,
      answer: draft.answer.trim(),
    })
    setDraft(BLANK_Q)
    setSaving(false)
  }, [draft, isValid, needsChoices, onAdd, saving])

  const inputStyle = {
    ...font, width: '100%', background: '#1a1a1a', color: '#fff',
    border: '1px solid #2a2a2a', borderRadius: 8,
    padding: '9px 12px', fontSize: 14, outline: 'none',
    transition: 'border-color 0.15s', boxSizing: 'border-box',
  }

  const sorted = [...questions].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))

  return (
    <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
      {/* Header toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          ...font, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#fff',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Question Bank
        </span>
        <span style={{ color: '#555', fontSize: 13 }}>
          {questions.length} {questions.length === 1 ? 'question' : 'questions'} {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid #1e1e1e' }}>
          {/* Add form */}
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid #1e1e1e' }}>
            <input
              value={draft.text}
              onChange={e => setDraft(d => ({ ...d, text: e.target.value }))}
              placeholder="Question text…"
              maxLength={200}
              className="placeholder-[#444]"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#f97316'}
              onBlur={e => e.target.style.borderColor = '#2a2a2a'}
            />

            {/* Type selector */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['blitz', 'closest', 'beer', 'single-team'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDraft(d => ({ ...d, type: t, choiceA: '', choiceB: '', answer: '' }))}
                  style={{
                    ...font, padding: '5px 12px', borderRadius: 8, fontSize: 12,
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                    border: 'none', cursor: 'pointer',
                    background: draft.type === t ? '#f97316' : '#1a1a1a',
                    color: draft.type === t ? '#fff' : '#555',
                  }}
                >
                  {GAME_TYPES[t]}
                </button>
              ))}
            </div>

            {/* Choice inputs (blitz / beer) */}
            {needsChoices && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input
                  value={draft.choiceA}
                  onChange={e => setDraft(d => ({ ...d, choiceA: e.target.value }))}
                  placeholder="Choice A text…"
                  maxLength={80}
                  className="placeholder-[#444]"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#f97316'}
                  onBlur={e => e.target.style.borderColor = '#2a2a2a'}
                />
                <input
                  value={draft.choiceB}
                  onChange={e => setDraft(d => ({ ...d, choiceB: e.target.value }))}
                  placeholder="Choice B text…"
                  maxLength={80}
                  className="placeholder-[#444]"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#f97316'}
                  onBlur={e => e.target.style.borderColor = '#2a2a2a'}
                />
              </div>
            )}

            {/* Answer */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: '#555', fontSize: 12, flexShrink: 0 }}>Host answer:</span>
              <input
                value={draft.answer}
                onChange={e => setDraft(d => ({ ...d, answer: e.target.value }))}
                placeholder={ANSWER_PLACEHOLDER[draft.type] ?? 'Answer…'}
                maxLength={100}
                className="placeholder-[#444]"
                style={{ ...inputStyle, flex: 1 }}
                onFocus={e => e.target.style.borderColor = '#f97316'}
                onBlur={e => e.target.style.borderColor = '#2a2a2a'}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={!isValid || saving}
              style={{
                ...font, background: '#f97316', border: 'none', borderRadius: 8,
                color: '#fff', fontWeight: 700, fontSize: 14, padding: '10px',
                cursor: isValid && !saving ? 'pointer' : 'not-allowed',
                opacity: isValid && !saving ? 1 : 0.4,
              }}
            >
              {saving ? 'Saving…' : 'Save Question'}
            </button>
          </div>

          {/* Question list */}
          {sorted.length === 0 ? (
            <p style={{ ...font, textAlign: 'center', color: '#333', padding: '16px 0', fontSize: 13 }}>
              No questions yet.
            </p>
          ) : (
            sorted.map(q => (
              <div
                key={q.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 16px', borderBottom: '1px solid #1e1e1e',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ ...font, color: '#fff', fontSize: 14 }}>{q.text}</span>
                  {q.choiceA && (
                    <span style={{ ...font, color: '#555', fontSize: 12, display: 'block', marginTop: 2 }}>
                      A: {q.choiceA} · B: {q.choiceB} · ✓ {q.answer}
                    </span>
                  )}
                  {!q.choiceA && (
                    <span style={{ ...font, color: '#555', fontSize: 12, display: 'block', marginTop: 2 }}>
                      Answer: {q.answer}
                    </span>
                  )}
                </div>
                <TypeBadge type={q.type} />
                <button
                  onClick={() => onRemove(q.id)}
                  style={{
                    ...font, background: 'none', border: 'none', cursor: 'pointer',
                    color: '#555', fontSize: 20, lineHeight: 1, flexShrink: 0,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#888'}
                  onMouseLeave={e => e.currentTarget.style.color = '#555'}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Trigger selector ─────────────────────────────────────────────────────────

const BLANK_TRIGGER = { mode: null, question: null, targetTeamId: null, opponentTeamId: null }

function TriggerSelector({ trigger, setTrigger, teams, questions, onFire, onFireDraw }) {
  const filteredQuestions = questions.filter(q => q.type === trigger.mode)

  const canFire = trigger.mode === 'draw' ||
    (trigger.question !== null && (
      trigger.mode === 'blitz' ||
      trigger.mode === 'closest' ||
      (trigger.mode === 'single-team' && trigger.targetTeamId !== null) ||
      (trigger.mode === 'beer' && trigger.targetTeamId !== null && trigger.opponentTeamId !== null)
    ))

  const modeBtn = (mode) => (
    <button
      key={mode}
      type="button"
      onClick={() => setTrigger({ ...BLANK_TRIGGER, mode })}
      style={{
        ...font, padding: '8px 14px', borderRadius: 8, fontSize: 13,
        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
        border: 'none', cursor: 'pointer',
        background: trigger.mode === mode ? '#f97316' : '#1e1e1e',
        color: trigger.mode === mode ? '#fff' : '#888',
      }}
    >
      {GAME_TYPES[mode]}
    </button>
  )

  const teamBtn = (team, selected, onClick) => (
    <button
      key={team.id}
      type="button"
      onClick={onClick}
      style={{
        ...font, padding: '8px 14px', borderRadius: 8, fontSize: 13,
        fontWeight: 700, border: 'none', cursor: 'pointer',
        background: selected ? '#f97316' : '#1e1e1e',
        color: selected ? '#fff' : '#888',
      }}
    >
      {team.name}
    </button>
  )

  return (
    <div style={{ background: '#141414', border: '1px solid #f97316', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Step 1: mode */}
      <div>
        <p style={{ ...font, color: '#555', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
          Step 1 — Game type
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['draw', 'blitz', 'closest', 'beer', 'single-team'].map(modeBtn)}
        </div>
      </div>

      {/* Step 2: question (not draw) */}
      {trigger.mode && trigger.mode !== 'draw' && (
        <div>
          <p style={{ ...font, color: '#555', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Step 2 — Question
          </p>
          {filteredQuestions.length === 0 ? (
            <p style={{ ...font, color: '#555', fontSize: 13 }}>
              No {GAME_TYPES[trigger.mode]} questions in bank. Add some above.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filteredQuestions.map(q => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setTrigger(t => ({ ...t, question: q, targetTeamId: null, opponentTeamId: null }))}
                  style={{
                    ...font, textAlign: 'left', padding: '9px 12px', borderRadius: 8, fontSize: 14,
                    border: `1px solid ${trigger.question?.id === q.id ? '#f97316' : '#2a2a2a'}`,
                    background: trigger.question?.id === q.id ? 'rgba(249,115,22,0.1)' : '#1a1a1a',
                    color: '#fff', cursor: 'pointer',
                  }}
                >
                  {q.text}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: team picker (single-team, beer) */}
      {trigger.question && TYPE_NEEDS_TEAM(trigger.mode) && (
        <div>
          <p style={{ ...font, color: '#555', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            {trigger.mode === 'beer' ? 'Step 3 — Challenger team' : 'Step 3 — Team'}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {teams.map(t => teamBtn(t, trigger.targetTeamId === t.id,
              () => setTrigger(tr => ({ ...tr, targetTeamId: t.id, opponentTeamId: tr.opponentTeamId === t.id ? null : tr.opponentTeamId }))
            ))}
          </div>

          {/* Beer opponent */}
          {trigger.mode === 'beer' && trigger.targetTeamId && (
            <div style={{ marginTop: 12 }}>
              <p style={{ ...font, color: '#555', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                Opponent team
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {teams.filter(t => t.id !== trigger.targetTeamId).map(t =>
                  teamBtn(t, trigger.opponentTeamId === t.id,
                    () => setTrigger(tr => ({ ...tr, opponentTeamId: t.id }))
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fire / cancel */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          onClick={canFire ? (trigger.mode === 'draw' ? onFireDraw : onFire) : undefined}
          disabled={!canFire}
          style={{
            ...font, flex: 1, background: '#f97316', border: 'none', borderRadius: 12,
            color: '#fff', fontWeight: 900, fontSize: '1.1rem',
            padding: '14px', cursor: canFire ? 'pointer' : 'not-allowed',
            opacity: canFire ? 1 : 0.35, letterSpacing: '0.05em',
            boxShadow: canFire ? '0 0 20px rgba(249,115,22,0.35)' : 'none',
            transition: 'opacity 0.15s, box-shadow 0.15s',
          }}
        >
          ⚡ Fire Pulse
        </button>
        <button
          onClick={() => setTrigger(null)}
          style={{
            ...font, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12,
            color: '#555', fontWeight: 700, fontSize: 14, padding: '14px 18px', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const SESSION_KEY = 'pulseAdminSessionId'

export default function Admin() {
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(SESSION_KEY))
  const [newTeamName, setNewTeamName] = useState('')
  const [creating, setCreating] = useState(false)
  const [trigger, setTrigger] = useState(null)

  const {
    session,
    teams,
    questions,
    state,
    mode,
    miniGame,
    winnerName,
    loading,
    createSession,
    addTeam,
    updateTeamScore,
    updateTeamName,
    removeTeam,
    activatePulse,
    activatePulseWithGame,
    revealWinner,
    revealMiniGame,
    confirmReveal,
    resetSession,
    addQuestion,
    removeQuestion,
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
    setTrigger(null)
  }, [])

  const handleAddTeam = useCallback(async (e) => {
    e.preventDefault()
    const name = newTeamName.trim()
    if (!name) return
    setNewTeamName('')
    await addTeam(name)
  }, [newTeamName, addTeam])

  const handleFireDraw = useCallback(async () => {
    setTrigger(null)
    await activatePulse()
  }, [activatePulse])

  const handleFireGame = useCallback(async () => {
    if (!trigger?.question || !trigger?.mode) return
    setTrigger(null)
    await activatePulseWithGame(trigger.mode, {
      questionText: trigger.question.text,
      type: trigger.mode,
      choiceA: trigger.question.choiceA ?? null,
      choiceB: trigger.question.choiceB ?? null,
      answer: trigger.question.answer,
      targetTeamId: trigger.targetTeamId ?? null,
      opponentTeamId: trigger.opponentTeamId ?? null,
    })
  }, [trigger, activatePulseWithGame])

  const isMiniGame = mode && mode !== 'draw'

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
    if (!isMiniGame) {
      // Prize draw — existing UI
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

    // Mini game revealing / revealed
    return (
      <div style={{ ...font, minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <StateBadge state={state} />
          <TypeBadge type={mode} />
        </div>
        {miniGame?.questionText && (
          <p style={{ color: '#888', fontSize: 16, textAlign: 'center', maxWidth: 380, marginTop: 4 }}>{miniGame.questionText}</p>
        )}
        {state === 'revealing' && (
          <p style={{ color: '#555', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Showing on display screen…
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          {state === 'revealing' && (
            <button
              onClick={confirmReveal}
              style={{
                ...font, background: '#f97316', border: 'none', borderRadius: 12,
                color: '#fff', fontWeight: 900, fontSize: '1rem',
                padding: '12px 28px', cursor: 'pointer',
                boxShadow: '0 0 20px rgba(249,115,22,0.35)',
              }}
            >
              Confirm Result
            </button>
          )}
          {state === 'revealed' && (
            <button
              onClick={resetSession}
              style={{
                ...font, background: '#f97316', border: 'none', borderRadius: 12,
                color: '#fff', fontWeight: 900, fontSize: '1rem',
                padding: '12px 28px', cursor: 'pointer',
              }}
            >
              Reset &amp; Run Again
            </button>
          )}
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

  // ─── Active ───────────────────────────────────────────────────────────────────
  if (state === 'active') {
    return (
      <div style={{ ...font, minHeight: '100vh', background: '#0a0a0a', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 520, margin: '0 auto', width: '100%' }}>
          <h1 style={{ color: '#f97316', fontWeight: 900, fontSize: 20, letterSpacing: '0.25em', textTransform: 'uppercase' }}>Pulse Button</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isMiniGame && <TypeBadge type={mode} />}
            <OutcomeBadge outcomeType={session?.outcomeType} />
            <StateBadge state={state} />
          </div>
        </div>

        <div style={{ maxWidth: 520, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
          {isMiniGame && miniGame?.questionText && (
            <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ color: '#555', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Question</p>
              <p style={{ color: '#fff', fontSize: 16, lineHeight: 1.4 }}>{miniGame.questionText}</p>
              {miniGame.choiceA && (
                <p style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
                  A: {miniGame.choiceA} · B: {miniGame.choiceB} · ✓ {miniGame.answer}
                </p>
              )}
              {!miniGame.choiceA && (
                <p style={{ color: '#888', fontSize: 13, marginTop: 6 }}>Answer: {miniGame.answer}</p>
              )}
            </div>
          )}

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

          <button
            onClick={isMiniGame ? revealMiniGame : revealWinner}
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
            {isMiniGame ? 'Reveal' : 'Reveal Winner'}
          </button>
        </div>
      </div>
    )
  }

  // ─── Setup ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ ...font, minHeight: '100vh', background: '#0a0a0a', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 520, margin: '0 auto', width: '100%' }}>
        <h1 style={{ color: '#f97316', fontWeight: 900, fontSize: 20, letterSpacing: '0.25em', textTransform: 'uppercase' }}>
          Pulse Button
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <OutcomeBadge outcomeType={session?.outcomeType} />
          <StateBadge state={state} />
        </div>
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

        {/* Question bank */}
        <QuestionBank questions={questions} onAdd={addQuestion} onRemove={removeQuestion} />

        {/* Trigger */}
        {!trigger ? (
          <button
            onClick={() => setTrigger(BLANK_TRIGGER)}
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
        ) : (
          <TriggerSelector
            trigger={trigger}
            setTrigger={setTrigger}
            teams={teams}
            questions={questions}
            onFire={handleFireGame}
            onFireDraw={handleFireDraw}
          />
        )}

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
