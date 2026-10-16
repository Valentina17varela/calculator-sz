package calc

// Code is a stable, machine-readable error identifier shared with the HTTP API.
type Code string

const (
	CodeInvalidJSON         Code = "INVALID_JSON"
	CodeUnknownOperation    Code = "UNKNOWN_OPERATION"
	CodeInvalidOperandCount Code = "INVALID_OPERAND_COUNT"
	CodeInvalidOperand      Code = "INVALID_OPERAND"
	CodeDivisionByZero      Code = "DIVISION_BY_ZERO"
	CodeNegativeSquareRoot  Code = "NEGATIVE_SQUARE_ROOT"
	CodeNonIntegerExponent  Code = "NON_INTEGER_EXPONENT"
	CodeOutOfRange          Code = "OUT_OF_RANGE"
	CodeMethodNotAllowed    Code = "METHOD_NOT_ALLOWED"
	CodePayloadTooLarge     Code = "PAYLOAD_TOO_LARGE"
)

// Error is a typed error carrying a stable Code.
type Error struct {
	Code    Code
	Message string
}

func (e *Error) Error() string { return e.Message }

func newError(code Code, msg string) *Error {
	return &Error{Code: code, Message: msg}
}
