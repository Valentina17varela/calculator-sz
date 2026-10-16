import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Header from './Header'

describe('Header', () => {
  it('shows the Sezzle text wordmark', () => {
    render(<Header />)
    expect(screen.getByText('Sezzle')).toBeInTheDocument()
  })

  it('has no image or logo artwork', () => {
    const { container } = render(<Header />)
    expect(container.querySelector('img, svg')).toBeNull()
  })
})
