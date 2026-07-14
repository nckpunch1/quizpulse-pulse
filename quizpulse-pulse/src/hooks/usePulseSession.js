/**
 * usePulseSession
 *
 * Central hook for all Firebase Realtime Database interactions.
 * Both screens (Play, Display) use this hook.
 * No component should read Firebase directly.
 *
 * READ-ONLY BY DESIGN. This app is a display surface: every pulse game is
 * launched and driven from admin-host's Host Console (LiveGameController →
 * pulseService), which owns all state transitions including
 * revealing → revealed. This app subscribes and renders — it never writes.
 * (The deployed RTDB rules require auth != null for writes and this app has
 * no auth, so any write here would fail anyway.)
 */

import { useEffect, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '@/lib/firebase'

export function usePulseSession(sessionId) {
  const [session, setSession] = useState(null)
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [connected, setConnected] = useState(true)

  // Subscribe to session state
  useEffect(() => {
    if (!sessionId) return

    const unsub = onValue(
      ref(db, `pulseSessions/${sessionId}`),
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
        setError(null)
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

  // Live connection state, so screens can show "reconnecting" instead of
  // silently freezing on stale data. Firebase's SDK handles the actual
  // reconnection; this only surfaces it.
  useEffect(() => {
    const unsub = onValue(ref(db, '.info/connected'), snap => {
      setConnected(snap.val() === true)
    })
    return () => unsub()
  }, [])

  return {
    // State
    session,
    teams,
    loading,
    error,
    connected,

    // Derived
    state: session?.state ?? 'setup',
    mode: session?.mode ?? null,
    gameType: session?.gameType ?? null,
    miniGame: session?.currentGame ?? session?.miniGame ?? null,
    activatedAt: session?.activatedAt ?? null,
    winnerName: session?.winnerName ?? null,
    winnerId: session?.winnerId ?? null,
  }
}
