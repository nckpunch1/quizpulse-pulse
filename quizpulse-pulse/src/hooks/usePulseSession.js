/**
 * usePulseSession
 *
 * Central hook for all Firebase Realtime Database interactions.
 * All three screens (Admin, Play, Display) use this hook.
 * No component should write to Firebase directly.
 *
 * Usage:
 *   const { session, teams, activatePulse, revealWinner, resetSession } =
 *     usePulseSession(sessionId)
 */

import { useEffect, useState, useCallback } from 'react'
import { ref, onValue, set, update, push, remove } from 'firebase/database'
import { db } from '@/lib/firebase'
import { pickWinner } from '@/lib/weighted-draw'

// ─── Session helpers ──────────────────────────────────────────────────────────

function sessionRef(sessionId) {
  return ref(db, `pulseSession/${sessionId}`)
}

function teamsRef(sessionId) {
  return ref(db, `pulseSession/${sessionId}/teams`)
}

function teamRef(sessionId, teamId) {
  return ref(db, `pulseSession/${sessionId}/teams/${teamId}`)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePulseSession(sessionId) {
  const [session, setSession] = useState(null)
  const [teams, setTeams] = useState([])
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
          // Separate teams from session metadata
          const { teams: teamsMap, ...sessionData } = data
          setSession(sessionData)

          // Convert teams object to sorted array
          const teamsArray = teamsMap
            ? Object.entries(teamsMap).map(([id, team]) => ({ id, ...team }))
            : []

          setTeams(teamsArray)
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

  // ─── Admin: Create a new session ────────────────────────────────────────────

  const createSession = useCallback(async () => {
    const newRef = push(ref(db, 'pulseSession'))
    await set(newRef, {
      state: 'setup',
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
    await set(newTeamRef, {
      name: name.trim(),
      pulseScore: 0,
    })
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

  const activatePulse = useCallback(async () => {
    if (!sessionId) return
    await update(sessionRef(sessionId), {
      state: 'active',
      activatedAt: Date.now(),
      winnerId: null,
      winnerName: null,
    })
  }, [sessionId])

  const revealWinner = useCallback(async () => {
    if (!sessionId || teams.length === 0) return

    // Pick winner now — animation on display is purely theatrical
    const winner = pickWinner(teams)

    // Move to revealing state first so display can animate
    await update(sessionRef(sessionId), {
      state: 'revealing',
      winnerId: winner.id,
      winnerName: winner.name,
    })

    // After animation duration, move to revealed
    setTimeout(async () => {
      await update(sessionRef(sessionId), { state: 'revealed' })
    }, 5000) // 5 seconds for the cycling animation
  }, [sessionId, teams])

  const resetSession = useCallback(async () => {
    if (!sessionId) return
    await update(sessionRef(sessionId), {
      state: 'setup',
      winnerId: null,
      winnerName: null,
      activatedAt: null,
    })
  }, [sessionId])

  // ─── Return ──────────────────────────────────────────────────────────────────

  return {
    // State
    session,
    teams,
    loading,
    error,

    // Derived
    state: session?.state ?? 'setup',
    winnerName: session?.winnerName ?? null,
    winnerId: session?.winnerId ?? null,

    // Admin actions
    createSession,
    addTeam,
    updateTeamScore,
    updateTeamName,
    removeTeam,
    activatePulse,
    revealWinner,
    resetSession,
  }
}
