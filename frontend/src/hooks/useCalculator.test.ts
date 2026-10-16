import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, NetworkError, RequestTimeoutError } from '../api/client'
import type { Action } from '../calculator/types'
import { messageForError, useCalculator } from './useCalculator'

type CalculateMock = ReturnType<typeof vi.fn>

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

interface Deferred {
  mock: CalculateMock
  resolve: (v: string) => void
  reject: (e: unknown) => void
}

/** A calculate mock whose promises are resolved by hand. Wrappers keep the
 * bindings alive: the variables are assigned when the mock is first called. */
function deferredMock(): Deferred {
  let storedResolve!: (v: string) => void
  let storedReject!: (e: unknown) => void
  const mock = vi.fn().mockImplementation(
    () =>
      new Promise<string>((res, rej) => {
        storedResolve = res
        storedReject = rej
      }),
  )
  return {
    mock,
    resolve: (v: string) => storedResolve(v),
    reject: (e: unknown) => storedReject(e),
  }
}

function makeHook(deferred: Deferred) {
  return renderHook(() => useCalculator(deferred.mock as unknown as typeof import('../api/client').calculate))
}

function dispatchAll(hook: ReturnType<typeof makeHook>, actions: Action[]) {
  act(() => {
    for (const action of actions) hook.result.current.dispatch(action)
  })
}

function pressEquals(hook: ReturnType<typeof makeHook>) {
  dispatchAll(hook, [
    { type: 'digit', digit: '1' },
    { type: 'binaryOp', op: 'add' },
    { type: 'digit', digit: '1' },
    { type: 'equals' },
  ])
}

describe('useCalculator', () => {
  it('equals triggers the API call and shows the result', async () => {
    const { mock, resolve } = deferredMock()
    const hook = makeHook({ mock, resolve, reject: () => undefined })
    dispatchAll(hook, [
      { type: 'digit', digit: '2' },
      { type: 'binaryOp', op: 'add' },
      { type: 'digit', digit: '3' },
      { type: 'equals' },
    ])
    expect(mock).toHaveBeenCalledWith('add', ['2', '3'], expect.any(AbortSignal))
    await act(async () => resolve('5'))
    expect(hook.result.current.state.display).toBe('5')
    expect(hook.result.current.state.status).toBe('result')
  })

  it('a chained operator triggers the API call with the left operand', () => {
    const { mock, resolve, reject } = deferredMock()
    const hook = makeHook({ mock, resolve, reject })
    dispatchAll(hook, [
      { type: 'digit', digit: '2' },
      { type: 'binaryOp', op: 'add' },
      { type: 'digit', digit: '3' },
      { type: 'binaryOp', op: 'add' },
    ])
    expect(mock).toHaveBeenCalledWith('add', ['2', '3'], expect.any(AbortSignal))
  })

  it('sqrt triggers the API call immediately', () => {
    const { mock, resolve, reject } = deferredMock()
    const hook = makeHook({ mock, resolve, reject })
    dispatchAll(hook, [{ type: 'digit', digit: '9' }, { type: 'unaryOp', op: 'sqrt' }])
    expect(mock).toHaveBeenCalledWith('sqrt', ['9'], expect.any(AbortSignal))
  })

  it('percent triggers the API call', () => {
    const { mock, resolve, reject } = deferredMock()
    const hook = makeHook({ mock, resolve, reject })
    dispatchAll(hook, [
      { type: 'digit', digit: '5' },
      { type: 'dot' },
      { type: 'digit', digit: '5' },
      { type: 'percent' },
    ])
    expect(mock).toHaveBeenCalledWith('divide', ['5.5', '100'], expect.any(AbortSignal))
  })

  it.each([
    ['DIVISION_BY_ZERO', 'Cannot divide by zero'],
    ['NEGATIVE_SQUARE_ROOT', 'Square root needs a number of zero or more'],
    ['NON_INTEGER_EXPONENT', 'The exponent must be a whole number'],
    ['OUT_OF_RANGE', 'That number is too large to calculate'],
  ])('maps %s to a friendly message', async (code, expected) => {
    const { mock, reject, resolve } = deferredMock()
    const hook = makeHook({ mock, reject, resolve })
    pressEquals(hook)
    await act(async () => reject(new ApiError(code, 'raw message', 422)))
    expect(hook.result.current.state.error?.message).toBe(expected)
    expect(hook.result.current.state.error?.code).toBe(code)
    expect(hook.result.current.state.status).toBe('error')
  })

  it('maps an unknown code to the fallback message', async () => {
    const { mock, reject, resolve } = deferredMock()
    const hook = makeHook({ mock, reject, resolve })
    pressEquals(hook)
    await act(async () => reject(new ApiError('SOMETHING_ELSE', 'raw', 500)))
    expect(hook.result.current.state.error?.message).toBe('Something went wrong. Try again')
  })

  it('maps a network failure to the reachability message', async () => {
    const { mock, reject, resolve } = deferredMock()
    const hook = makeHook({ mock, reject, resolve })
    pressEquals(hook)
    await act(async () => reject(new NetworkError()))
    expect(hook.result.current.state.error?.message).toBe('Cannot reach the calculator service. Try again')
    expect(hook.result.current.state.error?.code).toBe('NETWORK_ERROR')
  })

  it('unmount aborts the in-flight request', () => {
    const { mock, reject, resolve } = deferredMock()
    const hook = makeHook({ mock, reject, resolve })
    pressEquals(hook)
    const signal = mock.mock.calls[0][2] as AbortSignal
    hook.unmount()
    expect(signal.aborted).toBe(true)
  })

  it('a stale answer for a superseded request id is ignored', async () => {
    const { mock, resolve, reject } = deferredMock()
    const hook = makeHook({ mock, reject, resolve })
    pressEquals(hook)
    const liveId = hook.result.current.state.pendingRequest?.id ?? 0
    // First a success with an id nobody is waiting for.
    act(() => {
      hook.result.current.dispatch({ type: 'requestSucceeded', id: liveId + 99, result: '999' })
    })
    expect(hook.result.current.state.display).toBe('1')
    expect(hook.result.current.state.status).toBe('loading')
    // Then the real answer.
    await act(async () => resolve('2'))
    expect(hook.result.current.state.display).toBe('2')
  })

  it('an answer arriving after abort changes nothing', async () => {
    const { mock, resolve, reject } = deferredMock()
    const hook = makeHook({ mock, reject, resolve })
    dispatchAll(hook, [
      { type: 'digit', digit: '2' },
      { type: 'binaryOp', op: 'add' },
      { type: 'digit', digit: '3' },
      { type: 'equals' },
    ])
    const signal = mock.mock.calls[0][2] as AbortSignal
    await act(async () => {
      Object.defineProperty(signal, 'aborted', { value: true })
      resolve('999')
    })
    expect(hook.result.current.state.status).toBe('loading')
  })

  it('a rejection arriving after abort changes nothing', async () => {
    const { mock, resolve, reject } = deferredMock()
    const hook = makeHook({ mock, reject, resolve })
    dispatchAll(hook, [
      { type: 'digit', digit: '2' },
      { type: 'binaryOp', op: 'add' },
      { type: 'digit', digit: '3' },
      { type: 'equals' },
    ])
    const signal = mock.mock.calls[0][2] as AbortSignal
    await act(async () => {
      Object.defineProperty(signal, 'aborted', { value: true })
      reject(new NetworkError())
    })
    expect(hook.result.current.state.status).toBe('loading')
    expect(hook.result.current.state.error).toBeNull()
  })

  it('a new calculate function on every render causes exactly one call', async () => {
    const deferred = deferredMock()
    const { rerender, result } = renderHook(
      ({ calc }: { calc: typeof import('../api/client').calculate }) => useCalculator(calc),
      { initialProps: { calc: deferred.mock as unknown as typeof import('../api/client').calculate } },
    )
    act(() => {
      result.current.dispatch({ type: 'digit', digit: '4' })
      result.current.dispatch({ type: 'percent' })
    })
    expect(deferred.mock).toHaveBeenCalledTimes(1)
    // Rerender with a fresh function identity: no new request may start.
    for (let i = 0; i < 5; i++) {
      rerender({ calc: (vi.fn() as unknown as typeof import('../api/client').calculate) })
    }
    expect(deferred.mock).toHaveBeenCalledTimes(1)
    await act(async () => deferred.resolve('0.04'))
    expect(result.current.state.display).toBe('0.04')
  })
})

describe('timeout handling in the hook', () => {
  it('shows the timeout message and recovers with clear', async () => {
    vi.useFakeTimers()
    // Real calculate hook: the timeout lives in client.ts, so stub fetch itself.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('The operation was aborted.', 'AbortError')),
            )
          }),
      ),
    )
    const hook = renderHook(() => useCalculator())
    dispatchAll(hook, [
      { type: 'digit', digit: '1' },
      { type: 'binaryOp', op: 'add' },
      { type: 'digit', digit: '1' },
      { type: 'equals' },
    ])
    expect(hook.result.current.state.status).toBe('loading')
    // The client timeout fires at 10 seconds.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })
    expect(hook.result.current.state.status).toBe('error')
    expect(hook.result.current.state.error?.code).toBe('TIMEOUT')
    expect(hook.result.current.state.error?.message).toBe('The calculator service took too long. Try again')
    // Clear recovers.
    dispatchAll(hook, [{ type: 'clear' }])
    expect(hook.result.current.state.error).toBeNull()
    expect(hook.result.current.state.status).toBe('entering')
  })
})

describe('messageForError', () => {
  it('gives the network message for NetworkError', () => {
    expect(messageForError(new NetworkError())).toBe('Cannot reach the calculator service. Try again')
  })

  it('gives the timeout message for RequestTimeoutError', () => {
    expect(messageForError(new RequestTimeoutError())).toBe('The calculator service took too long. Try again')
  })

  it('gives the fallback for unknown errors', () => {
    expect(messageForError(new Error('boom'))).toBe('Something went wrong. Try again')
  })
})
