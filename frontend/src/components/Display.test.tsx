import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Display from './Display'

describe('Display', () => {
  it('shows the expression and the value', () => {
    render(<Display expression="2 + 3" value="5" status="result" />)
    expect(screen.getByText('2 + 3')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('is a polite, atomic live region', () => {
    render(<Display expression="" value="0" status="entering" />)
    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toHaveAttribute('aria-atomic', 'true')
    expect(region).toHaveAttribute('aria-label', 'Calculator display')
  })

  it('groups thousands for reading', () => {
    render(<Display expression="" value="1234567" status="entering" />)
    expect(screen.getByText('1,234,567')).toBeInTheDocument()
  })

  it('scales the font down as the value grows', () => {
    const { rerender } = render(<Display expression="" value="123456789" status="entering" />)
    expect(screen.getByText('123,456,789')).toHaveAttribute('data-size', 'l')
    rerender(<Display expression="" value="123456789012345678" status="entering" />)
    expect(screen.getByText('123,456,789,012,345,678')).toHaveAttribute('data-size', 'm')
    rerender(<Display expression="" value="12345678901234567890123456789012" status="entering" />)
    expect(screen.getByText('12,345,678,901,234,567,890,123,456,789,012')).toHaveAttribute('data-size', 's')
  })

  it('marks the status in data-status', () => {
    for (const status of ['entering', 'result', 'loading', 'error'] as const) {
      const { unmount } = render(<Display expression="" value="0" status={status} />)
      expect(screen.getByRole('status')).toHaveAttribute('data-status', status)
      unmount()
    }
  })

  it('uses the tabular figures helper class', () => {
    render(<Display expression="" value="0" status="entering" />)
    expect(screen.getByText('0')).toHaveClass('t-numerics')
  })
})
