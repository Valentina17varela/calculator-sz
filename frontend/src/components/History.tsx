import { MAX_INPUT_LENGTH } from '../calculator/format'
import type { HistoryItem } from '../calculator/types'

interface HistoryProps {
  items: HistoryItem[]
  onReuse: (item: HistoryItem) => void
}

/** The last calculations, newest first. Clicking one reuses its result. */
export default function History({ items, onReuse }: HistoryProps) {
  if (items.length === 0) {
    return (
      <section className="history" aria-label="History">
        <p className="history-empty">No calculations yet. Your last operations will appear here.</p>
      </section>
    )
  }
  return (
    <section className="history" aria-label="History">
      <ul className="history-list">
        {items.map((item, index) => {
          const reusable = item.result.length <= MAX_INPUT_LENGTH
          return (
            <li key={`${index}-${item.expression}-${item.result}`}>
              <button
                type="button"
                className="history-item"
                onClick={() => onReuse(item)}
                disabled={!reusable}
                title={reusable ? undefined : 'Too long to reuse'}
                aria-label={
                  reusable
                    ? `${item.expression} ${item.result}, use result`
                    : `${item.expression} ${item.result}, too long to reuse`
                }
              >
                <span className="history-expression">{item.expression}</span>{' '}
                <span className="history-result t-numerics">{item.result}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
