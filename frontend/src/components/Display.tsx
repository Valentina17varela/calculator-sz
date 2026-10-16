import { withThousands } from '../calculator/format'
import type { Status } from '../calculator/types'

interface DisplayProps {
  expression: string
  value: string
  status: Status
}

/** Font step by digit count, so 32 digits stay readable at 360px. */
function sizeFor(value: string): 'l' | 'm' | 's' {
  if (value.length <= 9) return 'l'
  if (value.length <= 18) return 'm'
  return 's'
}

/** Shows the pending expression above the current value, announced politely. */
export default function Display({ expression, value, status }: DisplayProps) {
  return (
    <section
      className="display"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label="Calculator display"
      data-status={status}
    >
      <p className="display-expression">{expression}</p>
      <p className="display-value t-numerics" data-size={sizeFor(value)}>
        {withThousands(value)}
      </p>
    </section>
  )
}
