import { render, screen } from '@testing-library/react'
import App from './App'

describe('App smoke test', () => {
  it('renders the app title', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Sezzle Calculator' })).toBeInTheDocument()
  })
})
