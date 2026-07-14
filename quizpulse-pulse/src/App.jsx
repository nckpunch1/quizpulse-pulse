import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Play from './routes/Play'
import Display from './routes/Display'
import LeaderboardDisplay from './pages/LeaderboardDisplay'

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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play/:id" element={<Play />} />
        <Route path="/display/:id" element={<Display />} />
        <Route path="/leaderboard/:id" element={<LeaderboardDisplay />} />
      </Routes>
    </BrowserRouter>
  )
}
