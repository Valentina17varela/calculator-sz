import type { ReactNode } from 'react'

export type KeyVariant = 'digit' | 'operator' | 'action' | 'equals'

interface KeyProps {
  label: string
  ariaLabel?: string
  variant?: KeyVariant
  icon?: ReactNode
  onPress: () => void
  disabled?: boolean
}

/** One keypad button. Fully round, at least 48px tall, visible focus from the base styles. */
export default function Key({ label, ariaLabel, variant = 'digit', icon, onPress, disabled }: KeyProps) {
  return (
    <button
      type="button"
      className={`key key-${variant}`}
      aria-label={ariaLabel ?? label}
      onClick={onPress}
      disabled={disabled}
    >
      {icon ?? label}
    </button>
  )
}
