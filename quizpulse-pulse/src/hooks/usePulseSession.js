/**
 * usePulseSession
 *
 * Central hook for all Firebase Realtime Database interactions.
 * All three screens (Admin, Play, Display) use this hook.
 * No component should write to Firebase directly.
 */

import { useEffect, useState, useCallback } from 'react'
import { ref, onValue, set, update, push, remove } from 'firebase/database'
import { db } from '@/lib/firebase'
import { pickWinner } from '@/lib/weighted-draw'

const DEFAULT_COUNTDOWN = { blitz: 30, closest: 60, beer: 45, 'single-team': 45 }

// ─── Refs ─────────────────────────────────────────────────────────────────────

function sessionRef(id) { return ref(db, `pulseSessions/${id}`) }
function teamsRef(id) { return ref(db, `pulseSessions/${id}/teams`) }
function teamRef(id, teamId) { return ref(db, `pulseSessions/${id}/teams/${teamId}`) }

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePulseSession(sessionId) {
  const [session, setSession] = useState(null)
  const [teams, setTeams] = useState([])
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Subscribe to session state
  useEffect(() => {
    if (!sessionId) return

    const unsub = onValue(
      sessionRef(sessionId),
      snapshot => {
        const data = snapshot.val()
        if (!data) {
          setSession(null)
          setTeams([])
        } else {
          const { teams: teamsMap, ...sessionData } = data
          setSession(sessionData)
          setTeams(teamsMap
            ? Object.entries(teamsMap).map(([id, team]) => ({ id, ...team }))
            : [])
        }
        setLoading(false)
      },
      err => {
        console.error('Firebase error:', err)
        setError(err.message)
        setLoading(false)
      }
    )

    return () => unsub()
  }, [sessionId])

  // Subscribe to global question bank
  useEffect(() => {
    const unsub = onValue(ref(db, 'pulseQuestions'), snapshot => {
      const data = snapshot.val() || {}
      setQuestions(Object.entries(data).map(([id, q]) => ({ id, ...q })))
    })
    return () => unsub()
  }, [])

  // ─── Admin: Create session ───────────────────────────────────────────────────

  const createSession = useCallback(async () => {
    const newRef = push(ref(db, 'pulseSessions'))
    await set(newRef, {
      state: 'setup',
      mode: null,
      miniGame: null,
      winnerId: null,
      winnerName: null,
      createdAt: Date.now(),
    })
    return newRef.key
  }, [])

  // ─── Admin: Team management ──────────────────────────────────────────────────

  const addTeam = useCallback(async (name) => {
    if (!sessionId) return
    const newTeamRef = push(teamsRef(sessionId))
    await set(newTeamRef, { name: name.trim(), pulseScore: 0 })
    return newTeamRef.key
  }, [sessionId])

  const updateTeamScore = useCallback(async (teamId, pulseScore) => {
    if (!sessionId) return
    await update(teamRef(sessionId, teamId), { pulseScore })
  }, [sessionId])

  const updateTeamName = useCallback(async (teamId, name) => {
    if (!sessionId) return
    await update(teamRef(sessionId, teamId), { name: name.trim() })
  }, [sessionId])

  const removeTeam = useCallback(async (teamId) => {
    if (!sessionId) return
    await remove(teamRef(sessionId, teamId))
  }, [sessionId])

  // ─── Admin: Session control ──────────────────────────────────────────────────

  // Prize draw (existing behaviour)
  const activatePulse = useCallback(async () => {
    if (!sessionId) return
    await Promise.all([
      update(sessionRef(sessionId), {
        state: 'active',
        mode: 'draw',
        miniGame: null,
        activatedAt: Date.now(),
        winnerId: null,
        winnerName: null,
      }),
      set(ref(db, 'activePulseSession'), { sessionId }),
    ])
  }, [sessionId])

  // Mini game trigger
  const activatePulseWithGame = useCallback(async (mode, miniGameData) => {
    if (!sessionId) return
    await Promise.all([
      update(sessionRef(sessionId), {
        state: 'active',
        mode,
        miniGame: {
          ...miniGameData,
          countdownSeconds: DEFAULT_COUNTDOWN[mode] ?? 60,
        },
        activatedAt: Date.now(),
        winnerId: null,
        winnerName: null,
      }),
      set(ref(db, 'activePulseSession'), { sessionId }),
    ])
  }, [sessionId])

  // Draw reveal — picks winner, animates, auto-transitions to revealed
  const revealWinner = useCallback(async () => {
    if (!sessionId || teams.length === 0) return
    const winner = pickWinner(teams)
    await update(sessionRef(sessionId), {
      state: 'revealing',
      winnerId: winner.id,
      winnerName: winner.name,
    })
    setTimeout(async () => {
      await update(sessionRef(sessionId), { state: 'revealed' })
    }, 5000)
  }, [sessionId, teams])

  // Mini game reveal — admin manually advances
  const revealMiniGame = useCallback(async () => {
    if (!sessionId) return
    const mode = session?.mode
    if (mode && mode !== 'blitz' && mode !== 'closest' && teams.length > 0) {
      const winner = teams.reduce((a, b) => ((b.pulseScore ?? 0) > (a.pulseScore ?? 0) ? b : a))
      await update(sessionRef(sessionId), {
        state: 'revealing',
        winnerId: winner.id,
        winnerName: winner.name,
      })
    } else {
      await update(sessionRef(sessionId), { state: 'revealing' })
    }
  }, [sessionId, session, teams])

  const confirmReveal = useCallback(async () => {
    if (!sessionId) return
    await update(sessionRef(sessionId), { state: 'revealed' })
  }, [sessionId])

  const resetSession = useCallback(async () => {
    if (!sessionId) return
    await Promise.all([
      update(sessionRef(sessionId), {
        state: 'setup',
        mode: null,
        miniGame: null,
        winnerId: null,
        winnerName: null,
        activatedAt: null,
      }),
      set(ref(db, 'activePulseSession'), { sessionId: null }),
    ])
  }, [sessionId])

  // ─── Player: submit closest-answer guess ─────────────────────────────────────

  const submitAnswer = useCallback(async (teamId, value) => {
    if (!sessionId) return
    await set(ref(db, `pulseSessions/${sessionId}/miniGame/submissions/${teamId}`), value)
  }, [sessionId])

  // ─── Admin: Question bank ────────────────────────────────────────────────────

  const addQuestion = useCallback(async (question) => {
    const newRef = push(ref(db, 'pulseQuestions'))
    await set(newRef, { ...question, createdAt: Date.now() })
    return newRef.key
  }, [])

  const removeQuestion = useCallback(async (questionId) => {
    await remove(ref(db, `pulseQuestions/${questionId}`))
  }, [])

  // ─── Return ──────────────────────────────────────────────────────────────────

  return {
    // State
    session,
    teams,
    questions,
    loading,
    error,

    // Derived
    state: session?.state ?? 'setup',
    mode: session?.mode ?? null,
    gameType: session?.gameType ?? null,
    miniGame: session?.currentGame ?? session?.miniGame ?? null,
    activatedAt: session?.activatedAt ?? null,
    winnerName: session?.winnerName ?? null,
    winnerId: session?.winnerId ?? null,

    // Admin actions
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

    // Player actions
    submitAnswer,

    // Question bank
    addQuestion,
    removeQuestion,
  }
}
