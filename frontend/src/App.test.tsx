import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

function apiResponse(result: string): Response {
  return new Response(JSON.stringify({ operation: 'x', operands: [], result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function apiError(code: string, message: string, status: number): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Fetch stub that never answers, so the app stays in the loading state. */
function hangingApi(): void {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise<Response>(() => {})))
}

/** The `fetch(url, init)` call at `index`, so tests can check what was sent. */
function fetchCall(index = 0): { url: string; init: RequestInit } {
  const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[index] as [string, RequestInit]
  return { url, init }
}

function sentBody(index = 0): unknown {
  return JSON.parse(String(fetchCall(index).init.body))
}

async function pressTwoPlusThreeEquals() {
  await userEvent.click(screen.getByRole('button', { name: '2' }))
  await userEvent.click(screen.getByRole('button', { name: 'Add' }))
  await userEvent.click(screen.getByRole('button', { name: '3' }))
  await userEvent.click(screen.getByRole('button', { name: 'Equals' }))
}

describe('App', () => {
  it('renders display, keypad, history, wordmark and credit', () => {
    render(<App />)
    expect(screen.getByRole('status', { name: 'Calculator display' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Calculator keypad' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'History' })).toBeInTheDocument()
    expect(screen.getByText('Sezzle')).toBeInTheDocument()
    expect(screen.getByText('Built by Valentina Varela Alzate')).toBeInTheDocument()
  })

  it('flow 2 + 3 = shows 5 and records the history entry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(apiResponse('5')))
    render(<App />)
    await pressTwoPlusThreeEquals()
    const display = screen.getByRole('status', { name: 'Calculator display' })
    await waitFor(() => expect(within(display).getByText('5')).toBeInTheDocument())
    expect(screen.getByText('2 + 3')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetchCall().url).toBe('/api/v1/calculate')
    expect(sentBody()).toEqual({ operation: 'add', operands: ['2', '3'] })
  })

  it('flow 1 / 0 = shows the friendly error in an alert and recovers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(apiError('DIVISION_BY_ZERO', 'Cannot divide by zero', 422)),
    )
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Divide' }))
    await userEvent.click(screen.getByRole('button', { name: '0' }))
    await userEvent.click(screen.getByRole('button', { name: 'Equals' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Cannot divide by zero')
    // Any digit recovers.
    await userEvent.click(screen.getByRole('button', { name: '7' }))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('keys are disabled while the request is in flight, except Clear', async () => {
    hangingApi()
    render(<App />)
    await pressTwoPlusThreeEquals()
    const add = screen.getByRole('button', { name: 'Add' })
    const clear = screen.getByRole('button', { name: 'Clear' })
    expect(add).toBeDisabled()
    expect(clear).toBeEnabled()
    // Clear cancels and recovers.
    await userEvent.click(clear)
    expect(await screen.findByRole('button', { name: 'Add' })).toBeEnabled()
  })

  it('keyboard flow 2 + 3 Enter shows 5', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(apiResponse('5')))
    render(<App />)
    await userEvent.keyboard('2+3{Enter}')
    const display = screen.getByRole('status', { name: 'Calculator display' })
    await waitFor(() => expect(within(display).getByText('5')).toBeInTheDocument())
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(sentBody()).toEqual({ operation: 'add', operands: ['2', '3'] })
  })

  it('typing does not re-subscribe the keydown listener on every render', async () => {
    const addListener = vi.spyOn(window, 'addEventListener')
    render(<App />)
    await userEvent.keyboard('123')
    const keydownSubscriptions = addListener.mock.calls.filter(([type]) => type === 'keydown')
    expect(keydownSubscriptions).toHaveLength(1)
  })

  it('shows the pending expression 2 + while typing the second operand', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    const display = screen.getByRole('status', { name: 'Calculator display' })
    expect(within(display).getByText('2 +')).toBeInTheDocument()
    expect(within(display).getByText('2')).toBeInTheDocument()
  })

  it('clicking a history item reuses its result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(apiResponse('5')))
    render(<App />)
    await pressTwoPlusThreeEquals()
    const reuse = await screen.findByRole('button', { name: '2 + 3 5, use result' })
    const display = screen.getByRole('status', { name: 'Calculator display' })
    // Replace the result on screen first, so reuse has something to change.
    await userEvent.click(screen.getByRole('button', { name: '9' }))
    expect(within(display).getByText('9')).toBeInTheDocument()
    expect(within(display).queryByText('5')).toBeNull()
    await userEvent.click(reuse)
    expect(within(display).getByText('5')).toBeInTheDocument()
    expect(within(display).queryByText('9')).toBeNull()
  })

  it('Escape cancels the request during loading', async () => {
    hangingApi()
    render(<App />)
    await pressTwoPlusThreeEquals()
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
    const signal = fetchCall().init.signal as AbortSignal
    expect(signal.aborted).toBe(false)
    await userEvent.keyboard('{Escape}')
    expect(await screen.findByRole('button', { name: 'Add' })).toBeEnabled()
    expect(signal.aborted).toBe(true)
  })

  it('other keys are ignored during loading and do not cancel the request', async () => {
    hangingApi()
    render(<App />)
    await userEvent.keyboard('2+3{Enter}')
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
    const signal = fetchCall().init.signal as AbortSignal
    await userEvent.keyboard('9{Enter}+')
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(signal.aborted).toBe(false)
  })
})
