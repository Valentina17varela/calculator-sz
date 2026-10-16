import { MAX_INPUT_LENGTH, applyBackspace, applyDigit, applyDot, applyNegate, isValidOperand, normalizeOperand } from './format'
import type { Action, BinaryOp, HistoryItem, State } from './types'

export const initialState: State = {
  display: '0',
  left: null,
  op: null,
  status: 'entering',
  error: null,
  history: [],
  pendingRequest: null,
  nextRequestId: 1,
  awaitingOperand: false,
}

const HISTORY_LIMIT = 10

export const opSymbol: Record<BinaryOp, string> = {
  add: '+',
  subtract: '-',
  multiply: '×',
  divide: '÷',
  power: '^',
}

function capHistory(history: HistoryItem[]): HistoryItem[] {
  return history.slice(0, HISTORY_LIMIT)
}

/**
 * Pure state machine. Rules come from docs/sdd/03-frontend-design.md section 3.
 * The reducer never talks to the API: actions that need a call set
 * pendingRequest, and the hook executes it, then reports back with
 * requestSucceeded or requestFailed.
 */
export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'digit': {
      if (state.status === 'loading') return state
      // After an error or a result, typing starts a new number.
      if (state.status === 'error' || state.status === 'result') {
        return {
          ...state,
          display: action.digit === '0' ? '0' : action.digit,
          status: 'entering',
          error: null,
          awaitingOperand: false,
        }
      }
      if (state.awaitingOperand) {
        // An operator is pending: this digit starts the second operand.
        return { ...state, display: action.digit === '0' ? '0' : action.digit, awaitingOperand: false, error: null }
      }
      return { ...state, display: applyDigit(state.display, action.digit), error: null }
    }

    case 'dot': {
      if (state.status === 'loading' || state.status === 'error') return state
      if (state.awaitingOperand) {
        return { ...state, display: '0.', status: 'entering', awaitingOperand: false }
      }
      if (state.status === 'result') {
        return { ...state, display: '0.', status: 'entering' }
      }
      return { ...state, display: applyDot(state.display) }
    }

    case 'backspace': {
      if (state.status === 'loading') return state
      return {
        ...state,
        display: applyBackspace(state.display),
        status: 'entering',
        error: null,
        awaitingOperand: false,
      }
    }

    case 'clear':
      return { ...initialState, history: state.history, nextRequestId: state.nextRequestId }

    case 'negate': {
      if (state.status === 'loading' || state.status === 'error') return state
      return { ...state, display: applyNegate(state.display), status: 'entering', awaitingOperand: false }
    }

    case 'binaryOp': {
      if (state.status === 'loading' || state.status === 'error') return state
      // A second operator while the second operand is fully typed chains the
      // pending calculation. With nothing typed yet it replaces the operator.
      if (state.op !== null && state.status === 'entering' && !state.awaitingOperand && state.left !== null) {
        if (!isValidOperand(normalizeOperand(state.display))) return state
        return {
          ...state,
          status: 'loading',
          pendingRequest: {
            id: state.nextRequestId,
            operation: state.op,
            operands: [state.left, state.display].map(normalizeOperand),
            kind: 'chain',
            queuedOp: action.op,
            expression: `${state.left} ${opSymbol[state.op]} ${state.display}`,
          },
          nextRequestId: state.nextRequestId + 1,
        }
      }
      return {
        ...state,
        left: state.display,
        op: action.op,
        status: 'entering',
        error: null,
        awaitingOperand: true,
      }
    }

    case 'equals': {
      if (state.status === 'loading' || state.status === 'error') return state
      if (state.op === null || state.left === null) return state
      if (!isValidOperand(normalizeOperand(state.display))) return state
      return {
        ...state,
        status: 'loading',
        pendingRequest: {
          id: state.nextRequestId,
          operation: state.op,
          operands: [state.left, state.display].map(normalizeOperand),
          kind: 'binary',
          queuedOp: null,
          expression: `${state.left} ${opSymbol[state.op]} ${state.display}`,
        },
        nextRequestId: state.nextRequestId + 1,
      }
    }

    case 'unaryOp': {
      if (state.status === 'loading' || state.status === 'error') return state
      if (!isValidOperand(normalizeOperand(state.display))) return state
      return {
        ...state,
        status: 'loading',
        pendingRequest: {
          id: state.nextRequestId,
          operation: action.op,
          operands: [normalizeOperand(state.display)],
          kind: 'unary',
          queuedOp: null,
          expression: `√(${state.display})`,
        },
        nextRequestId: state.nextRequestId + 1,
      }
    }

    case 'percent': {
      if (state.status === 'loading' || state.status === 'error') return state
      if (!isValidOperand(normalizeOperand(state.display))) return state
      // With + or - pending, the percent is of the stored left operand.
      if ((state.op === 'add' || state.op === 'subtract') && state.left !== null) {
        return {
          ...state,
          status: 'loading',
          pendingRequest: {
            id: state.nextRequestId,
            operation: 'percent',
            operands: [state.display, state.left].map(normalizeOperand),
            kind: 'percentOf',
            queuedOp: null,
            expression: `${state.display}% of ${state.left}`,
          },
          nextRequestId: state.nextRequestId + 1,
        }
      }
      return {
        ...state,
        status: 'loading',
        pendingRequest: {
          id: state.nextRequestId,
          operation: 'divide',
          operands: [normalizeOperand(state.display), '100'],
          kind: 'percent',
          queuedOp: null,
          expression: `${state.display}%`,
        },
        nextRequestId: state.nextRequestId + 1,
      }
    }

    case 'requestSucceeded': {
      if (state.pendingRequest?.id !== action.id) return state
      const request = state.pendingRequest
      const history = capHistory([
        { expression: request.expression, result: action.result },
        ...state.history,
      ])
      // binary ends the statement; chain keeps the queued operator pending;
      // the rest replace the display and keep the statement as it was.
      const opUpdate =
        request.kind === 'binary'
          ? { op: null as BinaryOp | null }
          : request.kind === 'chain'
            ? { op: request.queuedOp }
            : {}
      const leftUpdate = request.kind === 'binary' || request.kind === 'chain' ? { left: action.result } : {}
      return {
        ...state,
        display: action.result,
        status: 'result',
        error: null,
        history,
        pendingRequest: null,
        awaitingOperand: false,
        ...opUpdate,
        ...leftUpdate,
      }
    }

    case 'requestFailed': {
      if (state.pendingRequest?.id !== action.id) return state
      return {
        ...state,
        status: 'error',
        error: action.error,
        pendingRequest: null,
      }
    }

    case 'reuseHistory': {
      if (state.status === 'loading') return state
      // A result longer than the input limit cannot be reused as an operand.
      if (action.item.result.length > MAX_INPUT_LENGTH) return state
      return {
        ...state,
        display: action.item.result,
        status: 'entering',
        error: null,
        awaitingOperand: false,
      }
    }
  }
}
