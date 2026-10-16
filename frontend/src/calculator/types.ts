import type { Operation } from '../api/types'

export type BinaryOp = 'add' | 'subtract' | 'multiply' | 'divide' | 'power'

export type Status = 'entering' | 'result' | 'loading' | 'error'

export interface HistoryItem {
  expression: string
  result: string
}

export interface CalculationError {
  code: string
  message: string
}

/** What the hook must send to the API. Set by the reducer, consumed by the hook. */
export interface PendingRequest {
  id: number
  operation: Operation
  operands: string[]
  kind: 'binary' | 'chain' | 'unary' | 'percent' | 'percentOf'
  queuedOp: BinaryOp | null
  expression: string
}

export interface State {
  display: string
  left: string | null
  op: BinaryOp | null
  status: Status
  error: CalculationError | null
  history: HistoryItem[]
  pendingRequest: PendingRequest | null
  nextRequestId: number
  /** True right after an operator: the next digit or dot starts the second operand. */
  awaitingOperand: boolean
}

export type Action =
  | { type: 'digit'; digit: string }
  | { type: 'dot' }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'negate' }
  | { type: 'binaryOp'; op: BinaryOp }
  | { type: 'equals' }
  | { type: 'unaryOp'; op: 'sqrt' }
  | { type: 'percent' }
  | { type: 'requestStarted'; id: number }
  | { type: 'requestSucceeded'; id: number; result: string }
  | { type: 'requestFailed'; id: number; error: CalculationError }
  | { type: 'reuseHistory'; item: HistoryItem }
