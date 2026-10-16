import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { HistoryItem } from '../calculator/types'
import History from './History'

const ITEMS: HistoryItem[] = [
  { expression: '2 + 3', result: '5' },
  { expression: '√(16)', result: '4' },
]

describe('History', () => {
  it('shows an empty state when there is no history', () => {
    render(<History items={[]} onReuse={() => undefined} />)
    expect(screen.getByText(/No calculations yet/i)).toBeInTheDocument()
  })

  it('lists the operations, newest first', () => {
    render(<History items={ITEMS} onReuse={() => undefined} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    // The first item in the list is the most recent calculation.
    expect(items[0]).toHaveTextContent('2 + 3')
    expect(items[1]).toHaveTextContent('√(16)')
  })

  it('shows a 60-digit result in full, wrapped by the styles', () => {
    const longResult = '9'.repeat(60)
    render(
      <History
        items={[{ expression: '999999 x 999999', result: longResult }]}
        onReuse={() => undefined}
      />,
    )
    const shown = screen.getByText(longResult)
    expect(shown).toHaveClass('history-result')
    expect(shown).toHaveClass('t-numerics')
  })

  it('stacks a 64-digit item in a column, both lines free to wrap', () => {
    const longResult = '9'.repeat(64)
    const expression = '9999999999999999 x 9999999999999999'
    render(
      <History
        items={[{ expression, result: longResult }]}
        onReuse={() => undefined}
      />,
    )
    // The item is a column (flex-direction set in CSS) whose lines both carry
    // the wrapping classes, so nothing can force the page wider than 360px.
    const button = screen.getByRole('button', { name: new RegExp(longResult.slice(0, 12)) })
    expect(button).toHaveClass('history-item')
    const expressionSpan = screen.getByText(expression)
    const resultSpan = screen.getByText(longResult)
    expect(expressionSpan).toHaveClass('history-expression')
    expect(resultSpan).toHaveClass('history-result')
    expect(button).toContainElement(expressionSpan)
    expect(button).toContainElement(resultSpan)
    // Full text, never trimmed.
    expect(resultSpan).toHaveTextContent(longResult)
  })

  it('disables results longer than 32 characters', async () => {
    const onReuse = vi.fn()
    const longResult = '9'.repeat(60)
    render(
      <History
        items={[{ expression: 'big', result: longResult }]}
        onReuse={onReuse}
      />,
    )
    const button = screen.getByRole('button', { name: /too long to reuse/i })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(onReuse).not.toHaveBeenCalled()
  })

  it('keeps a 32-character result enabled', () => {
    const onReuse = vi.fn()
    render(
      <History
        items={[{ expression: 'big', result: '9'.repeat(32) }]}
        onReuse={onReuse}
      />,
    )
    const button = screen.getByRole('button', { name: /big 9+, use result/ })
    expect(button).toBeEnabled()
  })

  it('disables a 33-character result', () => {
    const onReuse = vi.fn()
    render(
      <History
        items={[{ expression: 'big', result: '9'.repeat(33) }]}
        onReuse={onReuse}
      />,
    )
    expect(screen.getByRole('button', { name: /too long to reuse/i })).toBeDisabled()
  })

  it('keeps a single space between the visible expression and result', () => {
    render(<History items={ITEMS} onReuse={() => undefined} />)
    const button = screen.getByRole('button', { name: '2 + 3 5, use result' })
    expect(button.textContent).toBe('2 + 3 5')
  })

  it('clicking an item reuses its result', async () => {
    const onReuse = vi.fn()
    render(<History items={ITEMS} onReuse={onReuse} />)
    await userEvent.click(screen.getByRole('button', { name: '2 + 3 5, use result' }))
    expect(onReuse).toHaveBeenCalledWith({ expression: '2 + 3', result: '5' })
  })
})
