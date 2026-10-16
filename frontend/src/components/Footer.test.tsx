import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Footer from './Footer'

describe('Footer', () => {
  it('credits the author', () => {
    render(<Footer />)
    expect(screen.getByText('Built by Valentina Varela Alzate')).toBeInTheDocument()
  })

  it('links GitHub and LinkedIn safely', () => {
    render(<Footer />)
    const github = screen.getByRole('link', { name: 'GitHub profile' })
    const linkedin = screen.getByRole('link', { name: 'LinkedIn profile' })
    expect(github).toHaveAttribute('href', 'https://github.com/Valentina17varela')
    expect(linkedin).toHaveAttribute('href', 'https://www.linkedin.com/in/valentinavarelaalzate/')
    for (const link of [github, linkedin]) {
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      expect(link).toHaveAttribute('target', '_blank')
    }
  })
})
