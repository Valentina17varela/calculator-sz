import type { CalculationError } from '../calculator/types'

interface ErrorBannerProps {
  error: CalculationError | null
}

/** Friendly error text, announced assertively. Null renders nothing. */
export default function ErrorBanner({ error }: ErrorBannerProps) {
  if (!error) return null
  return (
    <div role="alert" className="error-banner">
      {error.message}
    </div>
  )
}
