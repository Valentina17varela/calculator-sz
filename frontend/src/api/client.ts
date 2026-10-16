import type {
  CalculateRequest,
  CalculateResponse,
  ErrorEnvelope,
  OperationsResponse,
} from './types'

/** Error from the API, carrying the machine-readable code and HTTP status. */
export class ApiError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

/** The API never answered properly: request failed, or the response was not from the API
 * (the Vite dev proxy answers 500 text/plain and 502 HTML when the backend is down). */
export class NetworkError extends Error {
  constructor() {
    super('network request failed')
    this.name = 'NetworkError'
  }
}

/** No answer within 10 seconds. */
export class RequestTimeoutError extends Error {
  constructor() {
    super('request timed out')
    this.name = 'RequestTimeoutError'
  }
}

const BASE = '/api/v1'
export const TIMEOUT_MS = 10000

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * Reads the error envelope from a non-2xx response. A response without a valid
 * envelope (error.code string) did not come from the API: NetworkError.
 */
async function parseError(response: Response): Promise<ApiError | NetworkError> {
  try {
    const body = (await response.json()) as ErrorEnvelope
    if (typeof body.error?.code === 'string') {
      return new ApiError(
        body.error.code,
        typeof body.error.message === 'string' ? body.error.message : 'request failed',
        response.status,
      )
    }
  } catch {
    // Body is not JSON: fall through to NetworkError.
  }
  return new NetworkError()
}

/**
 * Parses a JSON body from a 2xx response. A body that is not JSON did not come
 * from the API: NetworkError.
 */
async function parseSuccess<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T
  } catch {
    throw new NetworkError()
  }
}

/**
 * Shared fetch wrapper: NetworkError on failure, AbortError passes through,
 * RequestTimeoutError after 10 seconds without an answer. The caller's signal
 * and the timeout share one internal controller.
 */
async function request(url: string, init: RequestInit, signal?: AbortSignal): Promise<Response> {
  const controller = new AbortController()
  let timedOut = false
  const onCallerAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) throw new DOMException('The operation was aborted.', 'AbortError')
    signal.addEventListener('abort', onCallerAbort)
  }
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(url, { ...init, signal: controller.signal })
  } catch (error) {
    if (timedOut) throw new RequestTimeoutError()
    if (isAbort(error)) throw error
    throw new NetworkError()
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onCallerAbort)
  }
  if (!response.ok) throw await parseError(response)
  return response
}

/**
 * POST /api/v1/calculate. Returns the result string.
 * Throws ApiError for non-2xx API responses, NetworkError when the request
 * never completes or the response did not come from the API, and
 * RequestTimeoutError after 10 seconds without an answer.
 */
export async function calculate(
  operation: CalculateRequest['operation'],
  operands: string[],
  signal?: AbortSignal,
): Promise<string> {
  const requestBody: CalculateRequest = { operation, operands }
  const response = await request(`${BASE}/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  }, signal)
  const body = await parseSuccess<CalculateResponse>(response)
  return body.result
}

/** GET /api/v1/operations. Throws ApiError for non-2xx API responses. */
export async function listOperations(signal?: AbortSignal): Promise<OperationsResponse> {
  const response = await request(`${BASE}/operations`, {}, signal)
  return parseSuccess<OperationsResponse>(response)
}
