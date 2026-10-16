package httpapi

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/Valentina17varela/sezzle-calculator/backend/internal/calc"
)

const codeInternalError calc.Code = "INTERNAL_ERROR"

const internalErrorMessage = "internal server error"

type errorBody struct {
	Code    calc.Code `json:"code"`
	Message string    `json:"message"`
}

type errorEnvelope struct {
	Error errorBody `json:"error"`
}

// statusFor maps an error code to its HTTP status. Unmapped codes are 500.
func statusFor(code calc.Code) int {
	switch code {
	case calc.CodeInvalidJSON,
		calc.CodeUnknownOperation,
		calc.CodeInvalidOperandCount,
		calc.CodeInvalidOperand:
		return http.StatusBadRequest
	case calc.CodeDivisionByZero,
		calc.CodeNegativeSquareRoot,
		calc.CodeNonIntegerExponent,
		calc.CodeOutOfRange:
		return http.StatusUnprocessableEntity
	case calc.CodeMethodNotAllowed:
		return http.StatusMethodNotAllowed
	case calc.CodePayloadTooLarge:
		return http.StatusRequestEntityTooLarge
	default:
		return http.StatusInternalServerError
	}
}

// writeError writes the standard JSON error envelope.
func writeError(w http.ResponseWriter, status int, code calc.Code, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(errorEnvelope{Error: errorBody{Code: code, Message: msg}})
}

// writeCalcError maps err to the error envelope. Anything that is not a
// mapped *calc.Error becomes a generic 500; the details go to the log only.
func writeCalcError(w http.ResponseWriter, err error) {
	var calcErr *calc.Error
	if errors.As(err, &calcErr) {
		if status := statusFor(calcErr.Code); status != http.StatusInternalServerError {
			writeError(w, status, calcErr.Code, calcErr.Message)
			return
		}
	}
	slog.Error("internal error", "error", err)
	writeError(w, http.StatusInternalServerError, codeInternalError, internalErrorMessage)
}
