import { useCallback, useEffect, useReducer, useRef } from 'react'
import { ApiError, NetworkError, RequestTimeoutError, calculate as defaultCalculate } from '../api/client'
import type { Operation } from '../api/types'
import { initialState, reducer } from '../calculator/reducer'
import type { Action, CalculationError, State } from '../calculator/types'

const ERROR_MESSAGES: Record<string, string> = {
  DIVISION_BY_ZERO: 'Cannot divide by zero',
  NEGATIVE_SQUARE_ROOT: 'Square root needs a number of zero or more',
  NON_INTEGER_EXPONENT: 'The exponent must be a whole number',
  OUT_OF_RANGE: 'That number is too large to calculate',
  TIMEOUT: 'The calculator service took too long. Try again',
}

const NETWORK_MESSAGE = 'Cannot reach the calculator service. Try again'
const FALLBACK_MESSAGE = 'Something went wrong. Try again'

/** Maps an API or transport failure to the friendly message from the design doc. */
export function messageForError(error: unknown): string {
  if (error instanceof NetworkError) return NETWORK_MESSAGE
  if (error instanceof RequestTimeoutError) return ERROR_MESSAGES.TIMEOUT
  if (error instanceof ApiError) return ERROR_MESSAGES[error.code] ?? FALLBACK_MESSAGE
  return FALLBACK_MESSAGE
}

function codeForError(error: unknown): string {
  if (error instanceof ApiError) return error.code
  if (error instanceof RequestTimeoutError) return 'TIMEOUT'
  return 'NETWORK_ERROR'
}

export interface UseCalculatorResult {
  state: State
  dispatch: (action: Action) => void
}

/**
 * Wires the pure reducer to the API. Every pendingRequest the reducer emits is
 * executed here: the previous request is aborted, the result comes back as
 * requestSucceeded with a friendly message on failure.
 */
export function useCalculator(
  calculate: (
    operation: Operation,
    operands: string[],
    signal?: AbortSignal,
  ) => Promise<string> = defaultCalculate,
): UseCalculatorResult {
  const [state, dispatch] = useReducer(reducer, initialState)
  // The latest client lives in a ref so a new function identity on a render
  // never re-triggers the effect (which would loop requests forever).
  const calculateRef = useRef(calculate)

  useEffect(() => {
    calculateRef.current = calculate
  }, [calculate])

  useEffect(() => {
    const request = state.pendingRequest
    if (!request) return
    const controller = new AbortController()
    calculateRef.current(request.operation, request.operands, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        dispatch({ type: 'requestSucceeded', id: request.id, result })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const errorInfo: CalculationError = {
          code: codeForError(error),
          message: messageForError(error),
        }
        dispatch({ type: 'requestFailed', id: request.id, error: errorInfo })
      })
    return () => {
      controller.abort()
    }
  }, [state.pendingRequest])

  const dispatchAction = useCallback((action: Action) => dispatch(action), [])
  return { state, dispatch: dispatchAction }
}
