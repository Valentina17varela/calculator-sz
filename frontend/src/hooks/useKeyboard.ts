import { useEffect } from 'react'
import type { Action, BinaryOp } from '../calculator/types'

const BINARY_KEYS: Record<string, BinaryOp> = {
  '+': 'add',
  '-': 'subtract',
  '*': 'multiply',
  '/': 'divide',
  '^': 'power',
}

function actionFor(key: string): Action | null {
  if (/^[0-9]$/.test(key)) return { type: 'digit', digit: key }
  if (key === '.') return { type: 'dot' }
  if (key in BINARY_KEYS) return { type: 'binaryOp', op: BINARY_KEYS[key] }
  if (key === 'Enter' || key === '=') return { type: 'equals' }
  if (key === 'Backspace') return { type: 'backspace' }
  if (key === 'Escape' || key === 'c' || key === 'C') return { type: 'clear' }
  if (key === '%') return { type: 'percent' }
  if (key === 'r' || key === 'R') return { type: 'unaryOp', op: 'sqrt' }
  return null
}

/** True when the keystroke belongs to a text field, not the calculator. */
function isInTextInput(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
}

interface UseKeyboardOptions {
  loading: boolean
}

/** Maps physical keys to calculator actions, per the key map in the design doc. */
export function useKeyboard(onAction: (action: Action) => void, { loading }: UseKeyboardOptions): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Let browser and OS shortcuts through (Cmd+R, Ctrl+C, Alt+Tab).
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (loading || isInTextInput(event.target)) return
      const action = actionFor(event.key)
      if (action === null) return
      event.preventDefault()
      onAction(action)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onAction, loading])
}
