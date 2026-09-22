import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import ErrorBoundary from '../src/ErrorBoundary'

it('renders normal content without showing the crash fallback', () => {
  render(<ErrorBoundary><p>Live game</p></ErrorBoundary>)
  expect(screen.getByText('Live game')).toBeTruthy()
  expect(screen.queryByText('Display Error')).toBeNull()
})

it('contains a render crash and offers refresh without exposing internal error details', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  function BrokenGame() { throw new Error('private diagnostic details') }
  render(<ErrorBoundary><BrokenGame /></ErrorBoundary>)
  expect(screen.getByText('Display Error')).toBeTruthy()
  expect(screen.getByText('Please refresh the screen')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Refresh' })).toBeTruthy()
  expect(screen.queryByText('private diagnostic details')).toBeNull()
})
