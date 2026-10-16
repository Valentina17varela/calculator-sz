import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the display, keypad and history', () => {
    render(<App />)
    expect(screen.getByRole('status', { name: 'Calculator display' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Calculator keypad' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'History' })).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('keeps the clear key enabled while loading', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Clear' })).toBeEnabled()
  })
})
