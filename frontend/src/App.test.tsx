import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the display, keypad and history', () => {
    render(<App />)
    const display = screen.getByRole('status', { name: 'Calculator display' })
    expect(display).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Calculator keypad' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'History' })).toBeInTheDocument()
    expect(within(display).getByText('0')).toBeInTheDocument()
  })

  it('shows the wordmark and the author credit', () => {
    render(<App />)
    expect(screen.getByText('Sezzle')).toBeInTheDocument()
    expect(screen.getByText('Built by Valentina Varela Alzate')).toBeInTheDocument()
  })
})
