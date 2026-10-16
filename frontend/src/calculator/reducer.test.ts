import { describe, expect, it } from 'vitest'
import { initialState, reducer } from './reducer'
import { withThousands } from './format'
import type { State } from './types'

function run(state: State, ...actions: Parameters<typeof reducer>[1][]): State {
  return actions.reduce(reducer, state)
}

/** State after pressing 2 + : entering, left '2', op add. */
function afterTwoPlus(): State {
  return run(initialState, { type: 'digit', digit: '2' }, { type: 'binaryOp', op: 'add' })
}

/** State after pressing 2 + 3 : entering, left '2', display '3', op add. */
function afterTwoPlusThree(): State {
  return run(
    initialState,
    { type: 'digit', digit: '2' },
    { type: 'binaryOp', op: 'add' },
    { type: 'digit', digit: '3' },
  )
}

function succeed(state: State, result: string): State {
  const id = state.pendingRequest?.id
  if (id === undefined) throw new Error('no pending request')
  return reducer(state, { type: 'requestSucceeded', id, result })
}

function fail(state: State, code = 'DIVISION_BY_ZERO'): State {
  const id = state.pendingRequest?.id
  if (id === undefined) throw new Error('no pending request')
  return reducer(state, { type: 'requestFailed', id, error: { code, message: 'cannot divide by zero' } })
}

describe('reducer rules table', () => {
  it('max input length: 32 characters, extra digits ignored', () => {
    let state = initialState
    for (let i = 0; i < 40; i++) state = reducer(state, { type: 'digit', digit: '7' })
    expect(state.display).toHaveLength(32)
  })

  it('second decimal point ignored', () => {
    const state = run(
      initialState,
      { type: 'digit', digit: '1' },
      { type: 'dot' },
      { type: 'digit', digit: '5' },
      { type: 'dot' },
    )
    expect(state.display).toBe('1.5')
  })

  it('leading zeros: 0 then 5 shows 5', () => {
    const state = run(initialState, { type: 'digit', digit: '0' }, { type: 'digit', digit: '5' })
    expect(state.display).toBe('5')
  })

  it('operator pressed twice replaces the pending operator', () => {
    const state = run(afterTwoPlus(), { type: 'binaryOp', op: 'multiply' })
    expect(state.op).toBe('multiply')
    expect(state.left).toBe('2')
    expect(state.status).toBe('entering')
    expect(state.pendingRequest).toBeNull()
  })

  it('2 + 2 + chains: the API gets [2, 2] and the new + stays pending', () => {
    const state = run(
      initialState,
      { type: 'digit', digit: '2' },
      { type: 'binaryOp', op: 'add' },
      { type: 'digit', digit: '2' },
      { type: 'binaryOp', op: 'add' },
    )
    expect(state.status).toBe('loading')
    expect(state.pendingRequest).toMatchObject({
      operation: 'add',
      operands: ['2', '2'],
      kind: 'chain',
      queuedOp: 'add',
    })
    const done = succeed(state, '4')
    expect(done.display).toBe('4')
    expect(done.op).toBe('add')
  })

  it('2 + . 5 = sends [2, 0.5] and equals gives the sum', () => {
    const state = run(
      initialState,
      { type: 'digit', digit: '2' },
      { type: 'binaryOp', op: 'add' },
      { type: 'dot' },
      { type: 'digit', digit: '5' },
      { type: 'equals' },
    )
    expect(state.pendingRequest).toMatchObject({
      operation: 'add',
      operands: ['2', '0.5'],
      kind: 'binary',
    })
    const done = succeed(state, '2.5')
    expect(done.display).toBe('2.5')
  })

  it('chained 2 + 3 + calls the API for 2 + 3 and keeps + pending', () => {
    const state = run(afterTwoPlusThree(), { type: 'binaryOp', op: 'add' })
    expect(state.status).toBe('loading')
    expect(state.pendingRequest).toMatchObject({
      operation: 'add',
      operands: ['2', '3'],
      kind: 'chain',
      queuedOp: 'add',
    })
    const done = succeed(state, '5')
    expect(done.display).toBe('5')
    expect(done.left).toBe('5')
    expect(done.op).toBe('add')
    expect(done.status).toBe('result')
  })

  it('= with no pending op is a no-op', () => {
    const state = run(initialState, { type: 'digit', digit: '5' }, { type: 'equals' })
    expect(state.status).toBe('entering')
    expect(state.display).toBe('5')
    expect(state.pendingRequest).toBeNull()
  })

  it('% with + pending calls percent [display, left]', () => {
    const state = run(
      afterTwoPlus(),
      { type: 'digit', digit: '5' },
      { type: 'digit', digit: '0' },
      { type: 'percent' },
    )
    expect(state.pendingRequest).toMatchObject({
      operation: 'percent',
      operands: ['50', '2'],
      kind: 'percentOf',
    })
  })

  it('% with multiply pending calls divide [display, 100]', () => {
    const state = run(
      initialState,
      { type: 'digit', digit: '5' },
      { type: 'binaryOp', op: 'multiply' },
      { type: 'digit', digit: '2' },
      { type: 'percent' },
    )
    expect(state.pendingRequest).toMatchObject({
      operation: 'divide',
      operands: ['2', '100'],
      kind: 'percent',
    })
  })

  it('equals normalizes the display: 2 + 3. = sends [2, 3]', () => {
    const state = run(
      initialState,
      { type: 'digit', digit: '2' },
      { type: 'binaryOp', op: 'add' },
      { type: 'digit', digit: '3' },
      { type: 'dot' },
      { type: 'equals' },
    )
    expect(state.pendingRequest).toMatchObject({
      operation: 'add',
      operands: ['2', '3'],
      kind: 'binary',
    })
  })

  it('sqrt normalizes the display: sqrt(9.) sends [9]', () => {
    const state = run(
      initialState,
      { type: 'digit', digit: '9' },
      { type: 'dot' },
      { type: 'unaryOp', op: 'sqrt' },
    )
    expect(state.pendingRequest).toMatchObject({
      operation: 'sqrt',
      operands: ['9'],
      kind: 'unary',
    })
  })

  it('equals normalizes a lone dot: 5 + . = sends [5, 0]', () => {
    const state = run(
      initialState,
      { type: 'digit', digit: '5' },
      { type: 'binaryOp', op: 'add' },
      { type: 'dot' },
      { type: 'equals' },
    )
    expect(state.pendingRequest).toMatchObject({
      operation: 'add',
      operands: ['5', '0'],
      kind: 'binary',
    })
  })

  it('equals with a truly invalid display sends no request', () => {
    const state = run(
      initialState,
      { type: 'reuseHistory', item: { expression: 'x', result: 'abc' } },
      { type: 'equals' },
    )
    expect(state.pendingRequest).toBeNull()
    expect(state.status).toBe('entering')
  })

  it('operands are normalized: -0 becomes 0', () => {
    const negative = run(initialState, { type: 'reuseHistory', item: { expression: 'x', result: '-0' } }, { type: 'percent' })
    expect(negative.pendingRequest?.operands).toEqual(['0', '100'])
  })

  it('normalizeOperand drops trailing dots and maps -0 to 0', async () => {
    const { normalizeOperand } = await import('./format')
    expect(normalizeOperand('2.')).toBe('2')
    expect(normalizeOperand('-0')).toBe('0')
    expect(normalizeOperand('-0.')).toBe('0')
    expect(normalizeOperand('2.5')).toBe('2.5')
  })

  it('reuseHistory ignores results longer than 32 characters', () => {
    const long = '1'.repeat(33)
    const state = run(initialState, { type: 'reuseHistory', item: { expression: 'x', result: long } })
    expect(state.display).toBe('0')
    expect(state.status).toBe('entering')
  })

  it('sqrt history records the expression with the radical sign', () => {
    const state = succeed(
      run(initialState, { type: 'digit', digit: '1' }, { type: 'digit', digit: '6' }, { type: 'unaryOp', op: 'sqrt' }),
      '4',
    )
    expect(state.history[0]).toEqual({ expression: '√(16)', result: '4' })
  })

  it('% otherwise calls divide [display, 100]', () => {
    const state = run(
      initialState,
      { type: 'digit', digit: '5' },
      { type: 'dot' },
      { type: 'digit', digit: '5' },
      { type: 'percent' },
    )
    expect(state.pendingRequest).toMatchObject({
      operation: 'divide',
      operands: ['5.5', '100'],
      kind: 'percent',
    })
  })

  it('sqrt calls the API immediately with the display', () => {
    const state = run(initialState, { type: 'digit', digit: '1' }, { type: 'digit', digit: '6' }, { type: 'unaryOp', op: 'sqrt' })
    expect(state.status).toBe('loading')
    expect(state.pendingRequest).toMatchObject({
      operation: 'sqrt',
      operands: ['16'],
      kind: 'unary',
    })
  })

  it('API error shows the message and keeps the inputs', () => {
    const state = fail(
      run(
        afterTwoPlusThree(),
        { type: 'equals' },
      ),
    )
    expect(state.status).toBe('error')
    expect(state.error).toEqual({ code: 'DIVISION_BY_ZERO', message: 'cannot divide by zero' })
    expect(state.display).toBe('3')
    expect(state.left).toBe('2')
  })

  it('any digit recovers from an error', () => {
    const state = run(fail(run(afterTwoPlusThree(), { type: 'equals' })), { type: 'digit', digit: '7' })
    expect(state.status).toBe('entering')
    expect(state.error).toBeNull()
    expect(state.display).toBe('7')
  })

  it('clear recovers from an error and resets everything but history', () => {
    const before = succeed(run(afterTwoPlusThree(), { type: 'equals' }), '5')
    const state = run(fail(run(before, { type: 'binaryOp', op: 'add' }, { type: 'digit', digit: '0' }, { type: 'equals' })), { type: 'clear' })
    expect(state.status).toBe('entering')
    expect(state.display).toBe('0')
    expect(state.left).toBeNull()
    expect(state.op).toBeNull()
    expect(state.history).toEqual(before.history)
  })

  it('input while loading is ignored', () => {
    const loading = run(afterTwoPlusThree(), { type: 'equals' })
    const state = run(
      loading,
      { type: 'digit', digit: '9' },
      { type: 'dot' },
      { type: 'backspace' },
      { type: 'negate' },
      { type: 'binaryOp', op: 'add' },
      { type: 'equals' },
      { type: 'unaryOp', op: 'sqrt' },
      { type: 'percent' },
      { type: 'reuseHistory', item: { expression: '1 + 1', result: '2' } },
    )
    expect(state).toBe(loading)
  })

  it('history is capped at 10, newest first', () => {
    let state = initialState
    for (let i = 0; i < 12; i++) {
      state = run(state, { type: 'digit', digit: String(i % 10) }, { type: 'percent' })
      state = succeed(state, String(i))
    }
    expect(state.history).toHaveLength(10)
    expect(state.history[0]).toEqual({ expression: '1%', result: '11' })
    expect(state.history[9]).toEqual({ expression: '2%', result: '2' })
  })
})

describe('reducer flows', () => {
  it('equals with a pending op sends [left, display] and shows the result', () => {
    const state = succeed(run(afterTwoPlusThree(), { type: 'equals' }), '5')
    expect(state.pendingRequest).toBeNull()
    expect(state.display).toBe('5')
    expect(state.status).toBe('result')
    expect(state.op).toBeNull()
    expect(state.history[0]).toEqual({ expression: '2 + 3', result: '5' })
  })

  it('a binary op on a result uses the result as left', () => {
    const done = succeed(run(afterTwoPlusThree(), { type: 'equals' }), '5')
    const state = run(done, { type: 'binaryOp', op: 'multiply' })
    expect(state.left).toBe('5')
    expect(state.op).toBe('multiply')
    expect(state.status).toBe('entering')
  })

  it('a digit on a result starts a new number', () => {
    const done = succeed(run(afterTwoPlusThree(), { type: 'equals' }), '5')
    const state = run(done, { type: 'digit', digit: '7' })
    expect(state.display).toBe('7')
    expect(state.status).toBe('entering')
  })

  it('backspace trims the display and falls back to 0', () => {
    const state = run(
      initialState,
      { type: 'digit', digit: '1' },
      { type: 'digit', digit: '2' },
      { type: 'backspace' },
      { type: 'backspace' },
    )
    expect(state.display).toBe('0')
  })

  it('negate toggles the sign', () => {
    const state = run(initialState, { type: 'digit', digit: '5' }, { type: 'negate' })
    expect(state.display).toBe('-5')
    const back = run(state, { type: 'negate' })
    expect(back.display).toBe('5')
  })

  it('dot on an empty display gives 0.', () => {
    const state = run(initialState, { type: 'dot' })
    expect(state.display).toBe('0.')
  })

  it('stale responses are ignored', () => {
    const first = run(afterTwoPlusThree(), { type: 'equals' })
    const second = reducer(
      // Simulate a newer request superseding the first.
      { ...first, nextRequestId: first.nextRequestId + 1, pendingRequest: { ...first.pendingRequest!, id: first.pendingRequest!.id + 1 } },
      { type: 'requestSucceeded', id: first.pendingRequest!.id, result: '999' },
    )
    expect(second.display).toBe('3')
    expect(second.status).toBe('loading')
  })

  it('power maps to the power operation', () => {
    const state = run(
      initialState,
      { type: 'digit', digit: '2' },
      { type: 'binaryOp', op: 'power' },
      { type: 'digit', digit: '3' },
      { type: 'equals' },
    )
    expect(state.pendingRequest).toMatchObject({ operation: 'power', operands: ['2', '3'] })
  })

  it('reuseHistory puts the result on the display', () => {
    const state = run(initialState, { type: 'reuseHistory', item: { expression: '1 + 1', result: '2' } })
    expect(state.display).toBe('2')
    expect(state.status).toBe('entering')
  })
})

describe('withThousands', () => {
  it.each([
    ['1234567', '1,234,567'],
    ['-1234567', '-1,234,567'],
    ['1234.', '1,234.'],
    ['1234.5678', '1,234.5678'],
    ['-0.5', '-0.5'],
    ['0.5', '0.5'],
    ['', ''],
    ['12', '12'],
  ])('withThousands(%j) is %j', (input, expected) => {
    expect(withThousands(input)).toBe(expected)
  })
})
