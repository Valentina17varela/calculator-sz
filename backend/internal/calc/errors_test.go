package calc

import (
	"errors"
	"testing"
)

func TestCodeConstants(t *testing.T) {
	tests := []struct {
		name string
		got  Code
		want string
	}{
		{"invalid json", CodeInvalidJSON, "INVALID_JSON"},
		{"unknown operation", CodeUnknownOperation, "UNKNOWN_OPERATION"},
		{"invalid operand count", CodeInvalidOperandCount, "INVALID_OPERAND_COUNT"},
		{"invalid operand", CodeInvalidOperand, "INVALID_OPERAND"},
		{"division by zero", CodeDivisionByZero, "DIVISION_BY_ZERO"},
		{"negative square root", CodeNegativeSquareRoot, "NEGATIVE_SQUARE_ROOT"},
		{"non integer exponent", CodeNonIntegerExponent, "NON_INTEGER_EXPONENT"},
		{"out of range", CodeOutOfRange, "OUT_OF_RANGE"},
		{"method not allowed", CodeMethodNotAllowed, "METHOD_NOT_ALLOWED"},
		{"payload too large", CodePayloadTooLarge, "PAYLOAD_TOO_LARGE"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.got) != tt.want {
				t.Errorf("got %q, want %q", tt.got, tt.want)
			}
		})
	}
}

func TestNewError(t *testing.T) {
	err := newError(CodeDivisionByZero, "cannot divide by zero")

	if err.Code != CodeDivisionByZero {
		t.Errorf("Code = %q, want %q", err.Code, CodeDivisionByZero)
	}
	if err.Message != "cannot divide by zero" {
		t.Errorf("Message = %q, want %q", err.Message, "cannot divide by zero")
	}
}

func TestErrorImplementsError(t *testing.T) {
	var err error = newError(CodeInvalidOperand, "operand is not a valid decimal")

	if got := err.Error(); got != "operand is not a valid decimal" {
		t.Errorf("Error() = %q, want %q", got, "operand is not a valid decimal")
	}
}

func TestErrorsAs(t *testing.T) {
	var err error = newError(CodeOutOfRange, "result too large")

	var calcErr *Error
	if !errors.As(err, &calcErr) {
		t.Fatal("errors.As did not match *Error")
	}
	if calcErr.Code != CodeOutOfRange {
		t.Errorf("Code = %q, want %q", calcErr.Code, CodeOutOfRange)
	}
}
