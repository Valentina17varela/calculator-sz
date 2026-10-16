import Display from './components/Display'
import History from './components/History'
import Keypad from './components/Keypad'
import { opSymbol } from './calculator/reducer'
import { useCalculator } from './hooks/useCalculator'
import type { Action, HistoryItem } from './calculator/types'

/** Single-screen app: display on top, keypad, history below. */
export default function App() {
  const { state, dispatch } = useCalculator()

  const onAction = (action: Action) => dispatch(action)
  const onReuse = (item: HistoryItem) => dispatch({ type: 'reuseHistory', item })

  return (
    <main className="app">
      <h1 className="app-title">Sezzle</h1>
      <Display
        expression={state.op ? `${state.left} ${opSymbol[state.op]}` : ''}
        value={state.display}
        status={state.status}
      />
      <Keypad onAction={onAction} disabled={state.status === 'loading'} />
      <History items={state.history} onReuse={onReuse} />
    </main>
  )
}
