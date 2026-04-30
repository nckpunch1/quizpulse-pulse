import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Admin from './routes/Admin'
import Play from './routes/Play'
import Display from './routes/Display'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/play/:id" element={<Play />} />
        <Route path="/display/:id" element={<Display />} />
      </Routes>
    </BrowserRouter>
  )
}
