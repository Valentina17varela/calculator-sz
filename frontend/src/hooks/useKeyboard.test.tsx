import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Action } from '../calculator/types'
import { useKeyboard } from './useKeyboard'

function setup(loading = false) {
  const onAction = vi.fn()
  function Harness() {
    useKeyboard(onAction, { loading })
    return null
  }
  render(<Harness />)
  return { onAction }
}

describe('useKeyboard', () => {
  it('digits map to digit actions', async () => {
    const { onAction } = setup()
    await userEvent.keyboard('47')
    expect(onAction).toHaveBeenCalledWith({ type: 'digit', digit: '4' })
    expect(onAction).toHaveBeenCalledWith({ type: 'digit', digit: '7' })
  })

  it.each([
    ['.', { type: 'dot' }],
    ['+', { type: 'binaryOp', op: 'add' }],
    ['-', { type: 'binaryOp', op: 'subtract' }],
    ['*', { type: 'binaryOp', op: 'multiply' }],
    ['/', { type: 'binaryOp', op: 'divide' }],
    ['^', { type: 'binaryOp', op: 'power' }],
    ['=', { type: 'equals' }],
    ['{Backspace}', { type: 'backspace' }],
    ['%', { type: 'percent' }],
    ['r', { type: 'unaryOp', op: 'sqrt' }],
  ])('%s maps to the right action', async (key, expected) => {
    const { onAction } = setup()
    await userEvent.keyboard(key)
    expect(onAction).toHaveBeenCalledWith(expected)
  })

  it.each(['Enter', 'Escape', 'c', 'C'])('%s maps to the documented action', async (key) => {
    const { onAction } = setup()
    await userEvent.keyboard(key === 'Enter' || key === 'Escape' ? `{${key}}` : key)
    const expected: Action = key === 'Enter' ? { type: 'equals' } : { type: 'clear' }
    expect(onAction).toHaveBeenCalledWith(expected)
  })

  it('ignores every key while loading', async () => {
    const { onAction } = setup(true)
    await userEvent.keyboard('12+3=')
    expect(onAction).not.toHaveBeenCalled()
  })

  it('ignores keys typed into a text input', async () => {
    const { onAction } = setup()
    const { container } = render(<input aria-label="Search" />)
    const input = container.querySelector('input')!
    input.focus()
    await userEvent.keyboard('123')
    expect(onAction).not.toHaveBeenCalled()
  })

  it('ignores unmapped keys', async () => {
    const { onAction } = setup()
    await userEvent.keyboard('x')
    expect(onAction).not.toHaveBeenCalled()
  })

  it.each([
    ['{Control>}r{/Control}', 'Cmd/Ctrl+R'],
    ['{Meta>}r{/Meta}', 'Cmd/Ctrl+R with Meta'],
    ['{Control>}c{/Control}', 'Cmd/Ctrl+C'],
    ['{Meta>}c{/Meta}', 'Cmd/Ctrl+C with Meta'],
    ['{Alt>}1{/Alt}', 'Alt+1'],
  ])('ignores %s so browser shortcuts keep working', async (keys, label) => {
    const { onAction } = setup()
    await userEvent.keyboard(keys)
    expect(onAction, label).not.toHaveBeenCalled()
  })

  it('does not steal the reload shortcut: no preventDefault on modified keys', async () => {
    const { onAction } = setup()
    const event = new KeyboardEvent('keydown', { key: 'r', ctrlKey: true, cancelable: true })
    window.dispatchEvent(event)
    expect(onAction).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('removes the listener on unmount', async () => {
    const onAction = vi.fn()
    function Harness() {
      useKeyboard(onAction, { loading: false })
      return null
    }
    const { unmount } = render(<Harness />)
    unmount()
    await userEvent.keyboard('5')
    expect(onAction).not.toHaveBeenCalled()
  })
})
