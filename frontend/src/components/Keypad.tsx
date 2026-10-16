import { Delete, Divide, Equal, Minus, Percent, Plus, Radical, X } from 'lucide-react'
import type { Action, BinaryOp } from '../calculator/types'
import Key from './Key'

interface KeypadProps {
  onAction: (action: Action) => void
  disabled?: boolean
}

const OPERAND = (digit: string): Action => ({ type: 'digit', digit })

/** Every key from the design doc, wired to reducer actions. */
export default function Keypad({ onAction, disabled = false }: KeypadProps) {
  const binary = (op: BinaryOp) => () => onAction({ type: 'binaryOp', op })

  return (
    <div className="keypad" role="group" aria-label="Calculator keypad">
      <Key label="C" ariaLabel="Clear" variant="action" onPress={() => onAction({ type: 'clear' })} />
      <Key label="+/-" ariaLabel="Negate" variant="action" onPress={() => onAction({ type: 'negate' })} disabled={disabled} />
      <Key label="%" ariaLabel="Percent" variant="action" icon={<Percent size={20} aria-hidden />} onPress={() => onAction({ type: 'percent' })} disabled={disabled} />
      <Key label="÷" ariaLabel="Divide" variant="operator" icon={<Divide size={20} aria-hidden />} onPress={binary('divide')} disabled={disabled} />

      {['7', '8', '9'].map((digit) => (
        <Key key={digit} label={digit} onPress={() => onAction(OPERAND(digit))} disabled={disabled} />
      ))}
      <Key label="×" ariaLabel="Multiply" variant="operator" icon={<X size={20} aria-hidden />} onPress={binary('multiply')} disabled={disabled} />

      {['4', '5', '6'].map((digit) => (
        <Key key={digit} label={digit} onPress={() => onAction(OPERAND(digit))} disabled={disabled} />
      ))}
      <Key label="-" ariaLabel="Subtract" variant="operator" icon={<Minus size={20} aria-hidden />} onPress={binary('subtract')} disabled={disabled} />

      {['1', '2', '3'].map((digit) => (
        <Key key={digit} label={digit} onPress={() => onAction(OPERAND(digit))} disabled={disabled} />
      ))}
      <Key label="+" ariaLabel="Add" variant="operator" icon={<Plus size={20} aria-hidden />} onPress={binary('add')} disabled={disabled} />

      <Key label="√" ariaLabel="Square root" variant="operator" icon={<Radical size={20} aria-hidden />} onPress={() => onAction({ type: 'unaryOp', op: 'sqrt' })} disabled={disabled} />
      <Key label="0" onPress={() => onAction(OPERAND('0'))} disabled={disabled} />
      <Key label="." ariaLabel="Decimal point" onPress={() => onAction({ type: 'dot' })} disabled={disabled} />
      <Key label="=" ariaLabel="Equals" variant="equals" icon={<Equal size={20} aria-hidden />} onPress={() => onAction({ type: 'equals' })} disabled={disabled} />

      <div className="keypad-wide" key="power">
        <Key label="^" ariaLabel="Power" variant="operator" onPress={binary('power')} disabled={disabled} />
      </div>
      <div className="keypad-wide" key="backspace">
        <Key label="⌫" ariaLabel="Backspace" variant="action" icon={<Delete size={20} aria-hidden />} onPress={() => onAction({ type: 'backspace' })} disabled={disabled} />
      </div>
    </div>
  )
}
