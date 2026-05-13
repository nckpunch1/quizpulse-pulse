import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh', background: '#0a0a0a',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '2vh', fontFamily: "'Barlow Condensed', sans-serif",
        }}>
          <p style={{ color: '#f97316', fontSize: '3rem' }}>⚡</p>
          <p style={{
            color: '#ffffff', fontWeight: 900,
            fontSize: 'clamp(1.5rem,3vw,3rem)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            Display Error
          </p>
          <p style={{ color: '#555', fontSize: '1rem' }}>
            Please refresh the screen
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '2vh', background: '#f97316', color: '#000',
              border: 'none', borderRadius: 8, padding: '0.75rem 2rem',
              fontWeight: 800, fontSize: '1rem', cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}
          >
            Refresh
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
