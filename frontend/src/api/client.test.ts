import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, NetworkError, calculate, listOperations } from './client'

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
})

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

  it('forwards the signal to fetch', async () => {
    const controller = new AbortController()
    const fetchMock = mockFetch(200, { operation: 'add', operands: ['1', '2'], result: '3' })
    vi.stubGlobal('fetch', fetchMock)
    await calculate('add', ['1', '2'], controller.signal)
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal).toBe(controller.signal)
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
