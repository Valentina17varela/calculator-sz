import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, NetworkError, RequestTimeoutError, calculate, listOperations } from './client'

function mockFetch(status: number, body: unknown): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

/** A fetch that rejects with the signal's reason when it aborts. */
function hangingFetch(): ReturnType<typeof vi.fn> {
  return vi.fn().mockImplementation(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted.', 'AbortError')),
        )
      }),
  )
}

describe('calculate', () => {
  it('returns the result string on success', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(200, { operation: 'add', operands: ['0.1', '0.2'], result: '0.3' }),
    )
    await expect(calculate('add', ['0.1', '0.2'])).resolves.toBe('0.3')
  })

  it('sends the envelope from the spec', async () => {
    const fetchMock = mockFetch(200, { operation: 'add', operands: ['1', '2'], result: '3' })
    vi.stubGlobal('fetch', fetchMock)
    await calculate('add', ['1', '2'])
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/v1/calculate')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      operation: 'add',
      operands: ['1', '2'],
    })
  })

  it.each([
    ['DIVISION_BY_ZERO', 422],
    ['NEGATIVE_SQUARE_ROOT', 422],
    ['NON_INTEGER_EXPONENT', 422],
    ['OUT_OF_RANGE', 422],
    ['INVALID_JSON', 400],
    ['UNKNOWN_OPERATION', 400],
    ['INVALID_OPERAND_COUNT', 400],
    ['INVALID_OPERAND', 400],
    ['METHOD_NOT_ALLOWED', 405],
    ['PAYLOAD_TOO_LARGE', 413],
  ])('throws ApiError with code %s and status %s', async (code, status) => {
    vi.stubGlobal(
      'fetch',
      mockFetch(status, { error: { code, message: `message for ${code}` } }),
    )
    const error = await calculate('divide', ['1', '0']).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe(code)
    expect((error as ApiError).status).toBe(status)
    expect((error as ApiError).message).toBe(`message for ${code}`)
  })

  it('throws NetworkError for a 500 text/plain body (Vite proxy, backend down)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('server exploded', { status: 500 })),
    )
    await expect(calculate('add', ['1', '2'])).rejects.toBeInstanceOf(NetworkError)
  })

  it('throws NetworkError for a 502 HTML body (proxy, no upstream)', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 })),
    )
    await expect(calculate('add', ['1', '2'])).rejects.toBeInstanceOf(NetworkError)
  })

  it('throws NetworkError for an error envelope without a code string', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(500, { error: { message: 'no code here' } }),
    )
    await expect(calculate('add', ['1', '2'])).rejects.toBeInstanceOf(NetworkError)
  })

  it('throws NetworkError for a 200 with a non-JSON body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('not json', { status: 200 })),
    )
    await expect(calculate('add', ['1', '2'])).rejects.toBeInstanceOf(NetworkError)
  })

  it('throws NetworkError when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(calculate('add', ['1', '2'])).rejects.toBeInstanceOf(NetworkError)
  })

  it('passes the abort through as an AbortError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError')),
    )
    await expect(calculate('add', ['1', '2'])).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('aborting the caller signal aborts the signal fetch receives', async () => {
    vi.useFakeTimers()
    let fetchSignal: AbortSignal | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            fetchSignal = init?.signal ?? undefined
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('The operation was aborted.', 'AbortError')),
            )
          }),
      ),
    )
    const controller = new AbortController()
    const promise = calculate('add', ['1', '2'], controller.signal).catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(1000)
    controller.abort()
    await promise
    expect(fetchSignal?.aborted).toBe(true)
  })
})

describe('request timeout', () => {
  it('throws RequestTimeoutError at 10 seconds, not before', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', hangingFetch())
    const promise = calculate('add', ['1', '2'])
    const assertion = expect(promise).rejects.toBeInstanceOf(RequestTimeoutError)
    await vi.advanceTimersByTimeAsync(9999)
    // Still pending one tick before the deadline: nothing has rejected yet.
    await vi.advanceTimersByTimeAsync(1)
    await assertion
  })

  it('clears the timer on success', async () => {
    vi.useFakeTimers()
    const fetchMock = mockFetch(200, { operation: 'add', operands: ['1', '2'], result: '3' })
    vi.stubGlobal('fetch', fetchMock)
    const promise = calculate('add', ['1', '2'])
    await vi.advanceTimersByTimeAsync(20000)
    await expect(promise).resolves.toBe('3')
  })

  it('applies the timeout to listOperations too', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', hangingFetch())
    const assertion = expect(listOperations()).rejects.toBeInstanceOf(RequestTimeoutError)
    await vi.advanceTimersByTimeAsync(10000)
    await assertion
  })

  it('a caller abort is an AbortError, not a timeout', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', hangingFetch())
    const controller = new AbortController()
    const promise = calculate('add', ['1', '2'], controller.signal).catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(1000)
    controller.abort()
    const error = await promise
    expect(error).toBeInstanceOf(DOMException)
    expect((error as DOMException).name).toBe('AbortError')
    await vi.advanceTimersByTimeAsync(20000)
    // Still the abort: the timeout later never re-reports it.
    expect(error).not.toBeInstanceOf(RequestTimeoutError)
  })

  it('a caller that is already aborted never reaches fetch', async () => {
    vi.useFakeTimers()
    const fetchMock = hangingFetch()
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    controller.abort()
    await expect(calculate('add', ['1', '2'], controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('listOperations', () => {
  it('returns the operations list', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(200, { operations: [{ name: 'add', arity: 2 }, { name: 'sqrt', arity: 1 }] }),
    )
    await expect(listOperations()).resolves.toEqual({
      operations: [
        { name: 'add', arity: 2 },
        { name: 'sqrt', arity: 1 },
      ],
    })
  })

  it('throws ApiError on failure', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(500, { error: { code: 'INTERNAL_ERROR', message: 'boom' } }),
    )
    await expect(listOperations()).rejects.toBeInstanceOf(ApiError)
  })

  it('throws NetworkError when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(listOperations()).rejects.toBeInstanceOf(NetworkError)
  })

  it('passes the abort through as an AbortError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError')),
    )
    await expect(listOperations()).rejects.toMatchObject({ name: 'AbortError' })
  })
})
