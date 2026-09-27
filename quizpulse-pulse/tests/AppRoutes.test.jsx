// App routes (src/App.jsx): the root explains itself (no session index), and the
// play and display screens receive the session from their own URL.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { useParams } from 'react-router-dom'

vi.mock('../src/routes/Play', () => ({ default: function Play() { return <p>play:{useParams().id}</p> } }))
vi.mock('../src/routes/Display', () => ({ default: function Display() { return <p>display:{useParams().id}</p> } }))
import App from '../src/App'

const at = path => { window.history.pushState({}, '', path); render(<App />) }
afterEach(() => { cleanup(); window.history.pushState({}, '', '/') })

describe('App routes', () => {
  it('the root is an explanation, not a list of sessions', () => {
    at('/')
    expect(screen.getByText(/QuizPulse display app/)).toBeTruthy()
    expect(screen.queryByText(/play:|display:/)).toBeNull()
  })
  it.each([['/play/mel-night', 'play:mel-night'], ['/display/bne-night', 'display:bne-night']])('%s renders its own session', (path, expected) => {
    at(path)
    expect(screen.getByText(expected)).toBeTruthy()
  })
  it('an unknown path renders nothing', () => {
    at('/sessions')
    expect(document.body.textContent).toBe('')
  })
})
