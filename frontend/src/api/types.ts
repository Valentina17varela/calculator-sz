/**
 * Types mirroring docs/sdd/01-api-spec.md.
 * Numbers travel as decimal strings, never JSON numbers.
 */

export type Operation =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'power'
  | 'sqrt'
  | 'percent'

export interface CalculateRequest {
  operation: Operation
  operands: string[]
}

export interface CalculateResponse {
  operation: string
  operands: string[]
  result: string
}

export interface OperationInfo {
  name: string
  arity: number
}

export interface OperationsResponse {
  operations: OperationInfo[]
}

export interface ErrorEnvelope {
  error: {
    code: string
    message: string
  }
}
