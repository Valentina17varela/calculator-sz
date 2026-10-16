import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Keypad from './Keypad'
import Key from './Key'

function setup(disabled = false) {
  const onAction = vi.fn()
  render(<Keypad onAction={onAction} disabled={disabled} />)
  return { onAction }
}

describe('Keypad', () => {
  it('renders every key with an accessible name', () => {
    setup()
    const names = [
      'Clear', 'Negate', 'Percent', 'Divide',
      '7', '8', '9', 'Multiply',
      '4', '5', '6', 'Subtract',
      '1', '2', '3', 'Add',
      'Square root', '0', 'Decimal point', 'Equals',
      'Power', 'Backspace',
    ]
    for (const name of names) {
      expect(screen.getByRole('button', { name }), `key ${name}`).toBeInTheDocument()
    }
  })

  it.each([
    ['7', { type: 'digit', digit: '7' }],
    ['0', { type: 'digit', digit: '0' }],
    ['Decimal point', { type: 'dot' }],
    ['Add', { type: 'binaryOp', op: 'add' }],
    ['Subtract', { type: 'binaryOp', op: 'subtract' }],
    ['Multiply', { type: 'binaryOp', op: 'multiply' }],
    ['Divide', { type: 'binaryOp', op: 'divide' }],
    ['Power', { type: 'binaryOp', op: 'power' }],
    ['Equals', { type: 'equals' }],
    ['Square root', { type: 'unaryOp', op: 'sqrt' }],
    ['Percent', { type: 'percent' }],
    ['Clear', { type: 'clear' }],
    ['Negate', { type: 'negate' }],
    ['Backspace', { type: 'backspace' }],
  ])('clicking %s dispatches the matching action', async (name, expected) => {
    const { onAction } = setup()
    await userEvent.click(screen.getByRole('button', { name }))
    expect(onAction).toHaveBeenCalledWith(expected)
  })

  it('disables every key while loading', () => {
    setup(true)
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled()
    }
  })

  it('uses icon glyphs with aria-hidden so the name comes from the label', () => {
    setup()
    const add = screen.getByRole('button', { name: 'Add' })
    expect(add.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('Key', () => {
  it('defaults the accessible name to the label', async () => {
    const onAction = vi.fn()
    render(<Key label="9" onPress={onAction} />)
    await userEvent.click(screen.getByRole('button', { name: '9' }))
    expect(onAction).toHaveBeenCalledOnce()
  })

  it('shows the pressed focus ring through the base styles', () => {
    const onAction = vi.fn()
    render(<Key label="9" onPress={onAction} />)
    expect(screen.getByRole('button', { name: '9' }).className).toContain('key-digit')
  })
})
