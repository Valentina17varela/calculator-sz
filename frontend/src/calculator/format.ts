/** Display helpers. Pure string work, no API, no React. */

/** Matches the API contract: ^-?\d+(\.\d+)?$ up to 32 characters. */
export const MAX_INPUT_LENGTH = 32
const OPERAND_PATTERN = /^-?\d+(\.\d+)?$/

export function isValidOperand(value: string): boolean {
  return value.length <= MAX_INPUT_LENGTH && OPERAND_PATTERN.test(value)
}

/**
 * Operands as the API accepts them: a trailing dot is dropped and
 * negative zero becomes plain zero.
 */
export function normalizeOperand(value: string): string {
  const withoutTrailingDot = value.endsWith('.') ? value.slice(0, -1) : value
  return withoutTrailingDot === '-0' ? '0' : withoutTrailingDot
}

/** Appends one digit, enforcing the length limit and the leading-zero rule. */
export function applyDigit(display: string, digit: string): string {
  if (display === '0') return digit
  if (display === '-0') return `-${digit}`
  if (display.length >= MAX_INPUT_LENGTH) return display
  return display + digit
}

/** Appends the decimal point, never a second one. */
export function applyDot(display: string): string {
  if (display.includes('.')) return display
  if (display === '' || display === '-') return `${display}0.`
  if (display.length >= MAX_INPUT_LENGTH) return display
  return `${display}.`
}

/** Removes the last character; an empty result falls back to '0'. */
export function applyBackspace(display: string): string {
  const next = display.slice(0, -1)
  return next === '' || next === '-' ? '0' : next
}

/** Toggles the sign; '0' stays '0'. */
export function applyNegate(display: string): string {
  if (display === '0' || display === '') return display
  return display.startsWith('-') ? display.slice(1) : `-${display}`
}

/**
 * Thousands separators for the display only. Operands sent to the API stay raw.
 * Keeps the sign, the decimal part and a trailing dot intact.
 */
export function withThousands(value: string): string {
  const negative = value.startsWith('-')
  const digits = negative ? value.slice(1) : value
  const [intPart, decimalPart] = digits.split('.')
  if (intPart === '') return value
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const joined = decimalPart === undefined ? grouped : `${grouped}.${decimalPart}`
  return negative ? `-${joined}` : joined
}
