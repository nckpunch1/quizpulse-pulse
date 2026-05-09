import { useParams } from 'react-router-dom'
import { useLeaderboardDisplay } from '@/hooks/usePulseSession'
import { useState, useEffect } from 'react'

const font = { fontFamily: "'Barlow Condensed', sans-serif" }

export default function LeaderboardDisplay() {
  const { id: sessionId } = useParams()
  const { data, loading } = useLeaderboardDisplay(sessionId)

  if (loading) return (
    <div style={{ ...font, height: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f97316', opacity: 0.4 }} />
    </div>
  )

  const teams = data?.teams ?? []
  const visible = data?.visible ?? false
  const roundLabel = data?.roundLabel ?? ''

  if (!visible || teams.length === 0) return (
    <div style={{ ...font, height: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2vh' }}>
      <style>{`@keyframes pulse-ring { 0%,100%{opacity:0.06;transform:scale(1)} 50%{opacity:0.14;transform:scale(1.04)} }`}</style>
      <div style={{ position:'absolute', width:'55vw', height:'55vw', borderRadius:'50%', border:'1px solid #f97316', animation:'pulse-ring 3.5s ease-in-out infinite', pointerEvents:'none' }} />
      <p style={{ color:'#f97316', fontWeight:900, fontSize:'clamp(1.5rem,3vw,3rem)', letterSpacing:'0.4em', textTransform:'uppercase' }}>⚡ QUIZPULSE</p>
      <h1 style={{ color:'#ffffff', fontWeight:900, fontSize:'clamp(3rem,8vw,10rem)', lineHeight:1, letterSpacing:'0.04em', textTransform:'uppercase' }}>LEADERBOARD</h1>
    </div>
  )

  return (
    <div style={{ ...font, minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4vh 4vw', gap: '4vh' }}>
      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes glow { 0%,100%{opacity:0.7} 50%{opacity:1} }
      `}</style>
      <div style={{ textAlign:'center' }}>
        <p style={{ color:'#f97316', fontWeight:900, fontSize:'clamp(1rem,2vw,2rem)', letterSpacing:'0.3em', textTransform:'uppercase', marginBottom:'1vh' }}>
          ⚡ {roundLabel || 'LEADERBOARD'}
        </p>
      </div>
      <div style={{ width:'100%', maxWidth:'80vw', display:'flex', flexDirection:'column', gap:'1.5vh' }}>
        {teams.map((team, i) => (
          <div key={team.teamId} style={{
            display:'flex', alignItems:'center', gap:'2vw',
            background: i === 0 ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.04)',
            border: i === 0 ? '1px solid rgba(249,115,22,0.4)' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16, padding:'2vh 3vw',
            animation: `slideIn 0.4s ease-out ${i * 0.08}s both`,
          }}>
            <span style={{ fontWeight:900, fontSize:'clamp(2rem,4vw,5rem)', color: i===0?'#f97316':i===1?'#94a3b8':i===2?'#b45309':'#555', minWidth:'4vw', textAlign:'center' }}>
              {i + 1}
            </span>
            <span style={{ flex:1, fontWeight:900, fontSize:'clamp(1.5rem,3.5vw,5rem)', color:'#ffffff', letterSpacing:'0.02em' }}>
              {team.teamName}
            </span>
            <span style={{ fontWeight:900, fontSize:'clamp(2rem,4vw,6rem)', color: i===0?'#f97316':'#ffffff', letterSpacing:'0.05em' }}>
              {team.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
