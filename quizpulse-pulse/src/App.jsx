import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import { usesProductionProject } from '@/lib/firebaseEnvGuard'
import Play from './routes/Play'
import Display from './routes/Display'

// This app is display-only: sessions are created and driven from admin-host's
// Host Console, which links here with an explicit session ID. There is no
// admin surface and no index of sessions, so the root can only explain itself.
function Home() {
  return (
    <div style={{
      height: '100vh', background: '#0a0a0a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '1rem',
      fontFamily: 'monospace', textAlign: 'center', padding: '0 2rem',
    }}>
      <p style={{ color: '#f97316', fontSize: '2rem', margin: 0 }}>⚡</p>
      <p style={{ color: '#555', fontSize: '1rem', margin: 0 }}>
        QuizPulse display app. Open a screen from the
        Host Console → Pulse tab (Display / Play links include the session ID).
      </p>
    </div>
  )
}

// The canonical leaderboard display lives in admin-host; this repo's copy
// drifted badly and was deleted. Old bookmarks on this domain get forwarded to
// THIS environment's admin app (VITE_ADMIN_APP_URL); only a production build
// falls back to the production admin, so a Dev screen never lands there.
const adminAppUrl = (import.meta.env.VITE_ADMIN_APP_URL || (usesProductionProject() ? 'https://admin.pulseiq.com.au' : '')).replace(/\/$/, '')
const LeaderboardRedirect = () => {
  const { id } = useParams()
  useEffect(() => {
    if (adminAppUrl) window.location.replace(`${adminAppUrl}/leaderboard/${id}`)
  }, [id])
  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', color: '#fff', background: '#0b0e14' }}>
      {adminAppUrl ? 'Redirecting to leaderboard…' : 'No admin app is configured for this environment (VITE_ADMIN_APP_URL).'}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play/:id" element={<Play />} />
        <Route path="/display/:id" element={<Display />} />
        <Route path="/leaderboard/:id" element={<LeaderboardRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}
